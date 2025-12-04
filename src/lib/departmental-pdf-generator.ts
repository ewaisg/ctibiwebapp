import { generateClientSidePdf } from '@/lib/pdf-generator';
import { resolveInvoiceTemplate, mapTemplateData, type ResolvedTemplate } from '@/lib/template-resolver';
import { generatePDFFromTemplate } from '@/lib/template-pdf-generator';
import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib';
import { extractId } from '@/lib/document-reference-utils';
import { sanitizeForLog, sanitizeFilePath, sanitizeTemplateValue } from '@/lib/security-utils';
import type { Invoice, Project, Department, Company, PdfTemplate } from '@/types';

/**
 * Generate PDF for departmental compilation with department-level template resolution
 */
export async function generateDepartmentalInvoicePdf(
  invoiceData: Invoice,
  projectData: Project | undefined,
  departmentId: string,
  companies: Company[]
): Promise<{ success: boolean; pdfBuffer?: Buffer; error?: string }> {
  try {
    // Try to resolve template using department-first hierarchy
    const contractId = extractId(projectData?.contractId) || extractId(invoiceData.contractId) || '';
    const projectId = projectData?.id || '';
    
    const { resolveInvoiceTemplate, mapTemplateData } = await import('@/lib/template-resolver');
    
    // Modified template resolution for departmental compilation
    // Priority: Department > Project > Contract > Global
    const resolved = await resolveDepartmentalTemplate(departmentId, projectId, contractId);

    if (resolved) {
      console.log(`[Departmental PDF] Using ${resolved.source} template for department`);

      // Check if it's a visual template
      if (resolved.source === 'visual') {
        console.log('[Departmental PDF] Generating from visual template');
        const visualPdfBytes = await generatePDFFromTemplate(
          resolved.template as any,
          {
            ...invoiceData,
            project: projectData || {},
            contract: companies.find(c => c.id === (projectData?.contractId || invoiceData.contractId)) || {}
          }
        );
        return { success: true, pdfBuffer: Buffer.from(visualPdfBytes) };
      }

      // Otherwise, use PDF template form filling
      const template = resolved.template as any;
      const pdfTemplateBytes = template.storageUrl
        ? await downloadTemplateFromStorage(template.storageUrl)
        : Buffer.from(template.base64Data, 'base64');

      const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
      const form = pdfDoc.getForm();

      // Map data using template configuration
      const mappedData = mapTemplateData(
        template,
        invoiceData,
        projectData || {},
        companies.find(c => c.id === (projectData?.contractId || invoiceData.contractId)) || {}
      );

      // Fill the form fields
      Object.entries(mappedData).forEach(([fieldName, value]) => {
        try {
          const field = form.getField(fieldName);
          if (field instanceof PDFTextField) {
            field.setText(String(value));
          } else if (field instanceof PDFCheckBox) {
            const boolValue = ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
            if (boolValue) field.check();
            else field.uncheck();
          } else if (field instanceof PDFRadioGroup) {
            try {
              field.select(sanitizeTemplateValue(value));
            } catch (error) {
              console.warn('Could not select radio option for field');
            }
          }
        } catch (error) {
          console.warn('Could not fill template field:', sanitizeForLog(error));
        }
      });

      const pdfBytes = await pdfDoc.save();
      return { success: true, pdfBuffer: Buffer.from(pdfBytes) };
    } else {
      console.log(`[Departmental PDF] No department template found, falling back to individual invoice generation`);
      // Fall back to regular invoice generation
      if (!invoiceData.id) {
        return { success: false, error: 'Invoice ID is required' };
      }
      const fallbackProjectId = extractId(invoiceData.projectId) || projectData?.id || '';
      const fallbackContractId = extractId(projectData?.contractId) || extractId(invoiceData.contractId) || '';
      return await generateClientSidePdf(invoiceData.id, {
        category: 'Invoice',
        userContext: { system: 'department-compilation' },
        projectId: fallbackProjectId,
        contractId: fallbackContractId,
        departmentId,
      });
    }
  } catch (error) {
    console.error('[Departmental PDF] Error generating department-level PDF:', error);
    // Fall back to regular invoice generation on error
    if (!invoiceData.id) {
      return { success: false, error: 'Invoice ID is required for fallback' };
    }
    const fallbackProjectId = extractId(invoiceData.projectId) || projectData?.id || '';
    const fallbackContractId = extractId(projectData?.contractId) || extractId(invoiceData.contractId) || '';
    return await generateClientSidePdf(invoiceData.id, {
      category: 'Invoice',
      userContext: { system: 'department-compilation' },
      projectId: fallbackProjectId,
      contractId: fallbackContractId,
      departmentId,
    });
  }
}

