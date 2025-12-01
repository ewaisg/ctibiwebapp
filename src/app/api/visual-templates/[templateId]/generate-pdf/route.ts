import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { getVisualTemplate } from '@/lib/visual-template-firestore';
import { generatePDFFromTemplate } from '@/lib/template-pdf-generator';
import { generateSampleData } from '@/lib/template-data-schemas';

/**
 * POST /api/visual-templates/[templateId]/generate-pdf
 * Generate a PDF from a visual template with provided data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  const handler = await withAuth(async (req) => {
    try {
      // Get template
      const template = await getVisualTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      // Get data from request body or use sample data
      const body = await req.json().catch(() => ({}));
      const data = body.data || generateSampleData(template.type);

      // Generate PDF
      const pdfBytes = await generatePDFFromTemplate(template, data);

      // Return PDF
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${template.name}.pdf"`,
        },
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}

/**
 * GET /api/visual-templates/[templateId]/generate-pdf
 * Preview PDF with sample data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  const handler = await withAuth(async (req) => {
    try {
      // Get template
      const template = await getVisualTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      // Use sample data
      const data = generateSampleData(template.type);

      // Generate PDF
      const pdfBytes = await generatePDFFromTemplate(template, data);

      // Return PDF for preview
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${template.name}-preview.pdf"`,
        },
      });
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      return NextResponse.json(
        { error: 'Failed to generate PDF preview' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}
