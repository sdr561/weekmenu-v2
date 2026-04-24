import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './Firebase';
import { doc, onSnapshot, setDoc, collection, getDoc } from 'firebase/firestore';
import Login from './Login';
import WeekMenuPlanner from './WeekMenuPlanner';
import './App.css';

const generateFamilyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

function App() {
  // undefined = auth nog niet gecontroleerd, null = niet ingelogd
  const [user, setUser] = useState(undefined);
  const [familyId, setFamilyId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user === undefined || user === null) {
      if (user === null) setFamilyId(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const unsub = onSnapshot(userRef, async (snap) => {
      if (snap.exists() && snap.data().familyId) {
        setFamilyId(snap.data().familyId);
        return;
      }

      // Nieuwe gebruiker of bestaande gebruiker zonder gezinsdocument:
      // gebruik userId als familyId zodat bestaande data bewaard blijft.
      try {
        const assignedFamilyId = user.uid;
        const familyRef = doc(db, 'families', assignedFamilyId);
        const familySnap = await getDoc(familyRef);

        if (!familySnap.exists() || !familySnap.data().familyCode) {
          const familyCode = generateFamilyCode();
          await setDoc(familyRef, {
            members: [user.uid],
            familyCode,
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
          }, { merge: true });
          await setDoc(doc(db, 'familyCodes', familyCode), { familyId: assignedFamilyId });
        }

        await setDoc(userRef, { familyId: assignedFamilyId });
        // onSnapshot vuurt opnieuw, dan wordt familyId gezet via de bovenste if
      } catch (err) {
        console.error('Fout bij gezin aanmaken:', err);
      }
    });

    return () => unsub();
  }, [user]);

  const loading = user === undefined || (user !== null && familyId === null);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {user && familyId ? (
        <WeekMenuPlanner userId={user.uid} familyId={familyId} userEmail={user.email} />
      ) : (
        <Login />
      )}
    </>
  );
}

export default App;
