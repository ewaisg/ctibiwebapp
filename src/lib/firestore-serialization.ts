import { Timestamp, DocumentReference } from 'firebase/firestore';

/**
 * Serializes Firestore data for client components by converting:
 * - Timestamp objects to ISO strings
 * - DocumentReference objects to their string IDs
 * - Removes any non-serializable properties
 */
export function serializeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item)) as T;
  }

  if (typeof data === 'object') {
    // Handle Timestamp objects
    if (data instanceof Timestamp || (data as any)._seconds !== undefined) {
      const timestamp = data as any;
      return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000).toISOString() as T;
    }

    // Handle DocumentReference objects
    if ((data as any).id && (data as any).path) {
      return (data as any).id as T;
    }

    // Handle regular objects
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeFirestoreData(value);
    }
    return serialized as T;
  }

  return data;
}

/**
 * Serializes an array of Firestore documents
 */
export function serializeFirestoreArray<T>(documents: T[]): T[] {
  return documents.map(doc => serializeFirestoreData(doc));
}