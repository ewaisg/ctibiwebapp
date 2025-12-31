'use server';

import {
  adminDb,
  Timestamp,
  sanitizeForLog,
} from './admin-shared';

export async function recordPayment(paymentData: {
  invoiceId: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  paidAmount: number;
  paymentDate: Date;
  paymentMethod: 'Check' | 'ACH' | 'Wire' | 'Credit Card';
  paymentReference?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; payment?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    // Get invoice to calculate outstanding amount
    const invoiceDoc = await adminDb!.collection('invoices').doc(paymentData.invoiceId).get();
    if (!invoiceDoc.exists) {
      return { success: false, message: "Invoice not found" };
    }

    const invoice = invoiceDoc.data();
    const invoiceAmount = invoice?.invoiceTotal || 0;
    const currentPaidAmount = paymentData.paidAmount;
    const outstandingAmount = Math.max(0, invoiceAmount - currentPaidAmount);
    let departmentId = invoice?.departmentId || null;

    if (!departmentId && paymentData.projectId) {
      try {
        const projectDoc = await adminDb!.collection('projects').doc(paymentData.projectId).get();
        if (projectDoc.exists) {
          const projectData = projectDoc.data();
          const deptRef = projectData?.departmentId;
          if (deptRef) {
            if (typeof deptRef === 'object' && deptRef.path) {
              departmentId = deptRef.path;
            } else if (typeof deptRef === 'string') {
              departmentId = deptRef.startsWith('departments/') ? deptRef : `departments/${deptRef}`;
            }
          }
        }
      } catch (e) {
        console.error('Error fetching project for departmentId fallback:', e);
      }
    }

    let status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
    if (currentPaidAmount >= invoiceAmount) {
      status = 'Paid';
    } else if (currentPaidAmount > 0) {
      status = 'Partial';
    } else if (invoice?.dueDate && new Date() > invoice.dueDate.toDate()) {
      status = 'Overdue';
    }

    const paymentDoc = {
      invoiceId: adminDb!.doc(`invoices/${paymentData.invoiceId}`),
      invoiceNumber: paymentData.invoiceNumber,
      projectId: adminDb!.doc(`projects/${paymentData.projectId}`),
      ...(departmentId && { departmentId }),
      projectName: paymentData.projectName,
      invoiceAmount,
      paidAmount: currentPaidAmount,
      outstandingAmount,
      paymentDate: Timestamp.fromDate(paymentData.paymentDate),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference || null,
      status,
      dueDate: invoice?.dueDate || Timestamp.now(),
      notes: paymentData.notes || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await adminDb!.collection('payment_tracking').add(paymentDoc);

    // Return a JSON-serializable payload (no DocumentReferences/Timestamps)
    const clientPayment = {
      id: docRef.id,
      invoiceId: paymentData.invoiceId,
      invoiceNumber: paymentData.invoiceNumber,
      projectId: paymentData.projectId,
      projectName: paymentData.projectName,
      invoiceAmount,
      paidAmount: currentPaidAmount,
      outstandingAmount,
      paymentDate: paymentData.paymentDate.toISOString(),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference || null,
      status,
      dueDate: invoice?.dueDate ? invoice.dueDate.toDate().toISOString() : null,
      notes: paymentData.notes || null,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: "Payment recorded successfully",
      payment: clientPayment
    };
  } catch (error) {
    console.error('Error recording payment:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to record payment"
    };
  }
}

export async function getPaymentHistory(invoiceId: string): Promise<{ success: boolean; items?: any[]; message?: string }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  try {
    const invRef = adminDb!.doc(`invoices/${invoiceId}`);
    const snap = await adminDb!
      .collection('payment_tracking')
      .where('invoiceId', '==', invRef)
      .orderBy('createdAt', 'desc')
      .get();

    const items = snap.docs.map(d => {
      const data = d.data() as any;
      const paymentDateTs = data.paymentDate;
      const dueDateTs = data.dueDate;
      const createdAtTs = data.createdAt;
      const updatedAtTs = data.updatedAt;
      const invoiceRef = data.invoiceId;
      const projectRef = data.projectId;
      return {
        id: d.id,
        invoiceId: typeof invoiceRef === 'object' && invoiceRef?.id ? invoiceRef.id : invoiceId,
        projectId: typeof projectRef === 'object' && projectRef?.id ? projectRef.id : null,
        invoiceNumber: data.invoiceNumber,
        projectName: data.projectName,
        invoiceAmount: data.invoiceAmount,
        paidAmount: data.paidAmount,
        outstandingAmount: data.outstandingAmount,
        paymentMethod: data.paymentMethod ?? null,
        paymentReference: data.paymentReference ?? null,
        status: data.status,
        notes: data.notes ?? null,
        entryType: data.entryType,
        deltaAmount: data.deltaAmount,
        paymentDate: paymentDateTs ? paymentDateTs.toDate().toISOString() : null,
        dueDate: dueDateTs ? dueDateTs.toDate().toISOString() : null,
        createdAt: createdAtTs ? createdAtTs.toDate().toISOString() : null,
        updatedAt: updatedAtTs ? updatedAtTs.toDate().toISOString() : null,
      };
    });

    return { success: true, items };
  } catch (error) {
    console.error('Error fetching payment history:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch payment history' };
  }
}

