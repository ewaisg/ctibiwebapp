import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFRadioGroup, StandardFonts } from 'pdf-lib';
import { extractId } from './document-reference-utils';
import { sanitizeForLog, validateInvoiceId, sanitizeTemplateValue } from './security-utils';
import { format } from 'date-fns';
import { getInvoicePdfTemplate } from '@/lib/pdf-template';
import { db } from '@/lib/firebase-client';
import { doc, collection, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { resolveTemplate, resolveInvoiceTemplate, mapTemplateData } from '@/lib/template-resolver';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin for server-side operations
if (!getApps().length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else {
      // Fallback to ADC or emulator to avoid build-time crash
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

// Use admin SDK for server-side operations
const adminDb = getApps().length > 0 ? getAdminFirestore() : null;

// Helper function to get data from either client or admin SDK
async function getCollectionData(collectionName: string) {
  // Try client SDK first
  if (db) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error fetching collection with client SDK:`, sanitizeForLog(error));
    }
  }
  
  // Fallback to admin SDK
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection(collectionName).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error fetching collection with admin SDK:`, sanitizeForLog(error));
    }
  }
  
  console.error('Database not initialized for collection');
  return [];
}

const formatDate = (dateValue: any): string => {
  if (!dateValue) return '';

  if (dateValue && typeof dateValue === 'object' && (dateValue as any).seconds) {
    const date = new Date((dateValue as any).seconds * 1000);
    return format(date, 'MM/dd/yyyy');
  }

  const date = new Date(dateValue);
  if (!isNaN(date.getTime())) {
    return format(date, 'MM/dd/yyyy');
  }

  return '';
};

