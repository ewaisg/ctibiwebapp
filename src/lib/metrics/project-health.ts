import { isAfter } from 'date-fns';
import type { Project, Invoice, PaymentTracking } from '@/types';
import type { DashboardFilters, ProjectHealthRow, ProjectFlag } from '@/types/dashboard';
import { toReferenceId } from '@/lib/document-reference-utils';
import { timestampToDate, toIsoDate, clamp } from './utils';

export interface ProjectHealthComputationArgs {
  projects: Project[];
  invoices: Invoice[];
  paymentTrackings: PaymentTracking[];
  filters: DashboardFilters;
}

export interface ProjectHealthComputationResult {
  rows: ProjectHealthRow[];
}

interface ProjectOutstanding {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  lastInvoiceDate?: Date;
}

function buildProjectFinancials(
  invoices: Invoice[],
  payments: Map<string, { paid: number; outstanding: number }>,
): Map<string, ProjectOutstanding> {
  const map = new Map<string, ProjectOutstanding>();

  invoices.forEach(invoice => {
    const projectId = toReferenceId(invoice.projectId);
    if (!projectId) return;
    const invoiceKey = invoice.id ?? invoice.invoiceNumber;
    const payment = payments.get(invoiceKey ?? '') ?? { paid: 0, outstanding: Math.max(0, invoice.invoiceTotal ?? 0) };
    const createdAt = timestampToDate(invoice.createdAt);
    const entry = map.get(projectId) ?? {
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    };
    entry.totalInvoiced += clamp(invoice.invoiceTotal ?? 0);
    entry.totalPaid += clamp(payment.paid);
    entry.totalOutstanding += Math.max(0, (invoice.invoiceTotal ?? 0) - payment.paid);
    if (createdAt) {
      entry.lastInvoiceDate = entry.lastInvoiceDate
        ? (isAfter(createdAt, entry.lastInvoiceDate) ? createdAt : entry.lastInvoiceDate)
        : createdAt;
    }
    map.set(projectId, entry);
  });

  return map;
}

function buildPaymentMap(paymentTrackings: PaymentTracking[]): Map<string, { paid: number; outstanding: number }> {
  const map = new Map<string, { paid: number; outstanding: number }>();
  paymentTrackings.forEach(tracking => {
    const invoiceId = toReferenceId(tracking.invoiceId) ?? tracking.invoiceNumber;
    if (!invoiceId) return;
    const current = map.get(invoiceId) ?? { paid: 0, outstanding: 0 };
    current.paid += clamp(tracking.paidAmount ?? 0);
    current.outstanding += clamp(tracking.outstandingAmount ?? 0);
    map.set(invoiceId, current);
  });
  return map;
}

function deriveFlag(row: ProjectHealthRow): ProjectFlag {
  const utilization = row.utilizationPercent ?? 0;
  const poRemaining = row.remainingPo ?? 0;
  const arOutstanding = row.arOutstanding ?? 0;
  const poCurrent = row.poCurrent ?? 0;

  if (poRemaining <= 0 || utilization >= 100 || (row.remainingHours ?? 0) <= 0) {
    return 'critical';
  }

  if (
    utilization >= 85 ||
    (poRemaining / Math.max(poCurrent, 1)) <= 0.1 ||
    (poCurrent > 0 && arOutstanding / poCurrent >= 0.3)
  ) {
    return 'warning';
  }

  return 'healthy';
}

export function computeProjectHealth(args: ProjectHealthComputationArgs): ProjectHealthComputationResult {
  const { projects, invoices, paymentTrackings, filters } = args;
  const paymentMap = buildPaymentMap(paymentTrackings);
  const financials = buildProjectFinancials(invoices, paymentMap);

  const filteredProjects = projects.filter(project => {
    if (filters.projectId && project.id !== filters.projectId) return false;
    if (filters.departmentId && toReferenceId(project.departmentId) !== filters.departmentId) return false;
    if (filters.companyId) {
      const assignedCompanies = project.assignedCompanies ?? [];
      const matchesCompany = assignedCompanies.some(company => toReferenceId(company.companyId) === filters.companyId);
      if (!matchesCompany) return false;
    }
    return true;
  });

  const rows: ProjectHealthRow[] = filteredProjects.map(project => {
    const projectFinancial = financials.get(project.id) ?? {
      totalInvoiced: clamp(project.previouslyInvoicedAmount ?? 0),
      totalPaid: 0,
      totalOutstanding: 0,
      lastInvoiceDate: undefined,
    };

    const poOriginal = clamp(project.originalPoAmount ?? 0);
    const changeOrder = clamp(project.changeOrderAmount ?? 0);
    const poCurrent = clamp(project.newPoAmount ?? poOriginal + changeOrder);
    const previouslyInvoiced = projectFinancial.totalInvoiced;
    const remainingPo = clamp(project.remainingPoAmount ?? (poCurrent - previouslyInvoiced));
    const budgetedHours = clamp(project.budgetedHours ?? 0);
    const usedHours = clamp(project.usedHours ?? 0);
    const remainingHours = clamp(project.remainingHours ?? (budgetedHours - usedHours));
    const utilizationPercent = poCurrent > 0 ? (previouslyInvoiced / poCurrent) * 100 : 0;

    const row: ProjectHealthRow = {
      projectId: project.id,
      projectName: project.projectName ?? project.poNumber ?? 'Unknown Project',
      poOriginal,
      poChange: changeOrder,
      poCurrent,
      previouslyInvoiced,
      remainingPo,
      budgetedHours,
      usedHours,
      remainingHours,
      utilizationPercent,
      arOutstanding: projectFinancial.totalOutstanding,
      lastInvoiceDate: projectFinancial.lastInvoiceDate ? toIsoDate(projectFinancial.lastInvoiceDate) : undefined,
      flag: 'healthy',
      narrative: undefined,
    };

    const flag = deriveFlag(row);
    row.flag = flag;

    if (flag !== 'healthy') {
      const issues: string[] = [];
      if (row.remainingPo !== undefined && row.remainingPo <= 0) {
        issues.push('PO capacity fully consumed');
      }
      if ((row.remainingHours ?? 0) <= 0) {
        issues.push('Allocated hours fully consumed');
      }
      if ((row.arOutstanding ?? 0) > 0) {
        issues.push('Outstanding receivables require attention');
      }
      row.narrative = issues.join('; ');
    }

    return row;
  });

  return {
    rows,
  };
}
