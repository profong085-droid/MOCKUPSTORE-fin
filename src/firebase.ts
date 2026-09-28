import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBDvGtP2Bhxir1qWVyzqtBk5_tS12fA0Ps",
  authDomain: "fong-ab522.firebaseapp.com",
  projectId: "fong-ab522",
  storageBucket: "fong-ab522.firebasestorage.app",
  messagingSenderId: "287370467762",
  appId: "1:287370467762:web:3ce5a8716501eda336ecab",
  measurementId: "G-GVDKDN7YPC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Analytics only in browser
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firebase Auth and Google Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, googleProvider };
