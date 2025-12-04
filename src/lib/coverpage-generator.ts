import { PDFDocument, StandardFonts } from 'pdf-lib';
import { adminDb, getAdminStorage } from '@/lib/firebase-admin';
import { resolveTemplate, mapTemplateData, type ResolvedTemplate } from '@/lib/template-resolver';
import { generatePDFFromTemplate } from '@/lib/template-pdf-generator';
import { sanitizeForLog, sanitizeTemplateValue } from '@/lib/security-utils';

export interface GenerateCoverPageParams {
  departmentId: string;
  fromDate: string; // ISO
  toDate: string;   // ISO
  projectId?: string;
  contractId?: string;
  manualData?: Record<string, any>; // optional manual overrides/inputs
}

export async function generateCoverPage(params: GenerateCoverPageParams): Promise<Buffer> {
  const { departmentId, fromDate, toDate, projectId, contractId, manualData } = params;

  if (!adminDb) {
    throw new Error('Database not initialized');
  }

  // Resolve template for category CoverPage with fallback chain
  const resolved = await resolveTemplate('CoverPage', projectId || '', contractId || '', departmentId);
  if (!resolved) {
    throw new Error('No CoverPage template found for the provided scope');
  }

  // Fetch department details for mapping
  let departmentName = '';
  try {
    const dep = await adminDb.collection('departments').doc(departmentId).get();
    if (dep.exists) {
      departmentName = (dep.data() as any)?.departmentName || '';
    }
  } catch (e) {
    console.warn('Failed to fetch department name:', sanitizeForLog(e));
  }

  const billingFrom = new Date(fromDate);
  const billingTo = new Date(toDate);
  const periodLabel = `${billingFrom.toLocaleDateString()} - ${billingTo.toLocaleDateString()}`;

  // Build generic data container reusing invoice mapping channel
  const invoiceData = {
    departmentId,
    departmentName: sanitizeTemplateValue(departmentName),
    billingFrom,
    billingTo,
    periodLabel: sanitizeTemplateValue(periodLabel),
    fromDate,
    toDate,
  };

  // Check if it's a visual template
  if (resolved.source === 'visual') {
    console.log('[CoverPage] Generating from visual template');
    const visualPdfBytes = await generatePDFFromTemplate(
      resolved.template as any,
      {
        ...invoiceData,
        manual: manualData || {}
      }
    );
    return Buffer.from(visualPdfBytes);
  }

  // Otherwise, use PDF template form filling
  const template = resolved.template as any;

  // Load PDF bytes
  let pdfTemplateBytes: Buffer | undefined;
  try {
    if (template.base64Data) {
      pdfTemplateBytes = Buffer.from(template.base64Data, 'base64');
    } else if (template.storageUrl && template.storageUrl.startsWith('gs://')) {
      const storage = getAdminStorage();
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) throw new Error('Storage bucket env not set');
      const relativePath = template.storageUrl.replace(`gs://${bucketName}/`, '');
      const [bytes] = await storage.bucket(bucketName).file(relativePath).download();
      pdfTemplateBytes = Buffer.from(bytes);
    }
  } catch (e) {
    console.error('Failed to load template bytes for CoverPage:', sanitizeForLog(e));
  }

  if (!pdfTemplateBytes) {
    throw new Error('Unable to load template bytes');
  }

  const projectData = undefined; // Not required for cover page
  const contractData = undefined; // Not required, mapping can use generated.* or invoice.*

  const fieldMappings = mapTemplateData(template, invoiceData, projectData, contractData, undefined, manualData);

  // Fill PDF
  const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
  const form = pdfDoc.getForm();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fields = form.getFields();
  fields.forEach((field) => {
    try {
      const da = (field as any).acroField.getDefaultAppearance();
      if (!da) {
        (field as any).acroField.setDefaultAppearance('/Helv 10 Tf 0 g');
      }
      (field as any).setFontSize?.(10);
    } catch {
      // ignore
    }
  });
  form.updateFieldAppearances(helveticaFont);

  Object.entries(fieldMappings).forEach(([fieldName, value]) => {
    try {
      form.getTextField(fieldName).setText(sanitizeTemplateValue(value));
    } catch (e) {
      // ignore missing fields, log to debug
      console.warn('CoverPage: missing field', fieldName);
    }
  });

  form.flatten();
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
