import { NextRequest, NextResponse } from 'next/server';
import { getProjects, getInvoices, getEmployees, getTimesheetEntries } from '@/lib/firestore';
import type { DashboardData } from '@/types';
import { BILLABLE_PAY_ITEM_CODES } from '@/types';
import { Timestamp as ClientTimestamp } from 'firebase/firestore';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;

    const [projects, invoices, employees, timesheetEntries] = await Promise.all([
      getProjects(),
      getInvoices(),
      getEmployees(),
      getTimesheetEntries(),
    ]);

    const startDate = getStartDateForRange(timeRange);
    const now = new Date();

    const selectedProject = projectId ? projects.find(p => p.id === projectId || p.poNumber === projectId) : undefined;

    const timesheetFiltered = timesheetEntries.filter(entry => {
      // Date filter
      const dt = toDate((entry as any).timecardDate);
      if (startDate && dt && (dt < startDate || dt > now)) return false;
      // Employee filter (match by numeric employeeId)
      if (employeeId) {
        if (String(entry.employeeId) !== String(employeeId)) return false;
      }
      // Project filter: try to match against project id (poNumber) in labors.laborValue
      if (selectedProject) {
        const lv = Array.isArray(entry.labors) ? entry.labors.map(l => (l.laborValue || '').toString()) : [];
        if (!lv.includes(String(selectedProject.id)) && !lv.includes(String(selectedProject.poNumber))) {
          return false;
        }
      }
      return true;
    });

    // KPIs
    const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const totalPaidAmount = invoices
      .filter(inv => (inv as any).status === 'paid')
      .reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const totalOutstandingAmount = totalInvoicedAmount - totalPaidAmount;

    const totalHours = timesheetFiltered.reduce((sum, entry) => sum + (entry.totalHoursActual || 0), 0);
    const billableHours = timesheetFiltered
      .filter(entry => Array.isArray(entry.payItems) && entry.payItems.some(item => BILLABLE_PAY_ITEM_CODES.includes(item.payItemCode)))
      .reduce((sum, entry) => sum + (entry.totalHoursActual || 0), 0);
    const unbillableHours = Math.max(0, totalHours - billableHours);
    const utilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    // Billable trends (group by day)
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

    // Project health with robust remaining calculation
    const projectList = selectedProject ? [selectedProject] : projects.slice(0, 25);
    const projectHealth = projectList.map(project => {
      const used = Number(project.previouslyInvoicedAmount || 0);
      // Try to infer capacity from remaining + used first
      const capFromRemain = (project.remainingPoAmount ?? null) !== null ? used + Number(project.remainingPoAmount || 0) : 0;
      const orig = Number(project.originalPoAmount || 0);
      const co = Number(project.changeOrderAmount || 0);
      const newPo = Number(project.newPoAmount || 0);
      const capacity = capFromRemain > 0 ? capFromRemain : (newPo > 0 ? newPo : (orig + co));
      const remaining = Math.max(0, capacity - used);
      const util = capacity > 0 ? (used / capacity) * 100 : 0;
      return {
        name: project.projectName,
        projectId: project.id,
        originalPoAmount: capacity,
        previouslyInvoicedAmount: used,
        utilization: util,
        remainingPoAmount: remaining,
      };
    });

    // Top employees: aggregate from timesheets; join name from timesheet fields
    const empAgg = new Map<string, { billable: number; total: number; firstName?: string; lastName?: string }>();
    for (const entry of timesheetFiltered) {
      const key = String(entry.employeeId);
      const cur = empAgg.get(key) || { billable: 0, total: 0 };
      const isBillable = Array.isArray(entry.payItems) && entry.payItems.some(item => BILLABLE_PAY_ITEM_CODES.includes(item.payItemCode));
      cur.total += entry.totalHoursActual || 0;
      if (isBillable) cur.billable += entry.totalHoursActual || 0;
      // capture a name when available
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