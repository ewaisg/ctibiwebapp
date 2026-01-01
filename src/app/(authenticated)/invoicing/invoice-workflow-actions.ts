'use server';

import { extractId } from '@/lib/document-reference-utils';
import { notifyAdminsPrimes, notifyAuthor } from '@/lib/notifications';
import type { Invoice } from '@/types';
import { nextSubmissionStatus, normalizeInvoiceStatus } from '@/lib/invoice-status';
import { adminDb, getUserRoleAndName, assertAllowed, nowTs, revalidateInvoiceViews, sumInvoiceHours } from './invoice-shared';

// Submit for review (Subconsultant: from draft -> submitted; from rejected -> resubmitted)
export async function submitInvoiceForReview(invoiceId: string, authorUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(authorUid);
  // All roles can submit their own draft; Subconsultant flow is primary
  assertAllowed(role, ['Admin','Prime','Subconsultant']);

  const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
  await adminDb.runTransaction(async (t) => {
    const snap = await t.get(invoiceRef);
    if (!snap.exists) throw new Error('Invoice not found');
    const inv = snap.data() as any as Invoice;

    const invAuthorId = extractId(inv.userId) || '';
    if (role === 'Subconsultant' && invAuthorId !== authorUid) throw new Error('Cannot submit someone else\'s invoice');

    const cur = normalizeInvoiceStatus((inv as any).status);
    if (cur === 'submitted' || cur === 'resubmitted' || cur === 'approved') {
      throw new Error('Invoice is locked and cannot be submitted');
    }

    const nextStatus = nextSubmissionStatus(cur);
    const history = Array.isArray(inv.history) ? inv.history.slice() : [];
    history.push({
      date: nowTs(),
      notes: nextStatus === 'resubmitted' ? 'Resubmitted by author' : 'Submitted by author',
      status: nextStatus,
      userId: authorUid,
      userName: displayName || 'Unknown',
    } as any);

    const invoiceItems = Array.isArray((inv as any).invoiceItems) ? (inv as any).invoiceItems : [];
    const reimbursableExpenses = Array.isArray((inv as any).reimbursableExpenses) ? (inv as any).reimbursableExpenses : [];
    const invoiceItemsTotal = Number((inv as any).invoiceItemsTotal || 0);
    const reimbursableExpensesTotal = Number((inv as any).reimbursableExpensesTotal || 0);
    const invoiceTotal = Number((inv as any).invoiceTotal || (invoiceItemsTotal + reimbursableExpensesTotal) || 0);

    const submittedSnapshot = {
      capturedAt: nowTs(),
      capturedBy: (inv as any).userId || authorUid,
      capturedByName: (inv as any).submitterName || displayName || 'Unknown',
      invoiceItems,
      reimbursableExpenses,
      invoiceItemsTotal,
      reimbursableExpensesTotal,
      invoiceTotal,
    };

    t.update(invoiceRef, {
      status: nextStatus,
      history,
      // Always clear rejectedNotes when moving into review.
      rejectedNotes: null,
      submittedSnapshot,
    });
  });

  await notifyAdminsPrimes('invoice-submitted', { invoiceId, by: authorUid });
  await revalidateInvoiceViews(invoiceId);

  return { success: true, message: 'Invoice submitted for review' };
}

export async function resubmitInvoice(invoiceId: string, authorUid: string) {
  return submitInvoiceForReview(invoiceId, authorUid);
}

