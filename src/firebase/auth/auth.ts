'use client';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeFirebase } from '..';
import { collection, doc, writeBatch, setDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { firebaseConfig } from '../config';

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

export const signInWithEmail = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error signing in with email', error);
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
    status: 'active',
  });

  await batch.commit();

  return userCredential;
}

export const createUserForCompany = async (
  adminProfile: UserProfile, 
  newUserData: { displayName: string; email: string; password: string, role: 'admin' | 'employee' | 'scrum-master' }
) => {
  if (!adminProfile.companyId || !adminProfile.roles?.some(r => ['admin', 'scrum-master'].includes(r))) {
    throw new Error("Permission refusée : Seuls les administrateurs ou scrum masters peuvent créer des utilisateurs.");
  }

  // Use a temporary, secondary Firebase app to create the user.
  // This allows the admin to remain logged in on the primary app.
  const tempAppName = `auth-worker-${Date.now()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
    // 1. Create the user in Firebase Authentication via the temporary app's auth service.
    const userCredential = await createUserWithEmailAndPassword(tempAuth, newUserData.email, newUserData.password);
    const newUser = userCredential.user;
    
    // We also need to update their profile in Auth with the display name right after creation
    await updateProfile(newUser, { displayName: newUserData.displayName });

    // 2. We can now use the primary app's firestore instance to create the user profile.
    await setDoc(doc(firestore, 'users', newUser.uid), {
      uid: newUser.uid,
      email: newUserData.email,
      displayName: newUserData.displayName,
      photoURL: null, // New users won't have a photoURL initially.
      companyId: adminProfile.companyId,
      roles: [newUserData.role],
      status: 'active', // The account is active immediately.
    });

    return newUser;
  } catch (error) {
    // Re-throw the error to be caught by the form handler to display a toast.
    throw error;
  } finally {
    // 3. Delete the temporary app to clean up resources.
    await deleteApp(tempApp);
  }
};
