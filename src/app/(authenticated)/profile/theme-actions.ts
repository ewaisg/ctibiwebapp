'use server';

// Use Firebase Admin SDK for server-side writes to bypass client security rules
import { adminDb } from '@/lib/firebase-admin';

export async function updateTheme(userId: string, theme: 'light' | 'dark' | 'system') {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return { success: false, error: 'Server is not configured for updates' };
    }

    await adminDb.collection('users').doc(userId).update({ theme });

    return { success: true, message: 'Theme updated successfully' };
  } catch (error) {
    console.error('Error updating theme:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update theme',
    };
  }
}