// Approve (Admin/Prime only) with idempotency and rollups
export async function approveInvoice(invoiceId: string, approverUid: string, approvalRunId: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(approverUid);
  assertAllowed(role, ['Admin','Prime']);

  const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
  await adminDb.runTransaction(async (t) => {
    const snap = await t.get(invoiceRef);
    if (!snap.exists) throw new Error('Invoice not found');
    const inv = snap.data() as any as Invoice;

    const cur = normalizeInvoiceStatus((inv as any).status);
    if (cur === 'approved' && (inv.approvalRunId === approvalRunId || !approvalRunId)) {
      return; // idempotent
    }
    if (!(cur === 'submitted' || cur === 'resubmitted' || cur === 'draft')) {
      throw new Error('Invoice not in approvable state');
    }

    const invoiceItemsTotalDerived = Array.isArray((inv as any).invoiceItems)
      ? (inv as any).invoiceItems.reduce((sum: number, item: any) => sum + Number(item?.amount || 0), 0)
      : 0;
    const reimbursableExpensesTotalDerived = Array.isArray((inv as any).reimbursableExpenses)
      ? (inv as any).reimbursableExpenses.reduce((sum: number, exp: any) => sum + Number(exp?.amount || 0), 0)
      : 0;
    const totalDerived = invoiceItemsTotalDerived + reimbursableExpensesTotalDerived;
    const total = Number.isFinite(Number((inv as any).invoiceTotal))
      ? Number((inv as any).invoiceTotal)
      : Number.isFinite(totalDerived)
        ? totalDerived
        : 0;
    const hours = sumInvoiceHours(inv);

    // Update invoice fields
    const history = Array.isArray(inv.history) ? inv.history.slice() : [];
    history.push({ date: nowTs(), notes: 'Approved', status: 'approved', userId: approverUid, userName: displayName || 'Unknown' } as any);

    const approvalSnapshot = {
      total,
      hours,
      createdAt: nowTs(),
      approvedBy: approverUid as any,
      approvedByName: displayName || 'Unknown',
    };

    // Always refresh submittedSnapshot at approval time to avoid drift.
    const submittedSnapshot = {
      capturedAt: nowTs(),
      capturedBy: (inv as any).userId || null,
      capturedByName: (inv as any).submitterName || 'Unknown',
      invoiceItems: Array.isArray((inv as any).invoiceItems) ? (inv as any).invoiceItems : [],
      reimbursableExpenses: Array.isArray((inv as any).reimbursableExpenses) ? (inv as any).reimbursableExpenses : [],
      invoiceItemsTotal: Number.isFinite(Number((inv as any).invoiceItemsTotal))
        ? Number((inv as any).invoiceItemsTotal)
        : invoiceItemsTotalDerived,
      reimbursableExpensesTotal: Number.isFinite(Number((inv as any).reimbursableExpensesTotal))
        ? Number((inv as any).reimbursableExpensesTotal)
        : reimbursableExpensesTotalDerived,
      invoiceTotal: total,
    };

    // Apply project rollups
    const projectId = extractId(inv.projectId);
    if (!projectId) throw new Error('Missing projectId');
    const projectRef = adminDb!.collection('projects').doc(projectId);
    const projectSnap = await t.get(projectRef);
    if (!projectSnap.exists) throw new Error('Project not found');
    const proj = projectSnap.data() as any;

    const prevUsed = Number(proj.previouslyInvoicedAmount || 0);
    const prevHours = Number(proj.usedHours || 0);
    const orig = Number(proj.originalPoAmount || 0);
    const co = Number(proj.changeOrderAmount || 0);
    const newPo = Number(proj.newPoAmount || 0);
    const capacity = newPo > 0 ? newPo : (orig + co);

    const nextPreviouslyInvoiced = prevUsed + total;
    const nextUsedHours = prevHours + hours;
    const nextRemainingPo = Math.max(0, capacity - nextPreviouslyInvoiced);
    const nextRemainingHours = Math.max(0, Number(proj.budgetedHours || 0) - nextUsedHours);

    t.update(projectRef, {
      previouslyInvoicedAmount: nextPreviouslyInvoiced,
      usedHours: nextUsedHours,
      remainingPoAmount: nextRemainingPo,
      remainingHours: nextRemainingHours,
    });

    t.update(invoiceRef, {
      status: 'approved',
      approvedAt: nowTs(),
      approvedBy: approverUid as any,
      approvedByName: displayName || 'Unknown',
      approvalSnapshot,
      approvalRunId,
      history,
      submittedSnapshot,
    });
  });

  await notifyAuthor(extractId((await adminDb!.collection('invoices').doc(invoiceId).get()).data()!.userId)!, 'invoice-approved', { invoiceId, by: approverUid });
  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'Invoice approved' };
}

