// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase }   from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCsDWPHyJt6VzAo5CIlqIOl9ekctSdcEgQ",
  authDomain: "phraipet.firebaseapp.com",
  databaseURL: "https://phraipet-default-rtdb.firebaseio.com",
  projectId: "phraipet",
  storageBucket: "phraipet.appspot.com",
  messagingSenderId: "939633456385",
  appId: "1:939633456385:web:7f58b7377b0a8f2c921700"
};

/* Init services */
const app  = initializeApp(firebaseConfig);
export const db   = getDatabase(app);
export const auth = getAuth(app);

/* Track authentication state */
let isAuthenticated = false;
let authPromise: Promise<void> | null = null;

/* Anonymous sign‑in with retry logic */
const authenticateAnonymously = async (): Promise<void> => {
  try {
    const result = await signInAnonymously(auth);
    console.log("Firebase: Anonymous authentication successful", result.user.uid);
    isAuthenticated = true;
  } catch (error: any) {
    console.error("Firebase: Anonymous authentication failed", error);
    
    // If Auth service isn't enabled, we need to handle this gracefully
    if (error.code === 'auth/configuration-not-found') {
      console.warn("Firebase Auth not configured - using permissive rules fallback");
      // We'll need to update the security rules to allow unauthenticated access
    }
    
    throw error;
  }
};

/* Initialize authentication and set up state monitoring */
authPromise = authenticateAnonymously();

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User authenticated:", user.uid);
    isAuthenticated = true;
  } else {
    console.log("User not authenticated");
    isAuthenticated = false;
    // Retry authentication if not authenticated
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