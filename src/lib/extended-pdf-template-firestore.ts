/**
 * Firestore operations for Extended PDF Templates
 *
 * Extends the existing pdf_templates collection with Syncfusion form fields
 * and enhanced field mapping capabilities
 */

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { ExtendedPdfTemplate } from '@/types';

const COLLECTION_NAME = 'pdfTemplates';

/**
 * Save an extended PDF template to Firestore
 */
export async function saveExtendedPdfTemplate(
  template: ExtendedPdfTemplate,
  userId: string,
  userName: string
): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const now = Timestamp.now();

  const templateData: any = {
    templateName: template.templateName,
    templateType: template.templateType,
    base64Data: template.base64Data,
    fieldMappings: template.fieldMappings || [],
    isActive: true,
    updatedAt: now,

    // Extended fields (new)
    syncfusionFormFields: template.syncfusionFormFields || [],
    tableMappings: template.tableMappings || [],
    dataSourceConfig: template.dataSourceConfig || {
      primaryCollection: 'invoices',
    },
    pageCount: template.pageCount || 0,
    version: template.version || 1,
  };

  let templateId: string;

  if (template.id) {
    // Update existing template
    await adminDb
      .collection(COLLECTION_NAME)
      .doc(template.id)
      .update(templateData);
    templateId = template.id;
  } else {
    // Create new template
    templateData.createdAt = now;
    templateData.createdBy = userId;
    templateData.createdByName = userName;

    const docRef = await adminDb.collection(COLLECTION_NAME).add(templateData);
    templateId = docRef.id;

    // Update document with its own ID
    await adminDb.collection(COLLECTION_NAME).doc(templateId).update({ id: templateId });
  }

  return templateId;
}

/**
 * Get an extended PDF template by ID
 */
export async function getExtendedPdfTemplate(
  templateId: string
): Promise<ExtendedPdfTemplate | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const doc = await adminDb.collection(COLLECTION_NAME).doc(templateId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();

  return {
    id: doc.id,
    ...data,
  } as ExtendedPdfTemplate;
}

/**
 * Get all extended PDF templates
 */
export async function getAllExtendedPdfTemplates(): Promise<ExtendedPdfTemplate[]> {
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
  })) as ExtendedPdfTemplate[];
}

/**
 * Get templates by type
 */
export async function getExtendedPdfTemplatesByType(
  templateType: string
): Promise<ExtendedPdfTemplate[]> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .where('templateType', '==', templateType)
    .orderBy('updatedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ExtendedPdfTemplate[];
}

/**
 * Get templates by data source collection
 */
export async function getExtendedPdfTemplatesByDataSource(
  collection: string
): Promise<ExtendedPdfTemplate[]> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .where('dataSourceConfig.primaryCollection', '==', collection)
    .orderBy('updatedAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ExtendedPdfTemplate[];
}

/**
 * Delete an extended PDF template (soft delete)
 */
export async function deleteExtendedPdfTemplate(templateId: string): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  await adminDb.collection(COLLECTION_NAME).doc(templateId).update({
    isActive: false,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Duplicate an extended PDF template
 */
export async function duplicateExtendedPdfTemplate(
  templateId: string,
  userId: string,
  userName: string
): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const original = await getExtendedPdfTemplate(templateId);
  if (!original) {
    throw new Error('Template not found');
  }

  const now = Timestamp.now();

  const duplicate: any = {
    templateName: `${original.templateName} (Copy)`,
    templateType: original.templateType,
    base64Data: original.base64Data,
    fieldMappings: original.fieldMappings,
    syncfusionFormFields: original.syncfusionFormFields,
    tableMappings: original.tableMappings,
    dataSourceConfig: original.dataSourceConfig,
    pageCount: original.pageCount,
    version: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    createdByName: userName,
  };

  const docRef = await adminDb.collection(COLLECTION_NAME).add(duplicate);
  const newTemplateId = docRef.id;

  await adminDb.collection(COLLECTION_NAME).doc(newTemplateId).update({ id: newTemplateId });

  return newTemplateId;
}

/**
 * Get template count by type
 */
export async function getTemplateCountByType(): Promise<Record<string, number>> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .get();

  const counts: Record<string, number> = {
    Invoice: 0,
    CoverPage: 0,
    Report: 0,
    Custom: 0,
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const type = data.templateType as string;
    if (type in counts) {
      counts[type]++;
    }
  });

  return counts;
}

/**
 * Search templates by name
 */
export async function searchExtendedPdfTemplates(
  query: string
): Promise<ExtendedPdfTemplate[]> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .orderBy('templateName')
    .get();

  // Client-side filtering for substring match
  const lowerQuery = query.toLowerCase();

  return snapshot.docs
    .filter(doc => {
      const data = doc.data();
      return data.templateName?.toLowerCase().includes(lowerQuery);
    })
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ExtendedPdfTemplate[];
}

/**
 * Update template version
 */
export async function incrementTemplateVersion(templateId: string): Promise<number> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const doc = await adminDb.collection(COLLECTION_NAME).doc(templateId).get();

  if (!doc.exists) {
    throw new Error('Template not found');
  }

  const currentVersion = (doc.data()?.version as number) || 1;
  const newVersion = currentVersion + 1;

  await adminDb.collection(COLLECTION_NAME).doc(templateId).update({
    version: newVersion,
    updatedAt: Timestamp.now(),
  });

  return newVersion;
}
