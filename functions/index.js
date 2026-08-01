const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const app = initializeApp();
const FIRESTORE_DATABASE_ID = "ai-studio-financedashboard-aa910227-5d34-4e29-8158-83d8f8d84a10";
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

const HARDCODED_OWNER_EMAILS = ["mark@herrera.com", "ryan@herrera.com", "marvin@herrera.com"];

async function getProfiles() {
  const snap = await db.collection("appData").doc("finance_db_v3_profiles").get();
  return snap.exists ? snap.data().data || [] : [];
}

async function getRoles() {
  const snap = await db.collection("appData").doc("finance_db_v3_roles").get();
  return snap.exists ? snap.data().data || [] : [];
}

// Mirrors isGroupAdmin()'s owner check in src/data/mockDatabase.ts (minus the
// isGroupAdmin/IT carve-out): hardcoded Herrera emails, or anyone holding a
// role:"owner" record for any company.
function getOwnerEmailSet(profiles, roles) {
  const emails = new Set(HARDCODED_OWNER_EMAILS);
  const ownerUserIds = new Set(
    roles.filter((r) => r.role === "owner").map((r) => r.userId),
  );
  profiles.forEach((p) => {
    if (ownerUserIds.has(p.id) && p.email) emails.add(p.email.toLowerCase());
  });
  return emails;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function isCallerGroupAdmin(uid, profiles) {
  const authUser = await getAuth().getUser(uid);
  const callerEmail = (authUser.email || "").toLowerCase();
  const profile = profiles.find((p) => p.email.toLowerCase() === callerEmail);
  return !!profile?.isGroupAdmin;
}

exports.resetUserPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const targetEmail = (request.data?.email || "").trim().toLowerCase();
  const newPassword = request.data?.newPassword || "";

  if (!targetEmail.endsWith("@herrera.com")) {
    throw new HttpsError("invalid-argument", "Target must be a herrera.com account.");
  }
  if (newPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");
  }

  const profiles = await getProfiles();

  const callerIsAdmin = await isCallerGroupAdmin(request.auth.uid, profiles);
  if (!callerIsAdmin) {
    throw new HttpsError("permission-denied", "Only a group admin can reset passwords.");
  }

  const targetProfile = profiles.find((p) => p.email.toLowerCase() === targetEmail);
  if (!targetProfile) {
    throw new HttpsError("not-found", "No app account found for that email.");
  }

  const auth = getAuth();
  try {
    const existingUser = await auth.getUserByEmail(targetEmail);
    await auth.updateUser(existingUser.uid, { password: newPassword });
    return { status: "updated" };
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      await auth.createUser({ email: targetEmail, password: newPassword });
      return { status: "created" };
    }
    throw new HttpsError("internal", err.message || "Failed to reset password.");
  }
});

// Emails Owners (see getOwnerEmailSet) when a new chat message lands in a
// conversation they're already a member of. Writes a doc to the `mail`
// collection for the Firebase "Trigger Email" extension to pick up and send.
exports.notifyOwnersOnNewChatMessage = onDocumentCreated(
  {
    document: "chatConversations/{conversationId}/messages/{messageId}",
    database: FIRESTORE_DATABASE_ID,
    // Firestore triggers must be deployed in the same region as the database
    // itself (confirmed via `firebase firestore:databases:get` — this named
    // database lives in us-west1, not the us-central1 functions default).
    region: "us-west1",
  },
  async (event) => {
    const message = event.data?.data();
    if (!message || !message.text) return;

    const conversationSnap = await db
      .collection("chatConversations")
      .doc(event.params.conversationId)
      .get();
    if (!conversationSnap.exists) return;
    const conversation = conversationSnap.data();

    const memberEmails = new Set(
      (Array.isArray(conversation.memberEmails) ? conversation.memberEmails : []).map((e) =>
        (e || "").toLowerCase(),
      ),
    );
    const senderEmail = (message.senderEmail || "").toLowerCase();

    const [profiles, roles] = await Promise.all([getProfiles(), getRoles()]);
    const ownerEmails = getOwnerEmailSet(profiles, roles);

    // Only notify Owners who already have read access to this conversation
    // (firestore.rules gates messages on membership) and never the sender.
    const recipients = [...ownerEmails].filter(
      (email) => email !== senderEmail && memberEmails.has(email),
    );
    if (recipients.length === 0) return;

    const senderProfile = profiles.find((p) => (p.email || "").toLowerCase() === senderEmail);
    const senderName = senderProfile?.fullName || message.senderEmail || "Someone";
    const conversationLabel =
      conversation.title || (conversation.type === "direct" ? "a direct message" : "a conversation");
    const preview = message.text.length > 200 ? `${message.text.slice(0, 200)}…` : message.text;
    const appUrl = process.env.APP_URL || "";

    const mailDocs = recipients.map((email) => ({
      to: [email],
      message: {
        subject: `New message from ${senderName}`,
        text: [
          `${senderName} sent a new message in ${conversationLabel}:`,
          "",
          `"${preview}"`,
          appUrl ? `\nOpen Herrera Finance: ${appUrl}` : "",
        ].join("\n"),
        html: [
          `<p><strong>${escapeHtml(senderName)}</strong> sent a new message in <strong>${escapeHtml(conversationLabel)}</strong>:</p>`,
          `<p>"${escapeHtml(preview)}"</p>`,
          appUrl ? `<p><a href="${escapeHtml(appUrl)}">Open Herrera Finance</a></p>` : "",
        ].join(""),
      },
    }));

    await Promise.all(mailDocs.map((doc) => db.collection("mail").add(doc)));
  },
);