async function fillPdfTemplate(
  invoiceData: any,
  companies: any[],
  projects: any[],
  options?: { category?: 'Invoice' | 'CoverPage' | 'Report' | 'Custom'; userContext?: any; projectId?: string; contractId?: string; departmentId?: string; }
): Promise<Buffer> {
  const category = options?.category || 'Invoice';
  const projectId = options?.projectId || extractId((invoiceData as any).projectId) || '';
  const project = projects.find((p: any) => p.id === projectId);
  const contractId = options?.contractId || extractId((project as any)?.contractId) || extractId((invoiceData as any).contractId) || '';
  const departmentId = options?.departmentId || extractId((project as any)?.departmentId);

  const resolveLegacyTemplate = async (hint?: string | null): Promise<Buffer> => {
    const preferredContractNumber = sanitizeTemplateValue(
      hint ??
      (invoiceData as any)?.contractNumber ??
      (invoiceData as any)?.contract?.contractNumber ??
      (project as any)?.contractNumber ??
      (project as any)?.contract?.contractNumber ??
      ''
    );
    return getInvoicePdfTemplate(preferredContractNumber || '');
  };

  let pdfTemplateBytes: Buffer | null = null;
  let fieldMappings: Record<string, string> = {};

  // Always load the legacy template first for invoices to mirror historical behaviour
  if (category === 'Invoice') {
    try {
      pdfTemplateBytes = await resolveLegacyTemplate();
    } catch (legacyError) {
      console.warn('Legacy invoice template resolution failed:', sanitizeForLog(legacyError));
      pdfTemplateBytes = null;
    }
  }

  // Attempt to use the new template assignment system when available
  if (!pdfTemplateBytes || category !== 'Invoice') {
    try {
      let template: any = null;
      if (category === 'Invoice') {
        template = await resolveInvoiceTemplate(projectId || '', contractId || '', departmentId);
      } else {
        template = await resolveTemplate(category as any, projectId || '', contractId || '', departmentId);
      }

      if (template) {
        pdfTemplateBytes = Buffer.from(template.base64Data, 'base64');

        // Fetch additional collection data for cross-collection field mapping
        fieldMappings = await mapTemplateData(
          template,
          invoiceData,
          project,
          { contractNumber: sanitizeTemplateValue((invoiceData as any).contractNumber) }
        );
      } else if (!pdfTemplateBytes) {
        pdfTemplateBytes = await resolveLegacyTemplate();
      }
    } catch (error) {
      console.warn('Template resolver failed, using legacy system:', sanitizeForLog(error));
      if (!pdfTemplateBytes) {
        pdfTemplateBytes = await resolveLegacyTemplate();
      }
    }
  }

  if (!pdfTemplateBytes) {
    // Final safeguard to avoid empty buffers
    pdfTemplateBytes = await resolveLegacyTemplate();
  }

  const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
  const form = pdfDoc.getForm();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fields = form.getFields();
  fields.forEach((field) => {
    try {
      const da = (field as any).acroField.getDefaultAppearance();
      if (!da) {
        (field as any).acroField.setDefaultAppearance('/Helv 8 Tf 0 g');
      }
      (field as any).setFontSize?.(8);
    } catch (e) {
      try {
        (field as any).acroField.setDefaultAppearance('/Helv 8 Tf 0 g');
      } catch {
        // Ignore fields that don't support default appearance
      }
    }
  });
  form.updateFieldAppearances(helveticaFont);

  // Fill fields using new template system or legacy fallback
  if (Object.keys(fieldMappings).length > 0) {
    // Use new template system mappings
    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      try {
        form.getTextField(fieldName).setText(sanitizeTemplateValue(value));
      } catch (e) {
        console.warn(`Could not fill mapped field:`, sanitizeForLog(e));
      }
    });
  } else {
    // Legacy field filling
    try {
      form.getTextField('date').setText(formatDate(new Date()));
      form.getTextField('DueDate').setText(formatDate(invoiceData.dueDate));
      form.getTextField('invoiceNumber').setText(sanitizeTemplateValue(invoiceData.invoiceNumber) || '');
      form.getTextField('projectName').setText(sanitizeTemplateValue(invoiceData.projectName) || '');
      form.getTextField('BillingFrom').setText(formatDate(invoiceData.fromDate));
      form.getTextField('BillingTo').setText(formatDate(invoiceData.toDate));
      form.getTextField('ContractNumber').setText(sanitizeTemplateValue(invoiceData.contractNumber) || '');
      form.getTextField('poNumber').setText(sanitizeTemplateValue(invoiceData.poNumber) || '');


      if (invoiceData.contractNumber !== '202262512') {
        form.getTextField('TermOfWeeks').setText(sanitizeTemplateValue(invoiceData.termOfWeek) || '');
        form.getTextField('PMISNumber').setText(sanitizeTemplateValue(invoiceData.pmisNumber) || '');
        form.getTextField('ApprovingSupervisor').setText(sanitizeTemplateValue(invoiceData.approvingSupervisor) || '');
      }
    } catch (e) {
      console.warn('Some PDF fields could not be filled:', e);
    }
  }

  // Fill line items
  if (invoiceData.enrichedItems) {
    (invoiceData.enrichedItems as any[]).forEach((item: any, index: number) => {
      const i = index + 1;
      try {
        form.getTextField(`ProfessionalServices_Personnel_${i}`).setText(sanitizeTemplateValue(item.employeeName) || '');
        form.getTextField(`ProfessionalServices_Company_${i}`).setText(sanitizeTemplateValue(item.companyName) || '');
        form.getTextField(`ProfessionalServices_Description_${i}`).setText(sanitizeTemplateValue(item.serviceName) || '');
        form.getTextField(`ProfessionalServices_Hours_${i}`).setText(sanitizeTemplateValue(item.hours?.toString()) || '0');
        form.getTextField(`ProfessionalServices_Rate_${i}`).setText(sanitizeTemplateValue(item.billingRate?.toFixed(2)) || '0.00');
        form.getTextField(`ProfessionalServices_Amount_${i}`).setText(sanitizeTemplateValue(item.amount?.toFixed(2)) || '0.00');
      } catch (err) {
        console.warn(`Could not fill line item:`, sanitizeForLog(err));
      }
    });
  }

  // Fill expenses with enriched company names
  if (invoiceData.reimbursableExpenses) {
    const enrichedExpenses = (invoiceData.reimbursableExpenses as any[]).map((exp: any) => {
      if (!exp.companyName) {
        const companyId = extractId(exp.companyId);
        const company = (companies as any[]).find((c: any) => c.id === companyId);
        return {
          ...exp,
          companyName: company?.companyName || ''
        };
      }
      return exp;
    });
    
    enrichedExpenses.forEach((exp: any, index: number) => {
      const i = index + 1;
      try {
        form.getTextField(`Expenses_Company_${i}`).setText(sanitizeTemplateValue(exp.companyName) || '');
        form.getTextField(`Expenses_Description_${i}`).setText(sanitizeTemplateValue(exp.description) || '');
        form.getTextField(`Expenses_Date_${i}`).setText(formatDate(exp.date));
        form.getTextField(`Expenses_Amount_${i}`).setText(sanitizeTemplateValue(exp.amount?.toFixed(2)) || '0.00');
      } catch (err) {
        console.warn(`Could not fill expense:`, sanitizeForLog(err));
      }
    });
  }

  // Fill totals
  try {
    form.getTextField('ProfessionalServices_total').setText((invoiceData.invoiceItemsTotal || 0).toFixed(2));
    form.getTextField('Expenses_Total').setText((invoiceData.reimbursableExpensesTotal || 0).toFixed(2));
    form.getTextField('InvoiceTotal').setText((invoiceData.invoiceTotal || 0).toFixed(2));

    if (invoiceData.contractSummary) {
      form
        .getTextField('ContractPOAmount')
        .setText((invoiceData.contractSummary.originalContractPoAmount || 0).toFixed(2));
      form
        .getTextField('PreviouslyInvoiced')
        .setText((invoiceData.contractSummary.previouslyInvoiced || 0).toFixed(2));
      form.getTextField('AmountThisInvoice').setText((invoiceData.invoiceTotal || 0).toFixed(2));
      form
        .getTextField('RemainingPOAmount')
        .setText((invoiceData.contractSummary.remainingPoAmount || 0).toFixed(2));
    }
  } catch (e) {
    console.warn('Could not fill totals:', e);
  }

  form.flatten();
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateClientSidePdf(
  invoiceId: string,
  options?: { category?: 'Invoice' | 'CoverPage' | 'Report' | 'Custom'; userContext?: any; projectId?: string; contractId?: string; departmentId?: string; }
): Promise<{
  pdfBuffer?: Buffer;
  laborReportBuffer?: Buffer;
  success: boolean;
  pdfUrl?: string;
  laborReportUrl?: string;
  error?: string;
}> {
  try {
    // Validate inputs
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    if (!options?.userContext) {
      throw new Error('User context is required');
    }
    const { userContext } = options;

    // Fetch invoice data
    const invoiceData = (await getCollectionData('invoices')).find((inv: any) => inv.id === validatedInvoiceId);
    if (!invoiceData) {
      throw new Error('Invoice not found');
    }

    // Fetch additional data needed for PDF using helper function
    const [employees, companies, services, projects] = await Promise.all([
      getCollectionData('employees'),
      getCollectionData('companies'),
      getCollectionData('services'),
      getCollectionData('projects'),
    ]);

    const projectId = options?.projectId || extractId((invoiceData as any).projectId) || '';
    const project = (projects as any[]).find((p: any) => p.id === projectId);

    // Enrich invoice items with names - extract IDs from DocumentReferences
    const enrichedItems = ((invoiceData as any).invoiceItems as any[])?.map((item: any) => {
      // Extract string IDs from DocumentReferences using utility functions
      const companyId = extractId(item.companyId);
      const employeeId = extractId(item.employeeId);
      const serviceId = extractId(item.serviceId);

      const employee = (employees as any[]).find((e: any) => e.id === employeeId);
      const company = (companies as any[]).find((c: any) => c.id === companyId);
      const service = (services as any[]).find((s: any) => s.id === serviceId);

      return {
        ...item,
        employeeName: (employee as any)?.formalName || 'N/A',
        companyName: (company as any)?.companyName || 'N/A',
        serviceName: (service as any)?.serviceName || 'N/A',
      };
    }) || [];

    // Calculate contract summary
    const toNum = (v: any) => (typeof v === 'number' ? v : Number(v)) || 0;
    const originalContractPoAmount = toNum((project as any)?.originalPoAmount ?? (project as any)?.poAmount);

    // Calculate previously invoiced (simplified for client-side)
    const previouslyInvoiced = toNum((project as any)?.previouslyInvoicedAmount) || 0;
    const remainingPoAmount = originalContractPoAmount - previouslyInvoiced - toNum((invoiceData as any).invoiceTotal);

    const enrichedInvoiceData = {
      ...(invoiceData as any),
      projectName: (project as any)?.projectName || 'N/A',
      enrichedItems,
      contractSummary: {
        originalContractPoAmount,
        previouslyInvoiced,
        remainingPoAmount,
      },
    };

    // Generate PDF using multi-category aware fill function
    const category = options?.category || 'Invoice';
    const contractId = options?.contractId || extractId((project as any)?.contractId) || extractId((invoiceData as any).contractId) || '';
    const departmentId = options?.departmentId || extractId((project as any)?.departmentId) || undefined;

    const pdfBuffer = await fillPdfTemplate(enrichedInvoiceData, companies, projects, {
      category,
      userContext,
      projectId,
      contractId,
      departmentId,
    });

    // Generate Direct Labor Report if timesheet data exists
    let laborReportBuffer: Buffer | undefined;
    let laborReportUrl: string | undefined;

    try {
      const { generateDirectLaborReport, shouldGenerateLaborReport } = await import('@/lib/labor-report-generator');

      if ((shouldGenerateLaborReport as any)(enrichedInvoiceData as any)) {
        console.log(`[Labor Report] Generating for invoice`);
        laborReportBuffer = (await generateDirectLaborReport(enrichedInvoiceData as any, project as any, employees as any[], companies as any[])) || undefined;

        if (laborReportBuffer && typeof window !== 'undefined') {
          const laborBlob = new Blob([new Uint8Array(laborReportBuffer)], { type: 'application/pdf' });
          laborReportUrl = URL.createObjectURL(laborBlob);
          console.log(`[Labor Report] Generated blob URL for invoice`);
        }
      } else {
        console.log(`[Labor Report] Skipping for invoice - no timesheet data`);
      }
    } catch (error) {
      console.warn(`[Labor Report] Failed to generate for invoice ${invoiceId}:`, error);
    }

    // Create blob URL for download only in browser environment
    let pdfUrl: string | undefined;
    if (typeof window !== 'undefined') {
      const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
      pdfUrl = URL.createObjectURL(blob);
      console.log('Generated blob URL for PDF');
    }

    // Update invoice with generated timestamp
    try {
      if (db) {
        const invoiceRef = doc(db, 'invoices', validatedInvoiceId);
        await updateDoc(invoiceRef, {
          pdfGeneratedAt: Timestamp.now(),
          lastPdfGeneration: 'client-side',
        });
      } else if (adminDb) {
        await adminDb.collection('invoices').doc(validatedInvoiceId).update({
          pdfGeneratedAt: AdminTimestamp.now(),
          lastPdfGeneration: 'server-side',
        });
      }
    } catch (updateError) {
      console.warn('Could not update invoice with PDF generation timestamp:', sanitizeForLog(updateError));
    }

    return {
      success: true,
      pdfBuffer,
      laborReportBuffer,
      pdfUrl,
      laborReportUrl,
    };
  } catch (error) {
    console.error('PDF generation error:', sanitizeForLog(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}