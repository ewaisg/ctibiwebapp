'use server';

import { z } from 'zod';
import { getStorage } from 'firebase-admin/storage';
import { validateInvoiceId, validateContractNumber } from '@/lib/security-utils';
import { extractId } from '@/lib/document-reference-utils';
import type { Invoice } from '@/types';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { adminDb, AdminTs, serializeFirestoreValue, snapshotToInvoice, getUserRoleAndName, nowTs, revalidateInvoiceViews } from './invoice-shared';

// Invoice creation schema
const CreateInvoiceSchema = z.object({
  projectId: z.string(),
  contractNumber: z.string().optional(),
  poNumber: z.string(),
  pmisNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  fromDate: z.string(),
  toDate: z.string(),
  dueDate: z.string(),
  termOfWeek: z.string().optional(),
  approvingSupervisor: z.string().optional(),
  invoiceItems: z.array(z.object({
    employeeId: z.string(),
    companyId: z.string(),
    serviceId: z.string(),
    hours: z.number(),
    billingRate: z.number(),
    markdown: z.number(),
    amount: z.number(),
    notes: z.string(),
  })),
  reimbursableExpenses: z.array(z.object({
    amount: z.number(),
    companyId: z.string(),
    date: z.string(),
    description: z.string(),
  })),
  attachedFiles: z.array(z.object({
    fileName: z.string(),
    fileData: z.string(),
    fileType: z.string(),
  })).optional(),
  autofillSource: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string(),
  userRole: z.enum(['Admin', 'Prime', 'Subconsultant']),
  status: z.enum(['draft', 'submitted', 'approved']).optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export type CreateInvoiceResult =
  | { success: true; message: string; invoiceId: string; invoiceNumber: string }
  | { success: false; error: string };

const UpdateInvoiceSchema = CreateInvoiceSchema.omit({ status: true });

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

type UploadedFileResponse = {
  fileName: string;
  fileUrl: string;
  uploadedAt?: string | undefined;
};

export type UpdateInvoiceResult =
  | { success: true; message: string; uploadedFiles?: UploadedFileResponse[] }
  | { success: false; error: string };

// Helper: upload generic invoice attachments to Firebase Storage (Admin SDK) and return signed URLs
async function uploadInvoiceAttachmentsToStorage(
  files: Array<{ fileName: string; fileData: string; fileType: string }>,
  invoiceId: string
): Promise<Array<{ fileName: string; fileUrl: string; uploadedAt?: FirebaseFirestore.Timestamp }>> {
  if (!files?.length) return [];
  const storage = getStorage();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const results: Array<{ fileName: string; fileUrl: string; uploadedAt?: FirebaseFirestore.Timestamp }> = [];

  const safe = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  for (const f of files) {
    try {
      const base = safe(f.fileName || `file-${Date.now()}`);
      const filePath = `invoices/${invoiceId}/attachments/${base}`;
      const buffer = Buffer.from(f.fileData, 'base64');
      const file = bucket.file(filePath);
      await file.save(buffer, { contentType: f.fileType || 'application/octet-stream', resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '2100-01-01' });
      results.push({ fileName: base, fileUrl: signedUrl, uploadedAt: AdminTs.now() });
    } catch (err) {
      console.error('Attachment upload failed:', err);
    }
  }
  return results;
}

async function generateInvoiceNumber(): Promise<string> {
  // Generate a unique invoice number
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);

  return `INV-${year}${month}-${timestamp}`;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  try {
    // Validate and sanitize inputs
    const validatedInput = CreateInvoiceSchema.parse(input);

    if (validatedInput.contractNumber) {
      validateContractNumber(validatedInput.contractNumber);
    }

    const invoiceNumber = validatedInput.invoiceNumber || await generateInvoiceNumber();

    // Resolve lookups for denormalized names
    const { getEmployees, getCompanies, getServices } = await import('./invoice-autofill-actions');
    const [employeesLookup, companiesLookup, servicesLookup] = await Promise.all([
      getEmployees(),
      getCompanies(),
      getServices(),
    ]);

    // Build common calculated fields
    const invoiceItemsTotal = validatedInput.invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const reimbursableExpensesTotal = validatedInput.reimbursableExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const invoiceTotal = invoiceItemsTotal + reimbursableExpensesTotal;

    // Prefer Admin SDK for writes to bypass client security rules
    if (adminDb) {
      // Submitter company resolution
      const firstItem = validatedInput.invoiceItems[0];
      let submitterCompanyRef = firstItem?.companyId ? adminDb.doc(`companies/${firstItem.companyId}`) : null as any;
      let submitterCompany = '';
      if (!submitterCompanyRef) {
        try {
          const userSnap = await adminDb.collection('users').doc(validatedInput.userId).get();
          const userData = userSnap.exists ? (userSnap.data() as any) : null;
          const companyRef = userData?.companyId;
          const companyIdStr = typeof companyRef === 'object' && companyRef?.id
            ? companyRef.id
            : (typeof companyRef === 'string' ? companyRef : null);
          if (companyIdStr) submitterCompanyRef = adminDb.doc(`companies/${companyIdStr}`);
        } catch { /* ignore */ }
      }
      if (submitterCompanyRef) {
        const c = companiesLookup.find(cmp => cmp.id === submitterCompanyRef!.id);
        if (c?.companyName) submitterCompany = c.companyName;
      }

      // IMPORTANT: Do not persist base64 attachments in the invoice document
      const { attachedFiles, ...inputWithoutFiles } = validatedInput;

      // Fetch project to get departmentId
      let departmentPath = null;
      if (validatedInput.projectId) {
        try {
          const projectSnap = await adminDb.collection('projects').doc(validatedInput.projectId).get();
          if (projectSnap.exists) {
            const projectData = projectSnap.data();
            const deptRef = projectData?.departmentId;
            if (deptRef) {
              if (typeof deptRef === 'object' && deptRef.path) {
                departmentPath = deptRef.path;
              } else if (typeof deptRef === 'string') {
                departmentPath = deptRef.startsWith('departments/') ? deptRef : `departments/${deptRef}`;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching project for departmentId:', err);
        }
      }

      const invoiceData = {
        ...inputWithoutFiles, // excludes attachedFiles
        projectId: adminDb.doc(`projects/${validatedInput.projectId}`),
        ...(departmentPath && { departmentId: departmentPath }),
        userId: adminDb.doc(`users/${validatedInput.userId}`),
        invoiceNumber,
        invoiceItemsTotal,
        reimbursableExpensesTotal,
        invoiceTotal,
        submitterCompanyId: submitterCompanyRef,
        submitterCompany,
        autofillSource: validatedInput.autofillSource || 'manual',
        status: validatedInput.status || 'draft',
        createdAt: AdminTs.now(),
        fromDate: AdminTs.fromDate(new Date(validatedInput.fromDate)),
        toDate: AdminTs.fromDate(new Date(validatedInput.toDate)),
        dueDate: AdminTs.fromDate(new Date(validatedInput.dueDate)),
        uploadedFiles: [],
        invoiceItems: validatedInput.invoiceItems.map(item => {
          const emp = employeesLookup.find(e => e.id === item.employeeId);
          const cmp = companiesLookup.find(c => c.id === item.companyId);
          const svc = servicesLookup.find(s => s.id === item.serviceId);
          return {
            ...item,
            companyId: adminDb!.doc(`companies/${item.companyId}`),
            companyName: cmp?.companyName || '',
            employeeId: adminDb!.doc(`employees/${item.employeeId}`),
            employeeName: emp?.formalName || '',
            serviceId: adminDb!.doc(`services/${item.serviceId}`),
            serviceName: svc?.serviceName || '',
          } as any;
        }),
        reimbursableExpenses: validatedInput.reimbursableExpenses.map(expense => {
          const company = companiesLookup.find(c => c.id === expense.companyId);
          return {
            ...expense,
            companyId: adminDb!.doc(`companies/${expense.companyId}`),
            companyName: company?.companyName || '',
            date: AdminTs.fromDate(new Date(expense.date)),
          } as any;
        }),
        ...(validatedInput.status === 'approved' && {
          approvedAt: AdminTs.now(),
          approvedBy: validatedInput.userId,
          submittedAt: AdminTs.now(),
        }),
      } as any;

      // Create invoice (Admin)
      const docRef = await adminDb.collection('invoices').add(invoiceData);

      // Upload files if provided, then update (Admin)
      if (attachedFiles?.length) {
        try {
          const uploadedFiles = await uploadInvoiceAttachmentsToStorage(attachedFiles, docRef.id);
          if (uploadedFiles.length > 0) {
            await adminDb.collection('invoices').doc(docRef.id).update({ uploadedFiles });
          }
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
        }
      }

      const statusMessage = validatedInput.status === 'approved'
        ? 'Invoice created and approved automatically'
        : validatedInput.status === 'draft'
        ? 'Invoice saved as draft'
        : 'Invoice created successfully';

      return { success: true, message: statusMessage, invoiceId: docRef.id, invoiceNumber };
    }

    // Fallback: client SDK (only if Admin not available)
    // Client fallback not implemented for server environment; return a failure explicitly to satisfy type checking
    return { success: false, error: 'Database not initialized: Admin SDK unavailable for writes' };

  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create invoice' };
  }
}

export async function updateInvoiceDetails(invoiceId: string, input: UpdateInvoiceInput): Promise<UpdateInvoiceResult> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized: Admin SDK unavailable for writes' };
  }

  try {
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const validatedInput = UpdateInvoiceSchema.parse(input);

    if (validatedInput.contractNumber) {
      validateContractNumber(validatedInput.contractNumber);
    }

    const invoiceRef = adminDb.collection('invoices').doc(validatedInvoiceId);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
      return { success: false, error: 'Invoice not found' };
    }

    const existing = invoiceSnap.data() as Record<string, unknown>;
    const role = validatedInput.userRole;
    const isAdminOrPrime = role === 'Admin' || role === 'Prime';
    const authorId = typeof existing.userId === 'object' && existing.userId && typeof (existing.userId as any).id === 'string'
      ? (existing.userId as any).id
      : existing.userId;
    const isAuthor = !!authorId && authorId === validatedInput.userId;

    if (!isAuthor && !isAdminOrPrime) {
      return { success: false, error: 'You do not have permission to update this invoice' };
    }

    const currentStatus = String(existing.status || 'draft').toLowerCase();
    const editableStatuses = new Set(['draft', 'rejected', 'revision_requested']);
    if (!editableStatuses.has(currentStatus) && !isAdminOrPrime) {
      return { success: false, error: `Invoice cannot be edited while ${currentStatus}` };
    }

    const ensureId = (value: unknown, field: string) => {
      const id = String(value || '').trim();
      if (!id) {
        throw new Error(`Missing required ${field}`);
      }
      return id;
    };

    const projectId = ensureId(validatedInput.projectId, 'projectId');

    // Safety: do not allow moving an already-approved invoice to a different project,
    // as that would require rolling back and re-applying multiple rollups.
    if (currentStatus === 'approved') {
      const existingProjectId = typeof (existing as any).projectId === 'object' && (existing as any).projectId && typeof (existing as any).projectId.id === 'string'
        ? (existing as any).projectId.id
        : String((existing as any).projectId || '');
      if (existingProjectId && existingProjectId !== projectId) {
        return { success: false, error: 'Approved invoices cannot change project. Create a new invoice instead.' };
      }
    }

    const fromDate = new Date(validatedInput.fromDate);
    const toDate = new Date(validatedInput.toDate);
    const dueDate = new Date(validatedInput.dueDate);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      throw new Error('Invalid date value provided');
    }

    const { getEmployees, getCompanies, getServices } = await import('./invoice-autofill-actions');
    const [employeesLookup, companiesLookup, servicesLookup] = await Promise.all([
      getEmployees(),
      getCompanies(),
      getServices(),
    ]);

    const invoiceItemsTotal = validatedInput.invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const reimbursableExpensesTotal = validatedInput.reimbursableExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const invoiceTotal = invoiceItemsTotal + reimbursableExpensesTotal;
    const invoiceHours = validatedInput.invoiceItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);

    const firstItem = validatedInput.invoiceItems[0];
    let submitterCompanyRef: FirebaseFirestore.DocumentReference | null = null;
    let submitterCompany = typeof existing.submitterCompany === 'string' ? (existing.submitterCompany as string) : '';

    if (firstItem?.companyId) {
      const firstCompanyId = ensureId(firstItem.companyId, 'invoiceItems[0].companyId');
      submitterCompanyRef = adminDb.doc(`companies/${firstCompanyId}`);
      const companyLookup = companiesLookup.find(cmp => cmp.id === firstCompanyId);
      if (companyLookup?.companyName) {
        submitterCompany = companyLookup.companyName;
      }
    } else if (existing.submitterCompanyId) {
      const existingRef = existing.submitterCompanyId as any;
      if (existingRef && typeof existingRef.path === 'string') {
        submitterCompanyRef = existingRef as FirebaseFirestore.DocumentReference;
      } else if (typeof existingRef === 'string' && existingRef.trim()) {
        submitterCompanyRef = adminDb.doc(`companies/${existingRef.trim()}`);
      }
    }

    if (!submitterCompanyRef) {
      try {
        const userSnap = await adminDb.collection('users').doc(validatedInput.userId).get();
        if (userSnap.exists) {
          const userData = userSnap.data() as any;
          const companyRef = userData?.companyId;
          const companyIdStr = typeof companyRef === 'object' && companyRef?.id
            ? companyRef.id
            : (typeof companyRef === 'string' ? companyRef : null);
          if (companyIdStr) {
            submitterCompanyRef = adminDb.doc(`companies/${companyIdStr}`);
            const companyLookup = companiesLookup.find(cmp => cmp.id === companyIdStr);
            if (companyLookup?.companyName) {
              submitterCompany = companyLookup.companyName;
            }
          }
        }
      } catch {
        // ignore lookup errors
      }
    }

    const invoiceItems = validatedInput.invoiceItems.map((item, index) => {
      const employeeId = ensureId(item.employeeId, `invoiceItems[${index}].employeeId`);
      const companyId = ensureId(item.companyId, `invoiceItems[${index}].companyId`);
      const serviceIdRaw = String(item.serviceId ?? '').trim();

      const employee = employeesLookup.find(e => e.id === employeeId);
      const company = companiesLookup.find(c => c.id === companyId);
      const service = serviceIdRaw ? servicesLookup.find(s => s.id === serviceIdRaw) : undefined;

      return {
        ...item,
        companyId: adminDb!.doc(`companies/${companyId}`),
        companyName: company?.companyName || '',
        employeeId: adminDb!.doc(`employees/${employeeId}`),
        employeeName: employee?.formalName || '',
        serviceId: serviceIdRaw ? adminDb!.doc(`services/${serviceIdRaw}`) : null,
        serviceName: service?.serviceName || '',
      } as any;
    });

    const reimbursableExpenses = validatedInput.reimbursableExpenses.map((expense, index) => {
      const companyId = ensureId(expense.companyId, `reimbursableExpenses[${index}].companyId`);
      const company = companiesLookup.find(c => c.id === companyId);
      const expenseDate = new Date(expense.date);
      if (Number.isNaN(expenseDate.getTime())) {
        throw new Error(`Invalid reimbursable expense date at index ${index}`);
      }

      return {
        ...expense,
        companyId: adminDb!.doc(`companies/${companyId}`),
        companyName: company?.companyName || '',
        date: AdminTs.fromDate(expenseDate),
      } as any;
    });

    const invoiceNumber = (validatedInput.invoiceNumber || existing.invoiceNumber || '').toString();

    const updates: Record<string, unknown> = {
      projectId: adminDb.doc(`projects/${projectId}`),
      contractNumber: validatedInput.contractNumber || null,
      poNumber: validatedInput.poNumber || null,
      pmisNumber: validatedInput.pmisNumber || null,
      invoiceNumber: invoiceNumber || null,
      fromDate: AdminTs.fromDate(fromDate),
      toDate: AdminTs.fromDate(toDate),
      dueDate: AdminTs.fromDate(dueDate),
      termOfWeek: validatedInput.termOfWeek || null,
      approvingSupervisor: validatedInput.approvingSupervisor || null,
      invoiceItems,
      reimbursableExpenses,
      invoiceItemsTotal,
      reimbursableExpensesTotal,
      invoiceTotal,
      notes: validatedInput.notes ?? null,
      autofillSource: validatedInput.autofillSource || existing.autofillSource || 'manual',
      updatedAt: AdminTs.now(),
      updatedBy: validatedInput.userId,
    };

    if (submitterCompanyRef) {
      updates.submitterCompanyId = submitterCompanyRef;
      updates.submitterCompany = submitterCompany;
    }

    let uploadedFiles = Array.isArray(existing.uploadedFiles)
      ? [...(existing.uploadedFiles as Array<{ fileName: string; fileUrl: string; uploadedAt?: FirebaseFirestore.Timestamp }>)]
      : [];

    if (validatedInput.attachedFiles?.length) {
      try {
        const newlyUploaded = await uploadInvoiceAttachmentsToStorage(validatedInput.attachedFiles, validatedInvoiceId);
        if (newlyUploaded.length) {
          uploadedFiles = [...uploadedFiles, ...newlyUploaded];
          updates.uploadedFiles = uploadedFiles;
        }
      } catch (uploadError) {
        console.error('Attachment upload failed during update:', uploadError);
      }
    }

    // If Prime/Admin edits an already-approved invoice, keep project rollups consistent
    // by applying only the delta between previous approved totals/hours and the new totals/hours.
    if (currentStatus === 'approved' && isAdminOrPrime) {
      await adminDb.runTransaction(async (t) => {
        const invSnap = await t.get(invoiceRef);
        if (!invSnap.exists) throw new Error('Invoice not found');
        const invNow = invSnap.data() as any;

        const prevTotal = Number(invNow.invoiceTotal || 0);
        const prevHours = Array.isArray(invNow.invoiceItems)
          ? invNow.invoiceItems.reduce((s: number, it: any) => s + (Number(it?.hours) || 0), 0)
          : 0;

        const deltaTotal = Number(invoiceTotal) - prevTotal;
        const deltaHours = Number(invoiceHours) - prevHours;

        const projectRef = adminDb!.collection('projects').doc(projectId);
        const projectSnap = await t.get(projectRef);
        if (!projectSnap.exists) throw new Error('Project not found');
        const proj = projectSnap.data() as any;

        const prevUsed = Number(proj.previouslyInvoicedAmount || 0);
        const prevUsedHours = Number(proj.usedHours || 0);
        const orig = Number(proj.originalPoAmount || 0);
        const co = Number(proj.changeOrderAmount || 0);
        const newPo = Number(proj.newPoAmount || 0);
        const capacity = newPo > 0 ? newPo : (orig + co);

        const nextPreviouslyInvoiced = Math.max(0, prevUsed + deltaTotal);
        const nextUsedHours = Math.max(0, prevUsedHours + deltaHours);
        const nextRemainingPo = Math.max(0, capacity - nextPreviouslyInvoiced);
        const nextRemainingHours = Math.max(0, Number(proj.budgetedHours || 0) - nextUsedHours);

        t.update(projectRef, {
          previouslyInvoicedAmount: nextPreviouslyInvoiced,
          usedHours: nextUsedHours,
          remainingPoAmount: nextRemainingPo,
          remainingHours: nextRemainingHours,
        });

        const existingApprovalSnapshot = invNow.approvalSnapshot as any;
        const nextApprovalSnapshot = existingApprovalSnapshot
          ? { ...existingApprovalSnapshot, total: invoiceTotal, hours: invoiceHours }
          : {
              total: invoiceTotal,
              hours: invoiceHours,
              createdAt: AdminTs.now(),
              approvedBy: invNow.approvedBy || validatedInput.userId,
              approvedByName: invNow.approvedByName || 'Unknown',
            };

        t.update(invoiceRef, { ...updates, approvalSnapshot: nextApprovalSnapshot });
      });
    } else {
      await invoiceRef.update(updates);
    }

    await revalidateInvoiceViews(validatedInvoiceId);

    const serializedUploads: UploadedFileResponse[] = Array.isArray(uploadedFiles)
      ? ((serializeFirestoreValue(uploadedFiles) as Array<Record<string, unknown>>).map((entry) => {
          const fileName = typeof entry.fileName === 'string' ? entry.fileName : '';
          const fileUrl = typeof entry.fileUrl === 'string' ? entry.fileUrl : '';
          const uploadedAt = typeof entry.uploadedAt === 'string' ? entry.uploadedAt : undefined;
          if (!fileName || !fileUrl) {
            return null;
          }
          return { fileName, fileUrl, uploadedAt };
        }).filter(Boolean) as UploadedFileResponse[])
      : [];

    return { success: true, message: 'Invoice updated successfully', uploadedFiles: serializedUploads };
  } catch (error) {
    console.error('Error updating invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update invoice' };
  }
}

