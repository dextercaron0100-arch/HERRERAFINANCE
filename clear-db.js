import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || "(default)");

async function clearDB() {
  const docRef = doc(db, "appData", "master");
  await setDoc(docRef, {});
  console.log("Database cleared!");
  process.exit(0);
}

clearDB().catch(console.error);
