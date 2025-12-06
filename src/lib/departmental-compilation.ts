import JSZip from 'jszip';
import { format } from 'date-fns';
import { adminDb } from '@/lib/firebase-admin';
import { generateDepartmentalInvoicePdf } from '@/lib/departmental-pdf-generator';
import { extractId, FlexibleReference } from '@/lib/document-reference-utils';
import { generateDepartmentalProjectReportPdf } from '@/lib/departmental-project-report-pdf';
import { generateDepartmentalProjectReportData } from '@/lib/departmental-project-report-data';
import { sanitizeForLog, sanitizeFilePath } from '@/lib/security-utils';
import type { Invoice, Project, Department, Employee, Company, Service } from '@/types';

interface InvoiceSubmission {
  invoice: Invoice;
  project: Project;
  submissionDate: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  timecardReport?: Buffer;
}

interface TimesheetEntry {
  employeeId: FlexibleReference;
  date: any;
  startTime?: string;
  endTime?: string;
  hours: number;
  notes?: string;
}

interface CompilationResult {
  success: boolean;
  zipBuffer?: Buffer;
  filename?: string;
  error?: string;
}

export type ProgressCallback = (progress: {
  status: string;
  processed: number;
  total: number;
  currentItem?: string;
}) => void;

export async function generateDepartmentalCompilation(
  departmentId: string,
  startDate: string,
  endDate: string,
  onProgress?: ProgressCallback
): Promise<CompilationResult> {
  try {
    // Validate inputs
    if (!departmentId || typeof departmentId !== 'string') {
      throw new Error('Invalid department ID');
    }
    
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }
    
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    
    if (startDateObj > endDateObj) {
      throw new Error('Start date cannot be after end date');
    }
    
    if (!adminDb) {
      throw new Error('Firebase Admin SDK is not initialized');
    }

    console.log('[Departmental Compilation] Starting compilation for department');

    // Get department info
    const departmentDoc = await adminDb.collection('departments').doc(departmentId).get();
    if (!departmentDoc.exists) {
      throw new Error(`Department with ID ${departmentId} not found`);
    }
    const department = { id: departmentDoc.id, ...departmentDoc.data() } as Department;

    // Get all required data
    const [projectsSnapshot, invoicesSnapshot, employeesSnapshot, companiesSnapshot, servicesSnapshot] = await Promise.all([
      adminDb.collection('projects').where('departmentId', '==', departmentId).get(),
      adminDb.collection('invoices').get(),
      adminDb.collection('employees').get(),
      adminDb.collection('companies').get(),
      adminDb.collection('services').get()
    ]);

    const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
    const allInvoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
    const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
    const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Company[];
    const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];

    if (onProgress) {
      onProgress({ status: 'processing', processed: 0, total: 0 });
    }

    // Filter invoices by date range and department projects
    const projectIds = new Set(projects.map(p => p.id));
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    const relevantInvoices = allInvoices.filter(invoice => {
      // Check if invoice belongs to a project in this department
      const invoiceProjectId = extractId(invoice.projectId);
      if (!invoiceProjectId || !projectIds.has(invoiceProjectId)) return false;

      // Check if invoice period overlaps with selected date range
      const invoiceFromDate = convertToDate(invoice.fromDate);
      const invoiceToDate = convertToDate(invoice.toDate);
      
      if (!invoiceFromDate || !invoiceToDate) return false;
      
      return invoiceFromDate <= end && invoiceToDate >= start;
    });

    console.log('[Departmental Compilation] Found relevant invoices:', sanitizeForLog(relevantInvoices.length));

    if (onProgress) {
      onProgress({ status: 'processing', processed: 0, total: relevantInvoices.length });
    }

    // Group invoices by project and submission date
    const submissionsByProject = new Map<string, Map<string, InvoiceSubmission[]>>();

    let processedCount = 0;
    for (const invoice of relevantInvoices) {
      processedCount++;
      if (onProgress) {
        onProgress({ 
          status: 'processing', 
          processed: processedCount, 
          total: relevantInvoices.length,
          currentItem: invoice.invoiceNumber 
        });
      }

      const projectId = extractId(invoice.projectId);
      if (!projectId) continue; // Skip if no valid project ID
      
      const project = projects.find(p => p.id === projectId);
      if (!project) continue;

      const submissionDate = format(convertToDate(invoice.createdAt) || new Date(), 'yyyy-MM-dd');
      
      if (!submissionsByProject.has(projectId)) {
        submissionsByProject.set(projectId, new Map());
      }
      
      const projectSubmissions = submissionsByProject.get(projectId)!;
      if (!projectSubmissions.has(submissionDate)) {
        projectSubmissions.set(submissionDate, []);
      }

      // Get attachments for the invoice
      const attachments = invoice.id ? await getInvoiceAttachments(invoice.id) : [];

      // Try to get Direct Labor Report - check multiple sources
      let timecardReport: Buffer | undefined;
      let hasExistingReport = false;

      // First, check if there's an existing Direct Labor Report URL
      if (invoice.directLaborReportUrl && invoice.directLaborReportFileName) {
        console.log('[Labor Report] Found existing labor report URL for invoice:', sanitizeForLog(invoice.invoiceNumber));
        hasExistingReport = true;
      }

      // If no existing report, try to generate from invoice data
      if (!hasExistingReport && invoice.invoiceItems && invoice.invoiceItems.length > 0) {
        try {
          const { generateDirectLaborReport, shouldGenerateLaborReport } = await import('@/lib/labor-report-generator');

          // Check if we should generate based on invoice metadata
          const shouldGenerate = shouldGenerateLaborReport(invoice);

          if (shouldGenerate) {
            console.log('[Labor Report] Generating labor report for invoice:', sanitizeForLog(invoice.invoiceNumber), '- autofillSource:', sanitizeForLog(invoice.autofillSource));
            timecardReport = await generateDirectLaborReport(invoice, project, employees, companies) || undefined;
            console.log('[Labor Report] Generated', sanitizeForLog(timecardReport?.length || 0), 'bytes');
          } else {
            // As a fallback, try to generate if invoice has employee items (may have been created from timesheet)
            // This handles cases where autofillSource wasn't set correctly
            const hasEmployeeItems = invoice.invoiceItems.some(item => extractId(item.employeeId));

            if (hasEmployeeItems) {
              console.log('[Labor Report] Attempting to generate from employee items for invoice:', sanitizeForLog(invoice.invoiceNumber));
              try {
                timecardReport = await generateDirectLaborReport(invoice, project, employees, companies) || undefined;
                if (timecardReport && timecardReport.length > 0) {
                  console.log('[Labor Report] Successfully generated', sanitizeForLog(timecardReport.length), 'bytes from fallback method');
                }
              } catch (fallbackError) {
                console.warn('[Labor Report] Fallback generation also failed:', sanitizeForLog(fallbackError));
              }
            } else {
              console.log('[Labor Report] Skipping invoice - no employee items:', sanitizeForLog({
                invoiceNumber: invoice.invoiceNumber,
                autofillSource: invoice.autofillSource,
                itemCount: invoice.invoiceItems?.length || 0
              }));
            }
          }
        } catch (error) {
          console.warn('[Labor Report] Failed to generate Direct Labor Report for invoice:', sanitizeForLog(error));
        }
      }

      projectSubmissions.get(submissionDate)!.push({
        invoice,
        project,
        submissionDate,
        attachments,
        timecardReport
      });
    }

    // Create ZIP file
    if (onProgress) {
      onProgress({ status: 'compressing', processed: relevantInvoices.length, total: relevantInvoices.length });
    }
    const zip = new JSZip();
    
    // Add project folders with submissions
    for (const [projectId, submissions] of submissionsByProject) {
      const project = projects.find(p => p.id === projectId);
      if (!project) continue;

      const projectFolderName = sanitizeFilename(project.projectName || `Project-${projectId}`);
      const projectFolder = zip.folder(projectFolderName);
      
      if (!projectFolder) continue;

      for (const [submissionDate, invoiceSubmissions] of submissions) {
        const dateFolder = projectFolder.folder(submissionDate);
        if (!dateFolder) continue;

        for (const submission of invoiceSubmissions) {
          // Generate and add invoice PDF using departmental template resolution
          try {
            const projectData = projects.find(p => p.id === extractId(submission.invoice.projectId));
            const pdfResult = await generateDepartmentalInvoicePdf(
              submission.invoice, 
              projectData, 
              departmentId, 
              companies
            );
            
            if (pdfResult.success && pdfResult.pdfBuffer) {
              const invoiceFilename = sanitizeFilePath(`invoice-${submission.invoice.invoiceNumber || submission.invoice.id}.pdf`);
              dateFolder.file(invoiceFilename, pdfResult.pdfBuffer);
              console.log('[Departmental Compilation] Generated PDF for invoice using department template');
            } else {
              console.warn('[Departmental Compilation] Failed to generate PDF for invoice:', sanitizeForLog(pdfResult.error));
            }
          } catch (error) {
            console.warn('[Departmental Compilation] Failed to generate PDF for invoice:', sanitizeForLog(error));
          }

          // Add Direct Labor Report if generated
          if (submission.timecardReport && submission.timecardReport.length > 0) {
            const laborReportFilename = sanitizeFilePath(`direct-labor-report-${submission.invoice.invoiceNumber || submission.invoice.id}.pdf`);
            dateFolder.file(laborReportFilename, submission.timecardReport);
            console.log('[Departmental Compilation] Added generated labor report:', sanitizeForLog(laborReportFilename));
          }

          // Add existing Direct Labor Report if available (from previous PDF generation)
          if (submission.invoice.directLaborReportUrl && submission.invoice.directLaborReportFileName) {
            try {
              console.log('[Departmental Compilation] Downloading existing labor report from URL for invoice:', sanitizeForLog(submission.invoice.invoiceNumber));
              const reportData = await downloadAttachment(submission.invoice.directLaborReportUrl);
              if (reportData && reportData.length > 0) {
                dateFolder.file(sanitizeFilePath(submission.invoice.directLaborReportFileName), reportData);
                console.log('[Departmental Compilation] Added existing labor report:', sanitizeForLog(submission.invoice.directLaborReportFileName), '(', sanitizeForLog(reportData.length), 'bytes)');
              } else {
                console.warn('[Departmental Compilation] Existing labor report download returned no data for invoice:', sanitizeForLog(submission.invoice.invoiceNumber));
              }
            } catch (error) {
              console.warn('[Departmental Compilation] Failed to download existing labor report for invoice:', sanitizeForLog(submission.invoice.invoiceNumber), sanitizeForLog(error));
            }
          }

          // Log if no labor report was found at all
          if (!submission.timecardReport && !submission.invoice.directLaborReportUrl) {
            console.log('[Departmental Compilation] No labor report available for invoice:', sanitizeForLog({
              invoiceNumber: submission.invoice.invoiceNumber,
              autofillSource: submission.invoice.autofillSource,
              hasDirectLaborReportUrl: !!submission.invoice.directLaborReportUrl
            }));
          }

          // Add attachments in organized folder
          if (submission.attachments.length > 0) {
            const attachmentsFolder = dateFolder.folder('attachments');
            if (attachmentsFolder) {
              for (const attachment of submission.attachments) {
                try {
                  const attachmentData = await downloadAttachment(attachment.url);
                  if (attachmentData) {
                    attachmentsFolder.file(sanitizeFilePath(attachment.name), attachmentData);
                  }
                } catch (error) {
                  console.warn('Failed to download attachment:', sanitizeForLog(error));
                }
              }
            }
          }
        }
      }
    }

    // Generate and add departmental summary report
    try {
      const reportData = await generateDepartmentalProjectReportData(departmentId, startDate, endDate, true);
      const reportPdf = await generateDepartmentalProjectReportPdf(reportData);
      const reportFilename = sanitizeFilePath(`${department.departmentName}-Summary-Report.pdf`);
      zip.file(reportFilename, reportPdf);
    } catch (error) {
      console.warn('Failed to generate departmental summary report:', sanitizeForLog(error));
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const filename = sanitizeFilePath(`${department.departmentName}-Compilation-${format(new Date(), 'yyyy-MM-dd')}.zip`);

    console.log('[Departmental Compilation] Successfully generated compilation');

    return {
      success: true,
      zipBuffer,
      filename
    };

  } catch (error) {
    console.error('[Departmental Compilation] Error:', sanitizeForLog(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Helper functions
function convertToDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) return dateValue;
  
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  if (typeof dateValue === 'object' && dateValue.seconds) {
    return new Date(dateValue.seconds * 1000);
  }
  
  if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  
  return null;
}

function sanitizeFilename(filename: string): string {
  return sanitizeFilePath(filename)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function getInvoiceAttachments(invoiceId: string): Promise<Array<{name: string, url: string, type: string}>> {
  try {
    if (!adminDb) return [];
    
    const invoiceDoc = await adminDb.collection('invoices').doc(invoiceId).get();
    const invoiceData = invoiceDoc.data();
    
    if (!invoiceData?.uploadedFiles) return [];
    
    return invoiceData.uploadedFiles.map((file: any) => ({
      name: sanitizeFilePath(file.fileName || 'attachment'),
      url: file.fileUrl || '',
      type: 'application/octet-stream'
    }));
  } catch (error) {
    console.warn('Failed to get attachments for invoice:', sanitizeForLog(error));
    return [];
  }
}

async function downloadAttachment(url: string): Promise<Buffer | null> {
  // Placeholder - implement based on your storage system
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn('Failed to download attachment:', sanitizeForLog(error));
    return null;
  }
}

// Legacy functions - now using unified labor report generator