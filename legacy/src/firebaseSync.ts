import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { DailyStudyLog, MockLogEntry, UserProfile, UserSettings } from './types';

// Profile operations (saved in users/{uid}/profile/main)
export async function saveCloudUserProfile(userId: string, profile: UserProfile) {
  if (!db) return;
  const path = `users/${userId}/profile/main`;
  try {
    console.log(`[Firestore Write] Saving profile to: ${path}`);
    const docRef = doc(db, 'users', userId, 'profile', 'main');
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// User settings operations (saved in users/{uid}/settings/config)
export async function saveCloudUserSettings(userId: string, settings: UserSettings) {
  if (!db) return;
  const path = `users/${userId}/settings/config`;
  try {
    console.log(`[Firestore Write] Saving settings to: ${path}`);
    const docRef = doc(db, 'users', userId, 'settings', 'config');
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Study logs operations (saved in users/{uid}/study_logs/{id})
export async function saveCloudStudyLog(userId: string, entry: Omit<DailyStudyLog, 'id'> & { id?: string }) {
  if (!db) return;
  const docId = entry.id || entry.date || doc(collection(db, 'users', userId, 'study_logs')).id;
  const path = `users/${userId}/study_logs/${docId}`;
  try {
    console.log(`[Firestore Write] Saving study log at: ${path}`);
    const docRef = doc(db, 'users', userId, 'study_logs', docId);
    await setDoc(docRef, { 
      ...entry, 
      id: docId, 
      createdAt: entry.createdAt || new Date().toISOString() 
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCloudStudyLog(userId: string, docId: string) {
  if (!db) return;
  const path = `users/${userId}/study_logs/${docId}`;
  try {
    console.log(`[Firestore Write] Deleting study log at: ${path}`);
    const docRef = doc(db, 'users', userId, 'study_logs', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Mock logs operations (saved in users/{uid}/mock_logs/{id})
export async function saveCloudMockLog(userId: string, entry: Omit<MockLogEntry, 'id'> & { id?: string }) {
  if (!db) return;
  const docId = entry.id || doc(collection(db, 'users', userId, 'mock_logs')).id;
  const path = `users/${userId}/mock_logs/${docId}`;
  try {
    console.log(`[Firestore Write] Saving mock log at: ${path}`);
    const docRef = doc(db, 'users', userId, 'mock_logs', docId);
    await setDoc(docRef, { 
      ...entry, 
      id: docId, 
      createdAt: entry.createdAt || new Date().toISOString() 
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function deleteCloudMockLog(userId: string, docId: string) {
  if (!db) return;
  const path = `users/${userId}/mock_logs/${docId}`;
  try {
    console.log(`[Firestore Write] Deleting mock log at: ${path}`);
    const docRef = doc(db, 'users', userId, 'mock_logs', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
