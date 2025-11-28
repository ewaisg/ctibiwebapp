import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      const snapshot = await adminDb.collection('contracts').orderBy('contractNumber', 'asc').get();
      const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return NextResponse.json(contracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
    }
  });

  return withRateLimit(handler)(request);
}