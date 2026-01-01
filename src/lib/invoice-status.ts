export type InvoiceStatus =
  | 'draft'
  | 'submitted'
  | 'resubmitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested';

export function normalizeInvoiceStatus(input: unknown): InvoiceStatus {
  const s = String(input ?? 'draft').toLowerCase();
  switch (s) {
    case 'draft':
    case 'submitted':
    case 'resubmitted':
    case 'approved':
    case 'rejected':
    case 'revision_requested':
      return s;
    default:
      return 'draft';
  }
}

export function isPendingInvoiceStatus(status: unknown): boolean {
  const s = normalizeInvoiceStatus(status);
  return s === 'submitted' || s === 'resubmitted';
}

export function nextSubmissionStatus(currentStatus: unknown): 'submitted' | 'resubmitted' {
  const cur = normalizeInvoiceStatus(currentStatus);
  return cur === 'rejected' || cur === 'revision_requested' ? 'resubmitted' : 'submitted';
}

export function matchesStatusFilter(invoiceStatus: unknown, filter: string): boolean {
  if (!filter || filter === 'all') return true;

  const inv = normalizeInvoiceStatus(invoiceStatus);
  if (filter === 'submitted') return inv === 'submitted' || inv === 'resubmitted';
  if (filter === 'rejected') return inv === 'rejected' || inv === 'revision_requested';

  return inv === filter;
}
