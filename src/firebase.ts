// src/firebase.ts
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getDatabase }   from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const fallbackConfig: FirebaseOptions = {
  apiKey: "AIzaSyCsDWPHyJt6VzAo5CIlqIOl9ekctSdcEgQ",
  authDomain: "phraipet.firebaseapp.com",
  databaseURL: "https://phraipet-default-rtdb.firebaseio.com",
  projectId: "phraipet",
  storageBucket: "phraipet.appspot.com",
  messagingSenderId: "939633456385",
  appId: "1:939633456385:web:7f58b7377b0a8f2c921700",
};

const firebaseConfig: FirebaseOptions = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain),
  databaseURL: String(import.meta.env.VITE_FIREBASE_DATABASE_URL || fallbackConfig.databaseURL),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId),
  storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId),
};

/* Init services */
const app  = initializeApp(firebaseConfig);

const resolvedDatabaseUrl = String(firebaseConfig.databaseURL || fallbackConfig.databaseURL);
if (import.meta.env.DEV && (!resolvedDatabaseUrl || !resolvedDatabaseUrl.startsWith("https://"))) {
  console.error("Firebase: Invalid database URL. Expected https://<project>-default-rtdb.firebaseio.com but got:", resolvedDatabaseUrl);
}
export const db   = getDatabase(app, resolvedDatabaseUrl);
export const auth = getAuth(app);

/* Track authentication state */
let isAuthenticated = false;
let authPromise: Promise<void> | null = null;

/* Anonymous sign‑in with retry logic */
const authenticateAnonymously = async (): Promise<void> => {
  try {
    const result = await signInAnonymously(auth);
    if (import.meta.env.DEV) {
      console.log("Firebase: Anonymous authentication successful", result.user.uid);
    }
    isAuthenticated = true;
  } catch (error: unknown) {
    console.error("Firebase: Anonymous authentication failed", error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      // @ts-expect-error safe guard for FirebaseError shape
      (error.code === 'auth/configuration-not-found')
    ) {
      console.warn("Firebase Auth not configured - using permissive rules fallback");
    }
    throw error as Error;
  }
};

/* Initialize authentication and set up state monitoring */
authPromise = authenticateAnonymously();

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (import.meta.env.DEV) {
      console.log("User authenticated:", user.uid);
    }
    isAuthenticated = true;
  } else {
    if (import.meta.env.DEV) {
      console.log("User not authenticated");
    }
    isAuthenticated = false;
    if (!authPromise) {
      authPromise = authenticateAnonymously().catch(() => {
        authPromise = null;
      });
    }
  }
});

/* Export auth utilities */
export const waitForAuth = () => authPromise;
export const getAuthStatus = () => isAuthenticated;