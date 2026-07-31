import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAFgABD5BKf2lhCqWjxvpwtaf0P93mDFRg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0684119223.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0684119223",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0684119223.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "669943024755",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:669943024755:web:be81f2a77b9fd617ab6e06"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-plusuiclone-87f7d9a4-167e-42ce-a8c5-1ad72f8ca775");
export const auth = getAuth(app);
