'use client';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { initializeFirebase } from '..';
import { collection, doc, writeBatch } from 'firebase/firestore';

const { auth, firestore } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
    throw error;
  }
};


type CompanyData = {
    name: string;
    creationYear: number;
    country: string;
    currency: string;
    language: string;
};

export const signUpWithCompany = async (email, password, fullName, companyData: CompanyData) => {
  // 1. Create user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (!user) {
    throw new Error("User creation failed.");
  }

  // 2. Update user profile in Auth
  await updateProfile(user, { displayName: fullName });

  // 3. Create company and user profile docs in Firestore in a single batch
  const batch = writeBatch(firestore);

  // Company doc
  const companyRef = doc(collection(firestore, 'companies'));
  batch.set(companyRef, {
    ...companyData,
    ownerId: user.uid,
    createdAt: new Date(),
  });

  // UserProfile doc
  const userProfileRef = doc(firestore, 'users', user.uid);
  batch.set(userProfileRef, {
    uid: user.uid,
    email: user.email,
    displayName: fullName,
    photoURL: user.photoURL,
    companyId: companyRef.id,
    roles: ['admin'],
  });

  await batch.commit();

  return userCredential;
}
