import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

const SCOPE_COLLECTIONS: Record<string, string> = {
  'Test Data': 'test_data',
  'Orphaned Records': 'orphaned',
  'Invoices': 'invoices',
  'Timesheets': 'timesheets',
  'Logs': 'logs',
};

export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
  try {
    const body = await req.json();
    const scope: string = body?.scope;
    const dateBefore: string | undefined = body?.dateBefore;

    if (!adminDb) return NextResponse.json({ success: false, message: 'Firestore not initialized' }, { status: 500 });
    const colName = SCOPE_COLLECTIONS[scope];
    if (!colName) return NextResponse.json({ success: false, message: 'Invalid scope' }, { status: 400 });

    let query: FirebaseFirestore.Query = adminDb.collection(colName);

    if (dateBefore) {
      const beforeDate = new Date(dateBefore);
      if (!isNaN(beforeDate.getTime())) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(beforeDate));
      }
    }

    let total = 0;
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined = undefined;
    const pageSize = 500;

    while (true) {
      let paged = query.orderBy('__name__').limit(pageSize);
      if (cursor) paged = paged.startAfter(cursor);
      const snap = await paged.get();
      total += snap.size;
      if (snap.empty || snap.size < pageSize) break;
      cursor = snap.docs[snap.docs.length - 1];
    }

    return NextResponse.json({ success: true, count: total });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Error computing deletion preview' }, { status: 500 });
  }
  }, { requiredRole: 'Admin' }); // Only Admin can preview deletions

  // Rate limit: 10 previews per minute
  return withRateLimit(handler, { maxRequests: 10, windowMs: 60 * 1000 })(request);
}
