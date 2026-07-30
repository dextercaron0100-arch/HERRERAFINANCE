import {
  collection,
  deleteField,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  ChatConversation,
  ChatConversationType,
  ChatMessage,
  ChatMessageReply,
  Company,
  Profile,
} from "../types";

type ChatErrorHandler = (error: FirestoreError) => void;
export type ChatReadState = Record<string, string>;
export interface ChatMemberReadState {
  profileId: string;
  email: string;
  lastReadAt: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const timestampToIso = (
  value: Timestamp | Date | string | null | undefined,
  fallback = "",
): string => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return fallback;
};

const nullableTimestampToIso = (
  value: Timestamp | Date | string | null | undefined,
) => (value ? timestampToIso(value) : null);

const normalizeConversation = (
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ChatConversation => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    type: data.type as ChatConversationType,
    title: data.title || "",
    companyId: data.companyId || null,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    memberEmails: Array.isArray(data.memberEmails) ? data.memberEmails : [],
    createdById: data.createdById || "",
    createdByEmail: data.createdByEmail || "",
    lastMessageId: data.lastMessageId || null,
    lastMessageText: data.lastMessageText || "",
    lastMessageSenderId: data.lastMessageSenderId || null,
    lastMessageAt: nullableTimestampToIso(data.lastMessageAt),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    announcementOnly: Boolean(data.announcementOnly),
  };
};

const normalizeMessage = (
  conversationId: string,
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ChatMessage => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    conversationId,
    senderId: data.senderId || "",
    senderEmail: data.senderEmail || "",
    text: data.text || "",
    replyTo: data.replyTo || null,
    createdAt: timestampToIso(data.createdAt, data.clientCreatedAt || ""),
    editedAt: nullableTimestampToIso(data.editedAt),
    deletedAt: nullableTimestampToIso(data.deletedAt),
  };
};

const requireAuthenticatedEmail = () => {
  const email = auth.currentUser?.email;
  if (!auth.currentUser || !email) {
    throw new Error("Your authenticated chat session is unavailable.");
  }
  return {
    uid: auth.currentUser.uid,
    email: normalizeEmail(email),
  };
};

const directConversationId = (firstUserId: string, secondUserId: string) =>
  `direct-${[firstUserId, secondUserId].sort().join("--")}`;