export async function addPaymentEntry(args: {
  invoiceId: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  entryType: 'payment' | 'write_off' | 'credit' | 'refund';
  amount: number;
  paymentDate?: Date;
  paymentMethod?: 'Check' | 'ACH' | 'Wire' | 'Credit Card';
  paymentReference?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; entry?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const invoiceDoc = await adminDb!.collection('invoices').doc(args.invoiceId).get();
    if (!invoiceDoc.exists) return { success: false, message: 'Invoice not found' };

    const invoice = invoiceDoc.data() as any;
    const invoiceAmount = Number(invoice?.invoiceTotal || 0);
    const dueDateTs = invoice?.dueDate;
    let departmentId = invoice?.departmentId || null;

    if (!departmentId && args.projectId) {
      try {
        const projectDoc = await adminDb!.collection('projects').doc(args.projectId).get();
        if (projectDoc.exists) {
          const projectData = projectDoc.data();
          const deptRef = projectData?.departmentId;
          if (deptRef) {
            if (typeof deptRef === 'object' && deptRef.path) {
              departmentId = deptRef.path;
            } else if (typeof deptRef === 'string') {
              departmentId = deptRef.startsWith('departments/') ? deptRef : `departments/${deptRef}`;
            }
          }
        }
      } catch (e) {
        console.error('Error fetching project for departmentId fallback:', e);
      }
    }

    // Get latest cumulative values
    const invRef = adminDb!.doc(`invoices/${args.invoiceId}`);
    const latestSnap = await adminDb!
      .collection('payment_tracking')
      .where('invoiceId', '==', invRef)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    const latest = latestSnap.empty ? null : latestSnap.docs[0].data();
    const prevPaid = Number(latest?.paidAmount || 0);
    const prevOutstanding = Number(latest?.outstandingAmount ?? Math.max(0, invoiceAmount - prevPaid));

    const delta = Math.max(0, Number(args.amount || 0));
    if (!Number.isFinite(delta) || delta <= 0) {
      return { success: false, message: 'Enter a valid positive amount' };
    }

    // Logical validations
    if (args.entryType === 'payment') {
      if (prevOutstanding <= 0) {
        return { success: false, message: 'Invoice is fully paid. No additional payments allowed.' };
      }
      if (delta > prevOutstanding) {
        return { success: false, message: 'Payment amount exceeds outstanding balance.' };
      }
    } else if (args.entryType === 'refund') {
      if (prevPaid <= 0) {
        return { success: false, message: 'No payments recorded to refund.' };
      }
      if (delta > prevPaid) {
        return { success: false, message: 'Refund amount exceeds total paid.' };
      }
    } else if (args.entryType === 'write_off' || args.entryType === 'credit') {
      if (prevOutstanding <= 0) {
        return { success: false, message: 'No outstanding balance to adjust.' };
      }
      if (delta > prevOutstanding) {
        return { success: false, message: 'Adjustment amount exceeds outstanding balance.' };
      }
    }

    let newPaid = prevPaid;
    let newOutstanding = prevOutstanding;

    switch (args.entryType) {
      case 'payment':
        newPaid = prevPaid + delta;
        newOutstanding = Math.max(0, invoiceAmount - newPaid);
        break;
      case 'write_off':
      case 'credit':
        newOutstanding = Math.max(0, prevOutstanding - delta);
        break;
      case 'refund':
        newPaid = Math.max(0, prevPaid - delta);
        newOutstanding = Math.max(0, invoiceAmount - newPaid);
        break;
    }

    let derivedStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
    if (newPaid >= invoiceAmount) derivedStatus = 'Paid';
    else if (newPaid > 0) derivedStatus = 'Partial';
    else if (dueDateTs && new Date() > dueDateTs.toDate()) derivedStatus = 'Overdue';

    const docData = {
      invoiceId: invRef,
      invoiceNumber: args.invoiceNumber,
      projectId: adminDb!.doc(`projects/${args.projectId}`),
      ...(departmentId && { departmentId }),
      projectName: args.projectName,
      invoiceAmount,
      paidAmount: newPaid,
      outstandingAmount: newOutstanding,
      paymentDate: args.paymentDate ? Timestamp.fromDate(args.paymentDate) : null,
      paymentMethod: args.paymentMethod || null,
      paymentReference: args.paymentReference || null,
      status: derivedStatus,
      dueDate: dueDateTs || Timestamp.now(),
      notes: args.notes || null,
      entryType: args.entryType,
      deltaAmount: delta,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const ref = await adminDb!.collection('payment_tracking').add(docData);

    const entry = {
      id: ref.id,
      invoiceId: args.invoiceId,
      invoiceNumber: args.invoiceNumber,
      projectId: args.projectId,
      projectName: args.projectName,
      invoiceAmount,
      paidAmount: newPaid,
      outstandingAmount: newOutstanding,
      paymentMethod: args.paymentMethod || null,
      paymentReference: args.paymentReference || null,
      status: derivedStatus,
      notes: args.notes || null,
      entryType: args.entryType,
      deltaAmount: delta,
      paymentDate: args.paymentDate ? args.paymentDate.toISOString() : null,
      dueDate: dueDateTs ? dueDateTs.toDate().toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Entry recorded',
      entry,
    };
  } catch (error) {
    console.error('Error adding payment entry:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to add entry' };
  }
}

async function recomputeInvoicePayments(invoiceId: string): Promise<{ paid: number; outstanding: number; status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' }> {
  if (!adminDb) throw new Error('Firestore is not initialized.');
  const invoiceDoc = await adminDb!.collection('invoices').doc(invoiceId).get();
  if (!invoiceDoc.exists) throw new Error('Invoice not found');
  const invoice = invoiceDoc.data() as any;
  const invoiceAmount = Number(invoice?.invoiceTotal || 0);
  const dueDateTs = invoice?.dueDate;

  const invRef = adminDb!.doc(`invoices/${invoiceId}`);
  const snap = await adminDb!
    .collection('payment_tracking')
    .where('invoiceId', '==', invRef)
    .orderBy('createdAt', 'asc')
    .get();

  let paid = 0;
  let outstanding = Math.max(0, invoiceAmount - paid);
  const batch = adminDb!.batch();

  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const voided = !!data.voided;
    const entryType = data.entryType as 'payment' | 'write_off' | 'credit' | 'refund';
    const delta = Number(data.deltaAmount || 0);

    // Apply only non-voided entries to cumulative
    if (!voided) {
      if (entryType === 'payment') {
        paid = paid + delta;
      } else if (entryType === 'refund') {
        paid = Math.max(0, paid - delta);
      }
    }
    outstanding = Math.max(0, invoiceAmount - paid);

    let status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
    if (paid >= invoiceAmount && invoiceAmount > 0) status = 'Paid';
    else if (paid > 0) status = 'Partial';
    else if (dueDateTs && new Date() > dueDateTs.toDate()) status = 'Overdue';

    batch.update(doc.ref, {
      paidAmount: paid,
      outstandingAmount: outstanding,
      status,
      updatedAt: Timestamp.now(),
    });

    // After cumulative update, if this entry is write-off/credit, reflect reduction in outstanding from this entry
    if (!voided && (entryType === 'write_off' || entryType === 'credit')) {
      const adjustedOutstanding = Math.max(0, outstanding - delta);
      outstanding = adjustedOutstanding;
      batch.update(doc.ref, {
        outstandingAmount: adjustedOutstanding,
        updatedAt: Timestamp.now(),
      });
    }
  }

  await batch.commit();

  let finalStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
  if (paid >= invoiceAmount && invoiceAmount > 0) finalStatus = 'Paid';
  else if (paid > 0) finalStatus = 'Partial';
  else if (dueDateTs && new Date() > dueDateTs.toDate()) finalStatus = 'Overdue';

  return { paid, outstanding, status: finalStatus };
}

