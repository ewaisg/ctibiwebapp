import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, StandardFonts, rgb } from 'pdf-lib';
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
        dataSource: providedDataSource,
        filters = {},
        preview = false,
        reportTemplateId, // Optional: ID of pre-built report template
      } = body;

      // Validation
      if (templateSource === 'pdf' && !templateId) {
        return NextResponse.json({ error: 'Template ID is required for PDF templates' }, { status: 400 });
      }
      if (templateSource === 'prebuilt' && !reportTemplateId) {
        return NextResponse.json({ error: 'Report Template ID is required for prebuilt reports' }, { status: 400 });
      }

      // Get template and determine data source
      let template: any;
      let templateTypeValue: string | undefined;
      let dataSource = providedDataSource;

      if (templateSource === 'visual') {
        if (!templateId) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
        template = await getVisualTemplate(templateId);
        if (!template) {
          return NextResponse.json({ error: 'Visual template not found' }, { status: 404 });
        }
        templateTypeValue = template.type;
        if (!dataSource) dataSource = 'invoices'; // Default fallback
      } else if (templateSource === 'pdf') {
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
        
        // Infer data source if not provided
        if (!dataSource && template.dataSourceConfig?.primaryCollection) {
          dataSource = template.dataSourceConfig.primaryCollection;
        }
      }

      // Fetch data
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
              if (!result.data?.hasData && !preview) {
                 // For preview we might want to show empty report? No, usually we want data.
                 // But if it's a "Run" action, we should warn.
                 // Let's allow empty data but maybe the generator handles it.
              }

              data = result.data;
            } else {
              console.warn(`[Reports] Processor not found: ${reportTemplate.processorFunction}`);
              // Fall back to basic fetch
              if (dataSource) {
                 data = await fetchDataFromSource(dataSource, filters);
              }
            }
          } else {
             if (dataSource) {
                data = await fetchDataFromSource(dataSource, filters);
             }
          }
        } else if (dataSource) {
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
      } else if (templateSource === 'prebuilt') {
         // Generate Prebuilt PDF (Simple Table Layout)
         // We need a simple generator here.
         // For now, let's use a basic function to dump data.
         const pdfBytes = await generatePrebuiltPDF(data, reportTemplateId);
         return new NextResponse(Buffer.from(pdfBytes), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': preview
              ? `inline; filename="report-preview.pdf"`
              : `attachment; filename="report-${Date.now()}.pdf"`,
          },
        });
      } else {
        // Handle PDF template generation (Form Filling)

        try {
          // 1. Get the base64 PDF data
          const base64Data = template.base64Data;
          if (!base64Data) {
            throw new Error('Template PDF data is missing');
          }

          // 2. Prepare data array (handle single object or array)
          const dataArray = Array.isArray(data) ? data : [data];
          
          if (dataArray.length === 0) {
             return NextResponse.json(
              { error: 'No data found to generate report' },
              { status: 404 }
            );
          }

          // 3. Create a merged PDF to hold all filled forms
          const mergedPdf = await PDFDocument.create();

          // 4. Process each data item
          for (const item of dataArray) {
            // Load the template PDF
            const pdfDoc = await PDFDocument.load(base64Data);
            
            // Embed standard font for field appearances
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            
            const form = pdfDoc.getForm();

            // Fill fields based on mappings
            if (template.fieldMappings && Array.isArray(template.fieldMappings)) {
              for (const mapping of template.fieldMappings) {
                try {
                  const field = form.getField(mapping.fieldName);
                  if (field) {
                    // Get value from data item using sourceField (supports dot notation)
                    const value = getNestedValue(item, mapping.sourceField);
                    
                    if (value !== undefined && value !== null) {
                      // Convert to string and fill
                      const stringValue = String(value);
                      
                      // Handle different field types
                      if (field instanceof PDFTextField) {
                        field.setText(stringValue);
                        // Update appearance with font to ensure it renders correctly when flattened
                        field.updateAppearances(helveticaFont);
                      } else if (field instanceof PDFCheckBox) {
                        if (stringValue.toLowerCase() === 'true' || stringValue === '1' || stringValue.toLowerCase() === 'yes') {
                          field.check();
                        } else {
                          field.uncheck();
                        }
                        field.updateAppearances();
                      } else if (field instanceof PDFDropdown) {
                        // Check if option exists before selecting to avoid error
                        const options = field.getOptions();
                        if (options.includes(stringValue)) {
                          field.select(stringValue);
                          field.updateAppearances(helveticaFont);
                        } else {
                          console.warn(`Option "${stringValue}" not found in dropdown "${mapping.fieldName}"`);
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.warn(`Failed to fill field ${mapping.fieldName}:`, err);
                }
              }
            }

            // Flatten the form to make it read-only and merge fields into content
            // We wrap this in a try-catch because sometimes flattening fails with complex forms
            try {
              form.flatten();
            } catch (flattenError) {
              console.warn('Failed to flatten form, saving with filled fields instead:', flattenError);
              // If flattening fails, we just leave the fields filled but editable/interactive
            }

            // Copy pages to merged PDF
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
          }

          // 5. Save the merged PDF
          const pdfBytes = await mergedPdf.save();

          return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': preview
                ? `inline; filename="${template.templateName || 'report'}-preview.pdf"`
                : `attachment; filename="${template.templateName || 'report'}-${Date.now()}.pdf"`,
            },
          });

        } catch (error) {
          console.error('Error generating PDF from template:', error);
          return NextResponse.json(
            { error: 'Failed to generate PDF from template', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }
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
 * Helper to get nested value from object
 */
function getNestedValue(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
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

/**
 * Generate a PDF for prebuilt reports with tables
 */
async function generatePrebuiltPDF(data: any, reportTemplateId?: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  let y = height - 50;

  // Title
  const title = reportTemplateId 
    ? reportTemplateId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
    : 'Generated Report';

  page.drawText(title, {
    x: 50,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  page.drawText(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, {
    x: 50,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 40;

  // Summary Section
  if (data.summary) {
    page.drawText('Summary', { x: 50, y, size: 14, font: boldFont });
    y -= 20;
    
    for (const [key, value] of Object.entries(data.summary)) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const valStr = typeof value === 'number' 
        ? (key.toLowerCase().includes('amount') || key.toLowerCase().includes('cost') ? `$${value.toFixed(2)}` : value.toString())
        : String(value);

      page.drawText(`${label}: ${valStr}`, { x: 50, y, size: 10, font });
      y -= 15;
    }
    y -= 20;
  }

  // Table Headers & Data
  const items = data.items || (Array.isArray(data) ? data : []);
  
  if (items.length > 0) {
    // Determine columns based on report type or data keys
    let columns: { key: string, header: string, width: number }[] = [];
    
    if (reportTemplateId === 'po-status-report') {
      columns = [
        { key: 'poNumber', header: 'PO Number', width: 100 },
        { key: 'projectName', header: 'Project Name', width: 200 },
        { key: 'status', header: 'Status', width: 80 },
        { key: 'poAmount', header: 'Amount', width: 100 },
      ];
    } else if (reportTemplateId === 'billable-hours-report') {
      columns = [
        { key: 'projectName', header: 'Project', width: 200 },
        { key: 'totalHours', header: 'Total Hrs', width: 80 },
        { key: 'billableHours', header: 'Billable', width: 80 },
        { key: 'nonBillableHours', header: 'Non-Billable', width: 80 },
      ];
    } else if (reportTemplateId === 'employee-utilization-report') {
      columns = [
        { key: 'employeeName', header: 'Employee', width: 150 },
        { key: 'totalHours', header: 'Total Hrs', width: 80 },
        { key: 'billableHours', header: 'Billable', width: 80 },
        { key: 'utilizationRate', header: 'Util %', width: 80 },
      ];
    } else {
      // Auto-detect columns from first item (limit to 5)
      const keys = Object.keys(items[0]).filter(k => k !== 'id' && typeof items[0][k] !== 'object').slice(0, 5);
      columns = keys.map(k => ({ 
        key: k, 
        header: k.charAt(0).toUpperCase() + k.slice(1), 
        width: (width - 100) / keys.length 
      }));
    }

    // Draw Header
    let x = 50;
    page.drawRectangle({ x: 45, y: y - 5, width: width - 90, height: 20, color: rgb(0.9, 0.9, 0.9) });
    
    for (const col of columns) {
      page.drawText(col.header, { x, y, size: 10, font: boldFont });
      x += col.width;
    }
    y -= 20;

    // Draw Rows
    for (const item of items) {
      if (y < 50) {
        page = pdfDoc.addPage();
        y = height - 50;
        // Redraw header on new page
        x = 50;
        page.drawRectangle({ x: 45, y: y - 5, width: width - 90, height: 20, color: rgb(0.9, 0.9, 0.9) });
        for (const col of columns) {
          page.drawText(col.header, { x, y, size: 10, font: boldFont });
          x += col.width;
        }
        y -= 20;
      }

      x = 50;
      for (const col of columns) {
        let val = item[col.key];
        
        // Formatting
        if (typeof val === 'number') {
          if (col.key.toLowerCase().includes('amount') || col.key.toLowerCase().includes('cost')) {
            val = `$${val.toFixed(2)}`;
          } else if (col.key.toLowerCase().includes('rate') || col.key.toLowerCase().includes('percent')) {
            val = `${val.toFixed(1)}%`;
          } else {
            val = val.toString();
          }
        } else {
          val = String(val || '-');
        }

        // Truncate
        const maxChars = Math.floor(col.width / 6);
        if (val.length > maxChars) val = val.substring(0, maxChars - 3) + '...';

        page.drawText(val, { x, y, size: 10, font });
        x += col.width;
      }
      y -= 15;
      
      // Draw light line
      page.drawLine({ start: { x: 50, y: y + 12 }, end: { x: width - 50, y: y + 12 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    }
  } else {
    page.drawText('No data found for the selected criteria.', { x: 50, y, size: 12, font, color: rgb(0.5, 0.5, 0.5) });
  }

  return pdfDoc.save();
}
