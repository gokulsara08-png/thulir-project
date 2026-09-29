import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() });
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = { id: userDoc.id, ...userDoc.data() };
      setUserData(data);
      return data;
    }
    // If user profile doesn't exist (e.g. seeder issue), create a basic one
    const basicProfile = {
      uid: result.user.uid,
      email: result.user.email,
      fullName: result.user.email.split('@')[0],
      phone: '',
      location: '',
      role: 'consumer', // default role
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(userDocRef, basicProfile);
    setUserData({ id: result.user.uid, ...basicProfile });
    return { id: result.user.uid, ...basicProfile };
  }

  async function signup(email, password, profileData) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userProfile = {
      uid: result.user.uid,
      email,
      fullName: profileData.fullName,
      phone: profileData.phone,
      location: profileData.location,
      role: profileData.role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', result.user.uid), userProfile);
    setUserData({ id: result.user.uid, ...userProfile });
    return userProfile;
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateProfile(updates) {
    if (!user) throw new Error('Not authenticated');
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    const updated = await getDoc(userRef);
    setUserData({ id: updated.id, ...updated.data() });
  }

  const value = {
    user,
    userData,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
