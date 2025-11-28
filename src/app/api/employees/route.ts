import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      const snapshot = await adminDb.collection('employees').orderBy('formalName', 'asc').get();
      const employees = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { id: doc.id, formalName: d.formalName, employeeId: d.employeeId };
      });

      return NextResponse.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }
  });

  return withRateLimit(handler)(request);
}
