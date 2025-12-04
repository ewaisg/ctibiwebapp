import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { getVisualTemplate } from '@/lib/visual-template-firestore';
import { generatePDFFromTemplate } from '@/lib/template-pdf-generator';
import { generateSampleData } from '@/lib/template-data-schemas';

/**
 * POST /api/reports/generate
 * Generate a PDF report from a template with filtered data
 */
export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const body = await req.json();
      const {
        templateId,
        templateSource = 'visual',
        dataSource,
        filters = {},
        preview = false
      } = body;

      if (!templateId || !dataSource) {
        return NextResponse.json(
          { error: 'Template ID and data source are required' },
          { status: 400 }
        );
      }

      // Get template
      let template: any;
      let templateTypeValue: string | undefined;

      if (templateSource === 'visual') {
        template = await getVisualTemplate(templateId);
        if (!template) {
          return NextResponse.json({ error: 'Visual template not found' }, { status: 404 });
        }
        templateTypeValue = template.type;
      } else {
        // PDF template
        if (!adminDb) {
          return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }
        const doc = await adminDb.collection('pdfTemplates').doc(templateId).get();
        if (!doc.exists) {
          return NextResponse.json({ error: 'PDF template not found' }, { status: 404 });
        }
        const docData = doc.data() as any;
        template = { id: doc.id, ...docData };
        templateTypeValue = docData?.type || docData?.templateType;
      }

      // Fetch data from specified source
      let data;
      if (preview || !adminDb) {
        // Use sample data for preview or if DB not available
        data = generateSampleData(templateTypeValue || 'invoice');
      } else {
        // Fetch real data from Firestore
        data = await fetchDataFromSource(dataSource, filters);
      }

      // Generate PDF
      if (templateSource === 'visual') {
        const pdfBytes = await generatePDFFromTemplate(template, data);

        return new NextResponse(Buffer.from(pdfBytes), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': preview
              ? `inline; filename="${template.name}-preview.pdf"`
              : `attachment; filename="${template.name}-${Date.now()}.pdf"`,
          },
        });
      } else {
        // TODO: Handle PDF template generation
        return NextResponse.json(
          { error: 'PDF template generation not yet implemented for reports' },
          { status: 501 }
        );
      }
    } catch (error) {
      console.error('Error generating report:', error);
      return NextResponse.json(
        { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}

/**
 * Fetch data from Firestore based on source and filters
 */
async function fetchDataFromSource(source: string, filters: any): Promise<any> {
  if (!adminDb) {
    throw new Error('Database not initialized');
  }

  let query = adminDb.collection(source) as any;

  // Apply date filters if provided
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    query = query.where('createdAt', '>=', fromDate);
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    query = query.where('createdAt', '<=', toDate);
  }

  // Apply other filters
  if (filters.departmentId) {
    query = query.where('departmentId', '==', filters.departmentId);
  }

  if (filters.projectId) {
    query = query.where('projectId', '==', filters.projectId);
  }

  if (filters.contractId) {
    query = query.where('contractId', '==', filters.contractId);
  }

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  // Limit results to prevent performance issues
  query = query.limit(100);

  const snapshot = await query.get();

  if (snapshot.empty) {
    // Return sample data if no results found
    return generateSampleData('custom');
  }

  // Convert documents to array of data
  const data = snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data()
  }));

  return { items: data, count: data.length };
}
