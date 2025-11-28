'use server';

import { z } from 'zod';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin for server-side operations
if (!getApps().length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const adminDb = getApps().length > 0 ? getAdminFirestore() : null;
const adminAuth = getApps().length > 0 ? getAdminAuth() : null;

const UpdateProfileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
});

export async function updateProfile(input: {
  displayName: string;
  bio?: string;
  phone?: string;
  profileImage?: File | null;
  userId: string;
}) {
  try {
    const validatedInput = UpdateProfileSchema.parse(input);
    
    if (!input.userId) {
      return { success: false, error: 'User ID is required' };
    }

    let profileImageUrl = '';

    // Upload profile image if provided
    if (input.profileImage) {
      try {
        const imageRef = ref(storage, `profile-images/${input.userId}/${Date.now()}-${input.profileImage.name}`);
        const uploadResult = await uploadBytes(imageRef, input.profileImage);
        profileImageUrl = await getDownloadURL(uploadResult.ref);
      } catch (error) {
        console.error('Error uploading profile image:', error);
        return { success: false, error: 'Failed to upload profile image' };
      }
    }

    // Update Firebase Auth profile using Admin SDK
    if (adminAuth && (validatedInput.displayName || profileImageUrl)) {
      try {
        const authUpdate: any = {};
        if (validatedInput.displayName) authUpdate.displayName = validatedInput.displayName;
        if (profileImageUrl) authUpdate.photoURL = profileImageUrl;
        
        await adminAuth.updateUser(input.userId, authUpdate);
      } catch (error) {
        console.error('Error updating Firebase Auth profile:', error);
      }
    }

    // Update Firestore user document
    const updateData: any = {
      ...(validatedInput.displayName && { displayName: validatedInput.displayName }),
      ...(validatedInput.bio !== undefined && { bio: validatedInput.bio }),
      ...(validatedInput.phone !== undefined && { phone: validatedInput.phone }),
      ...(profileImageUrl && { profileImageUrl }),
      updatedAt: Timestamp.now(),
    };

    if (db) {
      const userRef = doc(db, 'users', input.userId);
      await updateDoc(userRef, updateData);
    } else if (adminDb) {
      await adminDb.collection('users').doc(input.userId).update(updateData);
    } else {
      return { success: false, error: 'Database not available' };
    }

    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

export async function updatePassword(newPassword: string, userId: string) {
  try {
    if (newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    // Update password in Firebase Auth using Admin SDK
    if (adminAuth) {
      await adminAuth.updateUser(userId, {
        password: newPassword,
      });
    } else {
      return { success: false, error: 'Admin authentication not available' };
    }

    // Update lastPasswordChange in Firestore
    const updateData = {
      lastPasswordChange: Timestamp.now(),
    };

    if (db) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updateData);
    } else if (adminDb) {
      await adminDb.collection('users').doc(userId).update(updateData);
    }

    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Error updating password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password',
    };
  }
}

export async function deleteAccount(userId: string) {
  try {
    // This should only be called by admins or the user themselves
    if (!adminAuth || !adminDb) {
      return { success: false, error: 'Admin access not available' };
    }

    // Delete user from Firebase Auth
    await adminAuth.deleteUser(userId);

    // Mark user as deleted in Firestore (soft delete)
    await adminDb.collection('users').doc(userId).update({
      isActive: false,
      deletedAt: Timestamp.now(),
    });

    return { success: true, message: 'Account deleted successfully' };
  } catch (error) {
    console.error('Error deleting account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account',
    };
  }
}