export async function submitInvoice(invoiceId: string, userId: string) {
  if (!adminDb) throw new Error('Database not initialized');
  try {
    // Validate inputs
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const validatedUserId = validateInvoiceId(userId); // Same validation pattern
    const invoiceRef = adminDb.collection('invoices').doc(validatedInvoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      throw new Error('Invoice not found');
    }

    await invoiceRef.update({
      status: 'submitted',
      submittedAt: AdminTs.now(),
      submittedBy: validatedUserId,
    });

    let pdfResult: Awaited<ReturnType<typeof generateInvoicePDF>> | null = null;
    try {
      pdfResult = await generateInvoicePDF(validatedInvoiceId);

      if (pdfResult?.success) {
        await invoiceRef.update({
          pdfUrl: pdfResult.pdfUrl,
          pdfFileName: pdfResult.fileName,
          pdfGeneratedAt: AdminTs.now(),
        });
      }
    } catch (pdfError) {
      console.error('PDF generation failed during submission:', pdfError);
    }

    return {
      success: true,
      message: 'Invoice submitted successfully',
      pdfGenerated: Boolean(pdfResult?.success),
      pdfUrl: pdfResult?.pdfUrl,
    };

  } catch (error) {
    console.error('Error submitting invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit invoice',
    };
  }
}

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

