"use client";

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle,
  DollarSign,
  Download,
  Eye,
  History,
  MoreHorizontal,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';

export function InvoiceListActions(props: {
  invoice: any;
  isDeleting: boolean;
  actionLoadingId: string | null;
  isAdminOrPrime: boolean;

  canSubmitAction: (invoice: any) => boolean;
  canApproveAction: (invoice: any) => boolean;
  canRejectAction: (invoice: any) => boolean;
  canGeneratePdfAction: (invoice: any) => boolean;
  canRestorePdfAction: (invoice: any) => boolean;

  onViewInvoiceAction: (invoice: any) => void;
  onSubmitForReviewAction: (invoiceId: string) => void;
  onApproveAction: (invoiceId: string) => void;
  onOpenRejectDialogAction: (invoiceId: string, status: string) => void;
  onGenerateApprovedPdfAction: (invoiceId: string) => void;
  onOpenRestoreDialogAction: (invoice: any) => void;
  onOpenPaymentDrawerAction: (invoice: any) => void;
  onConfirmDeleteInvoiceAction: (invoiceId: string, status: string) => void;
}) {
  const {
    invoice,
    isDeleting,
    actionLoadingId,
    isAdminOrPrime,
    canSubmitAction,
    canApproveAction,
    canRejectAction,
    canGeneratePdfAction,
    canRestorePdfAction,
    onViewInvoiceAction,
    onSubmitForReviewAction,
    onApproveAction,
    onOpenRejectDialogAction,
    onGenerateApprovedPdfAction,
    onOpenRestoreDialogAction,
    onOpenPaymentDrawerAction,
    onConfirmDeleteInvoiceAction,
  } = props;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting || actionLoadingId === invoice?.id}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewInvoiceAction(invoice)}>
          <Eye className="mr-2 h-4 w-4" />
          View/Edit
        </DropdownMenuItem>

        {canSubmitAction(invoice) && invoice?.id && (
          <DropdownMenuItem onClick={() => onSubmitForReviewAction(invoice.id)} disabled={actionLoadingId === invoice.id}>
            <Send className="mr-2 h-4 w-4" />
            {invoice.status === 'rejected' ? 'Resubmit' : 'Submit for Review'}
          </DropdownMenuItem>
        )}

        {canApproveAction(invoice) && invoice?.id && (
          <DropdownMenuItem onClick={() => onApproveAction(invoice.id)} disabled={actionLoadingId === invoice.id}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </DropdownMenuItem>
        )}

        {canRejectAction(invoice) && invoice?.id && (
          <DropdownMenuItem
            onClick={() => onOpenRejectDialogAction(invoice.id, invoice.status)}
            disabled={actionLoadingId === invoice.id}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject...
          </DropdownMenuItem>
        )}

        {isAdminOrPrime && invoice?.pdfUrl ? (
          <DropdownMenuItem
            onClick={() => {
              const sanitizedUrl = String(invoice.pdfUrl).replace(/[<>"']/g, '');
              if (sanitizedUrl) window.open(sanitizedUrl, '_blank');
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Generated PDF
          </DropdownMenuItem>
        ) : null}

        {canGeneratePdfAction(invoice) && invoice?.id && (
          <DropdownMenuItem onClick={() => onGenerateApprovedPdfAction(invoice.id)} disabled={actionLoadingId === invoice.id}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate/ReGenerate PDF
          </DropdownMenuItem>
        )}

        {canRestorePdfAction(invoice) ? (
          <DropdownMenuItem onClick={() => onOpenRestoreDialogAction(invoice)} disabled={actionLoadingId === invoice?.id}>
            <History className="mr-2 h-4 w-4" />
            Restore PDF Version...
          </DropdownMenuItem>
        ) : null}

        {isAdminOrPrime ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onOpenPaymentDrawerAction(invoice)}>
              <DollarSign className="mr-2 h-4 w-4" /> Manage Payment...
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        {(invoice?.isHistorical || ['draft', 'submitted', 'approved'].includes(invoice?.status)) && invoice?.id ? (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onConfirmDeleteInvoiceAction(invoice.id, invoice.status)}
            disabled={isDeleting || actionLoadingId === invoice.id}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
