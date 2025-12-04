import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { getVisualTemplate } from '@/lib/visual-template-firestore';
import { generatePDFFromTemplate } from '@/lib/template-pdf-generator';
import { generateSampleData } from '@/lib/template-data-schemas';
import { getReportTemplate } from '@/lib/report-templates';
import { getProcessor } from '@/lib/report-processors';

/**
 * GET /api/reports/generate
 * Get report data without generating PDF (for testing and preview)
 */
export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const reportTemplateId = searchParams.get('reportTemplateId');
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      const departmentId = searchParams.get('departmentId');
      const projectId = searchParams.get('projectId');
      const contractId = searchParams.get('contractId');
      const status = searchParams.get('status');

      if (!reportTemplateId) {
        return NextResponse.json(
          { error: 'Report template ID is required' },
          { status: 400 }
        );
      }

      const reportTemplate = getReportTemplate(reportTemplateId);
      if (!reportTemplate) {
        return NextResponse.json(
          { error: 'Report template not found' },
          { status: 404 }
        );
      }

      if (!reportTemplate.processorFunction) {
        return NextResponse.json(
          { error: 'Report template does not have a processor function' },
          { status: 400 }
        );
      }

      const processor = getProcessor(reportTemplate.processorFunction);
      if (!processor) {
        return NextResponse.json(
          { error: 'Processor function not found' },
          { status: 404 }
        );
      }

      // Build filters
      const filters: any = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (departmentId) filters.departmentId = departmentId;
      if (projectId) filters.projectId = projectId;
      if (contractId) filters.contractId = contractId;
      if (status) filters.status = status;

      console.log(`[Reports GET] Processing report: ${reportTemplateId} with filters:`, filters);

      // Run processor
      const result = await processor(filters);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to process report data' },
          { status: 500 }
        );
      }

      // Return JSON data
      return NextResponse.json({
        success: true,
        reportTemplate: {
          id: reportTemplate.id,
          name: reportTemplate.name,
          description: reportTemplate.description,
          category: reportTemplate.category,
        },
        data: result.data,
        hasData: result.data?.hasData || false,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch report data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}

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
        preview = false,
        reportTemplateId, // Optional: ID of pre-built report template
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
        // Check if using a pre-built report template with processor
        if (reportTemplateId) {
          const reportTemplate = getReportTemplate(reportTemplateId);
          if (reportTemplate && reportTemplate.processorFunction) {
            const processor = getProcessor(reportTemplate.processorFunction);
            if (processor) {
              console.log(`[Reports] Using processor: ${reportTemplate.processorFunction}`);
              const result = await processor(filters);

              if (!result.success) {
                return NextResponse.json(
                  { error: result.error || 'Failed to process report data' },
                  { status: 500 }
                );
              }

              // Check if data is available
              if (!result.data?.hasData) {
                return NextResponse.json(
                  {
                    error: 'No data available for the selected filters',
                    message: 'Try adjusting your date range, department, project, or other filters.',
                    noData: true,
                  },
                  { status: 404 }
                );
              }

              data = result.data;
            } else {
              console.warn(`[Reports] Processor not found: ${reportTemplate.processorFunction}`);
              // Fall back to basic fetch
              data = await fetchDataFromSource(dataSource, filters);
            }
          } else {
            // No processor, use basic fetch
            data = await fetchDataFromSource(dataSource, filters);
          }
        } else {
          // Fetch real data from Firestore (basic query)
          data = await fetchDataFromSource(dataSource, filters);
        }
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

  let query: any = adminDb.collection(source);

  // Determine which date field to use based on collection
  const dateField = getDateFieldForCollection(source);

  // Apply date filters if provided
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    query = query.where(dateField, '>=', fromDate);
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    query = query.where(dateField, '<=', toDate);
  }

  // Apply department filter
  if (filters.departmentId) {
    const departmentField = getDepartmentFieldForCollection(source);
    if (departmentField) {
      // Check if field should be a reference or string
      const usesReference = collectionUsesReferences(source, 'department');
      if (usesReference) {
        query = query.where(departmentField, '==', adminDb.doc(`departments/${filters.departmentId}`));
      } else {
        query = query.where(departmentField, '==', filters.departmentId);
      }
    }
  }

  // Apply project filter
  if (filters.projectId) {
    const projectField = getProjectFieldForCollection(source);
    if (projectField) {
      const usesReference = collectionUsesReferences(source, 'project');
      if (usesReference) {
        query = query.where(projectField, '==', adminDb.doc(`projects/${filters.projectId}`));
      } else {
        query = query.where(projectField, '==', filters.projectId);
      }
    }
  }

  // Apply contract filter
  if (filters.contractId) {
    const contractField = getContractFieldForCollection(source);
    if (contractField) {
      const usesReference = collectionUsesReferences(source, 'contract');
      if (usesReference) {
        query = query.where(contractField, '==', adminDb.doc(`contracts/${filters.contractId}`));
      } else {
        query = query.where(contractField, '==', filters.contractId);
      }
    }
  }

  // Apply status filter
  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  // Order by date field
  query = query.orderBy(dateField, 'desc');

  // Limit results to prevent performance issues
  query = query.limit(100);

  const snapshot = await query.get();

  if (snapshot.empty) {
    console.log(`[Reports] No data found for source: ${source} with filters:`, filters);
    // Return sample data if no results found
    return generateSampleData('custom');
  }

  // Convert documents to array of data, handling DocumentReferences
  const data = await Promise.all(snapshot.docs.map(async (doc: any) => {
    const docData = doc.data();
    const processedData: any = { id: doc.id };

    // Convert DocumentReferences to IDs
    for (const [key, value] of Object.entries(docData)) {
      if (value && typeof value === 'object' && value.constructor.name === 'DocumentReference') {
        processedData[key] = (value as any).id;
      } else {
        processedData[key] = value;
      }
    }

    return processedData;
  }));

  console.log(`[Reports] Fetched ${data.length} records from ${source}`);

  return { items: data, count: data.length };
}

/**
 * Get the appropriate date field for a collection
 */
function getDateFieldForCollection(collection: string): string {
  switch (collection) {
    case 'invoices':
      return 'createdAt';
    case 'timesheets':
      return 'timecardDate';
    case 'projects':
      return 'createdAt';
    case 'contracts':
      return 'effectiveDate';
    default:
      return 'createdAt';
  }
}

/**
 * Get the department field name for a collection
 */
function getDepartmentFieldForCollection(collection: string): string | null {
  switch (collection) {
    case 'projects':
    case 'invoices':
    case 'timesheets':
    case 'employees':
      return 'departmentId';
    case 'departments':
      return null; // Can't filter departments by department
    default:
      return 'departmentId';
  }
}

/**
 * Get the project field name for a collection
 */
function getProjectFieldForCollection(collection: string): string | null {
  switch (collection) {
    case 'invoices':
    case 'timesheets':
      return 'projectId';
    case 'projects':
      return null; // Can't filter projects by project
    default:
      return 'projectId';
  }
}

/**
 * Get the contract field name for a collection
 */
function getContractFieldForCollection(collection: string): string | null {
  switch (collection) {
    case 'invoices':
    case 'projects':
      return 'contractId';
    default:
      return null;
  }
}

/**
 * Check if a collection uses DocumentReferences for a field type
 */
function collectionUsesReferences(collection: string, fieldType: 'department' | 'project' | 'contract'): boolean {
  // Most collections use DocumentReferences for relationships
  // Timesheets might use strings depending on implementation
  if (collection === 'timesheets') {
    return false; // Timesheets use string IDs
  }
  return true; // Default to references
}
