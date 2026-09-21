/// <reference types="vite/client" />
import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const env = (import.meta as any).env || {};

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export interface ActiveFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
  projectName?: string;
  isCustom?: boolean;
}

// 1. Resolve initial configuration (checking localStorage first, then env, then default json)
function resolveInitialConfig(): ActiveFirebaseConfig {
  try {
    const rawLocal = localStorage.getItem('ninimo_custom_firebase_config');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      // If cached API key does not match active firebaseConfigJson or is old, clear it
      if (parsed && parsed.apiKey && parsed.projectId && parsed.apiKey === firebaseConfigJson.apiKey) {
        return {
          apiKey: parsed.apiKey,
          authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
          projectId: parsed.projectId,
          storageBucket: parsed.storageBucket || `${parsed.projectId}.firebasestorage.app`,
          messagingSenderId: parsed.messagingSenderId || '',
          appId: parsed.appId || '',
          projectName: parsed.projectName || parsed.projectId,
          firestoreDatabaseId: parsed.firestoreDatabaseId || '',
          isCustom: true,
        };
      } else {
        localStorage.removeItem('ninimo_custom_firebase_config');
      }
    }
  } catch {}

  const envApiKey = env.VITE_FIREBASE_API_KEY;
  const envAuthDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const envProjectId = env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envAuthDomain && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: envAuthDomain,
      projectId: envProjectId,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
      projectName: envProjectId,
      isCustom: true,
    };
  }

  return {
    apiKey: firebaseConfigJson.apiKey,
    authDomain: firebaseConfigJson.authDomain,
    projectId: firebaseConfigJson.projectId,
    storageBucket: firebaseConfigJson.storageBucket,
    messagingSenderId: firebaseConfigJson.messagingSenderId,
    appId: firebaseConfigJson.appId,
    measurementId: (firebaseConfigJson as any).measurementId || 'G-0866Q18BW9',
    firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId,
    projectName: 'Ninimo AFK',
    isCustom: true,
  };
}

export let activeFirebaseConfig: ActiveFirebaseConfig = resolveInitialConfig();

// Backward compatibility export
export const firebaseConfig = activeFirebaseConfig;

// Initialize Firebase App singleton
export let app = getApps().length === 0 ? initializeApp(activeFirebaseConfig) : getApp();

// Firebase Analytics (browser environment safe)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  try {
    isAnalyticsSupported()
      .then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      })
      .catch(() => {
        // Analytics error ignored gracefully
      });
  } catch {}
}

// Firebase Auth & Firestore
export let auth = getAuth(app);
export let googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore
export let db =
  activeFirebaseConfig.firestoreDatabaseId && activeFirebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, activeFirebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Validate Connection to Firestore on boot
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

/**
 * Save and apply custom Firebase credentials (switches popup to your custom project name)
 */
export async function applyCustomFirebaseConfig(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  projectName?: string;
}): Promise<void> {
  const cleanConfig: ActiveFirebaseConfig = {
    apiKey: config.apiKey.trim(),
    authDomain: config.authDomain.trim(),
    projectId: config.projectId.trim(),
    appId: config.appId ? config.appId.trim() : undefined,
    storageBucket: config.storageBucket ? config.storageBucket.trim() : `${config.projectId.trim()}.firebasestorage.app`,
    messagingSenderId: config.messagingSenderId ? config.messagingSenderId.trim() : undefined,
    projectName: config.projectName ? config.projectName.trim() : config.projectId.trim(),
    isCustom: true,
  };

  // Save to browser
  localStorage.setItem('ninimo_custom_firebase_config', JSON.stringify(cleanConfig));

  // Save to server volume if online
  try {
    await fetch('/api/firebase/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanConfig),
    });
  } catch {}

  // Reload window to apply freshly initialized Firebase SDK instances cleanly
  window.location.reload();
}

/**
 * Reset Firebase configuration to system default
 */
export async function resetFirebaseConfig(): Promise<void> {
  localStorage.removeItem('ninimo_custom_firebase_config');
  try {
    await fetch('/api/firebase/config/reset', { method: 'POST' });
  } catch {}
  window.location.reload();
}

/**
 * Sync user profile to Firestore `/users/{uid}`
 */
export async function syncUserToFirestore(user: FirebaseUser, customUsername?: string) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);
    const username = customUsername || user.displayName || user.email?.split('@')[0] || `User_${user.uid.slice(0, 6)}`;
    const emailLower = (user.email || '').toLowerCase();
    const isAdmin =
      emailLower === 'shifinkallan16@gmail.com' ||
      emailLower === 'gamershifin75@gmail.com' ||
      emailLower === 'shifin67e@gmail.com' ||
      username.toLowerCase() === 'shifin';

    if (!existing.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        username,
        email: user.email || '',
        photoURL: user.photoURL || '',
        isAdmin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(
        userRef,
        {
          updatedAt: new Date().toISOString(),
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          ...(isAdmin ? { isAdmin: true } : {}),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Firestore user sync notice:', err);
  }
}

export async function deleteUserFromFirestore(userId: string) {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    console.debug('Firestore user deletion notice:', err);
  }
}

/**
 * Cloud Storage (Upstash Redis is handled securely server-side)
 * Client storage helpers retained as clean no-op stubs for backward-compatibility.
 */
export async function saveBotToFirestore(_userId: string, _bot: any): Promise<boolean> {
  return true;
}

export async function syncBotsToFirestore(_userId: string, _bots: any[]): Promise<boolean> {
  return true;
}

export async function fetchBotsFromFirestore(_userId: string): Promise<any[]> {
  return [];
}

export async function deleteBotFromFirestore(_userId: string, _botId: string): Promise<boolean> {
  return true;
}

export async function saveChatMessageToFirestore(_msg: any): Promise<boolean> {
  return true;
}

export async function fetchChatMessagesFromFirestore(): Promise<any[]> {
  return [];
}

export async function deleteChatMessageFromFirestore(_messageId: string): Promise<boolean> {
  return true;
}

export {
  initializeApp,
  getAnalytics,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
};
