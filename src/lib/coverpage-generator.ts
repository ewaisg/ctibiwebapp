import { PDFDocument, StandardFonts } from 'pdf-lib';
import { adminDb, getAdminStorage } from '@/lib/firebase-admin';
import { resolveTemplate, mapTemplateData } from '@/lib/template-resolver';
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
  const template = await resolveTemplate('CoverPage', projectId || '', contractId || '', departmentId);
  if (!template) {
    throw new Error('No CoverPage template found for the provided scope');
  }

  // Load PDF bytes
  let pdfTemplateBytes: Buffer | undefined;
  try {
    if ((template as any).base64Data) {
      pdfTemplateBytes = Buffer.from((template as any).base64Data, 'base64');
    } else if ((template as any).storageUrl && (template as any).storageUrl.startsWith('gs://')) {
      const storage = getAdminStorage();
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) throw new Error('Storage bucket env not set');
      const relativePath = (template as any).storageUrl.replace(`gs://${bucketName}/`, '');
      const [bytes] = await storage.bucket(bucketName).file(relativePath).download();
      pdfTemplateBytes = Buffer.from(bytes);
    }
  } catch (e) {
    console.error('Failed to load template bytes for CoverPage:', sanitizeForLog(e));
  }

  if (!pdfTemplateBytes) {
    throw new Error('Unable to load template bytes');
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
  };

  const projectData = undefined; // Not required for cover page
  const contractData = undefined; // Not required, mapping can use generated.* or invoice.*

  const fieldMappings = mapTemplateData(template as any, invoiceData, projectData, contractData, undefined, manualData);

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
