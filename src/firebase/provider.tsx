'use client';

import { createContext, ReactNode, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  app: null,
  auth: null,
  firestore: null,
});

export function FirebaseProvider({
  children,
  ...value
}: {
  children: ReactNode;
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}) {
  return (
    <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);

export const useFirebaseApp = () => {
  const context = useContext(FirebaseContext);
  if (!context || !context.app) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  }
  return context.app;
};

export const useAuth = () => {
  const context = useContext(FirebaseContext);
  if (!context || !context.auth) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context.auth;
};

export const useFirestore = () => {
  const context = useContext(FirebaseContext);
  if (!context || !context.firestore) {
    throw new Error('useFirestore must be used within a FirebaseProvider');
  }
  return context.firestore;
};
