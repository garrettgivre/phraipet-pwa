// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase }   from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

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

/* Anonymous sign‑in so the DB rules we’ll add later allow writes */
const auth = getAuth(app);
signInAnonymously(auth).catch(console.error);