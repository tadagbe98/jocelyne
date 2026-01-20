'use client';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { initializeFirebase } from '..';
import { collection, doc, writeBatch, addDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';

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
    status: 'active',
  });

  await batch.commit();

  return userCredential;
}

export const inviteUserToCompany = async (
  adminProfile: UserProfile, 
  newUserData: { displayName: string; email: string; role: 'admin' | 'employee' | 'scrum-master' }
) => {
  if (!adminProfile.companyId || !adminProfile.roles?.some(r => ['admin', 'scrum-master'].includes(r))) {
    throw new Error("Permission refusée : Seuls les administrateurs ou scrum masters peuvent inviter des utilisateurs.");
  }

  // This function only creates a user profile document in Firestore with a 'pending' status.
  // It does NOT create a user in Firebase Authentication.
  // The invited user must complete the standard sign-up process using the same email address.
  // A robust, production-ready solution would typically involve sending a signed invitation link
  // via email, processed by a backend service (like Firebase Functions) to securely create the user.

  const usersRef = collection(firestore, 'users');
  await addDoc(usersRef, {
      displayName: newUserData.displayName,
      email: newUserData.email.toLowerCase(),
      roles: [newUserData.role],
      companyId: adminProfile.companyId,
      status: 'pending',
      photoURL: null,
      uid: '', // This will be updated when the user signs up and their account is linked.
  });
};
