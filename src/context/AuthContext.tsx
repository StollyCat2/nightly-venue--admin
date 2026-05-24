import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u && ADMIN_EMAIL && u.email === ADMIN_EMAIL) {
          const adminRef = doc(db, 'admins', u.uid);
          const snap = await getDoc(adminRef);
          if (!snap.exists()) {
            await setDoc(adminRef, { email: u.email });
          }
        } else if (u) {
          const venueRef = doc(db, 'venues', u.uid);
          const snap = await getDoc(venueRef);
          if (snap.exists()) {
            const updates: Record<string, unknown> = { lastLoginAt: serverTimestamp() };
            if (snap.data().inviteStatus === 'pending') {
              updates.inviteStatus = 'active';
            }
            await updateDoc(venueRef, updates);
          }
        }
      } catch (e) {
        console.warn('AuthContext post-login error:', e);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const isAdmin = !!user && !!ADMIN_EMAIL && user.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
