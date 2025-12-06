import { NextRequest, NextResponse } from 'next/server';
import { generateDepartmentalCompilation } from '@/lib/departmental-compilation';
import { handleApiError, validateRequestBody, ValidationError } from '@/lib/api-error-handler';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

// Store progress in memory (in production, use Redis or database)
const compilationProgress = new Map<string, any>();

export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const compilationId = searchParams.get('compilationId');

    if (!compilationId) {
      return NextResponse.json({ error: 'Missing compilationId' }, { status: 400 });
    }

    const progress = compilationProgress.get(compilationId);
    return NextResponse.json(progress || { status: 'idle' });
  });

  return handler(request);
}

export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
  try {
    const body = await req.json();
    validateRequestBody(body, ['departmentId', 'startDate', 'endDate']);
    
    const { departmentId, startDate, endDate, compilationId } = body;

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    if (start > end) {
      throw new ValidationError('Start date must be before end date');
    }
    
    // Validate date range (max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end.getTime() - start.getTime() > maxRange) {
      throw new ValidationError('Date range cannot exceed 1 year');
    }

    console.log('[API] Starting departmental compilation for department');

    if (compilationId) {
      compilationProgress.set(compilationId, { status: 'starting', processed: 0, total: 0 });
    }

    const onProgress = (progress: any) => {
      if (compilationId) {
        compilationProgress.set(compilationId, progress);
      }
    };

    const result = await generateDepartmentalCompilation(departmentId, startDate, endDate, onProgress);

    if (compilationId) {
      compilationProgress.set(compilationId, { status: 'completed', processed: 100, total: 100 });
      // Clean up after 5 minutes
      setTimeout(() => compilationProgress.delete(compilationId), 5 * 60 * 1000);
    }

    if (!result.success) {
      throw new Error(result.error || 'Compilation failed');
    }

    if (!result.zipBuffer || !result.filename) {
      throw new Error('No compilation data generated');
    }

    // Return the ZIP file as a download
    return new NextResponse(new Uint8Array(result.zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
  }, { requiredRole: 'Admin' }); // Only Admin/Prime can generate departmental compilations

  // Strict rate limit: 5 compilations per hour (resource intensive)
  return withRateLimit(handler, { maxRequests: 5, windowMs: 60 * 60 * 1000 })(request);
}