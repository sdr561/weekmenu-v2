import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './Firebase';
import Login from './Login';
import WeekMenuPlanner from './WeekMenuPlanner';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
      {user ? (
        <WeekMenuPlanner userId={user.uid} userEmail={user.email} />
      ) : (
        <Login />
      )}
    </>
  );
}

export default App;