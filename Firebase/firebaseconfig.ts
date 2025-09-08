
// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAT6jgAZ4FjqC34W0hxCz4fIlqEe7fWNls",
  authDomain: "lokawaz-506ba.firebaseapp.com",
  projectId: "lokawaz-506ba",
  storageBucket: "lokawaz-506ba.firebasestorage.app",
  messagingSenderId: "50557200707",
  appId: "1:50557200707:web:293610a236b035cd1ee7f6",
  measurementId: "G-280V0BCM53"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);