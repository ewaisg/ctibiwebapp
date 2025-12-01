import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { generateOverallProjectsSummaryPackage } from '@/lib/overall-projects-summary-package';
import { sanitizeForLog, sanitizeDocumentId } from '@/lib/security-utils';
import { ValidationError } from '@/lib/api-error-handler';

/**
 * POST /api/overall-projects-summary
 *
 * Generates an Overall Projects Summary Report Package containing 3 professional PDFs:
 * 1. PO Budget Summary - Budget tracking and utilization across all projects
 * 2. MWBE Compliance Report - Diversity goal achievement and participation analysis
 * 3. Sub-Consultant Breakdown - Sub-consultant financial engagement and payment status
 *
 * Request Body:
 * - departmentId (required): Filter by department
 * - contractId (optional): Filter by contract
 * - fromDate (optional): Start date for invoices
 * - toDate (optional): End date for invoices
 * - includeInactiveProjects (optional): Include inactive projects in report
 *
 * Response:
 * - ZIP file containing 3 PDF reports (application/zip)
 */
export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    const startTime = Date.now();

    try {
      // Parse request body
      const body = await req.json();
      const {
        departmentId,
        contractId,
        fromDate,
        toDate,
        includeInactiveProjects = false
      } = body;

      // Validate required fields
      if (!departmentId) {
        return NextResponse.json(
          { error: 'departmentId is required' },
          { status: 400 }
        );
      }

      // Validate and sanitize department ID
      const sanitizedDepartmentId = sanitizeDocumentId(departmentId);
      if (!sanitizedDepartmentId) {
        throw new ValidationError('Invalid department ID format');
      }

      // Validate and sanitize contract ID if provided
      const sanitizedContractId = contractId ? sanitizeDocumentId(contractId) ?? undefined : undefined;

      // Validate date format if provided
      if (fromDate) {
        const start = new Date(fromDate);
        if (isNaN(start.getTime())) {
          throw new ValidationError('Invalid fromDate format');
        }
      }

      if (toDate) {
        const end = new Date(toDate);
        if (isNaN(end.getTime())) {
          throw new ValidationError('Invalid toDate format');
        }
      }

      // Validate date range if both provided
      if (fromDate && toDate) {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        if (start > end) {
          throw new ValidationError('fromDate must be before toDate');
        }

        // Validate date range (max 2 years)
        const maxRange = 2 * 365 * 24 * 60 * 60 * 1000;
        if (end.getTime() - start.getTime() > maxRange) {
          throw new ValidationError('Date range cannot exceed 2 years');
        }
      }

      // Validate includeInactiveProjects is boolean
      if (typeof includeInactiveProjects !== 'boolean') {
        throw new ValidationError('includeInactiveProjects must be a boolean');
      }

      console.log('[API] Generating overall projects summary package', {
        departmentId: sanitizedDepartmentId,
        contractId: sanitizedContractId,
        fromDate,
        toDate,
        includeInactiveProjects
      });

      // Convert date strings to Date objects
      const options = {
        departmentId: sanitizedDepartmentId,
        contractId: sanitizedContractId,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        includeInactiveProjects,
        useAdminSdk: true // Use Firebase Admin SDK for server-side
      };

      // Generate complete package (3 PDFs in ZIP)
      const packageResult = await generateOverallProjectsSummaryPackage(options);

      const duration = Date.now() - startTime;
      console.log('[API] Overall projects summary package generated successfully', {
        duration,
        zipSize: packageResult.zipBuffer.length,
        reportCount: packageResult.reportCount,
        filename: packageResult.filename
      });

      // Return ZIP file
      return new NextResponse(new Uint8Array(packageResult.zipBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${packageResult.filename}"`,
          'Content-Length': packageResult.zipBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.error('[API] Error generating overall projects summary', {
        error: sanitizeForLog(error),
        duration
      });

      return NextResponse.json(
        {
          error: 'Failed to generate overall projects summary report',
          details: error.message
        },
        { status: 500 }
      );
    }
  }, { requiredRole: 'Admin' }); // Only Admin/Prime can generate this report

  // Apply rate limiting
  const limited = withRateLimit(handler);
  return limited(request);
}

// Increase function timeout for large reports
export const maxDuration = 60; // 60 seconds
