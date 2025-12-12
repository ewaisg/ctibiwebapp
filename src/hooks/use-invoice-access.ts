import { useMemo } from 'react';
import type { User, Invoice } from '@/types';
import type { UserRole } from '@/types';

export type Access = ReturnType<typeof getInvoiceAccess>;

export function getInvoiceAccess(user: User | null | undefined, invoice: Invoice | null | undefined) {
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
      status: 'draft' as const,
    };
  }

  const role = (user?.role ?? undefined) as UserRole | undefined;
  const status = String(invoice?.status || 'draft').toLowerCase();
  const authorId = (typeof invoice?.userId === 'object' && (invoice?.userId as any)?.id) ? (invoice?.userId as any).id : invoice?.userId;
  const isAuthor = !!user && !!authorId && user.uid === authorId;
  const isAdminOrPrime = role === 'Admin' || role === 'Prime';

  if (status === 'draft') {
    return { canView: isAuthor, isReadOnly: !isAuthor, canSubmit: isAuthor, canResubmit: false, canApprove: false, canReject: false, canGeneratePdf: false, canRestorePdf: false, isAuthor, isAdminOrPrime, status: 'draft' as const };
  }
  if (status === 'submitted') {
    return { canView: true, isReadOnly: true, canSubmit: false, canResubmit: false, canApprove: isAdminOrPrime, canReject: isAdminOrPrime, canGeneratePdf: false, canRestorePdf: false, isAuthor, isAdminOrPrime, status: 'submitted' as const };
  }
  if (status === 'resubmitted') {
    return { canView: true, isReadOnly: true, canSubmit: false, canResubmit: false, canApprove: isAdminOrPrime, canReject: isAdminOrPrime, canGeneratePdf: false, canRestorePdf: false, isAuthor, isAdminOrPrime, status: 'resubmitted' as const };
  }
  if (status === 'rejected') {
    return { canView: true, isReadOnly: !isAuthor, canSubmit: false, canResubmit: isAuthor, canApprove: false, canReject: false, canGeneratePdf: false, canRestorePdf: false, isAuthor, isAdminOrPrime, status: 'rejected' as const };
  }
  if (status === 'approved') {
    return {
      canView: true,
      isReadOnly: !isAdminOrPrime,
      canSubmit: false,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canGeneratePdf: isAdminOrPrime,
      canRestorePdf: isAdminOrPrime && Array.isArray(invoice?.pdfVersions) && (invoice!.pdfVersions as any[]).length > 0,
      isAuthor,
      isAdminOrPrime,
      status: 'approved' as const
    };
  }
  return { canView: !invoice || isAuthor, isReadOnly: !!invoice && !isAuthor, canSubmit: !invoice || (isAuthor && status === 'draft'), canResubmit: false, canApprove: false, canReject: false, canGeneratePdf: false, canRestorePdf: false, isAuthor, isAdminOrPrime, status: 'draft' as const };
}

export function useInvoiceAccess(user: User | null | undefined, invoice: Invoice | null | undefined) {
  // Track specific properties instead of entire objects for better memoization
  const userUid = user?.uid;
  const userRole = user?.role;
  const invoiceStatus = invoice?.status;
  const invoiceUserId = invoice?.userId;
  const invoiceId = invoice?.id;
  const pdfVersionsLength = Array.isArray(invoice?.pdfVersions) ? (invoice.pdfVersions as any[]).length : 0;

  return useMemo(
    () => getInvoiceAccess(user, invoice),
    [user, invoice, userUid, userRole, invoiceStatus, invoiceUserId, invoiceId, pdfVersionsLength]
  );
}
