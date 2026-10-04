import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim() ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() ?? "",
  appId: env.VITE_FIREBASE_APP_ID?.trim() ?? "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
};

export const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== "messagingSenderId" && !value)
  .map(([key]) => key);

export const firebaseConfigured = missingFirebaseConfig.length === 0;
export const adminUid = env.VITE_FIREBASE_ADMIN_UID?.trim() ?? "";

const firebaseApp = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

export function requireAuth(): Auth {
  if (!firebaseAuth) throw new Error("Firebase Auth ainda não está configurado neste deploy.");
  return firebaseAuth;
}

export function requireFirestore(): Firestore {
  if (!firestore) throw new Error("Cloud Firestore ainda não está configurado neste deploy.");
  return firestore;
}

export function isAdminUid(uid: string | null | undefined): boolean {
  return Boolean(uid && adminUid && uid === adminUid);
}
