'use client';
import { getAuth, onIdTokenChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { initializeFirebase } from '..';
import { UserProfile } from '@/lib/types';

const { app, firestore } = initializeFirebase();
const auth = getAuth(app);

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
            // This case might happen if the user exists in Auth but not in Firestore
            // For example, after sign-in with Google before company creation
            const profile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            };
            setUserProfile(profile);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
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
