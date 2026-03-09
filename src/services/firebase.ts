import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const firebaseDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

const requiredConfigKeys: Array<keyof typeof firebaseConfig> = [
  "apiKey",
  "projectId"
];

const missingFirebaseConfigKeys = requiredConfigKeys.filter(
  (key) => !firebaseConfig[key]
);
const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0;

export const db = isFirebaseConfigured
  ? getFirestore(initializeApp(firebaseConfig), firebaseDatabaseId || undefined)
  : null;

export { isFirebaseConfigured, missingFirebaseConfigKeys, firebaseDatabaseId };
