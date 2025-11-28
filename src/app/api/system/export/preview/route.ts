import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

// Map UI scopes to Firestore collection names
const SCOPE_COLLECTIONS: Record<string, string> = {
  Users: 'users',
  Companies: 'companies',
  Employees: 'employees',
  Projects: 'projects',
  Contracts: 'contracts',
  Divisions: 'divisions',
  Departments: 'departments',
  Invoices: 'invoices',
  Timesheets: 'timesheets',
  Templates: 'invoice_templates',
};

export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
  try {
    const body = await req.json();
    const selectedScopes: string[] = body?.selectedScopes || [];
    const dateFrom: string | undefined = body?.dateFrom;
    const dateTo: string | undefined = body?.dateTo;

    if (!adminDb) return NextResponse.json({ success: false, message: 'Firestore not initialized' }, { status: 500 });
    if (!Array.isArray(selectedScopes) || selectedScopes.length === 0) {
      return NextResponse.json({ success: false, message: 'No scopes provided' }, { status: 400 });
    }

    const counts: Record<string, number> = {};

    for (const scope of selectedScopes) {
      const colName = SCOPE_COLLECTIONS[scope];
      if (!colName) {
        counts[scope] = 0;
        continue;
      }

      let query: FirebaseFirestore.Query = adminDb.collection(colName);

      // Apply simple date filters if collection has typical timestamp fields
      const hasTimestampField = ['users', 'companies', 'projects', 'contracts', 'invoices'].includes(colName);
      if (hasTimestampField) {
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (!isNaN(fromDate.getTime())) {
            query = query.where('createdAt', '>=', Timestamp.fromDate(fromDate));
          }
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          if (!isNaN(toDate.getTime())) {
            query = query.where('createdAt', '<=', Timestamp.fromDate(toDate));
          }
        }
      }

      // Conservative count approach: page and sum, avoid loading entire collections
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

      counts[scope] = total;
    }

    return NextResponse.json({ success: true, counts });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Error computing counts' }, { status: 500 });
  }
  }, { requiredRole: 'Admin' }); // Only Admin can preview exports

  // Rate limit: 10 previews per minute
  return withRateLimit(handler, { maxRequests: 10, windowMs: 60 * 1000 })(request);
}
