import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/firestore/structure?collection=collectionName
 * Get the structure of a Firestore collection with sample data
 */
export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const collectionName = searchParams.get('collection');

      if (!collectionName) {
        return NextResponse.json(
          { error: 'Collection name is required' },
          { status: 400 }
        );
      }

      if (!adminDb) {
        return NextResponse.json(
          { error: 'Database not initialized' },
          { status: 500 }
        );
      }

      // Get a sample document from the collection
      const snapshot = await adminDb
        .collection(collectionName)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return NextResponse.json({
          name: collectionName,
          fields: [],
          sampleData: null,
        });
      }

      const sampleDoc = snapshot.docs[0].data();
      const fields = extractFieldStructure(sampleDoc);

      return NextResponse.json({
        name: collectionName,
        fields,
        sampleData: sampleDoc,
      });
    } catch (error) {
      console.error('Error fetching collection structure:', error);
      return NextResponse.json(
        { error: 'Failed to fetch collection structure' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}

/**
 * Extract field structure from a document
 */
function extractFieldStructure(obj: any, maxDepth = 3, currentDepth = 0): any[] {
  if (currentDepth >= maxDepth) return [];

  const fields: any[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const field: any = {
      name: key,
      type: getFieldType(value),
      value: getDisplayValue(value),
    };

    // Skip Timestamp objects - don't show children for them
    const isTimestamp = value && typeof value === 'object' && ('_seconds' in value || 'seconds' in value);

    // Handle nested objects (but not Timestamps)
    if (value && typeof value === 'object' && !Array.isArray(value) && !isTimestamp) {
      const children = extractFieldStructure(value, maxDepth, currentDepth + 1);
      if (children.length > 0) {
        field.children = children;
      }
    }

    // Handle arrays
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
      if (firstItem && typeof firstItem === 'object') {
        const children = extractFieldStructure(firstItem, maxDepth, currentDepth + 1);
        if (children.length > 0) {
          field.children = children;
          field.type = 'array<object>';
        }
      }
    }

    fields.push(field);
  }

  return fields.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get the type of a field value
 */
function getFieldType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array';
    const firstType = typeof value[0];
    return `array<${firstType}>`;
  }
  if (value instanceof Date) return 'date';
  // Check for Firestore Timestamp objects
  if (typeof value === 'object' && ('_seconds' in value || 'seconds' in value)) {
    return 'timestamp';
  }
  if (typeof value === 'object') return 'object';
  return typeof value;
}

/**
 * Get a display-friendly value for preview
 */
function getDisplayValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length > 3) return `[${value.length} items]`;
    return value.slice(0, 3);
  }
  if (value instanceof Date) return value.toISOString().split('T')[0];
  // Handle Firestore Timestamp objects
  if (typeof value === 'object' && ('_seconds' in value || 'seconds' in value)) {
    const seconds = value._seconds || value.seconds;
    const date = new Date(seconds * 1000);
    return date.toISOString().split('T')[0];
  }
  if (typeof value === 'object') return '[Object]';
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...';
  }
  return value;
}
