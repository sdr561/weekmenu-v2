import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBnXJ8e-dPHtW05-IdkHhcz9JA0BOoit1E",
  authDomain: "weekmenu-v2.firebaseapp.com",
  projectId: "weekmenu-v2",
  storageBucket: "weekmenu-v2.firebasestorage.app",
  messagingSenderId: "123456",
  appId: "1:123456:web:abc123"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;