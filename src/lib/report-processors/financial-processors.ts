/**
 * Financial Report Processors
 * Process data for financial reports
 */

import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { Timestamp } from 'firebase-admin/firestore';
import type { Invoice, Department, Project, PaymentTracking } from '@/types';
import type { ReportFilters } from '../report-templates/types';

/**
 * Process Billing Report By Department
 * Uses departmentId field within invoices to get department information
 */
export async function processBillingReportByDepartment(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch invoices with optional date filters
    let invoicesQuery: any = adminDb.collection('invoices');

    // Apply date filters (optional - supports "All Time")
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoicesQuery = invoicesQuery.where('approvedAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      invoicesQuery = invoicesQuery.where('approvedAt', '<=', Timestamp.fromDate(toDate));
    }

    const invoicesSnapshot = await invoicesQuery.get();
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Fetch all departments
    const departmentsSnapshot = await adminDb.collection('departments').get();
    const departments = departmentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Department[];

    // Create department map
    const departmentMap = new Map<string, {
      department: Department;
      totalBilled: number;
      invoiceCount: number;
      approvedAmount: number;
      pendingAmount: number;
      rejectedAmount: number;
    }>();

    // Initialize departments
    departments.forEach(dept => {
      departmentMap.set(dept.id, {
        department: dept,
        totalBilled: 0,
        invoiceCount: 0,
        approvedAmount: 0,
        pendingAmount: 0,
        rejectedAmount: 0,
      });
    });

    // Aggregate invoice data by department
    invoices.forEach(invoice => {
      // Get departmentId from invoice (direct field)
      const deptId = invoice.departmentId;
      if (!deptId) return;

      // Apply department filter if specified (support both single and multiple)
      if (filters.departmentId) {
        const filterDeptIds = Array.isArray(filters.departmentId) ? filters.departmentId : [filters.departmentId];
        if (!filterDeptIds.includes(deptId)) return;
      }

      const data = departmentMap.get(deptId);
      if (!data) return;

      const amount = invoice.invoiceTotal || 0;
      data.totalBilled += amount;
      data.invoiceCount++;

      // Categorize by status
      const status = invoice.status?.toLowerCase();
      if (status === 'approved') {
        data.approvedAmount += amount;
      } else if (status === 'rejected') {
        data.rejectedAmount += amount;
      } else {
        data.pendingAmount += amount;
      }
    });

    // Convert to array and filter out departments with no invoices (unless "All Departments" is selected)
    const results = Array.from(departmentMap.values())
      .filter(d => !filters.departmentId || d.invoiceCount > 0) // Show all if specific dept selected, else only with data
      .sort((a, b) => b.totalBilled - a.totalBilled)
      .map(item => ({
        departmentId: item.department.id,
        departmentCode: item.department.departmentCode,
        departmentName: item.department.departmentName,
        totalBilled: item.totalBilled,
        invoiceCount: item.invoiceCount,
        approvedAmount: item.approvedAmount,
        pendingAmount: item.pendingAmount,
        rejectedAmount: item.rejectedAmount,
        averageInvoiceAmount: item.invoiceCount > 0 ? item.totalBilled / item.invoiceCount : 0,
      }));

    // Calculate totals
    const totals = {
      totalBilled: results.reduce((sum, r) => sum + r.totalBilled, 0),
      totalInvoices: results.reduce((sum, r) => sum + r.invoiceCount, 0),
      totalApproved: results.reduce((sum, r) => sum + r.approvedAmount, 0),
      totalPending: results.reduce((sum, r) => sum + r.pendingAmount, 0),
      totalRejected: results.reduce((sum, r) => sum + r.rejectedAmount, 0),
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
        reportType: 'Billing Report By Department',
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processBillingReportByDepartment:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Billing Report By Project
 * Uses projectId in invoices to get project data
 */
export async function processBillingReportByProject(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch invoices with optional date filters
    let invoicesQuery: any = adminDb.collection('invoices');

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      invoicesQuery = invoicesQuery.where('approvedAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      invoicesQuery = invoicesQuery.where('approvedAt', '<=', Timestamp.fromDate(toDate));
    }

    const invoicesSnapshot = await invoicesQuery.get();
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Fetch all projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Create project map
    const projectMap = new Map<string, {
      project: Project;
      totalBilled: number;
      invoiceCount: number;
      approvedAmount: number;
      pendingAmount: number;
      rejectedAmount: number;
    }>();

    // Initialize projects (apply filter if specified - support both single and multiple)
    projects.forEach(project => {
      if (filters.projectId) {
        const filterProjectIds = Array.isArray(filters.projectId) ? filters.projectId : [filters.projectId];
        if (!filterProjectIds.includes(project.id)) return;
      }

      projectMap.set(project.id, {
        project,
        totalBilled: 0,
        invoiceCount: 0,
        approvedAmount: 0,
        pendingAmount: 0,
        rejectedAmount: 0,
      });
    });

    // Aggregate invoice data by project
    invoices.forEach(invoice => {
      const projectId = extractId(invoice.projectId);
      if (!projectId) return;

      const data = projectMap.get(projectId);
      if (!data) return;

      const amount = invoice.invoiceTotal || 0;
      data.totalBilled += amount;
      data.invoiceCount++;

      // Categorize by status
      const status = invoice.status?.toLowerCase();
      if (status === 'approved') {
        data.approvedAmount += amount;
      } else if (status === 'rejected') {
        data.rejectedAmount += amount;
      } else {
        data.pendingAmount += amount;
      }
    });

    // Convert to array and filter
    const results = Array.from(projectMap.values())
      .filter(p => !filters.projectId || p.invoiceCount > 0)
      .sort((a, b) => b.totalBilled - a.totalBilled)
      .map(item => ({
        projectId: item.project.id,
        poNumber: item.project.poNumber,
        projectName: item.project.projectName,
        projectManager: item.project.projectManager || 'N/A',
        totalBilled: item.totalBilled,
        invoiceCount: item.invoiceCount,
        approvedAmount: item.approvedAmount,
        pendingAmount: item.pendingAmount,
        rejectedAmount: item.rejectedAmount,
        averageInvoiceAmount: item.invoiceCount > 0 ? item.totalBilled / item.invoiceCount : 0,
      }));

    // Calculate totals
    const totals = {
      totalBilled: results.reduce((sum, r) => sum + r.totalBilled, 0),
      totalInvoices: results.reduce((sum, r) => sum + r.invoiceCount, 0),
      totalApproved: results.reduce((sum, r) => sum + r.approvedAmount, 0),
      totalPending: results.reduce((sum, r) => sum + r.pendingAmount, 0),
      totalRejected: results.reduce((sum, r) => sum + r.rejectedAmount, 0),
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
        reportType: 'Billing Report By Project',
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processBillingReportByProject:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Payment Report by Department
 * Uses departmentId in payment_tracking collection
 */
export async function processPaymentReportByDepartment(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch payment tracking records with optional date filters
    let paymentsQuery: any = adminDb.collection('payment_tracking');

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      paymentsQuery = paymentsQuery.where('createdAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      paymentsQuery = paymentsQuery.where('createdAt', '<=', Timestamp.fromDate(toDate));
    }

    const paymentsSnapshot = await paymentsQuery.get();
    const payments = paymentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as PaymentTracking[];

    // Fetch all departments
    const departmentsSnapshot = await adminDb.collection('departments').get();
    const departments = departmentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Department[];

    // Create department map
    const departmentMap = new Map<string, {
      department: Department;
      totalInvoiced: number;
      totalPaid: number;
      totalOutstanding: number;
      paymentCount: number;
      statusBreakdown: {
        pending: { count: number; amount: number };
        partial: { count: number; amount: number };
        paid: { count: number; amount: number };
        overdue: { count: number; amount: number };
      };
    }>();

    // Initialize departments
    departments.forEach(dept => {
      departmentMap.set(dept.id, {
        department: dept,
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        paymentCount: 0,
        statusBreakdown: {
          pending: { count: 0, amount: 0 },
          partial: { count: 0, amount: 0 },
          paid: { count: 0, amount: 0 },
          overdue: { count: 0, amount: 0 },
        },
      });
    });

    // Aggregate payment data by department
    payments.forEach(payment => {
      const deptId = payment.departmentId;
      if (!deptId) return;

      // Apply department filter if specified (support both single and multiple)
      if (filters.departmentId) {
        const filterDeptIds = Array.isArray(filters.departmentId) ? filters.departmentId : [filters.departmentId];
        if (!filterDeptIds.includes(deptId)) return;
      }

      const data = departmentMap.get(deptId);
      if (!data) return;

      const invoiceAmount = payment.invoiceAmount || 0;
      const paidAmount = payment.paidAmount || 0;
      const outstandingAmount = payment.outstandingAmount || 0;

      data.totalInvoiced += invoiceAmount;
      data.totalPaid += paidAmount;
      data.totalOutstanding += outstandingAmount;
      data.paymentCount++;

      // Categorize by status
      const status = payment.status?.toLowerCase();
      if (status === 'pending') {
        data.statusBreakdown.pending.count++;
        data.statusBreakdown.pending.amount += outstandingAmount;
      } else if (status === 'partial') {
        data.statusBreakdown.partial.count++;
        data.statusBreakdown.partial.amount += outstandingAmount;
      } else if (status === 'paid') {
        data.statusBreakdown.paid.count++;
        data.statusBreakdown.paid.amount += paidAmount;
      } else if (status === 'overdue') {
        data.statusBreakdown.overdue.count++;
        data.statusBreakdown.overdue.amount += outstandingAmount;
      }
    });

    // Convert to array and filter
    const results = Array.from(departmentMap.values())
      .filter(d => !filters.departmentId || d.paymentCount > 0)
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
      .map(item => ({
        departmentId: item.department.id,
        departmentCode: item.department.departmentCode,
        departmentName: item.department.departmentName,
        totalInvoiced: item.totalInvoiced,
        totalPaid: item.totalPaid,
        totalOutstanding: item.totalOutstanding,
        paymentCount: item.paymentCount,
        paymentRate: item.totalInvoiced > 0 ? (item.totalPaid / item.totalInvoiced) * 100 : 0,
        statusBreakdown: item.statusBreakdown,
      }));

    // Calculate totals
    const totals = {
      totalInvoiced: results.reduce((sum, r) => sum + r.totalInvoiced, 0),
      totalPaid: results.reduce((sum, r) => sum + r.totalPaid, 0),
      totalOutstanding: results.reduce((sum, r) => sum + r.totalOutstanding, 0),
      totalPayments: results.reduce((sum, r) => sum + r.paymentCount, 0),
      overallPaymentRate: 0,
    };

    totals.overallPaymentRate = totals.totalInvoiced > 0
      ? (totals.totalPaid / totals.totalInvoiced) * 100
      : 0;

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
        reportType: 'Payment Report by Department',
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processPaymentReportByDepartment:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Payment Report by Project
 * Uses projectId in payment_tracking collection
 */
export async function processPaymentReportByProject(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch payment tracking records with optional date filters
    let paymentsQuery: any = adminDb.collection('payment_tracking');

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      paymentsQuery = paymentsQuery.where('createdAt', '>=', Timestamp.fromDate(fromDate));
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      paymentsQuery = paymentsQuery.where('createdAt', '<=', Timestamp.fromDate(toDate));
    }

    const paymentsSnapshot = await paymentsQuery.get();
    const payments = paymentsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as PaymentTracking[];

    // Fetch all projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Create project map
    const projectMap = new Map<string, {
      project: Project;
      totalInvoiced: number;
      totalPaid: number;
      totalOutstanding: number;
      paymentCount: number;
      statusBreakdown: {
        pending: { count: number; amount: number };
        partial: { count: number; amount: number };
        paid: { count: number; amount: number };
        overdue: { count: number; amount: number };
      };
    }>();

    // Initialize projects (apply filter if specified - support both single and multiple)
    projects.forEach(project => {
      if (filters.projectId) {
        const filterProjectIds = Array.isArray(filters.projectId) ? filters.projectId : [filters.projectId];
        if (!filterProjectIds.includes(project.id)) return;
      }

      projectMap.set(project.id, {
        project,
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        paymentCount: 0,
        statusBreakdown: {
          pending: { count: 0, amount: 0 },
          partial: { count: 0, amount: 0 },
          paid: { count: 0, amount: 0 },
          overdue: { count: 0, amount: 0 },
        },
      });
    });

    // Aggregate payment data by project
    payments.forEach(payment => {
      const projectId = extractId(payment.projectId);
      if (!projectId) return;

      const data = projectMap.get(projectId);
      if (!data) return;

      const invoiceAmount = payment.invoiceAmount || 0;
      const paidAmount = payment.paidAmount || 0;
      const outstandingAmount = payment.outstandingAmount || 0;

      data.totalInvoiced += invoiceAmount;
      data.totalPaid += paidAmount;
      data.totalOutstanding += outstandingAmount;
      data.paymentCount++;

      // Categorize by status
      const status = payment.status?.toLowerCase();
      if (status === 'pending') {
        data.statusBreakdown.pending.count++;
        data.statusBreakdown.pending.amount += outstandingAmount;
      } else if (status === 'partial') {
        data.statusBreakdown.partial.count++;
        data.statusBreakdown.partial.amount += outstandingAmount;
      } else if (status === 'paid') {
        data.statusBreakdown.paid.count++;
        data.statusBreakdown.paid.amount += paidAmount;
      } else if (status === 'overdue') {
        data.statusBreakdown.overdue.count++;
        data.statusBreakdown.overdue.amount += outstandingAmount;
      }
    });

    // Convert to array and filter
    const results = Array.from(projectMap.values())
      .filter(p => !filters.projectId || p.paymentCount > 0)
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
      .map(item => ({
        projectId: item.project.id,
        poNumber: item.project.poNumber,
        projectName: item.project.projectName,
        projectManager: item.project.projectManager || 'N/A',
        totalInvoiced: item.totalInvoiced,
        totalPaid: item.totalPaid,
        totalOutstanding: item.totalOutstanding,
        paymentCount: item.paymentCount,
        paymentRate: item.totalInvoiced > 0 ? (item.totalPaid / item.totalInvoiced) * 100 : 0,
        statusBreakdown: item.statusBreakdown,
      }));

    // Calculate totals
    const totals = {
      totalInvoiced: results.reduce((sum, r) => sum + r.totalInvoiced, 0),
      totalPaid: results.reduce((sum, r) => sum + r.totalPaid, 0),
      totalOutstanding: results.reduce((sum, r) => sum + r.totalOutstanding, 0),
      totalPayments: results.reduce((sum, r) => sum + r.paymentCount, 0),
      overallPaymentRate: 0,
    };

    totals.overallPaymentRate = totals.totalInvoiced > 0
      ? (totals.totalPaid / totals.totalInvoiced) * 100
      : 0;

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
        reportType: 'Payment Report by Project',
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Financial Processor] Error in processPaymentReportByProject:', error);
    return { success: false, error: String(error), data: null };
  }
}