/**
 * Resolve template with department-first priority
 */
async function resolveDepartmentalTemplate(
  departmentId: string, 
  projectId: string, 
  contractId: string
) {
  const { adminDb } = await import('@/lib/firebase-admin');
  const { extractId } = await import('@/lib/document-reference-utils');
  
  if (!adminDb) {
    console.error('Firebase Admin SDK not initialized');
    return null;
  }

  try {
    // Template selection hierarchy for departmental compilation: Department > Project > Contract > Global
    const queries = [
      // 1. Department-level template (HIGHEST PRIORITY for departmental compilation)
      adminDb.collection('templateAssignments')
        .where('assignmentType', '==', 'Department')
        .where('assignmentId', '==', departmentId)
        .where('templateType', '==', 'Invoice')
        .where('isActive', '==', true)
        .limit(1),
      
      // 2. Project-level template
      ...(projectId ? [
        adminDb.collection('templateAssignments')
          .where('assignmentType', '==', 'Project')
          .where('assignmentId', '==', projectId)
          .where('templateType', '==', 'Invoice')
          .where('isActive', '==', true)
          .limit(1)
      ] : []),
      
      // 3. Contract-level template
      ...(contractId ? [
        adminDb.collection('templateAssignments')
          .where('assignmentType', '==', 'Contract')
          .where('assignmentId', '==', contractId)
          .where('templateType', '==', 'Invoice')
          .where('isActive', '==', true)
          .limit(1)
      ] : []),
      
      // 4. Global default template
      adminDb.collection('templateAssignments')
        .where('assignmentType', '==', 'Global')
        .where('templateType', '==', 'Invoice')
        .where('isActive', '==', true)
        .limit(1)
    ];

    // Execute queries in priority order
    for (const query of queries) {
      const snapshot = await query.get();
      if (!snapshot.empty) {
        const assignment = snapshot.docs[0].data();
        const templateId = extractId(assignment.templateId);

        // Check templateSource field (defaults to 'pdf' for backward compatibility)
        const templateSource = assignment.templateSource || 'pdf';
        const collectionName = templateSource === 'visual' ? 'visual_templates' : 'pdfTemplates';

        if (templateId) {
          const templateDoc = await adminDb.collection(collectionName).doc(templateId).get();
          if (templateDoc.exists) {
            const template = { id: templateDoc.id, ...templateDoc.data() };
            console.log(`[Departmental Template] Found ${templateSource} template for assignment type:`, sanitizeForLog(assignment.assignmentType));
            return {
              template: template as any,
              source: templateSource as 'pdf' | 'visual'
            };
          }
        }
      }
    }

    console.warn('[Departmental Template] No template found for department');
    return null;
  } catch (error) {
    console.error('[Departmental Template] Error resolving template:', sanitizeForLog(error));
    return null;
  }
}

/**
 * Download template from Firebase Storage
 */
async function downloadTemplateFromStorage(storageUrl: string): Promise<Buffer> {
  const { getAdminStorage } = await import('@/lib/firebase-admin');
  
  const storage = getAdminStorage();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('Storage bucket not configured');
  }
  
  const bucket = storage.bucket(bucketName);
  // Prevent path traversal by using basename only
  const path = require('path');
  const urlPath = storageUrl.replace(`gs://${bucketName}/`, '');
  const fileName = path.basename(urlPath).replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = bucket.file(fileName);
  
  const [fileBuffer] = await file.download();
  return fileBuffer;
}
