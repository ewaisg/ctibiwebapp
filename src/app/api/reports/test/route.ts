/**
 * Test API Route for PDF Generation Foundation
 * GET /api/reports/test?type=sample|blank
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSampleReport, generateBlankTemplateExample } from '@/lib/pdf-generation/examples/sample-report';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sample';

    let pdfBytes: Uint8Array;
    let filename: string;

    if (type === 'blank') {
      pdfBytes = await generateBlankTemplateExample();
      filename = 'blank-template.pdf';
    } else {
      pdfBytes = await generateSampleReport();
      filename = 'sample-report.pdf';
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating test report:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate test report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
