import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || "(default)"); // Provide the specific database ID or default
export const auth = getAuth(app);
const functions = getFunctions(app);

export const resetUserPassword = async (email: string, newPassword: string): Promise<{ status: string }> => {
  const callable = httpsCallable<{ email: string; newPassword: string }, { status: string }>(functions, 'resetUserPassword');
  const result = await callable({ email, newPassword });
  return result.data;
};

export const getOwnerEmailDeliverySettings = async (): Promise<{ enabled: boolean }> => {
  const callable = httpsCallable<void, { enabled: boolean }>(functions, 'getOwnerEmailDeliverySettings');
  const result = await callable();
  return result.data;
};

export const setOwnerEmailDeliveryEnabled = async (enabled: boolean): Promise<{ enabled: boolean }> => {
  const callable = httpsCallable<{ enabled: boolean }, { enabled: boolean }>(functions, 'setOwnerEmailDeliveryEnabled');
  const result = await callable({ enabled });
  return result.data;
};

export const logout = async () => {
  await auth.signOut();
};
