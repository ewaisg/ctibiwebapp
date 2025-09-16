import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Simple Firestore-backed notifications stub. Replace with email/Slack if needed.
// Collection: notifications { id, type, targets, title, message, createdAt }

export async function notifyAdminsPrimes(type: string, payload: Record<string, any>) {
  try {
    if (!getApps().length) return;
    const db = getFirestore();
    await db.collection('notifications').add({
      type,
      targets: ['Admin', 'Prime'],
      payload,
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn('notifyAdminsPrimes failed', e);
  }
}

export async function notifyAuthor(userId: string, type: string, payload: Record<string, any>) {
  try {
    if (!getApps().length) return;
    const db = getFirestore();
    await db.collection('notifications').add({
      type,
      targets: [{ userId }],
      payload,
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn('notifyAuthor failed', e);
  }
}
