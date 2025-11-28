import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { generateCoverPage } from '@/lib/coverpage-generator';
import { sanitizeForLog, sanitizeDocumentId } from '@/lib/security-utils';
import { ValidationError } from '@/lib/api-error-handler';

// POST /api/coverpage
// Body: { departmentId: string; fromDate: string (ISO); toDate: string (ISO); projectId?: string; contractId?: string }
export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const body = await request.json();
      const { departmentId, fromDate, toDate, projectId, contractId, manualData } = body || {};

      // Validate required fields
      if (!departmentId || !fromDate || !toDate) {
        return NextResponse.json({ error: 'departmentId, fromDate, and toDate are required' }, { status: 400 });
      }

      // Validate and sanitize IDs
      const sanitizedDepartmentId = sanitizeDocumentId(departmentId);
      if (!sanitizedDepartmentId) {
        throw new ValidationError('Invalid department ID format');
      }

      const sanitizedProjectId = projectId ? sanitizeDocumentId(projectId) ?? undefined : undefined;
      const sanitizedContractId = contractId ? sanitizeDocumentId(contractId) ?? undefined : undefined;

      // Validate date format
      const start = new Date(fromDate);
      const end = new Date(toDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format');
      }

      if (start > end) {
        throw new ValidationError('fromDate must be before toDate');
      }

      // Validate date range (max 2 years for cover page)
      const maxRange = 2 * 365 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > maxRange) {
        throw new ValidationError('Date range cannot exceed 2 years');
      }

      // Validate manualData if provided
      if (manualData !== undefined && typeof manualData !== 'object') {
        throw new ValidationError('manualData must be an object');
      }

      const buffer = await generateCoverPage({
        departmentId: sanitizedDepartmentId,
        fromDate,
        toDate,
        projectId: sanitizedProjectId,
        contractId: sanitizedContractId,
        manualData
      });

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