// Reject (Admin/Prime only). If reversing a prior approval, rollback rollups.
export async function rejectInvoice(invoiceId: string, approverUid: string, reason: string, options?: { reversePriorApproval?: boolean }) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(approverUid);
  assertAllowed(role, ['Admin','Prime']);

  const reverse = Boolean(options?.reversePriorApproval);

  const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
  await adminDb.runTransaction(async (t) => {
    const snap = await t.get(invoiceRef);
    if (!snap.exists) throw new Error('Invoice not found');
    const inv = snap.data() as any as Invoice;

    const cur = String(inv.status || '').toLowerCase();
    if (!(cur === 'submitted' || cur === 'resubmitted' || cur === 'approved')) {
      throw new Error('Invoice not in reviewable state');
    }

    // If reversing a previously approved invoice
    if (reverse && inv.approvalSnapshot) {
      const projectId = extractId(inv.projectId);
      if (projectId) {
        const projectRef = adminDb!.collection('projects').doc(projectId);
        const projectSnap = await t.get(projectRef);
        if (projectSnap.exists) {
          const proj = projectSnap.data() as any;
          const cap = Number(proj.newPoAmount || 0) || (Number(proj.originalPoAmount || 0) + Number(proj.changeOrderAmount || 0));
          const prevUsed = Number(proj.previouslyInvoicedAmount || 0);
          const prevHours = Number(proj.usedHours || 0);
          const nextUsed = Math.max(0, prevUsed - Number(inv.approvalSnapshot.total || 0));
          const nextHours = Math.max(0, prevHours - Number(inv.approvalSnapshot.hours || 0));
          const nextRemainPo = Math.max(0, cap - nextUsed);
          const nextRemainHours = Math.max(0, Number(proj.budgetedHours || 0) - nextHours);
          t.update(projectRef, {
            previouslyInvoicedAmount: nextUsed,
            usedHours: nextHours,
            remainingPoAmount: nextRemainPo,
            remainingHours: nextRemainHours,
          });
        }
      }
    }

    const history = Array.isArray(inv.history) ? inv.history.slice() : [];
    history.push({ date: nowTs(), notes: reason || 'Rejected', status: 'rejected', userId: approverUid, userName: displayName || 'Unknown' } as any);

    t.update(invoiceRef, { status: 'rejected', rejectedNotes: reason || '', history });
  });

  const authorId = extractId((await adminDb!.collection('invoices').doc(invoiceId).get()).data()!.userId)!;
  await notifyAuthor(authorId, 'invoice-rejected', { invoiceId, by: approverUid, reason });
  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'Invoice rejected' };
}

// Return invoice for edits (neutral alternative to rejection)
export async function returnInvoiceForEdits(
  invoiceId: string,
  requesterUid: string,
  reason: string = 'Returned for revisions'
) {
  if (!adminDb) throw new Error('Database not initialized');

  return await adminDb.runTransaction(async (t) => {
    const ref = adminDb!.collection('invoices').doc(invoiceId);
    const snap = await t.get(ref);
    if (!snap.exists) throw new Error('Invoice not found');

    const cur = snap.data()!;
    const currentStatus = String(cur.status || '').toLowerCase();

    // Can return submitted, resubmitted, or approved invoices for edits
    if (!['submitted', 'resubmitted', 'approved'].includes(currentStatus)) {
      throw new Error(`Cannot return ${currentStatus} invoice for edits`);
    }

    // Get requester info
    const reqUser = await adminDb!.collection('users').doc(requesterUid).get();
    if (!reqUser.exists) throw new Error('Requester not found');
    const reqData = reqUser.data()!;
    const displayName = reqData.displayName || reqData.email || 'Unknown';

    const historyEntry = {
      action: 'returned_for_edits',
      timestamp: nowTs(),
      userId: requesterUid,
      userDisplayName: displayName,
      notes: reason,
      previousStatus: cur.status,
      newStatus: 'revision_requested'
    };

    const nextHistory = Array.isArray(cur.history) ? [...cur.history, historyEntry] : [historyEntry];

    t.update(ref, {
      status: 'revision_requested',
      history: nextHistory,
      lastModified: nowTs(),
      lastModifiedBy: requesterUid
    });

    await revalidateInvoiceViews(invoiceId);
    return { success: true, message: 'Invoice returned for edits' };
  });
}
