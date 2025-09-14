import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { generateCoverPage } from '@/lib/coverpage-generator';
import { sanitizeForLog } from '@/lib/security-utils';

// POST /api/coverpage
// Body: { departmentId: string; fromDate: string (ISO); toDate: string (ISO); projectId?: string; contractId?: string }
export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const body = await request.json();
      const { departmentId, fromDate, toDate, projectId, contractId, manualData } = body || {};

      if (!departmentId || !fromDate || !toDate) {
        return NextResponse.json({ error: 'departmentId, fromDate, and toDate are required' }, { status: 400 });
      }

      const buffer = await generateCoverPage({ departmentId, fromDate, toDate, projectId, contractId, manualData });

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="coverpage.pdf"',
        },
      });
    } catch (error) {
      console.error('Coverpage generation error:', sanitizeForLog(error));
      return NextResponse.json({ error: 'Failed to generate cover page' }, { status: 500 });
    }
  }, { requiredRole: 'Admin' });

  const limited = withRateLimit(handler);
  return limited(request);
}
