import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

interface RunPayload {
  scope: string;
  dateBefore?: string; // ISO date
  includeChildren?: boolean;
  archiveBeforeDelete?: boolean;
}

export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      if (!adminDb) throw new Error('Firestore is not initialized');

    const body = (await req.json()) as RunPayload;
    const { scope, dateBefore, includeChildren, archiveBeforeDelete } = body || {};

    if (!scope) return NextResponse.json({ success: false, error: 'Missing scope' }, { status: 400 });

    // Build base query by scope
    const collections: string[] = [];
    switch (scope) {
      case 'Timesheets':
        collections.push('timesheets');
        break;
      case 'Invoices':
        collections.push('invoices');
        break;
      case 'Logs':
        collections.push('logs');
        break;
      case 'Orphaned Records':
        // Placeholder: orphan logic would gather IDs that have missing parents
        collections.push('orphans');
        break;
      case 'Test Data':
        // Example: a tag in docs or a dedicated collection
        collections.push('test_data');
        break;
      default:
        return NextResponse.json({ success: false, error: 'Unknown scope' }, { status: 400 });
    }

    const cutoffTs = dateBefore ? Timestamp.fromDate(new Date(dateBefore)) : null;

    // Optional: archive before delete (no-op placeholder)
    let archivedCount = 0;
    if (archiveBeforeDelete) {
      // For now, we only count; streaming to Storage can be added later
    }

    let deletedCount = 0;

    for (const col of collections) {
      let q = adminDb.collection(col) as FirebaseFirestore.Query;
      if (cutoffTs) {
        q = q.where('createdAt', '<', cutoffTs);
      }

      // Page through documents to delete in batches
      const pageSize = 250; // conservative to avoid timeouts
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      while (true) {
        let pageQ = q.limit(pageSize);
        if (lastDoc) pageQ = pageQ.startAfter(lastDoc);

        const snap = await pageQ.get();
        if (snap.empty) break;

        const batch = adminDb.batch();
        for (const doc of snap.docs) {
          batch.delete(doc.ref);
        }
        await batch.commit();
        deletedCount += snap.size;

        lastDoc = snap.docs[snap.docs.length - 1];

        // Optional: handle includeChildren cascades per doc (placeholder)
        if (includeChildren) {
          // TODO: implement cascades based on schema relationships
        }

        // If page smaller than pageSize, no more
        if (snap.size < pageSize) break;
      }
    }

      // Basic audit log with user info
      try {
        await adminDb.collection('admin_audit').add({
          action: 'deletion_run',
          scope,
          includeChildren: !!includeChildren,
          archiveBeforeDelete: !!archiveBeforeDelete,
          deletedCount,
          archivedCount,
          performedBy: req.user?.uid,
          performedByEmail: req.user?.email,
          createdAt: Timestamp.now(),
        });
      } catch (e) {
        // swallow audit errors
      }

      return NextResponse.json({ success: true, deletedCount, archivedCount });
    } catch (err: any) {
      console.error('Deletion run error', err);
      return NextResponse.json({ success: false, error: err?.message || 'Unknown error' }, { status: 500 });
    }
  }, { requiredRole: 'Admin' }); // CRITICAL: Only Admin can delete data

  // Very restrictive rate limit: 2 deletions per hour
  return withRateLimit(handler, { maxRequests: 2, windowMs: 60 * 60 * 1000 })(request);
}
