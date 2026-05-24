import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyB0fda-X546A5dpLB9bVBfVQVZ28EDwZw8',
  authDomain: 'nightly-app-f3722.firebaseapp.com',
  projectId: 'nightly-app-f3722',
  storageBucket: 'nightly-app-f3722.firebasestorage.app',
  messagingSenderId: '58724179976',
  appId: '1:58724179976:web:72ece6d6f4930864f931bd',
  measurementId: 'G-0N3Z1Q0H7Y',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
