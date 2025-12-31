import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeForLog } from '@/lib/security-utils';
import type { UserRole, Invoice } from '@/types';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

// Initialize Firebase Admin for server-side operations
if (!getApps().length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (projectId && clientEmail && privateKeyRaw) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
        storageBucket,
      });
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', sanitizeForLog(error));
  }
}

// Use admin SDK for server-side operations
export const adminDb = getApps().length > 0 ? getAdminFirestore() : null;
export const AdminTs = AdminTimestamp;

const clientPermissionWarnings = new Set<string>();

// Helper function to get data from either client or admin SDK
interface CollectionFetchOptions {
  context?: string;
}

export async function getCollectionData(collectionName: string, options: CollectionFetchOptions = {}) {
  const { context } = options;
  // Use client SDK only in browser; server should prefer Admin SDK
  if (typeof window !== 'undefined' && db) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      const errorCode = (error as { code?: string })?.code;
      const key = `${collectionName}:${context ?? ''}`;
      if (errorCode === 'permission-denied') {
        if (!clientPermissionWarnings.has(key)) {
          clientPermissionWarnings.add(key);
          const location = context ? ` in ${context}` : '';
          console.warn(`Client SDK permission denied for collection "${collectionName}"${location}. Falling back to Admin SDK.`);
        }
      } else {
        console.error('Error fetching collection with client SDK:', sanitizeForLog(error));
      }
    }
  }

  // Fallback to admin SDK (primary path on server)
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection(collectionName).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching collection with admin SDK:', sanitizeForLog(error));
    }
  }

  console.error('Database not initialized for collection');
  return [];
}

// Firestore serialization helpers
function isDocumentReferenceLike(value: unknown): value is { id: string; path?: string } {
  return !!value && typeof value === 'object' && typeof (value as any).id === 'string';
}

function isTimestampLike(value: unknown): value is { seconds: number; nanoseconds: number } {
  return !!value && typeof value === 'object' && typeof (value as any).seconds === 'number' && typeof (value as any).nanoseconds === 'number';
}

export function serializeFirestoreValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeFirestoreValue(item));
  }

  if (typeof value === 'object') {
    if (isDocumentReferenceLike(value)) {
      const path = typeof (value as any).path === 'string' ? (value as any).path : undefined;
      return { id: (value as any).id, path };
    }

    if (typeof (value as any).toDate === 'function') {
      try {
        const date = (value as any).toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // ignore conversion errors and fall through to generic object handling
      }
    }

    if (isTimestampLike(value)) {
      return { seconds: (value as any).seconds, nanoseconds: (value as any).nanoseconds };
    }

    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, serializeFirestoreValue(val)]));
  }

  return value;
}

export function snapshotToInvoice(snapshot: DocumentSnapshot): Invoice | null {
  const data = snapshot.data();
  if (!data) {
    return null;
  }
  const normalized = serializeFirestoreValue(data) as Record<string, unknown>;
  return { ...normalized, id: snapshot.id } as Invoice;
}

// User role and name lookup
export async function getUserRoleAndName(uid: string): Promise<{ role: UserRole | null; displayName: string | null }> {
  if (!adminDb) return { role: null, displayName: null };
  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    if (!snap.exists) return { role: null, displayName: null };
    const d = snap.data() as any;
    return { role: (d?.role as UserRole) || null, displayName: (d?.displayName as string) || null };
  } catch {
    return { role: null, displayName: null };
  }
}

// Permission assertion
export function assertAllowed(role: UserRole | null | undefined, allowed: UserRole[]): void {
  if (!role || !allowed.includes(role)) {
    throw new Error('Insufficient permissions');
  }
}

// Calculate invoice hours
export function sumInvoiceHours(inv: Invoice): number {
  try {
    return (inv.invoiceItems || []).reduce((s: number, it: any) => s + (Number(it.hours) || 0), 0);
  } catch { return 0; }
}

// Timestamp helper
export function nowTs() { return AdminTs.now(); }

// Revalidate invoice views
export async function revalidateInvoiceViews(invoiceId: string) {
  try {
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
  } catch {}
}
