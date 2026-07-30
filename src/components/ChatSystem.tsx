import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  Edit3,
  Megaphone,
  MessageCircle,
  MessageSquarePlus,
  MoreHorizontal,
  Reply,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  canAccessCompany,
  getCompanies,
  getProfiles,
  getRoles,
  isGroupAdmin,
  useDBUpdate,
} from "../data/mockDatabase";
import {
  createGroupConversation,
  deleteChatMessage,
  editChatMessage,
  isConversationUnread,
  markConversationRead,
  openCompanyConversation,
  openDirectConversation,
  sendChatMessage,
  setConversationAnnouncementOnly,
  subscribeToConversations,
  subscribeToConversationReadStates,
  subscribeToMessages,
  subscribeToReadStates,
  type ChatMemberReadState,
  type ChatReadState,
} from "../lib/chatService";
import {
  ChatConversation,
  ChatMessage,
  ChatMessageReply,
  Company,
  Profile,
} from "../types";

interface ChatSystemProps {
  userId: string;
  companyId: string;
}

interface NewConversationModalProps {
  currentProfile: Profile;
  profiles: Profile[];
  companies: Company[];
  onClose: () => void;
  onDirect: (profile: Profile) => Promise<void>;
  onCompany: (company: Company) => Promise<void>;
  onGroup: (profiles: Profile[], title: string) => Promise<void>;
}

const formatConversationTime = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatMessageTime = (iso: string) => {
  if (!iso) return "Sending…";
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
};

const formatMessageDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

