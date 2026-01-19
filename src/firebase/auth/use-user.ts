'use client';
import { getAuth, onIdTokenChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { initializeFirebase } from '..';

const { app } = initializeFirebase();
const auth = getAuth(app);

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const tokenResult = await user.getIdTokenResult();
        setClaims(tokenResult.claims);
      } else {
        setUser(null);
        setClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, claims };
};
