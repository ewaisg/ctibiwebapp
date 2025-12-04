/**
 * Financial Report Processors
 * Process data for financial reports
 */

import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { Timestamp } from 'firebase-admin/firestore';
import type { Invoice, Department, Project } from '@/types';
import type { ReportFilters } from '../report-templates/types';

/**
 * Process Revenue by Department Report
 */
export async function processRevenueByDepartment(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch invoices with filters
    let invoicesQuery: any = adminDb.collection('invoices');

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoicesQuery = invoicesQuery.where('createdAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      invoicesQuery = invoicesQuery.where('createdAt', '<=', Timestamp.fromDate(toDate));
    }

    // Apply status filter
    if (filters.status) {
      invoicesQuery = invoicesQuery.where('status', '==', filters.status);
    }

    const invoicesSnapshot = await invoicesQuery.get();
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Fetch departments
    const departmentsSnapshot = await adminDb.collection('departments').get();
    const departments = departmentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Department[];

    // Filter by department if specified
    let filteredInvoices = invoices;
    if (filters.departmentId) {
      filteredInvoices = invoices.filter(inv => {
        const deptId = extractId(inv.projectId);
        if (!deptId) return false;
        // Need to check project's departmentId
        return true; // Will refine this after fetching projects
      });
    }

    // Create department map
    const departmentMap = new Map<string, {
      department: Department;
      totalRevenue: number;
      invoiceCount: number;
      paidAmount: number;
      pendingAmount: number;
      approvedAmount: number;
    }>();

    // Initialize departments
    departments.forEach(dept => {
      departmentMap.set(dept.id, {
        department: dept,
        totalRevenue: 0,
        invoiceCount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
      });
    });

    // Fetch all projects to map invoice -> department
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Aggregate invoice data by department
    filteredInvoices.forEach(invoice => {
      const projectId = extractId(invoice.projectId);
      if (!projectId) return;

      const project = projectMap.get(projectId);
      if (!project) return;

      const deptId = extractId(project.departmentId);
      if (!deptId) return;

      // Apply department filter
      if (filters.departmentId && deptId !== filters.departmentId) return;

      const data = departmentMap.get(deptId);
      if (!data) return;

      const amount = invoice.invoiceTotal || 0;
      data.totalRevenue += amount;
      data.invoiceCount++;

      if (invoice.status === 'paid') {
        data.paidAmount += amount;
      } else if (invoice.status === 'approved') {
        data.approvedAmount += amount;
      } else {
        data.pendingAmount += amount;
      }
    });

    // Convert to array and filter out departments with no invoices
    const results = Array.from(departmentMap.values())
      .filter(d => d.invoiceCount > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map(item => ({
        departmentCode: item.department.departmentCode,
        departmentName: item.department.departmentName,
        totalRevenue: item.totalRevenue,
        invoiceCount: item.invoiceCount,
        paidAmount: item.paidAmount,
        pendingAmount: item.pendingAmount,
        approvedAmount: item.approvedAmount,
        averageInvoiceAmount: item.invoiceCount > 0 ? item.totalRevenue / item.invoiceCount : 0,
      }));

    // Calculate totals
    const totals = {
      totalRevenue: results.reduce((sum, r) => sum + r.totalRevenue, 0),
      totalInvoices: results.reduce((sum, r) => sum + r.invoiceCount, 0),
      totalPaid: results.reduce((sum, r) => sum + r.paidAmount, 0),
      totalPending: results.reduce((sum, r) => sum + r.pendingAmount, 0),
      totalApproved: results.reduce((sum, r) => sum + r.approvedAmount, 0),
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processRevenueByDepartment:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Outstanding Invoices Report
 */
export async function processOutstandingInvoices(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch approved invoices
    let invoicesQuery: any = adminDb.collection('invoices').where('status', '==', 'approved');

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoicesQuery = invoicesQuery.where('createdAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      invoicesQuery = invoicesQuery.where('createdAt', '<=', Timestamp.fromDate(toDate));
    }

    const invoicesSnapshot = await invoicesQuery.get();
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Fetch projects for filtering
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Calculate aging and filter
    const results = invoices
      .filter(inv => {
        const projectId = extractId(inv.projectId);
        if (!projectId) return false;

        const project = projectMap.get(projectId);
        if (!project) return false;

        // Apply filters
        if (filters.departmentId) {
          const deptId = extractId(project.departmentId);
          if (deptId !== filters.departmentId) return false;
        }

        if (filters.projectId) {
          if (projectId !== filters.projectId) return false;
        }

        if (filters.contractId) {
          const contractId = extractId(project.contractId);
          if (contractId !== filters.contractId) return false;
        }

        return true;
      })
      .map(invoice => {
        const projectId = extractId(invoice.projectId);
        const project = projectMap.get(projectId!);

        const dueDate = invoice.dueDate?.toDate?.() ? invoice.dueDate.toDate() : new Date(invoice.dueDate as any);
        const today = new Date();
        const daysOutstanding = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        let agingCategory: '0-30' | '31-60' | '61-90' | '90+';
        if (daysOutstanding <= 30) agingCategory = '0-30';
        else if (daysOutstanding <= 60) agingCategory = '31-60';
        else if (daysOutstanding <= 90) agingCategory = '61-90';
        else agingCategory = '90+';

        return {
          invoiceNumber: invoice.invoiceNumber,
          projectName: project?.projectName || 'N/A',
          poNumber: invoice.poNumber,
          invoiceTotal: invoice.invoiceTotal,
          dueDate: dueDate,
          daysOutstanding,
          agingCategory,
          submitterCompany: invoice.submitterCompany,
        };
      })
      .sort((a, b) => b.daysOutstanding - a.daysOutstanding);

    // Calculate aging summary
    const agingSummary = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    };

    results.forEach(inv => {
      agingSummary[inv.agingCategory].count++;
      agingSummary[inv.agingCategory].amount += inv.invoiceTotal;
    });

    const totals = {
      totalOutstanding: results.reduce((sum, inv) => sum + inv.invoiceTotal, 0),
      totalCount: results.length,
    };

    return {
      success: true,
      data: {
        results,
        agingSummary,
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processOutstandingInvoices:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Revenue by Project Report
 */
export async function processRevenueByProject(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch invoices with filters
    let invoicesQuery: any = adminDb.collection('invoices');

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoicesQuery = invoicesQuery.where('createdAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      invoicesQuery = invoicesQuery.where('createdAt', '<=', Timestamp.fromDate(toDate));
    }

    if (filters.status) {
      invoicesQuery = invoicesQuery.where('status', '==', filters.status);
    }

    const invoicesSnapshot = await invoicesQuery.get();
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Fetch projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Create project map
    const projectMap = new Map<string, {
      project: Project;
      totalRevenue: number;
      invoiceCount: number;
      budgetAmount: number;
      remainingBudget: number;
      utilizationPercent: number;
    }>();

    // Initialize projects
    projects.forEach(project => {
      // Apply filters
      if (filters.departmentId) {
        const deptId = extractId(project.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      if (filters.contractId) {
        const contractId = extractId(project.contractId);
        if (contractId !== filters.contractId) return;
      }

      if (filters.projectId && project.id !== filters.projectId) return;

      projectMap.set(project.id, {
        project,
        totalRevenue: 0,
        invoiceCount: 0,
        budgetAmount: project.newPoAmount || project.originalPoAmount || 0,
        remainingBudget: project.remainingPoAmount || 0,
        utilizationPercent: 0,
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

    // Calculate utilization and convert to array
    const results = Array.from(projectMap.values())
      .filter(p => p.invoiceCount > 0)
      .map(item => {
        const budgetUtilized = item.budgetAmount > 0
          ? (item.totalRevenue / item.budgetAmount) * 100
          : 0;

        return {
          poNumber: item.project.poNumber,
          projectName: item.project.projectName,
          projectManager: item.project.projectManager || 'N/A',
          totalRevenue: item.totalRevenue,
          invoiceCount: item.invoiceCount,
          budgetAmount: item.budgetAmount,
          remainingBudget: item.remainingBudget,
          budgetUtilized,
          isOverBudget: item.totalRevenue > item.budgetAmount,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totals = {
      totalRevenue: results.reduce((sum, r) => sum + r.totalRevenue, 0),
      totalBudget: results.reduce((sum, r) => sum + r.budgetAmount, 0),
      totalRemaining: results.reduce((sum, r) => sum + r.remainingBudget, 0),
      totalProjects: results.length,
      overBudgetCount: results.filter(r => r.isOverBudget).length,
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processRevenueByProject:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Payment History Report
 */
export async function processPaymentHistory(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch invoices
    let invoicesQuery: any = adminDb.collection('invoices').where('status', '==', 'paid');

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoicesQuery = invoicesQuery.where('createdAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      invoicesQuery = invoicesQuery.where('createdAt', '<=', Timestamp.fromDate(toDate));
    }

    const invoicesSnapshot = await invoicesQuery.get();
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Fetch projects for filtering and details
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Process payment history
    const results = invoices
      .filter(inv => {
        const projectId = extractId(inv.projectId);
        if (!projectId) return false;

        const project = projectMap.get(projectId);
        if (!project) return false;

        // Apply filters
        if (filters.departmentId) {
          const deptId = extractId(project.departmentId);
          if (deptId !== filters.departmentId) return false;
        }

        if (filters.projectId && projectId !== filters.projectId) return false;

        if (filters.contractId) {
          const contractId = extractId(project.contractId);
          if (contractId !== filters.contractId) return false;
        }

        return true;
      })
      .map(invoice => {
        const projectId = extractId(invoice.projectId);
        const project = projectMap.get(projectId!);
        const approvedDate = invoice.approvedAt?.toDate?.() ? invoice.approvedAt.toDate() : new Date(invoice.approvedAt as any);

        return {
          invoiceNumber: invoice.invoiceNumber,
          projectName: project?.projectName || 'N/A',
          poNumber: invoice.poNumber,
          invoiceTotal: invoice.invoiceTotal,
          approvedDate,
          approvedBy: invoice.approvedByName,
          submitterCompany: invoice.submitterCompany,
        };
      })
      .sort((a, b) => b.approvedDate.getTime() - a.approvedDate.getTime());

    // Group by month
    const monthlyBreakdown = new Map<string, { count: number; amount: number }>();

    results.forEach(inv => {
      const monthKey = `${inv.approvedDate.getFullYear()}-${String(inv.approvedDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyBreakdown.get(monthKey) || { count: 0, amount: 0 };
      existing.count++;
      existing.amount += inv.invoiceTotal;
      monthlyBreakdown.set(monthKey, existing);
    });

    const totals = {
      totalPaid: results.reduce((sum, inv) => sum + inv.invoiceTotal, 0),
      totalCount: results.length,
    };

    return {
      success: true,
      data: {
        results,
        monthlyBreakdown: Array.from(monthlyBreakdown.entries())
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => b.month.localeCompare(a.month)),
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processPaymentHistory:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Profitability Analysis Report
 */
export async function processProfitabilityAnalysis(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch invoices with date filters
    let invoicesQuery: any = adminDb.collection('invoices');

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoicesQuery = invoicesQuery.where('createdAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      invoicesQuery = invoicesQuery.where('createdAt', '<=', Timestamp.fromDate(toDate));
    }

    const [invoicesSnapshot, projectsSnapshot, timesheetsSnapshot] = await Promise.all([
      invoicesQuery.get(),
      adminDb.collection('projects').get(),
      filters.dateFrom && filters.dateTo
        ? adminDb.collection('cti_timesheets')
            .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
            .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
            .get()
        : adminDb.collection('cti_timesheets').limit(0).get(),
    ]);

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Calculate profitability by project
    const projectProfitability = new Map<string, {
      project: Project;
      revenue: number;
      laborCost: number; // Estimated from timesheet hours
      profit: number;
      profitMargin: number;
    }>();

    // Initialize with projects
    projects.forEach(project => {
      if (filters.departmentId) {
        const deptId = extractId(project.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      if (filters.contractId) {
        const contractId = extractId(project.contractId);
        if (contractId !== filters.contractId) return;
      }

      if (filters.projectId && project.id !== filters.projectId) return;

      projectProfitability.set(project.id, {
        project,
        revenue: 0,
        laborCost: 0,
        profit: 0,
        profitMargin: 0,
      });
    });

    // Add invoice revenue
    invoices.forEach(invoice => {
      const projectId = extractId(invoice.projectId);
      if (!projectId) return;

      const data = projectProfitability.get(projectId);
      if (!data) return;

      if (invoice.status === 'paid' || invoice.status === 'approved') {
        data.revenue += invoice.invoiceTotal || 0;
      }
    });

    // Estimate labor cost from timesheets (using average rate of $75/hr as baseline)
    const AVERAGE_HOURLY_RATE = 75;

    timesheets.forEach(timesheet => {
      // Extract project from labor codes
      const labors = timesheet.labors || [];
      const projectLabor = labors.find((l: any) =>
        l.laborTitle === 'Project/Job' || l.laborTitle === 'Project/Categories'
      );

      if (!projectLabor) return;

      const projectCode = projectLabor.laborValue;
      // Find project by poNumber matching labor code
      const project = projects.find(p => p.poNumber === projectCode);
      if (!project) return;

      const data = projectProfitability.get(project.id);
      if (!data) return;

      const hours = timesheet.totalHoursActual || 0;
      data.laborCost += hours * AVERAGE_HOURLY_RATE;
    });

    // Calculate profit and margin
    const results = Array.from(projectProfitability.values())
      .map(item => {
        const profit = item.revenue - item.laborCost;
        const profitMargin = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;

        return {
          poNumber: item.project.poNumber,
          projectName: item.project.projectName,
          revenue: item.revenue,
          laborCost: item.laborCost,
          profit,
          profitMargin,
          isProfitable: profit > 0,
        };
      })
      .filter(item => item.revenue > 0) // Only show projects with revenue
      .sort((a, b) => b.profit - a.profit);

    const totals = {
      totalRevenue: results.reduce((sum, r) => sum + r.revenue, 0),
      totalLaborCost: results.reduce((sum, r) => sum + r.laborCost, 0),
      totalProfit: results.reduce((sum, r) => sum + r.profit, 0),
      averageMargin: results.length > 0
        ? results.reduce((sum, r) => sum + r.profitMargin, 0) / results.length
        : 0,
      profitableCount: results.filter(r => r.isProfitable).length,
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
        note: 'Labor costs are estimated using average hourly rate. For accurate profitability, integrate actual payroll data.',
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processProfitabilityAnalysis:', error);
    return { success: false, error: String(error), data: null };
  }
}
