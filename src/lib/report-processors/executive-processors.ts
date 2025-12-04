/**
 * Executive Report Processors
 * Process data for executive dashboard and summary reports
 */

import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { Timestamp } from 'firebase-admin/firestore';
import type { Invoice, Project, CtiTimesheet, Employee, Department } from '@/types';
import type { ReportFilters } from '../report-templates/types';

const BILLABLE_CODES = ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP'];

/**
 * Process Company-Wide Summary Report
 */
export async function processCompanyWideSummary(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch all data sources
    const [invoicesSnapshot, projectsSnapshot, timesheetsSnapshot, departmentsSnapshot] = await Promise.all([
      adminDb.collection('invoices')
        .where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('projects').get(),
      adminDb.collection('cti_timesheets')
        .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('departments').get(),
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
    })) as CtiTimesheet[];

    const departments = departmentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Department[];

    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Financial Metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const approvedRevenue = invoices
      .filter(inv => inv.status === 'approved' || inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const paidRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const pendingRevenue = invoices
      .filter(inv => inv.status === 'pending' || inv.status === 'draft')
      .reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);

    // Project Metrics
    const activeProjects = projects.filter(p => !p.isInactive && !p.isComplete).length;
    const completedProjects = projects.filter(p => p.isComplete).length;
    const totalProjectBudget = projects.reduce((sum, p) => sum + (p.newPoAmount || p.originalPoAmount || 0), 0);
    const remainingBudget = projects.reduce((sum, p) => sum + (p.remainingPoAmount || 0), 0);

    // Labor Metrics
    const totalHours = timesheets.reduce((sum, ts) => sum + (ts.totalHoursActual || 0), 0);

    let billableHours = 0;
    timesheets.forEach(timesheet => {
      const payItems = timesheet.payItems || [];
      payItems.forEach((item: any) => {
        if (BILLABLE_CODES.includes(item.payItemCode)) {
          billableHours += item.payItemHours || 0;
        }
      });
    });

    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    // Department Breakdown
    const departmentBreakdown = departments.map(dept => {
      // Get department projects
      const deptProjects = projects.filter(p => extractId(p.departmentId) === dept.id);

      // Get department invoices
      const deptInvoices = invoices.filter(inv => {
        const projectId = extractId(inv.projectId);
        const project = projectMap.get(projectId || '');
        return project && extractId(project.departmentId) === dept.id;
      });

      const deptRevenue = deptInvoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);

      return {
        departmentCode: dept.departmentCode,
        departmentName: dept.departmentName,
        projectCount: deptProjects.length,
        revenue: deptRevenue,
        revenuePercent: totalRevenue > 0 ? (deptRevenue / totalRevenue) * 100 : 0,
      };
    })
    .filter(d => d.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

    // Top Projects by Revenue
    const projectRevenue = new Map<string, number>();
    invoices.forEach(inv => {
      const projectId = extractId(inv.projectId);
      if (!projectId) return;
      const current = projectRevenue.get(projectId) || 0;
      projectRevenue.set(projectId, current + (inv.invoiceTotal || 0));
    });

    const topProjects = Array.from(projectRevenue.entries())
      .map(([projectId, revenue]) => {
        const project = projectMap.get(projectId);
        return project ? {
          poNumber: project.poNumber,
          projectName: project.projectName,
          revenue,
        } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Month-over-Month Trend
    const monthlyData = new Map<string, { revenue: number; hours: number; invoices: number }>();

    invoices.forEach(inv => {
      const date = inv.createdAt?.toDate?.() ? inv.createdAt.toDate() : new Date(inv.createdAt as any);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyData.get(monthKey) || { revenue: 0, hours: 0, invoices: 0 };
      existing.revenue += inv.invoiceTotal || 0;
      existing.invoices++;
      monthlyData.set(monthKey, existing);
    });

    timesheets.forEach(ts => {
      const date = ts.timecardDate?.toDate?.() ? ts.timecardDate.toDate() : new Date(ts.timecardDate as any);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyData.get(monthKey) || { revenue: 0, hours: 0, invoices: 0 };
      existing.hours += ts.totalHoursActual || 0;
      monthlyData.set(monthKey, existing);
    });

    const monthlyTrend = Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      success: true,
      data: {
        summary: {
          totalRevenue,
          approvedRevenue,
          paidRevenue,
          pendingRevenue,
          activeProjects,
          completedProjects,
          totalProjectBudget,
          remainingBudget,
          totalHours,
          billableHours,
          utilizationRate,
          invoiceCount: invoices.length,
          departmentCount: departments.length,
        },
        departmentBreakdown,
        topProjects,
        monthlyTrend,
        filters,
        hasData: invoices.length > 0 || timesheets.length > 0,
      },
    };
  } catch (error) {
    console.error('[Executive Processor] Error in processCompanyWideSummary:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process KPI Dashboard Report
 */
export async function processKPIDashboard(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch data
    const [invoicesSnapshot, projectsSnapshot, timesheetsSnapshot, employeesSnapshot] = await Promise.all([
      adminDb.collection('invoices')
        .where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('projects').get(),
      adminDb.collection('cti_timesheets')
        .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('employees').where('employmentStatus', '==', 'Active').get(),
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
    })) as CtiTimesheet[];

    const employees = employeesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];

    // Apply department filter if specified
    let filteredProjects = projects;
    if (filters.departmentId) {
      filteredProjects = filteredProjects.filter(p => extractId(p.departmentId) === filters.departmentId);
    }

    // KPI 1: Revenue Growth
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
    const paidRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);

    // KPI 2: Project Completion Rate
    const completedProjects = filteredProjects.filter(p => p.isComplete).length;
    const totalProjects = filteredProjects.length;
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    // KPI 3: Average Utilization Rate
    const totalHours = timesheets.reduce((sum, ts) => sum + (ts.totalHoursActual || 0), 0);
    let billableHours = 0;

    timesheets.forEach(timesheet => {
      const payItems = timesheet.payItems || [];
      payItems.forEach((item: any) => {
        if (BILLABLE_CODES.includes(item.payItemCode)) {
          billableHours += item.payItemHours || 0;
        }
      });
    });

    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    // KPI 4: Budget Performance
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.newPoAmount || p.originalPoAmount || 0), 0);
    const budgetUsed = filteredProjects.reduce((sum, p) => {
      const used = (p.originalPoAmount || 0) - (p.remainingPoAmount || 0);
      return sum + used;
    }, 0);
    const budgetUtilization = totalBudget > 0 ? (budgetUsed / totalBudget) * 100 : 0;

    // KPI 5: Invoice Processing Time (average days from creation to approval)
    const approvedInvoices = invoices.filter(inv => inv.status === 'approved' || inv.status === 'paid');
    const processingTimes = approvedInvoices
      .map(inv => {
        const created = (inv.createdAt as any)?.toDate?.() ? (inv.createdAt as any).toDate() : new Date(inv.createdAt as any);
        const approved = (inv.approvedAt as any)?.toDate?.() ? (inv.approvedAt as any).toDate() : new Date(inv.approvedAt as any);
        return (approved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
      })
      .filter(days => days >= 0 && days < 365); // Filter out invalid dates

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, days) => sum + days, 0) / processingTimes.length
      : 0;

    // KPI 6: Employee Productivity (revenue per employee)
    const revenuePerEmployee = employees.length > 0 ? totalRevenue / employees.length : 0;

    // KPI 7: Outstanding Receivables
    const outstandingInvoices = invoices.filter(inv => inv.status === 'approved');
    const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);

    // KPI 8: Projects Over Budget
    const overBudgetProjects = filteredProjects.filter(p => {
      const budget = p.newPoAmount || p.originalPoAmount || 0;
      const used = budget - (p.remainingPoAmount || 0);
      return used > budget;
    }).length;
    const overBudgetRate = totalProjects > 0 ? (overBudgetProjects / totalProjects) * 100 : 0;

    const kpis = [
      {
        name: 'Total Revenue',
        value: totalRevenue,
        format: 'currency',
        target: null,
        status: 'neutral' as const,
      },
      {
        name: 'Paid Revenue',
        value: paidRevenue,
        format: 'currency',
        target: totalRevenue * 0.8, // 80% collection target
        status: (paidRevenue / totalRevenue) >= 0.8 ? 'good' as const : 'warning' as const,
      },
      {
        name: 'Project Completion Rate',
        value: completionRate,
        format: 'percent',
        target: 90,
        status: completionRate >= 90 ? 'good' as const : completionRate >= 70 ? 'warning' as const : 'bad' as const,
      },
      {
        name: 'Utilization Rate',
        value: utilizationRate,
        format: 'percent',
        target: 80,
        status: utilizationRate >= 80 ? 'good' as const : utilizationRate >= 65 ? 'warning' as const : 'bad' as const,
      },
      {
        name: 'Budget Utilization',
        value: budgetUtilization,
        format: 'percent',
        target: 100,
        status: budgetUtilization <= 100 ? 'good' as const : 'bad' as const,
      },
      {
        name: 'Avg Invoice Processing Time',
        value: avgProcessingTime,
        format: 'days',
        target: 7,
        status: avgProcessingTime <= 7 ? 'good' as const : avgProcessingTime <= 14 ? 'warning' as const : 'bad' as const,
      },
      {
        name: 'Revenue per Employee',
        value: revenuePerEmployee,
        format: 'currency',
        target: null,
        status: 'neutral' as const,
      },
      {
        name: 'Outstanding Receivables',
        value: outstandingAmount,
        format: 'currency',
        target: null,
        status: 'neutral' as const,
      },
      {
        name: 'Projects Over Budget',
        value: overBudgetRate,
        format: 'percent',
        target: 10,
        status: overBudgetRate <= 10 ? 'good' as const : overBudgetRate <= 20 ? 'warning' as const : 'bad' as const,
      },
    ];

    return {
      success: true,
      data: {
        kpis,
        filters,
        hasData: invoices.length > 0 || timesheets.length > 0,
      },
    };
  } catch (error) {
    console.error('[Executive Processor] Error in processKPIDashboard:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Trend Analysis Report
 */
export async function processTrendAnalysis(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch data
    const [invoicesSnapshot, timesheetsSnapshot, projectsSnapshot] = await Promise.all([
      adminDb.collection('invoices')
        .where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('cti_timesheets')
        .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('projects').get(),
    ]);

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Apply department filter if specified
    let filteredInvoices = invoices;
    if (filters.departmentId) {
      filteredInvoices = filteredInvoices.filter(inv => {
        const projectId = extractId(inv.projectId);
        const project = projectMap.get(projectId || '');
        return project && extractId(project.departmentId) === filters.departmentId;
      });
    }

    // Build monthly trends
    const monthlyTrends = new Map<string, {
      revenue: number;
      hours: number;
      billableHours: number;
      invoiceCount: number;
      utilizationRate: number;
    }>();

    // Process invoices
    filteredInvoices.forEach(inv => {
      const date = inv.createdAt?.toDate?.() ? inv.createdAt.toDate() : new Date(inv.createdAt as any);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyTrends.get(monthKey) || {
        revenue: 0,
        hours: 0,
        billableHours: 0,
        invoiceCount: 0,
        utilizationRate: 0,
      };

      existing.revenue += inv.invoiceTotal || 0;
      existing.invoiceCount++;
      monthlyTrends.set(monthKey, existing);
    });

    // Process timesheets
    timesheets.forEach(ts => {
      const date = ts.timecardDate?.toDate?.() ? ts.timecardDate.toDate() : new Date(ts.timecardDate as any);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyTrends.get(monthKey) || {
        revenue: 0,
        hours: 0,
        billableHours: 0,
        invoiceCount: 0,
        utilizationRate: 0,
      };

      existing.hours += ts.totalHoursActual || 0;

      // Calculate billable hours
      const payItems = ts.payItems || [];
      payItems.forEach((item: any) => {
        if (BILLABLE_CODES.includes(item.payItemCode)) {
          existing.billableHours += item.payItemHours || 0;
        }
      });

      monthlyTrends.set(monthKey, existing);
    });

    // Calculate utilization rates
    monthlyTrends.forEach((data, month) => {
      data.utilizationRate = data.hours > 0 ? (data.billableHours / data.hours) * 100 : 0;
    });

    // Convert to sorted array
    const trends = Array.from(monthlyTrends.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        revenuePerHour: data.billableHours > 0 ? data.revenue / data.billableHours : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate growth rates
    const trendsWithGrowth = trends.map((current, index) => {
      if (index === 0) {
        return { ...current, revenueGrowth: 0, hoursGrowth: 0, utilizationGrowth: 0 };
      }

      const previous = trends[index - 1];
      const revenueGrowth = previous.revenue > 0
        ? ((current.revenue - previous.revenue) / previous.revenue) * 100
        : 0;
      const hoursGrowth = previous.hours > 0
        ? ((current.hours - previous.hours) / previous.hours) * 100
        : 0;
      const utilizationGrowth = current.utilizationRate - previous.utilizationRate;

      return {
        ...current,
        revenueGrowth,
        hoursGrowth,
        utilizationGrowth,
      };
    });

    // Calculate averages
    const avgRevenue = trends.length > 0
      ? trends.reduce((sum, t) => sum + t.revenue, 0) / trends.length
      : 0;
    const avgUtilization = trends.length > 0
      ? trends.reduce((sum, t) => sum + t.utilizationRate, 0) / trends.length
      : 0;

    return {
      success: true,
      data: {
        trends: trendsWithGrowth,
        summary: {
          avgMonthlyRevenue: avgRevenue,
          avgUtilization,
          totalRevenue: trends.reduce((sum, t) => sum + t.revenue, 0),
          totalHours: trends.reduce((sum, t) => sum + t.hours, 0),
          totalBillableHours: trends.reduce((sum, t) => sum + t.billableHours, 0),
        },
        filters,
        hasData: trends.length > 0,
      },
    };
  } catch (error) {
    console.error('[Executive Processor] Error in processTrendAnalysis:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Department Comparison Report
 */
export async function processDepartmentComparison(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch all data
    const [departmentsSnapshot, invoicesSnapshot, timesheetsSnapshot, projectsSnapshot] = await Promise.all([
      adminDb.collection('departments').get(),
      adminDb.collection('invoices')
        .where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('cti_timesheets')
        .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('projects').get(),
    ]);

    const departments = departmentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Department[];

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Aggregate by department
    const departmentMetrics = new Map<string, {
      department: Department;
      revenue: number;
      projectCount: number;
      activeProjectCount: number;
      totalHours: number;
      billableHours: number;
      utilizationRate: number;
      budgetTotal: number;
      budgetUsed: number;
    }>();

    // Initialize departments
    departments.forEach(dept => {
      departmentMetrics.set(dept.id, {
        department: dept,
        revenue: 0,
        projectCount: 0,
        activeProjectCount: 0,
        totalHours: 0,
        billableHours: 0,
        utilizationRate: 0,
        budgetTotal: 0,
        budgetUsed: 0,
      });
    });

    // Aggregate invoices
    invoices.forEach(inv => {
      const projectId = extractId(inv.projectId);
      const project = projectMap.get(projectId || '');
      if (!project) return;

      const deptId = extractId(project.departmentId);
      if (!deptId) return;

      const data = departmentMetrics.get(deptId);
      if (!data) return;

      data.revenue += inv.invoiceTotal || 0;
    });

    // Aggregate projects
    projects.forEach(project => {
      const deptId = extractId(project.departmentId);
      if (!deptId) return;

      const data = departmentMetrics.get(deptId);
      if (!data) return;

      data.projectCount++;
      if (!project.isInactive && !project.isComplete) {
        data.activeProjectCount++;
      }

      const budget = project.newPoAmount || project.originalPoAmount || 0;
      data.budgetTotal += budget;
      data.budgetUsed += budget - (project.remainingPoAmount || 0);
    });

    // Aggregate timesheets (would need employee-department mapping)
    // For now, we'll use project-based aggregation from labor codes

    // Convert to results
    const results = Array.from(departmentMetrics.values())
      .filter(item => item.revenue > 0 || item.projectCount > 0)
      .map(item => {
        const budgetUtilization = item.budgetTotal > 0
          ? (item.budgetUsed / item.budgetTotal) * 100
          : 0;
        const revenuePerProject = item.projectCount > 0
          ? item.revenue / item.projectCount
          : 0;

        return {
          departmentCode: item.department.departmentCode,
          departmentName: item.department.departmentName,
          revenue: item.revenue,
          projectCount: item.projectCount,
          activeProjectCount: item.activeProjectCount,
          budgetTotal: item.budgetTotal,
          budgetUsed: item.budgetUsed,
          budgetUtilization,
          revenuePerProject,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const totals = {
      totalRevenue: results.reduce((sum, r) => sum + r.revenue, 0),
      totalProjects: results.reduce((sum, r) => sum + r.projectCount, 0),
      totalBudget: results.reduce((sum, r) => sum + r.budgetTotal, 0),
      departmentCount: results.length,
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
    console.error('[Executive Processor] Error in processDepartmentComparison:', error);
    return { success: false, error: String(error), data: null };
  }
}
