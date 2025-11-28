import { adminDb } from '@/lib/firebase-admin';
import type { Invoice } from '@/types';

export type PaymentAggregate = {
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'pending' | 'partially_paid' | 'write_off';
};

function computeStatus(totalPaid: number, invoiceTotal: number, dueDate?: Date): PaymentAggregate['paymentStatus'] {
  if (totalPaid >= (invoiceTotal || 0)) return 'paid';
  if (totalPaid > 0 && totalPaid < (invoiceTotal || 0)) return 'partially_paid';
  if (dueDate && new Date(dueDate).getTime() < Date.now()) return 'unpaid';
  return 'pending';
}

export async function getPaymentAggregatesForInvoices(invoices: Invoice[]): Promise<Record<string, PaymentAggregate>> {
  if (!adminDb) return {};

  // Build mapping for quick lookups
  const byId: Record<string, { total: number; dueDate?: Date }> = {};
  invoices.forEach(inv => {
    const id = (inv as any).id as string;
    byId[id] = { total: inv.invoiceTotal || 0, dueDate: inv.dueDate ? new Date((inv.dueDate as any).seconds ? (inv.dueDate as any).seconds * 1000 : inv.dueDate as any) : undefined };
  });

  const ids = Object.keys(byId);
  const results: Record<string, PaymentAggregate> = {};

  // Firestore supports 'in' with max 10 values; batch queries
  for (let i = 0; i < ids.length; i += 10) {
    const batchIds = ids.slice(i, i + 10);
    const refs = batchIds.map(id => adminDb!.doc(`invoices/${id}`));
    const snap = await adminDb!.collection('payment_tracking').where('invoiceId', 'in', refs).get();

    const groups = new Map<string, { paid: number; latestOutstanding?: number; latestUpdatedAt?: number }>();

    snap.docs.forEach(doc => {
      const data = doc.data();
      const invRef = data.invoiceId;
      const invId = invRef?.id as string;
      const paid = Number(data.paidAmount || 0);
      const outstanding = Number(data.outstandingAmount || 0);
      const updatedAt = (data.updatedAt && (data.updatedAt.seconds || data.updatedAt._seconds))
        ? Number(data.updatedAt.seconds || data.updatedAt._seconds) * 1000
        : Date.now();

      const curr = groups.get(invId) || { paid: 0, latestOutstanding: undefined, latestUpdatedAt: undefined };
      // Interpret paidAmount as latest cumulative value when present, otherwise sum defensively
      curr.paid = Math.max(curr.paid, paid);
      if (!curr.latestUpdatedAt || updatedAt >= curr.latestUpdatedAt) {
        curr.latestOutstanding = outstanding;
        curr.latestUpdatedAt = updatedAt;
      }
      groups.set(invId, curr);
    });

    // Compute aggregates
    groups.forEach((agg, invId) => {
      const meta = byId[invId] || { total: 0, dueDate: undefined };
      const paidAmount = Number.isFinite(agg.paid) ? agg.paid : 0;
      const outstandingAmount = Number.isFinite(agg.latestOutstanding!) ? agg.latestOutstanding! : Math.max(0, (meta.total || 0) - paidAmount);
      const paymentStatus = computeStatus(paidAmount, meta.total, meta.dueDate);
      results[invId] = { paidAmount, outstandingAmount, paymentStatus };
    });
  }

  // Fill missing invoices with default pending/unpaid based on due date
  ids.forEach(invId => {
    if (!results[invId]) {
      const meta = byId[invId];
      const status = computeStatus(0, meta.total, meta.dueDate);
      results[invId] = { paidAmount: 0, outstandingAmount: meta.total || 0, paymentStatus: status };
    }
  });

  return results;
}
