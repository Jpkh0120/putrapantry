import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUserUid');
    return savedUser ? { uid: savedUser } : null;
  });

  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || null);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || null);
  const [isVerified, setIsVerified] = useState(() => localStorage.getItem('isVerified') === 'true');
  const [loading, setLoading]   = useState(true);

  // Register new user
  async function register(email, password, name, role = 'student') {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();

    await axios.post(
      `${API}/api/auth/register`,
      { uid: credential.user.uid, name, email, role },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );

    setUserName(name);
    setUserRole(role);
    setIsVerified(false); 
    setCurrentUser(credential.user);

    localStorage.setItem('currentUserUid', credential.user.uid);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', name);
    localStorage.setItem('isVerified', 'false');

    return credential.user;
  }

  // User login
  async function login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    setCurrentUser(credential.user);
    localStorage.setItem('currentUserUid', credential.user.uid);

    return credential;
  }

  // User logout
  async function logout() {
    const idToken = auth.currentUser?.getIdToken();
    if (idToken) {
      await axios.post(`${API}/api/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${idToken}` },
      }).catch(() => {});
    }

    setCurrentUser(null);
    setUserRole(null);
    setUserName(null);
    setIsVerified(false);
    localStorage.removeItem('currentUserUid');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('isVerified');

    return signOut(auth);
  }

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('currentUserUid', user.uid);

        try {
          const token = await user.getIdToken();
          const res = await axios.get(`${API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data) {
            const role = res.data.role ?? 'student';
            const name = res.data.name || 'Student';
            const verified = res.data.isVerified ?? false; 

            setUserRole(role);
            setUserName(name);
            setIsVerified(verified); 
            
            localStorage.setItem('userRole', role);
            localStorage.setItem('userName', name);
            localStorage.setItem('isVerified', String(verified));
          }
        } catch (err) {
          console.error("Backend connection error, using local fallback credentials:", err.message);
          const fallbackRole = localStorage.getItem('userRole') || 'student';
          const fallbackName = localStorage.getItem('userName') || (user.email ? user.email.split('@')[0] : 'Student');
          const fallbackVerified = localStorage.getItem('isVerified') === 'true';
          
          setUserRole(fallbackRole);
          setUserName(fallbackName);
          setIsVerified(fallbackVerified);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserName(null);
        setIsVerified(false);
        localStorage.removeItem('currentUserUid');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('isVerified');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = { currentUser, userRole, userName, isVerified, login, register, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f3f4f6',
          gap: '12px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #d1d5db',
            borderTop: '4px solid #16a34a',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading PutraPantry...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}