export async function updatePaymentEntry(args: {
  entryId: string;
  invoiceId: string;
  entryType: 'payment' | 'write_off' | 'credit' | 'refund';
  amount: number;
  paymentDate?: Date;
  paymentMethod?: 'Check' | 'ACH' | 'Wire' | 'Credit Card';
  paymentReference?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; summary?: { paid: number; outstanding: number; status: string } }> {
  if (!adminDb) throw new Error('Firestore is not initialized.');
  try {
    if (!args.amount || args.amount <= 0 || !Number.isFinite(args.amount)) {
      return { success: false, message: 'Enter a valid positive amount' };
    }

    const entryRef = adminDb!.collection('payment_tracking').doc(args.entryId);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) return { success: false, message: 'Entry not found' };

    await entryRef.update({
      entryType: args.entryType,
      deltaAmount: args.amount,
      paymentDate: args.paymentDate ? Timestamp.fromDate(args.paymentDate) : null,
      paymentMethod: args.paymentMethod || null,
      paymentReference: args.paymentReference || null,
      notes: args.notes || null,
      updatedAt: Timestamp.now(),
    });

    const summary = await recomputeInvoicePayments(args.invoiceId);
    return { success: true, message: 'Entry updated', summary: { paid: summary.paid, outstanding: summary.outstanding, status: summary.status } };
  } catch (error) {
    console.error('Error updating payment entry:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update entry' };
  }
}

export async function voidPaymentEntry(args: {
  entryId: string;
  invoiceId: string;
  reason?: string;
}): Promise<{ success: boolean; message: string; summary?: { paid: number; outstanding: number; status: string } }> {
  if (!adminDb) throw new Error('Firestore is not initialized.');
  try {
    const entryRef = adminDb!.collection('payment_tracking').doc(args.entryId);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) return { success: false, message: 'Entry not found' };

    await entryRef.update({
      voided: true,
      voidedAt: Timestamp.now(),
      voidReason: args.reason || null,
      updatedAt: Timestamp.now(),
    });

    const summary = await recomputeInvoicePayments(args.invoiceId);
    return { success: true, message: 'Entry voided', summary: { paid: summary.paid, outstanding: summary.outstanding, status: summary.status } };
  } catch (error) {
    console.error('Error voiding payment entry:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to void entry' };
  }
}
