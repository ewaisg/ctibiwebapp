import type { User, Invoice, UserRole, InvoiceItemForm } from '@/types';
import { normalizeInvoiceStatus } from '@/lib/invoice-status';

interface InvoiceAccess {
  canView: boolean;
  isReadOnly: boolean;
  canSubmit: boolean;
  canResubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canGeneratePdf: boolean;
  canRestorePdf: boolean;
  isAuthor: boolean;
  isAdminOrPrime: boolean;
  status: string;
}

/**
 * Determines access and available actions based on invoice status, user role, and authorship
 */
export function getInvoiceAccess(
  user: User | null | undefined,
  invoice: any | undefined
): InvoiceAccess {
  // New invoices: allow creation for the signed-in user
  if (!invoice) {
    const role = (user?.role ?? undefined) as UserRole | undefined;
    const isAdminOrPrime = role === 'Admin' || role === 'Prime';
    return {
      canView: !!user,
      isReadOnly: false,
      canSubmit: !!user,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor: !!user,
      isAdminOrPrime,
      status: 'draft',
    };
  }

  const role = (user?.role ?? undefined) as UserRole | undefined;
  const status = normalizeInvoiceStatus(invoice?.status);
  const authorId = (typeof invoice?.userId === 'object' && (invoice?.userId as any)?.id)
    ? (invoice?.userId as any).id
    : invoice?.userId;
  const isAuthor = !!user && !!authorId && user.uid === authorId;
  const isAdminOrPrime = role === 'Admin' || role === 'Prime';

  // Draft: If author: editable, If not author: not viewable
  if (status === 'draft') {
    return {
      canView: isAuthor,
      isReadOnly: !isAuthor,
      canSubmit: isAuthor,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status,
    };
  }

  // Submitted: Everyone read-only, Admin/Prime can Approve or Reject
  if (status === 'submitted') {
    return {
      canView: true,
      isReadOnly: true,
      canSubmit: false,
      canResubmit: false,
      canApprove: isAdminOrPrime,
      canReject: isAdminOrPrime,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status,
    };
  }

  // Resubmitted: Everyone read-only, Admin/Prime can Approve or Reject
  if (status === 'resubmitted') {
    return {
      canView: true,
      isReadOnly: true,
      canSubmit: false,
      canResubmit: false,
      canApprove: isAdminOrPrime,
      canReject: isAdminOrPrime,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status,
    };
  }

  // Rejected: If author: editable and can Resubmit, Others: read-only
  if (status === 'rejected') {
    return {
      canView: true,
      isReadOnly: !isAuthor,
      canSubmit: false,
      canResubmit: isAuthor,
      canApprove: false,
      canReject: false,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status,
    };
  }

  // Revision requested: If author: editable and can Resubmit, Others: read-only
  if (status === 'revision_requested') {
    return {
      canView: true,
      isReadOnly: !isAuthor,
      canSubmit: false,
      canResubmit: isAuthor,
      canApprove: false,
      canReject: false,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status,
    };
  }

  // Approved: Everyone read-only, Admin/Prime can Generate/Refresh PDF and Restore PDF
  if (status === 'approved') {
    return {
      canView: true,
      isReadOnly: !isAdminOrPrime,
      canSubmit: false,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canGeneratePdf: isAdminOrPrime,
      canRestorePdf:
        isAdminOrPrime &&
        Array.isArray(invoice?.pdfVersions) &&
        (invoice!.pdfVersions as any[]).length > 0,
      isAuthor,
      isAdminOrPrime,
      status,
    };
  }

  // Default fallback - treat as draft if status is unknown
  return {
    canView: !invoice || isAuthor,
    isReadOnly: !!invoice && !isAuthor,
    canSubmit: !invoice || (isAuthor && status === 'draft'),
    canResubmit: false,
    canApprove: false,
    canReject: false,
    canGeneratePdf: false,
    canRestorePdf: false,
    isAuthor,
    isAdminOrPrime,
    status,
  };
}

interface ReimbursableExpenseForm {
  amount: string;
  companyId: string;
  date: Date | null;
  description: string;
}

interface InvoiceFormData {
  projectId: string;
  contractNumber: string;
  poNumber: string;
  pmisNumber: string;
  invoiceNumber: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
  dueDate: Date | undefined;
  termOfWeek: string;
  approvingSupervisor: string;
  invoiceItems: InvoiceItemForm[];
  reimbursableExpenses: ReimbursableExpenseForm[];
  attachedFiles: File[];
  notes: string;
}

/**
 * Converts form data into the payload structure expected by server actions
 */
export async function prepareInvoicePayload(
  formData: InvoiceFormData,
  user: User,
  initialFormData?: { action?: 'autofill' | 'manual' },
  existingInvoice?: Invoice | null,
  isEditing?: boolean
) {
  if (!user) throw new Error('User must be authenticated');

  // Build attachments
  const attachments: Array<{ fileName: string; fileData: string; fileType: string }> = [];
  for (const file of formData.attachedFiles) {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    attachments.push({ fileName: file.name, fileData: base64, fileType: file.type });
  }

  return {
    projectId: formData.projectId,
    contractNumber: formData.contractNumber,
    poNumber: formData.poNumber,
    pmisNumber: formData.pmisNumber,
    invoiceNumber: formData.invoiceNumber,
    fromDate: formData.fromDate!.toISOString(),
    toDate: formData.toDate!.toISOString(),
    dueDate: formData.dueDate!.toISOString(),
    termOfWeek: formData.termOfWeek,
    approvingSupervisor: formData.approvingSupervisor,
    invoiceItems: formData.invoiceItems.map((item) => ({
      employeeId: typeof item.employeeId === 'string' ? item.employeeId : String(item.employeeId),
      companyId: typeof item.companyId === 'string' ? item.companyId : String(item.companyId),
      serviceId: typeof item.serviceId === 'string' ? item.serviceId : String(item.serviceId),
      hours: item.hours,
      billingRate: item.billingRate,
      markdown: item.markdown,
      amount: item.amount,
      notes: item.notes,
    })),
    reimbursableExpenses: formData.reimbursableExpenses.map((expense) => ({
      amount: parseFloat(expense.amount) || 0,
      companyId: String(expense.companyId || ''),
      date: expense.date?.toISOString() || new Date().toISOString(),
      description: expense.description,
    })),
    attachedFiles: attachments.length > 0 ? attachments : undefined,
    // Preserve autofillSource when editing existing invoice, otherwise set based on initialFormData
    autofillSource:
      isEditing && existingInvoice?.autofillSource
        ? existingInvoice.autofillSource
        : initialFormData?.action === 'autofill'
        ? 'timesheet'
        : 'manual',
    notes: formData.notes,
    userId: user.uid,
    userRole: user.role,
  };
}

/**
 * Status color mapping for invoice statuses
 */
export const statusColors: Record<
  'draft' | 'submitted' | 'approved' | 'rejected' | 'resubmitted' | 'revision_requested',
  string
> = {
  draft: 'bg-yellow-500 text-white',
  submitted: 'bg-blue-500 text-white',
  approved: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white',
  resubmitted: 'bg-blue-500 text-white',
  revision_requested: 'bg-yellow-500 text-white',
};
