import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './Firebase';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const errorMessages = {
        'auth/invalid-credential': 'Onjuist e-mailadres of wachtwoord',
        'auth/invalid-email': 'Ongeldig e-mailadres',
        'auth/user-not-found': 'Geen account gevonden met dit e-mailadres',
        'auth/wrong-password': 'Onjuist wachtwoord',
        'auth/email-already-in-use': 'Dit e-mailadres is al in gebruik',
        'auth/weak-password': 'Wachtwoord moet minimaal 6 tekens bevatten',
        'auth/too-many-requests': 'Te veel mislukte pogingen. Probeer het later opnieuw',
        'auth/network-request-failed': 'Netwerkfout. Controleer je verbinding',
        'auth/user-disabled': 'Dit account is uitgeschakeld',
      };
      setError(errorMessages[err.code] ?? 'Er ging iets mis. Probeer het opnieuw');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900">Weekmenu Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Plan je week, shop eenvoudig</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm"
              placeholder="jouw@email.nl"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading ? 'Bezig...' : (isRegister ? 'Account aanmaken' : 'Inloggen')}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium transition-colors"
          >
            {isRegister
              ? 'Heb je al een account? Log in'
              : 'Nog geen account? Registreer je'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
