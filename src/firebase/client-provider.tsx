'use client';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import { ReactNode } from 'react';

// This provider is responsible for initializing Firebase on the client side.
// It should be used as a wrapper around the root layout of the application.
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const { app, auth, firestore } = initializeFirebase();

  return (
    <FirebaseProvider app={app} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