// PDF generation using base64 templates
async function generatePDFDocument(invoiceData: Record<string, unknown>, invoiceId: string): Promise<string> {
  try {
    const { generateClientSidePdf } = await import('@/lib/pdf-generator');

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
        const { uploadPdfBufferToStorage } = await import('./invoice-pdf-actions');
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

export async function deleteInvoice(invoiceId: string, requesterUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  try {
    // Basic validation for invoiceId only
    const validatedInvoiceId = validateInvoiceId(invoiceId);

    // Determine requester role
    const { role } = await getUserRoleAndName(requesterUid);
    if (!role) throw new Error('Unauthorized');

    const ref = adminDb.collection('invoices').doc(validatedInvoiceId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error('Invoice not found');
    }
    const inv = snap.data() as any;

    // Author id
    const invAuthorId = (typeof inv.userId === 'object' && inv.userId?.id)
      ? inv.userId.id
      : inv.userId;

    const status = String(inv.status || '').toLowerCase();
    const isHistorical = inv.isHistorical === true;

    // Authorization rules
    if (role === 'Admin' || role === 'Prime') {
      // No restrictions for Admin/Prime (can delete any invoice including historical)
    } else if (role === 'Subconsultant') {
      // Historical invoices can be deleted by the author regardless of status
      // Regular invoices must be the author and in a deletable state
      if (isHistorical && requesterUid === invAuthorId) {
        // Allow deletion of historical invoices by author
      } else {
        const deletableStatuses = new Set(['draft', 'rejected', 'revision_requested']);
        if (requesterUid !== invAuthorId || !deletableStatuses.has(status)) {
          throw new Error('You do not have permission to delete this invoice');
        }
      }
    } else {
      throw new Error('You do not have permission to delete this invoice');
    }

    // Perform delete
    await ref.delete();

    await revalidateInvoiceViews(validatedInvoiceId);
    return { success: true, message: 'Invoice deleted successfully' };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete invoice' };
  }
}

// Delete multiple invoices function
export async function deleteMultipleInvoices(invoiceIds: string[], requesterUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  try {
    const results: Array<{ invoiceId: string; success: boolean; message?: string; error?: string }> = [];
    for (const id of invoiceIds) {
      try {
        const validatedId = validateInvoiceId(id);
        const res = await deleteInvoice(validatedId, requesterUid);
        results.push({ invoiceId: validatedId, ...(res as any) });
      } catch (err: any) {
        results.push({ invoiceId: id, success: false, error: err?.message || String(err) });
      }
    }
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    return {
      success: failureCount === 0,
      message: `${successCount} invoice(s) deleted successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
    };
  } catch (error) {
    console.error('Error deleting multiple invoices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete invoices',
      results: [],
    };
  }
}

// NEW: Fetch a single invoice by document id or by its invoiceNumber using Admin SDK fallback
export async function getInvoiceByIdOrNumber(identifier: string): Promise<Invoice | null> {
  try {
    if (adminDb) {
      // Try by document id
      const byId = await adminDb.collection('invoices').doc(identifier).get();
      if (byId.exists) {
        return snapshotToInvoice(byId);
      }
      // Fallback: query by invoiceNumber
      const q = await adminDb.collection('invoices').where('invoiceNumber', '==', identifier).limit(1).get();
      if (!q.empty) {
        const d = q.docs[0];
        return snapshotToInvoice(d);
      }
    }
  } catch (error) {
    console.error('Error fetching invoice by id/number:', error);
  }
  return null;
}

export async function createHistoricalInvoice(invoiceData: Partial<Invoice>, paymentStatus: string, projectName: string) {
  if (!adminDb) {
    return { success: false, error: 'Database connection not available' };
  }

  try {
    // Ensure isHistorical is true
    const dataToSave = {
      ...invoiceData,
      isHistorical: true,
      createdAt: AdminTimestamp.now(),
    };

    // Convert any Date objects or strings to Timestamps if needed
    // The incoming invoiceData might have Timestamps or Dates depending on how it's passed
    // But since it's coming from a client component via server action, it will be serialized.
    // Dates will be strings or numbers. Timestamps will be objects.

    // We need to ensure the fields are correct for Firestore
    if (typeof dataToSave.fromDate === 'string') dataToSave.fromDate = AdminTimestamp.fromDate(new Date(dataToSave.fromDate)) as any;
    if (typeof dataToSave.toDate === 'string') dataToSave.toDate = AdminTimestamp.fromDate(new Date(dataToSave.toDate)) as any;
    if (typeof dataToSave.dueDate === 'string') dataToSave.dueDate = AdminTimestamp.fromDate(new Date(dataToSave.dueDate)) as any;
    if (typeof dataToSave.approvedAt === 'string') dataToSave.approvedAt = AdminTimestamp.fromDate(new Date(dataToSave.approvedAt)) as any;

    const docRef = await adminDb.collection('invoices').add(dataToSave);

    // Create Payment Tracking record
    const paymentData = {
      invoiceId: docRef.id,
      invoiceNumber: dataToSave.invoiceNumber || '',
      projectId: dataToSave.projectId || '',
      departmentId: dataToSave.departmentId || '',
      projectName: projectName,
      invoiceAmount: dataToSave.invoiceTotal || 0,
      paidAmount: paymentStatus === 'Paid' ? (dataToSave.invoiceTotal || 0) : 0,
      outstandingAmount: paymentStatus === 'Paid' ? 0 : (dataToSave.invoiceTotal || 0),
      status: paymentStatus,
      dueDate: dataToSave.dueDate || AdminTimestamp.now(),
      createdAt: AdminTimestamp.now(),
      updatedAt: AdminTimestamp.now(),
    };

    await adminDb.collection('payment_tracking').add(paymentData);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating historical invoice:', error);
    return { success: false, error: 'Failed to create historical invoice' };
  }
}
