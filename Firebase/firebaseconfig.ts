// firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAT6jgAZ4FjqC34W0hxCz4fIlqEe7fWNls",
  authDomain: "lokawaz-506ba.firebaseapp.com",
  projectId: "lokawaz-506ba",
  storageBucket: "lokawaz-506ba.firebasestorage.app",
  messagingSenderId: "50557200707",
  appId: "1:50557200707:web:293610a236b035cd1ee7f6",
  measurementId: "G-280V0BCM53",
};

// ✅ Initialize Firebase app (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ✅ Auth with AsyncStorage persistence (only once)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app); // fallback if already initialized
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
