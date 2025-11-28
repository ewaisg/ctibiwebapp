import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

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

function serialize(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    // Firebase Admin Timestamp
    if (value instanceof Timestamp) return value.toDate().toISOString();
    // Firestore DocumentReference (admin sdk has 'path' and 'id')
    if (typeof (value as any).id === 'string' && typeof (value as any).path === 'string' && typeof (value as any).parent === 'object') {
      return (value as any).id;
    }
    if (Array.isArray(value)) return value.map(serialize);
    const out: any = {};
    for (const k of Object.keys(value)) out[k] = serialize(value[k]);
    return out;
  }
  return value;
}

export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      if (!adminDb) return NextResponse.json({ success: false, message: 'Firestore not initialized' }, { status: 500 });

      const body = await req.json();
    const selectedScopes: string[] = body?.selectedScopes || [];
    const format: 'jsonl' | 'csv' = body?.format || 'jsonl';
    const dateFrom: string | undefined = body?.dateFrom;
    const dateTo: string | undefined = body?.dateTo;
    // const denormalize: boolean = !!body?.denormalize; // reserved for future

    if (!Array.isArray(selectedScopes) || selectedScopes.length === 0) {
      return NextResponse.json({ success: false, message: 'No scopes provided' }, { status: 400 });
    }

    if (format !== 'jsonl') {
      return NextResponse.json({ success: false, message: 'Only jsonl format is supported at this time' }, { status: 400 });
    }

    const fileName = `export-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;

    // Narrow adminDb to a local non-null reference for use inside the stream
    const db = adminDb as FirebaseFirestore.Firestore;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for (const scope of selectedScopes) {
            const colName = SCOPE_COLLECTIONS[scope];
            if (!colName) continue;

            let query: FirebaseFirestore.Query = db.collection(colName);
            const hasTimestampField = ['users', 'companies', 'projects', 'contracts', 'invoices', 'timesheets'].includes(colName);
            if (hasTimestampField) {
              if (dateFrom) {
                const fromDate = new Date(dateFrom);
                if (!isNaN(fromDate.getTime())) query = query.where('createdAt', '>=', Timestamp.fromDate(fromDate));
              }
              if (dateTo) {
                const toDate = new Date(dateTo);
                if (!isNaN(toDate.getTime())) query = query.where('createdAt', '<=', Timestamp.fromDate(toDate));
              }
            }

            let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined = undefined;
            const pageSize = 500;
            while (true) {
              let paged = query.orderBy('__name__').limit(pageSize);
              if (cursor) paged = paged.startAfter(cursor);
              const snap = await paged.get();
              if (snap.empty) break;
              for (const doc of snap.docs) {
                const data = doc.data();
                const line = JSON.stringify({ scope, collection: colName, id: doc.id, data: serialize(data) }) + '\n';
                controller.enqueue(encoder.encode(line));
              }
              if (snap.size < pageSize) break;
              cursor = snap.docs[snap.docs.length - 1];
            }
          }
        } catch (err) {
          const msg = (err instanceof Error ? err.message : 'Export error') + '\n';
          controller.enqueue(encoder.encode(`{"error":"${msg.replace(/"/g, '\\"')}"}\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      }
    });
    } catch (error) {
      return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Failed to export' }, { status: 500 });
    }
  }, { requiredRole: 'Admin' }); // Only Admin can export data

  // Restrictive rate limit: 5 exports per hour
  return withRateLimit(handler, { maxRequests: 5, windowMs: 60 * 60 * 1000 })(request);
}
