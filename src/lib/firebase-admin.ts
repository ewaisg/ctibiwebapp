import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminDb: Firestore | null;
let adminApp: any = null;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    // Initialize Firebase Admin using environment variables when available
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
        projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else {
      // Fallback: allow application default credentials or emulators; prevents build failure
      adminApp = initializeApp();
    }
  } else {
    adminApp = getApp();
  }

  adminDb = getFirestore(adminApp);
} catch (error) {
  console.error('Firebase Admin initialization error (non-fatal):', error);
  adminDb = null;
}

// Helper function to get storage instance (lazy error if not configured)
export const getAdminStorage = () => {
  if (!adminApp) {
    throw new Error('Firebase Admin app not initialized');
  }
  return getStorage(adminApp);
};

export { adminDb, adminApp };
