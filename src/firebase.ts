// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase }    from "firebase/database";   // ← this line is essential

const firebaseConfig = {
  apiKey: "AIzaSyCsDWPHyJt6VzAo5CIlqIOl9ekctSdcEgQ",
  authDomain: "phraipet.firebaseapp.com",
  databaseURL: "https://phraipet-default-rtdb.firebaseio.com",
  projectId: "phraipet",
  storageBucket: "phraipet.appspot.com",
  messagingSenderId: "939633456385",
  appId: "1:939633456385:web:7f58b7377b0a8f2c921700"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);   //  ← must have the word “export”
