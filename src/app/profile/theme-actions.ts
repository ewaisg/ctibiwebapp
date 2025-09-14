'use server';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function updateTheme(userId: string, theme: 'light' | 'dark' | 'system') {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { theme });

    return { success: true, message: 'Theme updated successfully' };
  } catch (error) {
    console.error('Error updating theme:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update theme',
    };
  }
}