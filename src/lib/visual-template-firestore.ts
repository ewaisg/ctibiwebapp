/**
 * Firestore helpers for Visual Template management
 */

import { adminDb } from '@/lib/firebase-admin';
import type { VisualTemplate } from '@/types/template-designer';

const COLLECTION_NAME = 'visual_templates';

/**
 * Save a visual template to Firestore
 */
export async function saveVisualTemplate(template: VisualTemplate, userId: string): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const templateData = {
    ...template,
    createdBy: userId,
    updatedAt: new Date().toISOString(),
    isActive: true, // Ensure isActive is always set
  };

  let templateId: string;

  if (template.id) {
    // Update existing template
    await adminDb
      .collection(COLLECTION_NAME)
      .doc(template.id)
      .set(templateData, { merge: true });
    templateId = template.id;
  } else {
    // Create new template
    const docRef = await adminDb.collection(COLLECTION_NAME).add(templateData);
    await adminDb.collection(COLLECTION_NAME).doc(docRef.id).update({ id: docRef.id });
    templateId = docRef.id;
  }

  return templateId;
}

/**
 * Get a visual template by ID
 */
export async function getVisualTemplate(templateId: string): Promise<VisualTemplate | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const doc = await adminDb.collection(COLLECTION_NAME).doc(templateId).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() } as VisualTemplate;
}

/**
 * Get all visual templates
 */
export async function getAllVisualTemplates(): Promise<VisualTemplate[]> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .orderBy('updatedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as VisualTemplate[];
}

/**
 * Get visual templates by type
 */
export async function getVisualTemplatesByType(type: string): Promise<VisualTemplate[]> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('type', '==', type)
    .where('isActive', '==', true)
    .orderBy('updatedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as VisualTemplate[];
}

/**
 * Delete a visual template
 */
export async function deleteVisualTemplate(templateId: string): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Soft delete by setting isActive to false
  await adminDb
    .collection(COLLECTION_NAME)
    .doc(templateId)
    .update({
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
}

/**
 * Duplicate a visual template
 */
export async function duplicateVisualTemplate(
  templateId: string,
  userId: string
): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const original = await getVisualTemplate(templateId);
  if (!original) {
    throw new Error('Template not found');
  }

  const duplicate: VisualTemplate = {
    ...original,
    id: '', // Will be set by Firestore
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
  };

  const docRef = await adminDb.collection(COLLECTION_NAME).add(duplicate);
  await adminDb.collection(COLLECTION_NAME).doc(docRef.id).update({ id: docRef.id });

  return docRef.id;
}
