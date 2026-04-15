import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBnXJ8e-dPHtW05-IdkHhcz9JA0BOoit1E",
  authDomain: "weekmenu-v2-6adb3.firebaseapp.com",
  projectId: "weekmenu-v2-6adb3",
  storageBucket: "weekmenu-v2-6adb3.firebasestorage.app",
  messagingSenderId: "1016220868832",
  appId: "1:1016220868832:web:b28ff0c661fc2534e63085"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
});

export default app;