import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    "AIzaSyDj6OviWbUhE2280eOQ8N9BNh6hqHG4ekU",

  authDomain:
    "jenna-rose-inventory-4a4e3.firebaseapp.com",

  projectId:
    "jenna-rose-inventory-4a4e3",

  storageBucket:
    "jenna-rose-inventory-4a4e3.firebasestorage.app",

  messagingSenderId:
    "599844558666",

  appId:
    "1:599844558666:web:d789c6134000173e8393b3",
};

const app =
  initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);