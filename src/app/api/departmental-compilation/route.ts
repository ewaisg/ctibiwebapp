import { NextRequest, NextResponse } from 'next/server';
import { generateDepartmentalCompilation } from '@/lib/departmental-compilation';
import { handleApiError, validateRequestBody, ValidationError, globalRateLimiter } from '@/lib/api-error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!globalRateLimiter.isAllowed(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    const body = await request.json();
    validateRequestBody(body, ['departmentId', 'startDate', 'endDate']);
    
    const { departmentId, startDate, endDate } = body;

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

    const result = await generateDepartmentalCompilation(departmentId, startDate, endDate);

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
}