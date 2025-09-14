import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only on client side
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Check if we're in the browser
if (typeof window !== 'undefined') {
  try {
    // Only initialize on client side
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Connect to emulators in development if environment variables are set
    if (process.env.NODE_ENV === 'development') {
      // Only connect to emulators once - check for existing emulator connections
      try {
        const delegate: unknown = (auth as unknown as { _delegate?: { config?: { emulator?: unknown } } })._delegate;
        const isEmulatorConnected = Boolean((delegate as { config?: { emulator?: unknown } })?.config?.emulator);
        if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL && !isEmulatorConnected) {
          connectAuthEmulator(auth, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL);
        }
      } catch (error) {
        // Emulator already connected or not available
        console.debug('Auth emulator connection skipped:', error);
      }

      try {
        const host = (db as unknown as { _delegate?: { _settings?: { host?: string } } })._delegate?._settings?.host;
        if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST && !(host || '').includes('localhost')) {
          const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST.split(':');
          connectFirestoreEmulator(db, host, parseInt(port));
        }
      } catch (error) {
        // Emulator already connected or not available
        console.debug('Firestore emulator connection skipped:', error);
      }

      try {
        const storageHost = (storage as unknown as { _delegate?: { _host?: string } })._delegate?._host;
        if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST && !(storageHost || '').includes('localhost')) {
          const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST.split(':');
          connectStorageEmulator(storage, host, parseInt(port));
        }
      } catch (error) {
        // Emulator already connected or not available
        console.debug('Storage emulator connection skipped:', error);
      }
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { app, auth, db, storage };
export default app;
