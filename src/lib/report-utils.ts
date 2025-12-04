/**
 * Report Utility Functions
 * Helper functions for data aggregation and formatting
 */

import { adminDb } from './firebase-admin';
import { extractId } from './document-reference-utils';
import type { ReportFilters, ReportData } from './report-templates/types';

/**
 * Fetch data from Firestore with filters
 */
export async function fetchReportData(
  collection: string,
  filters: ReportFilters
): Promise<any[]> {
  if (!adminDb) {
    throw new Error('Database not initialized');
  }

  let query: any = adminDb.collection(collection);

  // Apply filters
  if (filters.departmentId) {
    query = query.where('departmentId', '==', filters.departmentId);
  }

  if (filters.projectId) {
    query = query.where('projectId', '==', filters.projectId);
  }

  if (filters.contractId) {
    query = query.where('contractId', '==', filters.contractId);
  }

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  // Date filters
  if (filters.dateFrom || filters.dateTo) {
    const dateField = getDateFieldForCollection(collection);

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      query = query.where(dateField, '>=', fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where(dateField, '<=', toDate);
    }
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get appropriate date field for collection
 */
function getDateFieldForCollection(collection: string): string {
  const dateFields: Record<string, string> = {
    invoices: 'createdAt',
    timesheets: 'timecardDate',
    projects: 'createdAt',
    contracts: 'effectiveDate',
    employees: 'createdAt',
    departments: 'createdAt',
  };

  return dateFields[collection] || 'createdAt';
}

/**
 * Aggregate revenue by department
 */
export function aggregateRevenueByDepartment(
  invoices: any[],
  departments: any[]
): any[] {
  const departmentMap = new Map<string, {
    department: any;
    totalRevenue: number;
    invoiceCount: number;
    paidAmount: number;
    pendingAmount: number;
  }>();

  // Initialize departments
  departments.forEach(dept => {
    departmentMap.set(dept.id, {
      department: dept,
      totalRevenue: 0,
      invoiceCount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    });
  });

  // Aggregate invoice data
  invoices.forEach(invoice => {
    const deptId = extractId(invoice.departmentId);
    if (!deptId) return;

    const data = departmentMap.get(deptId);
    if (!data) return;

    const amount = invoice.invoiceTotal || 0;
    data.totalRevenue += amount;
    data.invoiceCount++;

    if (invoice.status === 'approved' || invoice.status === 'paid') {
      data.paidAmount += amount;
    } else {
      data.pendingAmount += amount;
    }
  });

  return Array.from(departmentMap.values())
    .filter(d => d.invoiceCount > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Aggregate revenue by project
 */
export function aggregateRevenueByProject(
  invoices: any[],
  projects: any[]
): any[] {
  const projectMap = new Map<string, {
    project: any;
    totalRevenue: number;
    invoiceCount: number;
    budgetAmount: number;
    remainingBudget: number;
  }>();

  // Initialize projects
  projects.forEach(project => {
    projectMap.set(project.id, {
      project,
      totalRevenue: 0,
      invoiceCount: 0,
      budgetAmount: project.originalPoAmount || 0,
      remainingBudget: project.remainingPoAmount || 0,
    });
  });

  // Aggregate invoice data
  invoices.forEach(invoice => {
    const projectId = extractId(invoice.projectId);
    if (!projectId) return;

    const data = projectMap.get(projectId);
    if (!data) return;

    data.totalRevenue += invoice.invoiceTotal || 0;
    data.invoiceCount++;
  });

  return Array.from(projectMap.values())
    .filter(p => p.invoiceCount > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Calculate employee utilization rates
 */
export function calculateEmployeeUtilization(
  timesheets: any[],
  employees: any[]
): any[] {
  const employeeMap = new Map<string, {
    employee: any;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    ptoHours: number;
    utilizationRate: number;
  }>();

  // Initialize employees
  employees.forEach(emp => {
    employeeMap.set(String(emp.employeeId || emp.id), {
      employee: emp,
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      ptoHours: 0,
      utilizationRate: 0,
    });
  });

  // Aggregate timesheet data
  timesheets.forEach(timesheet => {
    const empId = String(timesheet.employeeId);
    const data = employeeMap.get(empId);
    if (!data) return;

    const hours = timesheet.totalHoursActual || 0;
    data.totalHours += hours;

    // Categorize hours
    const payItems = timesheet.payItems || [];
    payItems.forEach((item: any) => {
      const hours = item.payItemHours || 0;
      const code = item.payItemCode;

      if (['HRLY', 'OVT15', 'OVT20', 'SalaryHrs'].includes(code)) {
        data.billableHours += hours;
      } else if (['PTO', 'HOL', 'FLTHOL', 'BER'].includes(code)) {
        data.ptoHours += hours;
      } else {
        data.nonBillableHours += hours;
      }
    });
  });

  // Calculate utilization rates
  employeeMap.forEach(data => {
    if (data.totalHours > 0) {
      data.utilizationRate = (data.billableHours / data.totalHours) * 100;
    }
  });

  return Array.from(employeeMap.values())
    .filter(e => e.totalHours > 0)
    .sort((a, b) => b.billableHours - a.billableHours);
}

/**
 * Aggregate hours by project
 */
export function aggregateHoursByProject(
  timesheets: any[],
  projects: any[]
): any[] {
  const projectMap = new Map<string, {
    project: any;
    totalHours: number;
    billableHours: number;
    employees: Set<string>;
  }>();

  // Initialize projects
  projects.forEach(project => {
    projectMap.set(project.poNumber || project.id, {
      project,
      totalHours: 0,
      billableHours: 0,
      employees: new Set(),
    });
  });

  // Aggregate timesheet data
  timesheets.forEach(timesheet => {
    // Get project from labor codes
    const labors = timesheet.labors || [];
    const projectLabor = labors.find((l: any) =>
      l.laborTitle === 'Project/Job' || l.laborTitle === 'Project/Categories'
    );

    if (!projectLabor) return;

    const projectCode = projectLabor.laborValue;
    const data = projectMap.get(projectCode);
    if (!data) return;

    const hours = timesheet.totalHoursActual || 0;
    data.totalHours += hours;
    data.employees.add(String(timesheet.employeeId));

    // Calculate billable hours
    const payItems = timesheet.payItems || [];
    payItems.forEach((item: any) => {
      const code = item.payItemCode;
      if (['HRLY', 'OVT15', 'OVT20', 'SalaryHrs'].includes(code)) {
        data.billableHours += item.payItemHours || 0;
      }
    });
  });

  return Array.from(projectMap.values())
    .filter(p => p.totalHours > 0)
    .map(p => ({
      ...p,
      employeeCount: p.employees.size,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate date range label
 */
export function getDateRangeLabel(dateFrom?: string, dateTo?: string): string {
  if (!dateFrom && !dateTo) return 'All Time';
  if (!dateFrom) return `Up to ${formatDate(dateTo!)}`;
  if (!dateTo) return `From ${formatDate(dateFrom)}`;
  return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
}

/**
 * Get outstanding invoices
 */
export function getOutstandingInvoices(invoices: any[]): any[] {
  return invoices
    .filter(inv => inv.status === 'approved' && !inv.paidDate)
    .sort((a, b) => {
      const dateA = new Date(a.dueDate?.toDate?.() || a.dueDate);
      const dateB = new Date(b.dueDate?.toDate?.() || b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
}

/**
 * Calculate aging for outstanding invoices
 */
export function calculateInvoiceAging(invoice: any): {
  daysOutstanding: number;
  category: '0-30' | '31-60' | '61-90' | '90+';
} {
  const dueDate = new Date(invoice.dueDate?.toDate?.() || invoice.dueDate);
  const today = new Date();
  const daysOutstanding = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  let category: '0-30' | '31-60' | '61-90' | '90+';
  if (daysOutstanding <= 30) category = '0-30';
  else if (daysOutstanding <= 60) category = '31-60';
  else if (daysOutstanding <= 90) category = '61-90';
  else category = '90+';

  return { daysOutstanding, category };
}
