import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCnVWIVy4szPh5mtgqZR7o7FU1NdZKhDBM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "e-commerse-ca95f.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://e-commerse-ca95f-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "e-commerse-ca95f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "e-commerse-ca95f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "186543384543",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:186543384543:web:db1bc7a80f750f994c066a"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Firebase services
let db: any;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
  });
} catch (e) {
  db = getFirestore(app);
}

const auth = getAuth(app);

// Set session persistence for authentication
if (typeof window !== 'undefined') {
  setPersistence(auth, browserSessionPersistence)
    .catch((error) => {
      console.warn("Firebase Auth Persistence Note:", error?.message);
    });
}

export { db, auth };

