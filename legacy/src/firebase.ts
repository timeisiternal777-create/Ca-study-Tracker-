import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let app: any = null;
let db: any = null;
let auth: any = null;

const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== '' && 
  firebaseConfig.apiKey !== 'PLACEHOLDER';

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize standard Firestore
    const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
    if (dbId && dbId !== '(default)') {
      db = initializeFirestore(app, {
        databaseId: dbId,
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false
      } as any);
    } else {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false
      } as any);
    }

    auth = getAuth(app);
    
    // Enforce persistence so authentication state survives app restarts
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('[Firebase Auth] Persistence set to browserLocalPersistence.');
      })
      .catch((err) => {
        console.error('[Firebase Auth] Failed to configure persistence:', err);
      });

    // Enable offline persistence for Firestore
    enableIndexedDbPersistence(db)
      .then(() => {
        console.log('[Firestore] Offline persistence established successfully.');
      })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[Firestore] Persistence precondition failed (multiple tabs open).');
        } else if (err.code === 'unimplemented') {
          console.warn('[Firestore] The current browser does not support persistence.');
        }
      });

  } catch (error) {
    console.error('Firebase initialization failure:', error);
  }
}

// Global secure error handler to comply with security rules and trace operation failures
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid || null,
      email: currentAuth?.currentUser?.email || null,
      emailVerified: currentAuth?.currentUser?.emailVerified || null,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || null,
      providerInfo: currentAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error Details]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogleAndSync(): Promise<FirebaseUser> {
  if (!auth) {
    throw new Error('Firebase Auth is unconfigured. Please check project setup.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('[Firebase Auth] User successfully logged in with Google:', result.user.uid);
    return result.user;
  } catch (err) {
    console.error('[Firebase Auth] Sign in failure:', err);
    throw err;
  }
}

export async function logOutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
    console.log('[Firebase Auth] Successfully logged out.');
  } catch (err) {
    console.error('[Firebase Auth] Logout failure:', err);
  }
}

export { app, db, auth, isFirebaseConfigured };
