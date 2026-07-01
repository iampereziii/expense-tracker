import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** The shared household workspace id — the MVP guard for WHICH household. */
export const HOUSEHOLD_ID = process.env.NEXT_PUBLIC_HOUSEHOLD_ID ?? "";

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let dbInstance: Firestore | null = null;

/**
 * Firestore with offline persistence enabled (IndexedDB, multi-tab).
 * This is the whole architecture — local writes succeed offline and reconcile
 * on reconnect. Lazily initialized so it only runs in the browser.
 */
export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
  return dbInstance;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
