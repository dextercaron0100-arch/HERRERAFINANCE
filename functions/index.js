const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const app = initializeApp();
const FIRESTORE_DATABASE_ID = "ai-studio-financedashboard-aa910227-5d34-4e29-8158-83d8f8d84a10";
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

async function getProfiles() {
  const snap = await db.collection("appData").doc("finance_db_v3_profiles").get();
  return snap.exists ? snap.data().data || [] : [];
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
