import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// REPLACE THE VALUES BELOW WITH THE CODES FROM YOUR BROWSER TAB
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,                // <--- PASTE YOUR KEY HERE
  authDomain: "studify-99baa.firebaseapp.com",      // <--- PASTE YOUR DOMAIN HERE
  projectId: "studify-99baa",       // <--- PASTE YOUR ID HERE
  storageBucket: "studify-99baa.firebasestorage.app",   // <--- PASTE YOUR BUCKET HERE
  messagingSenderId: "13604704636",     // <--- PASTE YOUR SENDER ID HERE
  appId: "1:13604704636:web:aeec20567a949df840d4f9"                // <--- PASTE YOUR APP ID HERE
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the tools so we can use them in other pages
export const auth = getAuth(app);
export const db = getFirestore(app);