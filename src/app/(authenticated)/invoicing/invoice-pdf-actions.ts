'use server';

import { getStorage } from 'firebase-admin/storage';
import { validateInvoiceId } from '@/lib/security-utils';
import { extractId } from '@/lib/document-reference-utils';
import { adminDb, AdminTs, getUserRoleAndName, assertAllowed, nowTs, revalidateInvoiceViews } from './invoice-shared';
import type { Invoice } from '@/types';

// Helper: upload PDF buffer to Firebase Storage and return a signed URL
export async function uploadPdfBufferToStorage(invoiceId: string, filenameBase: string, buffer: Buffer): Promise<{ url: string; filePath: string; fileName: string; }>
{
  if (!buffer || !buffer.length) throw new Error('Empty PDF buffer');
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const storage = getStorage();
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const safeName = `${filenameBase}-${Date.now()}.pdf`;
  const filePath = `invoices/${invoiceId}/${safeName}`;
  const file = bucket.file(filePath);
  await file.save(buffer, { contentType: 'application/pdf', resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
  // Generate long-lived signed URL
  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '2100-01-01' });
  return { url: signedUrl, filePath, fileName: safeName };
}

// PDF generation using base64 templates
async function generatePDFDocument(invoiceData: Record<string, unknown>, invoiceId: string): Promise<string> {
  try {
    const { generateClientSidePdf } = await import('@/lib/pdf-generator');
    const { extractId } = await import('@/lib/document-reference-utils');

    const projectId = extractId(invoiceData?.projectId as any) || '';
    const contractId = extractId(invoiceData?.contractId as any) || '';

    const result = await generateClientSidePdf(invoiceId, {
      category: 'Invoice',
      userContext: { system: 'invoicing-actions' },
      projectId,
      contractId,
    });
    const filenameBase = `invoice-${(invoiceData as any).invoiceNumber || invoiceId}`;
    if (result.success) {
      if (result.pdfUrl) {
        return result.pdfUrl;
      }
      if (result.pdfBuffer && typeof window === 'undefined') {
        // Server: upload buffer to Storage and return durable URL
        const uploaded = await uploadPdfBufferToStorage(invoiceId, filenameBase, result.pdfBuffer);
        return uploaded.url;
      }
    }
    throw new Error(result.error || 'PDF generation failed');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

// Generate PDF for existing invoice (used during submission)
export async function generateInvoicePDF(invoiceId: string) {
  if (!adminDb) throw new Error('Database not initialized');
  try {
    // Validate input
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const invoiceRef = adminDb.collection('invoices').doc(validatedInvoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      throw new Error('Invoice not found');
    }
    const invoiceData = invoiceSnap.data() ?? {};
    const pdfUrl = await generatePDFDocument(invoiceData, validatedInvoiceId);

    return {
      success: true,
      message: 'PDF generated successfully',
      pdfUrl,
      fileName: `invoice-${(invoiceData as any).invoiceNumber || validatedInvoiceId}.pdf`,
    };

  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}

// Generate PDF (Admin/Prime only, approved status). Append version and update current.
export async function generateInvoicePdf(invoiceId: string, requesterUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(requesterUid);
  assertAllowed(role, ['Admin','Prime']);

  // Ensure approved status
  const invSnapAdmin = await adminDb.collection('invoices').doc(invoiceId).get();
  if (!invSnapAdmin.exists) throw new Error('Invoice not found');
  const inv = invSnapAdmin.data() as any as Invoice;
  if (String(inv.status || '').toLowerCase() !== 'approved') throw new Error('PDF generation allowed only for approved invoices');

  // Use existing generator
  const { generateClientSidePdf } = await import('@/lib/pdf-generator');
  const projectId = extractId(inv.projectId) || '';
  const contractId = extractId((inv as any).contractId) || '';

  const filenameBase = `invoice-${inv.invoiceNumber || invoiceId}`;

  const pdfRes = await generateClientSidePdf(invoiceId, {
    category: 'Invoice',
    userContext: { system: 'invoicing-actions' },
    projectId,
    contractId,
  });
  let pdfUrl = pdfRes?.pdfUrl;
  if (!pdfUrl) {
    if (pdfRes?.success && pdfRes?.pdfBuffer && typeof window === 'undefined') {
      const uploaded = await uploadPdfBufferToStorage(invoiceId, filenameBase, pdfRes.pdfBuffer);
      pdfUrl = uploaded.url;
    } else {
      throw new Error(pdfRes?.error || 'PDF generation failed');
    }
  }

  // Append pdf version in transaction
  await adminDb.runTransaction(async (t) => {
    const ref = adminDb!.collection('invoices').doc(invoiceId);
    const s = await t.get(ref);
    if (!s.exists) throw new Error('Invoice not found');
    const cur = s.data() as any;
    const counter = Number(cur.pdfVersionCounter || 0) + 1;

    const pdfVersion = {
      createdAt: nowTs(),
      uid: requesterUid as any,
      createdByName: displayName || 'Unknown',
      fileName: `${filenameBase}-v${counter}.pdf`,
      notes: 'Generated',
      type: counter === 1 ? 'initial' : 'replacement',
      url: pdfUrl,
      version: counter,
    };

    const nextVersions = Array.isArray(cur.pdfVersions) ? [...cur.pdfVersions, pdfVersion] : [pdfVersion];

    t.update(ref, {
      pdfUrl,
      pdfFileName: pdfVersion.fileName,
      pdfVersions: nextVersions,
      pdfVersionCounter: counter,
    });
  });

  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'PDF generated', pdfUrl: (await adminDb.collection('invoices').doc(invoiceId).get()).data()?.pdfUrl };
}

// Submit internal revision (Admin/Prime only, approved status)
export async function submitInvoiceWithInternalChanges(invoiceId: string, requesterUid: string, notes?: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(requesterUid);
  assertAllowed(role, ['Admin','Prime']);

  const invSnapAdmin = await adminDb.collection('invoices').doc(invoiceId).get();
  if (!invSnapAdmin.exists) throw new Error('Invoice not found');
  const inv = invSnapAdmin.data() as any as Invoice;
  if (String(inv.status || '').toLowerCase() !== 'approved') throw new Error('Only approved invoices can be revised');

  // Simulate generating a new PDF from internal edits (re-use generator but mark type)
  const { generateClientSidePdf } = await import('@/lib/pdf-generator');
  const projectId = extractId(inv.projectId) || '';
  const contractId = extractId((inv as any).contractId) || '';
  const filenameBase = `invoice-${inv.invoiceNumber || invoiceId}`;

  const pdfRes = await generateClientSidePdf(invoiceId, {
    category: 'Invoice',
    userContext: { system: 'invoicing-internal-revision' },
    projectId,
    contractId,
  });
  if (!pdfRes?.success || !pdfRes?.pdfUrl) throw new Error(pdfRes?.error || 'PDF generation failed');

  await adminDb.runTransaction(async (t) => {
    const ref = adminDb!.collection('invoices').doc(invoiceId);
    const s = await t.get(ref);
    if (!s.exists) throw new Error('Invoice not found');
    const cur = s.data() as any;
    const counter = Number(cur.pdfVersionCounter || 0) + 1;

    const pdfVersion = {
      createdAt: nowTs(),
      uid: requesterUid as any,
      createdByName: displayName || 'Unknown',
      fileName: `${filenameBase}-v${counter}.pdf`,
      notes: notes || 'Internal revision',
      type: 'internal-revision',
      url: pdfRes.pdfUrl,
      version: counter,
    };

    const nextVersions = Array.isArray(cur.pdfVersions) ? [...cur.pdfVersions, pdfVersion] : [pdfVersion];

    t.update(ref, {
      pdfUrl: pdfRes.pdfUrl,
      pdfFileName: pdfVersion.fileName,
      pdfVersions: nextVersions,
      pdfVersionCounter: counter,
    });
  });

  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'Internal revision submitted' };
}

// Restore specific pdf version (Admin/Prime only, approved status)
export async function restoreInvoicePdfVersion(invoiceId: string, requesterUid: string, versionNumber: number, notes?: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(requesterUid);
  assertAllowed(role, ['Admin','Prime']);

  await adminDb.runTransaction(async (t) => {
    const ref = adminDb!.collection('invoices').doc(invoiceId);
    const s = await t.get(ref);
    if (!s.exists) throw new Error('Invoice not found');
    const cur = s.data() as any;
    if (String(cur.status || '').toLowerCase() !== 'approved') throw new Error('Only approved invoices can restore PDF');

    const versions = Array.isArray(cur.pdfVersions) ? cur.pdfVersions : [];
    const target = versions.find((v: any) => v.version === versionNumber);
    if (!target) throw new Error('Version not found');

    const counter = Number(cur.pdfVersionCounter || 0) + 1;
    const replacement = {
      createdAt: nowTs(),
      uid: requesterUid as any,
      createdByName: displayName || 'Unknown',
      fileName: target.fileName,
      notes: notes || `Restore v${versionNumber}`,
      type: 'replacement',
      url: target.url,
      version: counter,
    };

    const nextVersions = [...versions, replacement];

    t.update(ref, {
      pdfUrl: target.url,
      pdfFileName: target.fileName,
      pdfVersions: nextVersions,
      pdfVersionCounter: counter,
    });
  });

  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'PDF version restored' };
}
