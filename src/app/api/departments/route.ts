import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      const snapshot = await adminDb.collection('departments').orderBy('departmentName', 'asc').get();
      const departments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return NextResponse.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
    }
  });

  return withRateLimit(handler)(request);
}