const groupConversationId = () =>
  `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function subscribeToConversations(
  email: string,
  onData: (conversations: ChatConversation[]) => void,
  onError?: ChatErrorHandler,
): Unsubscribe {
  const conversationQuery = query(
    collection(db, "chatConversations"),
    where("memberEmails", "array-contains", normalizeEmail(email)),
  );

  return onSnapshot(
    conversationQuery,
    (snapshot) => {
      const conversations = snapshot.docs
        .map(normalizeConversation)
        .sort((left, right) => {
          const leftTime = left.lastMessageAt || left.updatedAt || left.createdAt;
          const rightTime =
            right.lastMessageAt || right.updatedAt || right.createdAt;
          return rightTime.localeCompare(leftTime);
        });
      onData(conversations);
    },
    onError,
  );
}

export function subscribeToMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: ChatErrorHandler,
): Unsubscribe {
  const messagesQuery = query(
    collection(db, "chatConversations", conversationId, "messages"),
    orderBy("createdAt", "desc"),
    limit(100),
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onData(
        snapshot.docs
          .map((message) => normalizeMessage(conversationId, message))
          .reverse(),
      );
    },
    onError,
  );
}

export function subscribeToReadStates(
  onData: (states: ChatReadState) => void,
  onError?: ChatErrorHandler,
): Unsubscribe {
  const { uid } = requireAuthenticatedEmail();
  return onSnapshot(
    collection(db, "chatUserStates", uid, "conversations"),
    (snapshot) => {
      const states: ChatReadState = {};
      snapshot.docs.forEach((stateDoc) => {
        states[stateDoc.id] = timestampToIso(stateDoc.data().lastReadAt);
      });
      onData(states);
    },
    onError,
  );
}

export function subscribeToConversationReadStates(
  conversationId: string,
  onData: (states: ChatMemberReadState[]) => void,
  onError?: ChatErrorHandler,
): Unsubscribe {
  return onSnapshot(
    collection(
      db,
      "chatConversations",
      conversationId,
      "readStates",
    ),
    (snapshot) => {
      onData(
        snapshot.docs.map((stateDoc) => ({
          profileId: stateDoc.data().profileId || "",
          email: stateDoc.data().email || "",
          lastReadAt: timestampToIso(stateDoc.data().lastReadAt),
        })),
      );
    },
    onError,
  );
}

export async function openDirectConversation(
  currentProfile: Profile,
  targetProfile: Profile,
): Promise<string> {
  const { email } = requireAuthenticatedEmail();
  if (normalizeEmail(currentProfile.email) !== email) {
    throw new Error("The signed-in identity does not match this finance profile.");
  }

  const conversationId = directConversationId(
    currentProfile.id,
    targetProfile.id,
  );
  const conversationRef = doc(db, "chatConversations", conversationId);
  const existing = await getDoc(conversationRef);
  if (!existing.exists()) {
    await setDoc(conversationRef, {
      type: "direct",
      title: "",
      companyId: null,
      memberIds: [currentProfile.id, targetProfile.id].sort(),
      memberEmails: [
        normalizeEmail(currentProfile.email),
        normalizeEmail(targetProfile.email),
      ].sort(),
      createdById: currentProfile.id,
      createdByEmail: email,
      lastMessageId: null,
      lastMessageText: "",
      lastMessageSenderId: null,
      lastMessageAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return conversationId;
}

export async function openCompanyConversation(
  currentProfile: Profile,
  company: Company,
  members: Profile[],
): Promise<string> {
  const { email } = requireAuthenticatedEmail();
  const memberById = new Map(members.map((member) => [member.id, member]));
  memberById.set(currentProfile.id, currentProfile);
  const companyMembers = [...memberById.values()];
  const conversationId = `company-${company.id}`;
  const conversationRef = doc(db, "chatConversations", conversationId);
  const existing = await getDoc(conversationRef);
  const roster = {
    memberIds: companyMembers.map((member) => member.id).sort(),
    memberEmails: companyMembers
      .map((member) => normalizeEmail(member.email))
      .sort(),
  };

  if (existing.exists()) {
    await updateDoc(conversationRef, roster);
  } else {
    await setDoc(conversationRef, {
      type: "company",
      title: `${company.name} Channel`,
      companyId: company.id,
      ...roster,
      createdById: currentProfile.id,
      createdByEmail: email,
      lastMessageId: null,
      lastMessageText: "",
      lastMessageSenderId: null,
      lastMessageAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return conversationId;
}

export async function createGroupConversation(
  currentProfile: Profile,
  selectedProfiles: Profile[],
  title: string,
): Promise<string> {
  const { email } = requireAuthenticatedEmail();
  const memberById = new Map(
    selectedProfiles.map((member) => [member.id, member]),
  );
  memberById.set(currentProfile.id, currentProfile);
  const members = [...memberById.values()];
  if (members.length < 3) {
    throw new Error("Select at least two other users for a group conversation.");
  }
  if (!title.trim()) {
    throw new Error("A group name is required.");
  }

  const conversationId = groupConversationId();
  await setDoc(doc(db, "chatConversations", conversationId), {
    type: "group",
    title: title.trim(),
    companyId: null,
    memberIds: members.map((member) => member.id).sort(),
    memberEmails: members
      .map((member) => normalizeEmail(member.email))
      .sort(),
    createdById: currentProfile.id,
    createdByEmail: email,
    lastMessageId: null,
    lastMessageText: "",
    lastMessageSenderId: null,
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    announcementOnly: false,
  });
  return conversationId;
}

export async function setConversationAnnouncementOnly(
  conversationId: string,
  announcementOnly: boolean,
): Promise<void> {
  requireAuthenticatedEmail();
  await updateDoc(doc(db, "chatConversations", conversationId), {
    announcementOnly,
    updatedAt: serverTimestamp(),
  });
}

export async function sendChatMessage(
  conversationId: string,
  sender: Profile,
  text: string,
  replyTo: ChatMessageReply | null,
): Promise<void> {
  const { email } = requireAuthenticatedEmail();
  const cleanText = text.trim();
  if (!cleanText) return;
  if (cleanText.length > 4000) {
    throw new Error("Messages are limited to 4,000 characters.");
  }

  const conversationRef = doc(db, "chatConversations", conversationId);
  const messageRef = doc(
    collection(db, "chatConversations", conversationId, "messages"),
  );
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId: sender.id,
    senderEmail: email,
    text: cleanText,
    replyTo,
    clientCreatedAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
    editedAt: null,
    deletedAt: null,
  });
  batch.update(conversationRef, {
    lastMessageId: messageRef.id,
    lastMessageText: cleanText,
    lastMessageSenderId: sender.id,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(
      db,
      "chatUserStates",
      auth.currentUser!.uid,
      "conversations",
      conversationId,
    ),
    {
      profileId: sender.id,
      email,
      lastReadAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    doc(
      db,
      "chatConversations",
      conversationId,
      "readStates",
      auth.currentUser!.uid,
    ),
    {
      profileId: sender.id,
      email,
      lastReadAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
}

export async function editChatMessage(
  conversationId: string,
  messageId: string,
  currentUserId: string,
  text: string,
): Promise<void> {
  const { email } = requireAuthenticatedEmail();
  const cleanText = text.trim();
  if (!cleanText) throw new Error("A message cannot be empty.");
  const messageRef = doc(
    db,
    "chatConversations",
    conversationId,
    "messages",
    messageId,
  );
  const snapshot = await getDoc(messageRef);
  if (
    !snapshot.exists() ||
    snapshot.data().senderId !== currentUserId ||
    normalizeEmail(snapshot.data().senderEmail || "") !== email
  ) {
    throw new Error("You can only edit your own messages.");
  }
  const conversationRef = doc(db, "chatConversations", conversationId);
  const conversationSnapshot = await getDoc(conversationRef);
  const batch = writeBatch(db);
  batch.update(messageRef, {
    text: cleanText,
    editedAt: serverTimestamp(),
  });
  if (conversationSnapshot.data()?.lastMessageId === messageId) {
    batch.update(conversationRef, {
      lastMessageText: cleanText,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function deleteChatMessage(
  conversationId: string,
  messageId: string,
  currentUserId: string,
): Promise<void> {
  const { email } = requireAuthenticatedEmail();
  const messageRef = doc(
    db,
    "chatConversations",
    conversationId,
    "messages",
    messageId,
  );
  const snapshot = await getDoc(messageRef);
  if (
    !snapshot.exists() ||
    snapshot.data().senderId !== currentUserId ||
    normalizeEmail(snapshot.data().senderEmail || "") !== email
  ) {
    throw new Error("You can only delete your own messages.");
  }
  const conversationRef = doc(db, "chatConversations", conversationId);
  const conversationSnapshot = await getDoc(conversationRef);
  const batch = writeBatch(db);
  batch.update(messageRef, {
    text: "",
    replyTo: deleteField(),
    deletedAt: serverTimestamp(),
  });
  if (conversationSnapshot.data()?.lastMessageId === messageId) {
    batch.update(conversationRef, {
      lastMessageText: "Message deleted",
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function markConversationRead(
  conversationId: string,
  profileId: string,
): Promise<void> {
  const { uid, email } = requireAuthenticatedEmail();
  const batch = writeBatch(db);
  batch.set(
    doc(db, "chatUserStates", uid, "conversations", conversationId),
    {
      profileId,
      email,
      lastReadAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    doc(
      db,
      "chatConversations",
      conversationId,
      "readStates",
      uid,
    ),
    {
      profileId,
      email,
      lastReadAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
}

export function isConversationUnread(
  conversation: ChatConversation,
  lastReadAt: string | undefined,
  currentUserId: string,
): boolean {
  if (
    !conversation.lastMessageAt ||
    conversation.lastMessageSenderId === currentUserId
  ) {
    return false;
  }
  return !lastReadAt || conversation.lastMessageAt > lastReadAt;
}
