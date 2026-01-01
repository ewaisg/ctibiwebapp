import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, Invoice, UserRole } from '@/types';

interface InvoicePayload {
  projectId: string;
  contractNumber: string;
  poNumber: string;
  pmisNumber: string;
  invoiceNumber: string;
  fromDate: string;
  toDate: string;
  dueDate: string;
  termOfWeek: string;
  approvingSupervisor: string;
  invoiceItems: any[];
  reimbursableExpenses: any[];
  attachedFiles?: any[];
  autofillSource: string;
  notes: string;
  userId: string;
  userRole: UserRole;
}

interface UseInvoiceWorkflowOptions {
  user: User | null;
  existingInvoice?: Invoice | null;
  isAdminOrPrime: boolean;
  isAuthor: boolean;
  invStatus: string;
  onClearUnsavedChanges: () => void;
  onClearAttachedFiles: () => void;
}

export function useInvoiceWorkflow({
  user,
  existingInvoice,
  isAdminOrPrime,
  isAuthor,
  invStatus,
  onClearUnsavedChanges,
  onClearAttachedFiles,
}: UseInvoiceWorkflowOptions) {
  const router = useRouter();
  const { toast } = useToast();

  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const handleCreateInvoice = useCallback(async (
    payload: InvoicePayload,
    status: 'draft' | 'submitted' = 'submitted'
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setActionLoading(true);
    try {
      const { createInvoice } = await import('../app/(authenticated)/invoicing/invoice-crud-actions');

      // Auto-approve for Admin/Prime users
      const finalStatus = (user.role === 'Admin' || user.role === 'Prime') && status === 'submitted'
        ? 'approved'
        : status;

      const result = await createInvoice({ ...payload, status: finalStatus as 'draft' | 'submitted' | 'approved' });

      if (result?.success) {
        onClearUnsavedChanges();
        const statusMessage = finalStatus === 'approved'
          ? 'created and approved automatically'
          : status === 'draft' ? 'saved as draft' : 'created';

        toast({
          title: `Invoice ${statusMessage}`,
          description: `Invoice has been ${statusMessage} successfully.`
        });
        router.push('/invoices');
        return { success: true };
      } else {
        return { success: false, error: result?.error || 'Failed to create invoice' };
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setActionLoading(false);
    }
  }, [user, router, toast, onClearUnsavedChanges]);

  const handleSaveInvoiceChanges = useCallback(async (payload: InvoicePayload) => {
    if (!user || !existingInvoice?.id) return { success: false, error: 'Missing user or invoice ID' };

    setActionLoading(true);
    try {
      const { updateInvoiceDetails } = await import('../app/(authenticated)/invoicing/invoice-crud-actions');
      const res = await updateInvoiceDetails(existingInvoice.id, payload);

      if (res?.success) {
        onClearUnsavedChanges();
        onClearAttachedFiles();
        toast({ title: 'Invoice saved', description: 'Changes have been saved.' });
        router.refresh();
        return { success: true };
      } else {
        toast({
          title: 'Save failed',
          description: res?.error || 'Unable to save invoice changes.',
          variant: 'destructive'
        });
        return { success: false, error: res?.error };
      }
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || String(e),
        variant: 'destructive'
      });
      return { success: false, error: e?.message || String(e) };
    } finally {
      setActionLoading(false);
    }
  }, [user, existingInvoice, router, toast, onClearUnsavedChanges, onClearAttachedFiles]);

  const handleSubmitForReview = useCallback(async (
    payload: InvoicePayload | null,
    isReadOnly: boolean
  ) => {
    if (!user || !existingInvoice?.id) return;

    setActionLoading(true);
    try {
      const { submitInvoiceForReview, approveInvoice } = await import('../app/(authenticated)/invoicing/invoice-workflow-actions');
      const { updateInvoiceDetails } = await import('../app/(authenticated)/invoicing/invoice-crud-actions');

      // Save changes if not read-only
      if (!isReadOnly && payload) {
        const saveRes = await updateInvoiceDetails(existingInvoice.id, payload);
        if (!saveRes?.success) {
          toast({
            title: 'Submit failed',
            description: saveRes?.error || 'Unable to save changes before submission.',
            variant: 'destructive'
          });
          return;
        }
        onClearAttachedFiles();
      }

      const res = await submitInvoiceForReview(existingInvoice.id, user.uid);
      if (res?.success) {
        onClearUnsavedChanges();

        // Auto-approve for Admin/Prime authors
        if (isAdminOrPrime && isAuthor) {
          try {
            const runId = `${existingInvoice.id}-${Date.now()}`;
            await approveInvoice(existingInvoice.id, user.uid, runId);
          } catch (e) {
            // Ignore auto-approve failure, still submitted
          }
        }

        toast({
          title: invStatus === 'rejected' || invStatus === 'revision_requested' ? 'Resubmitted' : 'Submitted for review',
        });
        router.refresh();
      } else {
        toast({
          title: 'Submit failed',
          description: (res as any)?.message || (res as any)?.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'Submit failed',
        description: e?.message || String(e),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }, [user, existingInvoice, isAdminOrPrime, isAuthor, invStatus, router, toast, onClearUnsavedChanges, onClearAttachedFiles]);

  const handleApprove = useCallback(async () => {
    if (!user || !existingInvoice?.id) return;

    setActionLoading(true);
    try {
      const { approveInvoice } = await import('../app/(authenticated)/invoicing/invoice-workflow-actions');
      const runId = `${existingInvoice.id}-${Date.now()}`;
      const res = await approveInvoice(existingInvoice.id, user.uid, runId);

      if (res?.success) {
        toast({ title: 'Invoice approved' });
        router.refresh();
      } else {
        toast({
          title: 'Approval failed',
          description: (res as any)?.message || (res as any)?.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'Approval failed',
        description: e?.message || String(e),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }, [user, existingInvoice, router, toast]);

  const openRejectDialog = useCallback(() => {
    setRejectReason('');
    setRejectDialogOpen(true);
  }, []);

  const handleReject = useCallback(async () => {
    if (!user || !existingInvoice?.id) return;

    setActionLoading(true);
    try {
      const { rejectInvoice } = await import('../app/(authenticated)/invoicing/invoice-workflow-actions');
      const res = await rejectInvoice(existingInvoice.id, user.uid, rejectReason || 'Rejected');

      if (res?.success) {
        toast({ title: 'Invoice rejected' });
        setRejectDialogOpen(false);
        router.refresh();
      } else {
        toast({
          title: 'Rejection failed',
          description: (res as any)?.message || (res as any)?.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'Rejection failed',
        description: e?.message || String(e),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }, [user, existingInvoice, rejectReason, router, toast]);

  const handleGenerateApprovedPdf = useCallback(async () => {
    if (!user || !existingInvoice?.id) return;

    setActionLoading(true);
    try {
      const { generateInvoicePdf } = await import('../app/(authenticated)/invoicing/invoice-pdf-actions');
      const res = await generateInvoicePdf(existingInvoice.id, user.uid);

      if (res?.success) {
        toast({ title: 'PDF generated' });
        router.refresh();
      } else {
        toast({
          title: 'PDF generation failed',
          description: (res as any)?.message || (res as any)?.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'PDF generation failed',
        description: e?.message || String(e),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }, [user, existingInvoice, router, toast]);

  const openRestoreDialog = useCallback(() => {
    if (!existingInvoice?.id) return;
    setRestoreDialogOpen(true);
  }, [existingInvoice]);

  const handleRestoreVersion = useCallback(async (versionNumber: number) => {
    if (!user || !existingInvoice?.id) return;

    setActionLoading(true);
    try {
      const { restoreInvoicePdfVersion } = await import('../app/(authenticated)/invoicing/invoice-pdf-actions');
      const res = await restoreInvoicePdfVersion(
        existingInvoice.id,
        user.uid,
        versionNumber,
        `Restore v${versionNumber}`
      );

      if (res?.success) {
        toast({ title: `Restored to v${versionNumber}` });
        setRestoreDialogOpen(false);
        router.refresh();
      } else {
        toast({
          title: 'Restore failed',
          description: (res as any)?.message || (res as any)?.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'Restore failed',
        description: e?.message || String(e),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(false);
    }
  }, [user, existingInvoice, router, toast]);

  return {
    actionLoading,
    rejectDialogOpen,
    rejectReason,
    restoreDialogOpen,
    setRejectDialogOpen,
    setRejectReason,
    setRestoreDialogOpen,
    handleCreateInvoice,
    handleSaveInvoiceChanges,
    handleSubmitForReview,
    handleApprove,
    openRejectDialog,
    handleReject,
    handleGenerateApprovedPdf,
    openRestoreDialog,
    handleRestoreVersion,
  };
}