function Avatar({
  name,
  type = "person",
  size = "md",
}: {
  name: string;
  type?: "person" | "group" | "company";
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "h-14 w-14 text-base"
      : size === "sm"
        ? "h-8 w-8 text-[10px]"
        : "h-11 w-11 text-xs";
  const tone =
    type === "company"
      ? "bg-indigo-100 text-indigo-700"
      : type === "group"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-white ${sizeClass} ${tone}`}
      aria-hidden="true"
    >
      {type === "company" ? (
        <Building2 className="h-1/2 w-1/2" />
      ) : type === "group" ? (
        <Users className="h-1/2 w-1/2" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

function NewConversationModal({
  currentProfile,
  profiles,
  companies,
  onClose,
  onDirect,
  onCompany,
  onGroup,
}: NewConversationModalProps) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState("");

  const availableProfiles = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return profiles
      .filter((profile) => profile.id !== currentProfile.id)
      .filter(
        (profile) =>
          !search ||
          profile.fullName.toLowerCase().includes(search) ||
          profile.email.toLowerCase().includes(search),
      );
  }, [currentProfile.id, profiles, searchTerm]);

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-conversation-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="new-conversation-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              New conversation
            </h2>
            <p className="text-xs text-slate-500">
              Message a teammate or create a working group.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close new conversation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-5 pt-3">
          {(["direct", "group"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`border-b-2 px-4 py-2 text-xs font-semibold capitalize transition ${
                mode === item
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {item === "direct" ? "Direct message" : "New group"}
            </button>
          ))}
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {mode === "direct" ? (
            <section>
              <h3 className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                Company channels
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() =>
                      runAction(company.id, () => onCompany(company))
                    }
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    <Avatar name={company.name} type="company" size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">
                        {company.name}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Company channel
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                Group name
              </span>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="e.g., Monthly Closing Team"
                maxLength={80}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </label>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <section>
            <h3 className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
              {mode === "direct" ? "People" : "Select at least two members"}
            </h3>
            <div className="space-y-1">
              {availableProfiles.map((profile) => {
                const selected = selectedIds.includes(profile.id);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => {
                      if (mode === "direct") {
                        runAction(profile.id, () => onDirect(profile));
                      } else {
                        setSelectedIds((current) =>
                          current.includes(profile.id)
                            ? current.filter((id) => id !== profile.id)
                            : [...current, profile.id],
                        );
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Avatar name={profile.fullName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {profile.fullName}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">
                        {profile.email}
                      </span>
                    </span>
                    {mode === "group" ? (
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          selected
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {mode === "group" ? (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
            <span className="text-xs text-slate-500">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              disabled={
                selectedIds.length < 2 || !groupName.trim() || Boolean(busyId)
              }
              onClick={() =>
                runAction("group", () =>
                  onGroup(
                    profiles.filter((profile) =>
                      selectedIds.includes(profile.id),
                    ),
                    groupName,
                  ),
                )
              }
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Create group
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ChatSystem({ userId, companyId }: ChatSystemProps) {
  useDBUpdate();

  const profiles = getProfiles();
  const roles = getRoles();
  const allCompanies = getCompanies();
  const currentProfile = profiles.find((profile) => profile.id === userId);
  const accessibleCompanies = allCompanies.filter(
    (company) =>
      isGroupAdmin(userId) || canAccessCompany(userId, company.id),
  );

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readStates, setReadStates] = useState<ChatReadState>({});
  const [memberReadStates, setMemberReadStates] = useState<
    ChatMemberReadState[]
  >([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [composerText, setComposerText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageReply | null>(null);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState("");
  const [conversationRetryAttempt, setConversationRetryAttempt] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const profileByEmail = useMemo(
    () =>
      new Map(
        profiles.map((profile) => [
          profile.email.trim().toLowerCase(),
          profile,
        ]),
      ),
    [profiles],
  );
  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    ) || null;
  const unreadConversationCount = conversations.filter((conversation) =>
    isConversationUnread(
      conversation,
      readStates[conversation.id],
      userId,
    ),
  ).length;

  const getConversationTitle = (conversation: ChatConversation) => {
    if (conversation.type !== "direct") return conversation.title;
    const otherId = conversation.memberIds.find((id) => id !== userId);
    return (
      (otherId ? profileById.get(otherId)?.fullName : "") ||
      "Direct conversation"
    );
  };

  const filteredConversations = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return conversations;
    return conversations.filter((conversation) => {
      const title =
        conversation.type === "direct"
          ? conversation.memberIds
              .filter((id) => id !== userId)
              .map((id) => profileById.get(id)?.fullName || "")
              .join(" ")
          : conversation.title;
      return (
        title.toLowerCase().includes(search) ||
        conversation.lastMessageText.toLowerCase().includes(search)
      );
    });
  }, [conversations, profileById, searchTerm, userId]);

  const selectedMembers = useMemo(
    () =>
      selectedConversation
        ? selectedConversation.memberIds
            .map((id) => profileById.get(id))
            .filter((profile): profile is Profile => Boolean(profile))
        : [],
    [profileById, selectedConversation],
  );

  // Announcement-only channels can only be posted to by Owner or IT
  // accounts (the same privilege level as isGroupAdmin), regardless of who
  // created the group.
  const canManageAnnouncements = isGroupAdmin(userId);
  const canPostInSelectedConversation =
    !selectedConversation?.announcementOnly || canManageAnnouncements;

  const handleToggleAnnouncementOnly = async () => {
    if (!selectedConversation) return;
    try {
      await setConversationAnnouncementOnly(
        selectedConversation.id,
        !selectedConversation.announcementOnly,
      );
    } catch (error) {
      toast.error("Could not update channel settings", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  useEffect(() => {
    if (!currentProfile) return;
    let retryTimer: number | undefined;
    setLoadingConversations(true);
    const unsubscribeConversations = subscribeToConversations(
      currentProfile.email,
      (nextConversations) => {
        setConversations(nextConversations);
        setLoadingConversations(false);
        setChatError("");
      },
      (error) => {
        setLoadingConversations(false);
        if (error.code === "permission-denied") {
          setChatError("Chat authorization is being refreshed. Retrying...");
          retryTimer = window.setTimeout(
            () => setConversationRetryAttempt((attempt) => attempt + 1),
            3000,
          );
          return;
        }
        setChatError(error.message);
      },
    );
    const unsubscribeReadStates = subscribeToReadStates(
      setReadStates,
      (error) => setChatError(error.message),
    );
    return () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      unsubscribeConversations();
      unsubscribeReadStates();
    };
  }, [conversationRetryAttempt, currentProfile?.email]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setMemberReadStates([]);
      return;
    }
    setLoadingMessages(true);
    const unsubscribeMessages = subscribeToMessages(
      selectedConversationId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoadingMessages(false);
      },
      (error) => {
        setLoadingMessages(false);
        toast.error("Messages could not be loaded", {
          description: error.message,
        });
      },
    );
    const unsubscribeReadReceipts = subscribeToConversationReadStates(
      selectedConversationId,
      setMemberReadStates,
      () => setMemberReadStates([]),
    );
    return () => {
      unsubscribeMessages();
      unsubscribeReadReceipts();
    };
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation || !currentProfile) return;
    markConversationRead(selectedConversation.id, currentProfile.id).catch(
      () => undefined,
    );
  }, [
    currentProfile?.id,
    selectedConversation?.id,
    selectedConversation?.lastMessageAt,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setReplyTo(null);
    setEditingMessageId("");
    setComposerText("");
    setShowDetails(false);
  };

  const companyMembers = (company: Company) =>
    profiles.filter(
      (profile) =>
        profile.isGroupAdmin ||
        roles.some(
          (role) =>
            role.userId === profile.id && role.companyId === company.id,
        ),
    );

  const handleOpenDirect = async (profile: Profile) => {
    if (!currentProfile) return;
    try {
      const conversationId = await openDirectConversation(
        currentProfile,
        profile,
      );
      selectConversation(conversationId);
      setShowNewConversation(false);
    } catch (error) {
      toast.error("Conversation could not be opened", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleOpenCompany = async (company: Company) => {
    if (!currentProfile) return;
    try {
      const conversationId = await openCompanyConversation(
        currentProfile,
        company,
        companyMembers(company),
      );
      selectConversation(conversationId);
      setShowNewConversation(false);
    } catch (error) {
      toast.error("Company channel could not be opened", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleCreateGroup = async (
    members: Profile[],
    title: string,
  ) => {
    if (!currentProfile) return;
    try {
      const conversationId = await createGroupConversation(
        currentProfile,
        members,
        title,
      );
      selectConversation(conversationId);
      setShowNewConversation(false);
    } catch (error) {
      toast.error("Group could not be created", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !currentProfile ||
      !selectedConversation ||
      !composerText.trim() ||
      isSending
    ) {
      return;
    }
    setIsSending(true);
    try {
      if (editingMessageId) {
        await editChatMessage(
          selectedConversation.id,
          editingMessageId,
          currentProfile.id,
          composerText,
        );
      } else {
        await sendChatMessage(
          selectedConversation.id,
          currentProfile,
          composerText,
          replyTo,
        );
      }
      setComposerText("");
      setEditingMessageId("");
      setReplyTo(null);
    } catch (error) {
      toast.error("Message was not sent", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const startReply = (message: ChatMessage) => {
    const replySender = profileByEmail.get(
      message.senderEmail.trim().toLowerCase(),
    );
    setEditingMessageId("");
    setComposerText("");
    setReplyTo({
      messageId: message.id,
      senderId: replySender?.id || message.senderId,
      senderName: replySender?.fullName || "Finance user",
      text: message.text,
    });
  };

  const startEdit = (message: ChatMessage) => {
    setReplyTo(null);
    setEditingMessageId(message.id);
    setComposerText(message.text);
  };

  const handleDelete = async (message: ChatMessage) => {
    if (!selectedConversation || !currentProfile) return;
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await deleteChatMessage(
        selectedConversation.id,
        message.id,
        currentProfile.id,
      );
    } catch (error) {
      toast.error("Message could not be deleted", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  if (!currentProfile) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Your finance profile could not be loaded for chat.
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100vh-11rem)] min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <aside
          className={`w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-80 lg:w-96 ${
            selectedConversation ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Internal Messenger
                </p>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-semibold text-slate-900">
                    Messages
                  </h1>
                  {unreadConversationCount > 0 ? (
                    <span
                      className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
                      aria-label={`${unreadConversationCount} unread conversations`}
                      aria-live="polite"
                    >
                      {unreadConversationCount > 99
                        ? "99+"
                        : unreadConversationCount}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewConversation(true)}
                className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-sm transition hover:bg-emerald-700"
                aria-label="Start a new conversation"
                title="New conversation"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {chatError ? (
              <div className="m-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                {chatError}
              </div>
            ) : null}
            {loadingConversations ? (
              <div className="space-y-2 p-2" aria-label="Loading conversations">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 rounded-full bg-emerald-50 p-4 text-emerald-600">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  No conversations yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Start a direct message, group, or company channel.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewConversation(true)}
                  className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  New conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const title = getConversationTitle(conversation);
                const unread = isConversationUnread(
                  conversation,
                  readStates[conversation.id],
                  userId,
                );
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                      selectedConversationId === conversation.id
                        ? "bg-emerald-50 ring-1 ring-emerald-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        name={title}
                        type={
                          conversation.type === "direct"
                            ? "person"
                            : conversation.type
                        }
                      />
                      {unread ? (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
                      ) : null}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm ${
                            unread
                              ? "font-bold text-slate-950"
                              : "font-semibold text-slate-800"
                          }`}
                        >
                          {title}
                        </span>
                        <span
                          className={`shrink-0 text-[9px] ${
                            unread
                              ? "font-bold text-emerald-700"
                              : "text-slate-400"
                          }`}
                        >
                          {formatConversationTime(
                            conversation.lastMessageAt ||
                              conversation.updatedAt,
                          )}
                        </span>
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] ${
                          unread
                            ? "font-semibold text-slate-700"
                            : "text-slate-500"
                        }`}
                      >
                        {conversation.lastMessageText ||
                          (conversation.type === "company"
                            ? "Company channel created"
                            : "Start the conversation")}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`min-w-0 flex-1 flex-col bg-slate-50 ${
            selectedConversation ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConversation ? (
            <>
              <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId("")}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar
                    name={getConversationTitle(selectedConversation)}
                    type={
                      selectedConversation.type === "direct"
                        ? "person"
                        : selectedConversation.type
                    }
                    size="sm"
                  />
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-900">
                      {getConversationTitle(selectedConversation)}
                      {selectedConversation.announcementOnly ? (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700"
                          title="Only Owner and IT accounts can post here"
                        >
                          <Megaphone className="h-2.5 w-2.5" />
                          Announcement
                        </span>
                      ) : null}
                    </h2>
                    <p className="truncate text-[10px] text-slate-500">
                      {selectedConversation.type === "direct"
                        ? "Direct message"
                        : `${selectedMembers.length} members`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails((visible) => !visible)}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 xl:hidden"
                  aria-label="Show conversation details"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Loading messages…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Avatar
                      name={getConversationTitle(selectedConversation)}
                      type={
                        selectedConversation.type === "direct"
                          ? "person"
                          : selectedConversation.type
                      }
                      size="lg"
                    />
                    <h3 className="mt-4 text-base font-bold text-slate-900">
                      {getConversationTitle(selectedConversation)}
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                      This is the beginning of this finance-team conversation.
                    </p>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-1">
                    {messages.map((message, index) => {
                      const previous = messages[index - 1];
                      const showDate =
                        !previous ||
                        new Date(previous.createdAt).toDateString() !==
                          new Date(message.createdAt).toDateString();
                      const senderProfile = profileByEmail.get(
                        message.senderEmail.trim().toLowerCase(),
                      );
                      const isOwn =
                        message.senderEmail.trim().toLowerCase() ===
                        currentProfile.email.trim().toLowerCase();
                      const sender =
                        senderProfile?.fullName ||
                        "Finance user";
                      const grouped =
                        previous &&
                        previous.senderId === message.senderId &&
                        !showDate;
                      const seenByAnotherMember =
                        isOwn &&
                        Boolean(message.createdAt) &&
                        memberReadStates.some(
                          (state) =>
                            state.profileId !== userId &&
                            state.lastReadAt >= message.createdAt,
                        );

                      return (
                        <React.Fragment key={message.id}>
                          {showDate ? (
                            <div className="py-4 text-center">
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-mono font-semibold uppercase tracking-wider text-slate-500 shadow-xs">
                                {formatMessageDate(message.createdAt)}
                              </span>
                            </div>
                          ) : null}
                          <div
                            className={`group flex gap-2 ${
                              isOwn ? "justify-end" : "justify-start"
                            } ${grouped ? "pt-0.5" : "pt-3"}`}
                          >
                            {!isOwn ? (
                              <div className="w-8 shrink-0">
                                {!grouped ? (
                                  <Avatar name={sender} size="sm" />
                                ) : null}
                              </div>
                            ) : null}
                            <div
                              className={`flex max-w-[78%] flex-col ${
                                isOwn ? "items-end" : "items-start"
                              }`}
                            >
                              {!isOwn && !grouped ? (
                                <span className="mb-1 px-1 text-[10px] font-semibold text-slate-500">
                                  {sender}
                                </span>
                              ) : null}
                              <div
                                className={`relative rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${
                                  message.deletedAt
                                    ? "border border-slate-200 bg-white text-slate-400 italic"
                                    : isOwn
                                      ? "rounded-br-md bg-emerald-600 text-white"
                                      : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                                }`}
                              >
                                {message.replyTo && !message.deletedAt ? (
                                  <div
                                    className={`mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-[10px] ${
                                      isOwn
                                        ? "border-white/70 bg-white/10 text-emerald-50"
                                        : "border-emerald-400 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    <div className="font-bold">
                                      {message.replyTo.senderName}
                                    </div>
                                    <div className="max-w-xs truncate opacity-80">
                                      {message.replyTo.text}
                                    </div>
                                  </div>
                                ) : null}
                                <p className="whitespace-pre-wrap break-words">
                                  {message.deletedAt
                                    ? "Message deleted"
                                    : message.text}
                                </p>
                              </div>
                              <div className="mt-1 flex items-center gap-1 px-1 text-[9px] text-slate-400">
                                <span>{formatMessageTime(message.createdAt)}</span>
                                {message.editedAt && !message.deletedAt ? (
                                  <span>· edited</span>
                                ) : null}
                                {isOwn ? (
                                  seenByAnotherMember ? (
                                    <CheckCheck
                                      className="h-3 w-3 text-emerald-500"
                                      aria-label="Seen"
                                    />
                                  ) : (
                                    <Check
                                      className="h-3 w-3 text-slate-400"
                                      aria-label="Sent"
                                    />
                                  )
                                ) : null}
                              </div>
                            </div>
                            {!message.deletedAt ? (
                              <div
                                className={`flex items-center gap-0.5 self-center opacity-0 transition group-hover:opacity-100 ${
                                  isOwn ? "order-first" : ""
                                }`}
                              >
                                {canPostInSelectedConversation ? (
                                  <button
                                    type="button"
                                    onClick={() => startReply(message)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                                    aria-label="Reply to message"
                                    title="Reply"
                                  >
                                    <Reply className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                                {isOwn ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(message)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                                      aria-label="Edit message"
                                      title="Edit"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(message)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                      aria-label="Delete message"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                {canPostInSelectedConversation ? (
                  <>
                    {replyTo || editingMessageId ? (
                      <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="min-w-0 flex-1 border-l-2 border-emerald-500 pl-3">
                          <p className="text-[10px] font-bold text-emerald-700">
                            {editingMessageId
                              ? "Editing your message"
                              : `Replying to ${replyTo?.senderName}`}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">
                            {editingMessageId
                              ? composerText
                              : replyTo?.text}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(null);
                            setEditingMessageId("");
                            setComposerText("");
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                          aria-label="Cancel reply or edit"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    <form
                      onSubmit={handleSubmit}
                      className="mx-auto flex max-w-3xl items-end gap-2"
                    >
                      <textarea
                        value={composerText}
                        onChange={(event) => setComposerText(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        rows={1}
                        maxLength={4000}
                        placeholder="Write a message…"
                        aria-label="Message"
                        className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-hidden transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!composerText.trim() || isSending}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        aria-label={
                          editingMessageId ? "Save message" : "Send message"
                        }
                      >
                        {editingMessageId ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="mx-auto flex max-w-3xl items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <Megaphone className="h-4 w-4 shrink-0" />
                    <span>
                      This is an announcement-only channel. Only{" "}
                      <strong>Owner and IT accounts</strong> can post here.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-emerald-50 p-5 text-emerald-600">
                <MessageCircle className="h-9 w-9" />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Your finance team, connected
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Choose a conversation or start a secure internal message with a
                teammate.
              </p>
              <button
                type="button"
                onClick={() => setShowNewConversation(true)}
                className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Start a conversation
              </button>
            </div>
          )}
        </section>

        {selectedConversation ? (
          <aside
            className={`w-72 shrink-0 border-l border-slate-200 bg-white p-5 xl:block ${
              showDetails
                ? "fixed inset-y-0 right-0 z-50 block shadow-2xl"
                : "hidden"
            }`}
          >
            <div className="flex items-center justify-between xl:justify-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 xl:hidden">
                Conversation details
              </span>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 xl:hidden"
                aria-label="Close conversation details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center text-center">
              <Avatar
                name={getConversationTitle(selectedConversation)}
                type={
                  selectedConversation.type === "direct"
                    ? "person"
                    : selectedConversation.type
                }
                size="lg"
              />
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                {getConversationTitle(selectedConversation)}
              </h3>
              <p className="mt-1 text-[10px] capitalize text-slate-500">
                {selectedConversation.type} conversation
              </p>
            </div>
            {selectedConversation.type === "group" &&
            canManageAnnouncements ? (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                      <Megaphone className="h-3 w-3" />
                      Announcement only
                    </span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">
                      Only Owner and IT accounts can post here. Everyone else
                      can read but not reply.
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedConversation.announcementOnly}
                    onClick={handleToggleAnnouncementOnly}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      selectedConversation.announcementOnly
                        ? "bg-amber-500"
                        : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
                        selectedConversation.announcementOnly
                          ? "translate-x-[22px]"
                          : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </label>
              </div>
            ) : null}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h4 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                Members · {selectedMembers.length}
              </h4>
              <div className="space-y-2">
                {selectedMembers.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-50"
                  >
                    <Avatar name={profile.fullName} size="sm" />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {profile.fullName}
                        {profile.id === userId ? " (You)" : ""}
                      </p>
                      <p className="truncate text-[9px] text-slate-500">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {showNewConversation ? (
        <NewConversationModal
          currentProfile={currentProfile}
          profiles={profiles}
          companies={
            companyId === "all"
              ? accessibleCompanies
              : accessibleCompanies.filter(
                  (company) => company.id === companyId,
                )
          }
          onClose={() => setShowNewConversation(false)}
          onDirect={handleOpenDirect}
          onCompany={handleOpenCompany}
          onGroup={handleCreateGroup}
        />
      ) : null}
    </>
  );
}
