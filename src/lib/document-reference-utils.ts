import { DocumentReference, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

/**
 * Flexible type that can be either a DocumentReference or a string ID
 */
export type FlexibleReference = DocumentReference | string;

/**
 * Extracts string ID from either DocumentReference or string
 * @param reference - DocumentReference or string ID
 * @returns string ID
 */
export function extractId(reference: FlexibleReference | undefined | null): string | undefined {
  if (!reference) return undefined;
  
  if (typeof reference === 'string') {
    return reference;
  }
  
  // Check if it's a DocumentReference
  if (typeof reference === 'object' && 'id' in reference && reference.id) {
    return reference.id;
  }
  
  return undefined;
}

/**
 * Extracts string IDs from an array of references
 * @param references - Array of DocumentReference or string IDs
 * @returns Array of string IDs (filtered for non-null values)
 */
export function extractIds(references: (FlexibleReference | undefined | null)[]): string[] {
  return references
    .map(extractId)
    .filter((id): id is string => id !== undefined);
}

/**
 * Safely compares two references (DocumentReference or string)
 * @param ref1 - First reference
 * @param ref2 - Second reference
 * @returns true if they refer to the same document
 */
export function referencesEqual(
  ref1: FlexibleReference | undefined | null,
  ref2: FlexibleReference | undefined | null
): boolean {
  const id1 = extractId(ref1);
  const id2 = extractId(ref2);
  return id1 === id2 && id1 !== undefined;
}

/**
 * Creates a DocumentReference from a string ID and collection name
 * @param collectionName - Name of the Firestore collection
 * @param id - String ID of the document
 * @returns DocumentReference
 */
export function createDocumentReference(collectionName: string, id: string): DocumentReference {
  if (!db) {
    throw new Error('Firestore database not initialized');
  }
  return doc(db, collectionName, id);
}

/**
 * Converts string ID to DocumentReference if needed
 * @param reference - DocumentReference or string ID
 * @param collectionName - Collection name (required if reference is string)
 * @returns DocumentReference
 */
export function ensureDocumentReference(
  reference: FlexibleReference,
  collectionName: string
): DocumentReference {
  if (typeof reference === 'string') {
    return createDocumentReference(collectionName, reference);
  }
  return reference;
}

/**
 * Finds an item in an array by matching its reference field
 * @param items - Array of items to search
 * @param referenceField - Function to extract reference from item
 * @param targetReference - Reference to match
 * @returns Found item or undefined
 */
export function findByReference<T>(
  items: T[],
  referenceField: (item: T) => FlexibleReference | undefined | null,
  targetReference: FlexibleReference | undefined | null
): T | undefined {
  const targetId = extractId(targetReference);
  if (!targetId) return undefined;
  
  return items.find(item => {
    const itemId = extractId(referenceField(item));
    return itemId === targetId;
  });
}

/**
 * Filters an array by matching reference field
 * @param items - Array of items to filter
 * @param referenceField - Function to extract reference from item
 * @param targetReference - Reference to match
 * @returns Filtered array
 */
export function filterByReference<T>(
  items: T[],
  referenceField: (item: T) => FlexibleReference | undefined | null,
  targetReference: FlexibleReference | undefined | null
): T[] {
  const targetId = extractId(targetReference);
  if (!targetId) return [];
  
  return items.filter(item => {
    const itemId = extractId(referenceField(item));
    return itemId === targetId;
  });
}

/**
 * Type guard to check if a value is a DocumentReference
 * @param value - Value to check
 * @returns true if value is DocumentReference
 */
export function isDocumentReference(value: unknown): value is DocumentReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'path' in value &&
    typeof (value as any).id === 'string'
  );
}

/**
 * Batch extract IDs from object with multiple reference fields
 * @param obj - Object containing reference fields
 * @param fields - Array of field names that contain references
 * @returns Object with same fields but string IDs
 */
export function extractObjectIds<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Record<keyof T, string | undefined> {
  const result: Record<keyof T, string | undefined> = {} as any;
  
  fields.forEach(field => {
    result[field] = extractId(obj[field]);
  });
  
  return result;
}

/**
 * Helper for form data conversion - converts DocumentReference fields to strings
 * @param data - Object with potential DocumentReference fields
 * @param referenceFields - Array of field names that should be converted
 * @returns Object with string IDs instead of DocumentReferences
 */
export function convertReferencesToIds<T extends Record<string, any>>(
  data: T,
  referenceFields: (keyof T)[]
): T {
  const converted = { ...data };
  
  referenceFields.forEach(field => {
    const value = converted[field];
    if (value !== undefined && value !== null) {
      const id = extractId(value);
      converted[field] = id as T[keyof T];
    }
  });
  
  return converted;
}

/**
 * Helper for Firestore data preparation - converts string IDs to DocumentReferences
 * @param data - Object with string ID fields
 * @param referenceFieldsConfig - Object mapping field names to collection names
 * @returns Object with DocumentReferences instead of string IDs
 */
export function convertIdsToReferences<T extends Record<string, any>>(
  data: T,
  referenceFieldsConfig: Record<keyof T, string>
): T {
  const converted = { ...data };
  
  Object.entries(referenceFieldsConfig).forEach(([field, collectionName]) => {
    const value = converted[field as keyof T];
    if (typeof value === 'string') {
      converted[field as keyof T] = createDocumentReference(collectionName, value) as T[keyof T];
    }
  });
  
  return converted;
}
