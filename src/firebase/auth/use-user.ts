'use client';
import { getAuth, onIdTokenChanged, User } from 'firebase/auth';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { initializeFirebase } from '..';

const { app, firestore } = initializeFirebase();
const auth = getAuth(app);

export interface UserProfile extends DocumentData {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    companyId?: string;
    roles?: string[];
}

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (user) {
        setUser(user);
        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, userProfile, loading };
};
