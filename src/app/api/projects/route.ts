import { NextRequest, NextResponse} from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      const snapshot = await adminDb.collection('projects').orderBy('projectName', 'asc').get();
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return NextResponse.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
  });

  return withRateLimit(handler)(request);
}