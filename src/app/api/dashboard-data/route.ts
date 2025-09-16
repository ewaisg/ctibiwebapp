import { NextRequest, NextResponse } from 'next/server';
import { getProjects, getInvoices, getEmployees, getTimesheetEntries } from '@/lib/firestore';
import type { DashboardData, UserRole } from '@/types';
import { BILLABLE_PAY_ITEM_CODES } from '@/types';
import { Timestamp as ClientTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && ('seconds' in value)) {
    const s = (value as any).seconds as number;
    return new Date(s * 1000);
  }
  return null;
}

function getStartDateForRange(range?: string): Date | null {
  const now = new Date();
  switch (range) {
    case '7d': { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case '30d': { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    case '90d': { const d = new Date(now); d.setDate(d.getDate() - 90); return d; }
    case 'all':
    default: return null;
  }
}

async function getUserFromRequest(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;

    const viewer = await getUserFromRequest(request);

    const [projects, invoices, employees, timesheetEntries] = await Promise.all([
      getProjects(),
      getInvoices(),
      getEmployees(),
      getTimesheetEntries(),
    ]);

    // Subconsultant scoping: restrict data to their own submissions/company
    let scopedProjects = projects;
    let scopedInvoices = invoices;
    let scopedTimesheets = timesheetEntries;

    if (viewer?.role === 'Subconsultant') {
      // Scope invoices by submitterCompanyId/userId when available
      scopedInvoices = invoices.filter((inv: any) => {
        if (viewer.companyId && inv.submitterCompanyId) return String(inv.submitterCompanyId) === String(viewer.companyId);
        if (inv.userId) return String(inv.userId) === String(viewer.uid);
        return false; // hide if cannot attribute
      });

      // Scope projects by assignedCompanies companyId match when denormalized exists; otherwise hide
      scopedProjects = projects.filter((p: any) => Array.isArray(p.assignedCompanies) && p.assignedCompanies.some((ac: any) => String(ac.companyId) === String(viewer.companyId)));

      // Scope timesheets by company employees when possible; else hide
      const companyEmployeeIds = new Set(
        employees
          .filter((e: any) => String(e.companyId) === String(viewer.companyId))
          .map((e: any) => String(e.employeeId))
      );
      scopedTimesheets = timesheetEntries.filter((t: any) => companyEmployeeIds.has(String(t.employeeId)));
    }

    const startDate = getStartDateForRange(timeRange);
    const now = new Date();

    // Filters based on query
    const selectedProject = projectId ? scopedProjects.find(p => p.id === projectId || (p as any).poNumber === projectId) : undefined;

    const timesheetFiltered = scopedTimesheets.filter(entry => {
      const dt = toDate((entry as any).timecardDate);
      if (startDate && dt && (dt < startDate || dt > now)) return false;
      if (employeeId && String(entry.employeeId) !== String(employeeId)) return false;
      if (selectedProject) {
        const lv = Array.isArray(entry.labors) ? entry.labors.map(l => (l.laborValue || '').toString()) : [];
        if (!lv.includes(String((selectedProject as any).id)) && !lv.includes(String((selectedProject as any).poNumber))) {
          return false;
        }
      }
      return true;
    });

    // KPIs
    const totalInvoicedAmount = scopedInvoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const totalPaidAmount = scopedInvoices
      .filter(inv => (inv as any).status === 'paid')
      .reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const totalOutstandingAmount = totalInvoicedAmount - totalPaidAmount;

    const totalHours = timesheetFiltered.reduce((sum, entry) => sum + (entry.totalHoursActual || 0), 0);
    const billableHours = timesheetFiltered
      .filter(entry => Array.isArray(entry.payItems) && entry.payItems.some(item => BILLABLE_PAY_ITEM_CODES.includes(item.payItemCode)))
      .reduce((sum, entry) => sum + (entry.totalHoursActual || 0), 0);
    const unbillableHours = Math.max(0, totalHours - billableHours);
    const utilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    const trendMap = new Map<string, { billableHours: number; unbillableHours: number }>();
    for (const entry of timesheetFiltered) {
      const dt = toDate((entry as any).timecardDate);
      const key = dt ? dt.toISOString().slice(0, 10) : 'unknown';
      const isBillable = Array.isArray(entry.payItems) && entry.payItems.some(item => BILLABLE_PAY_ITEM_CODES.includes(item.payItemCode));
      const cur = trendMap.get(key) || { billableHours: 0, unbillableHours: 0 };
      if (isBillable) cur.billableHours += entry.totalHoursActual || 0;
      else cur.unbillableHours += entry.totalHoursActual || 0;
      trendMap.set(key, cur);
    }

    const billableTrends = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: ClientTimestamp.fromDate(new Date(date)), billableHours: v.billableHours, unbillableHours: v.unbillableHours }));

    const projectList = selectedProject ? [selectedProject] : scopedProjects.slice(0, 25);
    const projectHealth = projectList.map(project => {
      const used = Number((project as any).previouslyInvoicedAmount || 0);
      const capFromRemain = ((project as any).remainingPoAmount ?? null) !== null ? used + Number((project as any).remainingPoAmount || 0) : 0;
      const orig = Number((project as any).originalPoAmount || 0);
      const co = Number((project as any).changeOrderAmount || 0);
      const newPo = Number((project as any).newPoAmount || 0);
      const capacity = capFromRemain > 0 ? capFromRemain : (newPo > 0 ? newPo : (orig + co));
      const remaining = Math.max(0, capacity - used);
      const util = capacity > 0 ? (used / capacity) * 100 : 0;
      return {
        name: (project as any).projectName,
        projectId: (project as any).id,
        originalPoAmount: capacity,
        previouslyInvoicedAmount: used,
        utilization: util,
        remainingPoAmount: remaining,
      };
    });

    const empAgg = new Map<string, { billable: number; total: number; firstName?: string; lastName?: string }>();
    for (const entry of timesheetFiltered) {
      const key = String(entry.employeeId);
      const cur = empAgg.get(key) || { billable: 0, total: 0 };
      const isBillable = Array.isArray(entry.payItems) && entry.payItems.some(item => BILLABLE_PAY_ITEM_CODES.includes(item.payItemCode));
      cur.total += entry.totalHoursActual || 0;
      if (isBillable) cur.billable += entry.totalHoursActual || 0;
      if (!cur.firstName && (entry as any).employeeFirstName) cur.firstName = (entry as any).employeeFirstName;
      if (!cur.lastName && (entry as any).employeeLastName) cur.lastName = (entry as any).employeeLastName;
      empAgg.set(key, cur);
    }

    const topEmployees = Array.from(empAgg.entries())
      .map(([empKey, agg]) => {
        const name = [agg.firstName, agg.lastName].filter(Boolean).join(' ').trim() || `Employee ${empKey}`;
        const util = agg.total > 0 ? (agg.billable / agg.total) * 100 : 0;
        return {
          name,
          employeeId: empKey,
          billableHours: agg.billable,
          unbillableHours: Math.max(0, agg.total - agg.billable),
          utilization: util,
        };
      })
      .sort((a, b) => b.billableHours - a.billableHours)
      .slice(0, 10);

    const dashboardData: DashboardData = {
      kpi: { unbillableHours, billableHours, totalHours, utilization, totalInvoicedAmount, totalPaidAmount, totalOutstandingAmount },
      timeAllocationByCompany: [],
      departmentalUtilization: [],
      billableTrends,
      projectHealth,
      topEmployees,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}