import { NextRequest, NextResponse } from 'next/server';
import { getInvoices } from '@/lib/firestore';
import type { Invoice, UserRole } from '@/types';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

function extractId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.id) return value.id as string;
  return undefined;
}

async function getViewer(request: NextRequest): Promise<{ uid: string; role?: UserRole; companyId?: string } | null> {
  try {
    if (!getApps().length) return null;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) return null;
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role as UserRole | undefined;
    const companyId = (decoded as any).companyId as string | undefined;
    return { uid: decoded.uid, role, companyId };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const viewer = await getViewer(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoices = await getInvoices();

    // Scope to subconsultant's company/user
    let scoped: Invoice[] = invoices as any;
    if (viewer.role === 'Subconsultant') {
      scoped = (invoices as any[]).filter((inv) => {
        const invCompanyId = extractId(inv.submitterCompanyId);
        const invUserId = extractId(inv.userId);
        if (viewer.companyId && invCompanyId) return String(invCompanyId) === String(viewer.companyId);
        if (invUserId) return String(invUserId) === String(viewer.uid);
        return false;
      }) as any;
    }

    // KPIs
    const totals = scoped.reduce(
      (acc, inv: any) => {
        const total = Number(inv.invoiceTotal || 0);
        acc.totalAmount += total;
        const status = String(inv.status || '').toLowerCase();
        if (status === 'paid') acc.paidAmount += total;
        if (status === 'draft') acc.drafts++;
        if (status === 'submitted') acc.submitted++;
        if (status === 'approved') acc.approved++;
        if (status === 'paid') acc.paid++;
        return acc;
      },
      { totalAmount: 0, paidAmount: 0, drafts: 0, submitted: 0, approved: 0, paid: 0 }
    );
    const outstandingAmount = Math.max(0, totals.totalAmount - totals.paidAmount);

    // Recent invoices (last 10)
    const recent = [...scoped]
      .sort((a: any, b: any) => {
        const da = (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.parse(a.createdAt || '')) || 0;
        const db = (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.parse(b.createdAt || '')) || 0;
        return db - da;
      })
      .slice(0, 10)
      .map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        invoiceTotal: Number(inv.invoiceTotal || 0),
        createdAt: inv.createdAt,
        projectId: extractId(inv.projectId),
      }));

    return NextResponse.json({
      kpi: {
        drafts: totals.drafts,
        submitted: totals.submitted,
        approved: totals.approved,
        paid: totals.paid,
        totalSubmittedAmount: totals.totalAmount,
        totalPaidAmount: totals.paidAmount,
        totalOutstandingAmount: outstandingAmount,
      },
      recent,
    });
  } catch (error) {
    console.error('Error fetching subconsultant dashboard data', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
