/**
 * Financial Report PDF Generators
 * Generate PDFs for financial reports using data from processors
 */

import { generateTableReport } from '../templates/table-report-template';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatting';
import type { ReportFilters } from '@/lib/report-templates/types';

/**
 * Helper function to convert filter value (string or array) to display string
 */
function filterToString(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.length > 1 ? `${value.length} items` : value[0];
  }
  return value;
}

/**
 * Generate Revenue by Department PDF Report
 */
export async function generateRevenueByDepartmentPDF(
  data: any,
  filters: ReportFilters
): Promise<Uint8Array> {
  // Calculate totals from summary
  const summary = data.summary || {};
  const items = data.items || [];

  return generateTableReport({
    title: 'REVENUE BY DEPARTMENT',
    orientation: 'portrait',
    headerInfo: {
      title: 'REVENUE BY DEPARTMENT',
      contractNo: filterToString(filters.contractId),
      billingPeriod: filters.dateFrom && filters.dateTo
        ? `${formatDate(filters.dateFrom)} TO ${formatDate(filters.dateTo)}`
        : 'All Time',
    },
    summary: {
      title: 'Report Summary',
      items: [
        { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue || 0), highlight: true },
        { label: 'Total Invoices', value: (summary.totalInvoices || 0).toString() },
        { label: 'Total Paid', value: formatCurrency(summary.totalPaid || 0) },
        { label: 'Total Pending', value: formatCurrency(summary.totalPending || 0) },
        { label: 'Departments', value: items.length.toString() },
        { label: 'Report Date', value: formatDate(new Date(), 'short') },
      ],
      columns: 3,
    },
    tables: [
      {
        title: 'Revenue by Department',
        options: {
          columns: [
            { label: 'Department', width: 180, align: 'left' },
            { label: 'Revenue', width: 110, align: 'right' },
            { label: 'Invoices', width: 80, align: 'center' },
            { label: 'Paid', width: 110, align: 'right' },
            { label: 'Pending', width: 110, align: 'right' },
          ],
          rows: items.map((item: any) => [
            item.departmentName || 'Unknown',
            formatCurrency(item.totalRevenue || 0),
            (item.invoiceCount || 0).toString(),
            formatCurrency(item.paidAmount || 0),
            formatCurrency(item.pendingAmount || 0),
          ]),
          totals: [
            'TOTAL',
            formatCurrency(summary.totalRevenue || 0),
            (summary.totalInvoices || 0).toString(),
            formatCurrency(summary.totalPaid || 0),
            formatCurrency(summary.totalPending || 0),
          ],
          showBorders: true,
          alternateRowColors: true,
        },
      },
    ],
  });
}

/**
 * Generate Revenue by Project PDF Report
 */
export async function generateRevenueByProjectPDF(
  data: any,
  filters: ReportFilters
): Promise<Uint8Array> {
  const summary = data.summary || {};
  const items = data.items || [];

  return generateTableReport({
    title: 'REVENUE BY PROJECT',
    orientation: 'landscape',
    headerInfo: {
      title: 'REVENUE BY PROJECT',
      contractNo: filterToString(filters.contractId),
      billingPeriod: filters.dateFrom && filters.dateTo
        ? `${formatDate(filters.dateFrom)} TO ${formatDate(filters.dateTo)}`
        : 'All Time',
    },
    summary: {
      title: 'Report Summary',
      items: [
        { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue || 0), highlight: true },
        { label: 'Projects', value: items.length.toString() },
        { label: 'Avg Revenue/Project', value: formatCurrency((summary.totalRevenue || 0) / (items.length || 1)) },
        { label: 'Total Budget', value: formatCurrency(summary.totalBudget || 0) },
        { label: 'Remaining Budget', value: formatCurrency(summary.remainingBudget || 0) },
        { label: 'Budget Utilization', value: formatPercentage(summary.budgetUtilization || 0) },
      ],
      columns: 3,
    },
    tables: [
      {
        title: 'Project Revenue Detail',
        options: {
          columns: [
            { label: 'Project Name', width: 180, align: 'left' },
            { label: 'PO Number', width: 100, align: 'left' },
            { label: 'Budget', width: 100, align: 'right' },
            { label: 'Revenue', width: 100, align: 'right' },
            { label: 'Remaining', width: 100, align: 'right' },
            { label: 'Invoices', width: 70, align: 'center' },
            { label: 'Util %', width: 70, align: 'right' },
          ],
          rows: items.map((item: any) => [
            item.project?.projectName || 'Unknown',
            item.project?.poNumber || '-',
            formatCurrency(item.budgetAmount || 0),
            formatCurrency(item.totalRevenue || 0),
            formatCurrency(item.remainingBudget || 0),
            (item.invoiceCount || 0).toString(),
            formatPercentage((item.totalRevenue || 0) / (item.budgetAmount || 1) * 100),
          ]),
          totals: [
            'TOTAL',
            '',
            formatCurrency(summary.totalBudget || 0),
            formatCurrency(summary.totalRevenue || 0),
            formatCurrency(summary.remainingBudget || 0),
            (summary.invoiceCount || 0).toString(),
            formatPercentage(summary.budgetUtilization || 0),
          ],
          showBorders: true,
          alternateRowColors: true,
        },
      },
    ],
  });
}

/**
 * Generate Outstanding Invoices PDF Report
 */
export async function generateOutstandingInvoicesPDF(
  data: any,
  filters: ReportFilters
): Promise<Uint8Array> {
  const summary = data.summary || {};
  const items = data.items || [];

  return generateTableReport({
    title: 'OUTSTANDING INVOICES REPORT',
    orientation: 'portrait',
    headerInfo: {
      title: 'OUTSTANDING INVOICES REPORT',
      contractNo: filterToString(filters.contractId),
      billingPeriod: `As of ${formatDate(new Date(), 'long')}`,
    },
    summary: {
      title: 'Aging Summary',
      items: [
        { label: 'Total Outstanding', value: formatCurrency(summary.totalOutstanding || 0), highlight: true },
        { label: 'Total Invoices', value: (items.length || 0).toString() },
        { label: '0-30 Days', value: formatCurrency(summary.aging030 || 0) },
        { label: '31-60 Days', value: formatCurrency(summary.aging3160 || 0) },
        { label: '61-90 Days', value: formatCurrency(summary.aging6190 || 0) },
        { label: '90+ Days', value: formatCurrency(summary.aging90Plus || 0) },
      ],
      columns: 3,
    },
    tables: [
      {
        title: 'Outstanding Invoice Detail',
        options: {
          columns: [
            { label: 'Invoice #', width: 100, align: 'left' },
            { label: 'Project', width: 150, align: 'left' },
            { label: 'Due Date', width: 90, align: 'center' },
            { label: 'Days Out', width: 70, align: 'center' },
            { label: 'Amount', width: 100, align: 'right' },
          ],
          rows: items.map((item: any) => [
            item.invoiceNumber || '-',
            item.projectName || 'Unknown',
            item.dueDate ? formatDate(item.dueDate, 'short') : '-',
            (item.daysOutstanding || 0).toString(),
            formatCurrency(item.outstandingAmount || 0),
          ]),
          totals: [
            'TOTAL',
            `${items.length} Invoices`,
            '',
            '',
            formatCurrency(summary.totalOutstanding || 0),
          ],
          showBorders: true,
          alternateRowColors: true,
        },
      },
    ],
  });
}

/**
 * Generate Payment Tracking PDF Report
 */
export async function generatePaymentTrackingPDF(
  data: any,
  filters: ReportFilters
): Promise<Uint8Array> {
  const summary = data.summary || {};
  const items = data.items || [];

  return generateTableReport({
    title: 'PAYMENT TRACKING REPORT',
    orientation: 'landscape',
    headerInfo: {
      title: 'PAYMENT TRACKING REPORT',
      contractNo: filterToString(filters.contractId),
      billingPeriod: filters.dateFrom && filters.dateTo
        ? `${formatDate(filters.dateFrom)} TO ${formatDate(filters.dateTo)}`
        : 'All Time',
    },
    summary: {
      title: 'Payment Summary',
      items: [
        { label: 'Total Invoice Amount', value: formatCurrency(summary.totalInvoiceAmount || 0), highlight: true },
        { label: 'Total Paid', value: formatCurrency(summary.totalPaidAmount || 0) },
        { label: 'Total Outstanding', value: formatCurrency(summary.totalOutstandingAmount || 0) },
        { label: 'Payment Progress', value: formatPercentage(summary.paymentProgress || 0) },
        { label: 'Total Payments', value: (items.length || 0).toString() },
        { label: 'Overdue Invoices', value: (summary.overdueCount || 0).toString() },
      ],
      columns: 3,
    },
    tables: [
      {
        title: 'Payment Tracking Detail',
        options: {
          columns: [
            { label: 'Invoice #', width: 90, align: 'left' },
            { label: 'Project', width: 140, align: 'left' },
            { label: 'Invoice Amt', width: 90, align: 'right' },
            { label: 'Paid Amt', width: 90, align: 'right' },
            { label: 'Outstanding', width: 90, align: 'right' },
            { label: 'Payment Date', width: 90, align: 'center' },
            { label: 'Method', width: 80, align: 'left' },
            { label: 'Status', width: 70, align: 'center' },
          ],
          rows: items.map((item: any) => [
            item.invoiceNumber || '-',
            item.projectName || 'Unknown',
            formatCurrency(item.invoiceAmount || 0),
            formatCurrency(item.paidAmount || 0),
            formatCurrency(item.outstandingAmount || 0),
            item.paymentDate ? formatDate(item.paymentDate, 'short') : '-',
            item.paymentMethod || '-',
            item.status || 'Pending',
          ]),
          totals: [
            'TOTAL',
            `${items.length} Payments`,
            formatCurrency(summary.totalInvoiceAmount || 0),
            formatCurrency(summary.totalPaidAmount || 0),
            formatCurrency(summary.totalOutstandingAmount || 0),
            '',
            '',
            '',
          ],
          showBorders: true,
          alternateRowColors: true,
        },
      },
    ],
  });
}

/**
 * Generate Profitability Analysis PDF Report
 */
export async function generateProfitabilityAnalysisPDF(
  data: any,
  filters: ReportFilters
): Promise<Uint8Array> {
  const summary = data.summary || {};
  const items = data.items || [];

  return generateTableReport({
    title: 'PROFITABILITY ANALYSIS',
    orientation: 'landscape',
    headerInfo: {
      title: 'PROFITABILITY ANALYSIS',
      contractNo: filterToString(filters.contractId),
      billingPeriod: filters.dateFrom && filters.dateTo
        ? `${formatDate(filters.dateFrom)} TO ${formatDate(filters.dateTo)}`
        : 'All Time',
    },
    summary: {
      title: 'Profitability Summary',
      items: [
        { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue || 0), highlight: true },
        { label: 'Total Labor Cost', value: formatCurrency(summary.totalLaborCost || 0) },
        { label: 'Gross Profit', value: formatCurrency(summary.grossProfit || 0) },
        { label: 'Profit Margin', value: formatPercentage(summary.profitMargin || 0) },
        { label: 'Total Billable Hours', value: (summary.totalBillableHours || 0).toFixed(1) },
        { label: 'Avg Markup', value: formatPercentage(summary.averageMarkup || 0) },
      ],
      columns: 3,
    },
    tables: [
      {
        title: 'Project Profitability Detail',
        options: {
          columns: [
            { label: 'Project Name', width: 160, align: 'left' },
            { label: 'Revenue', width: 100, align: 'right' },
            { label: 'Labor Hours', width: 90, align: 'right' },
            { label: 'Labor Cost', width: 100, align: 'right' },
            { label: 'Gross Profit', width: 100, align: 'right' },
            { label: 'Profit Margin', width: 90, align: 'right' },
            { label: 'Markup', width: 80, align: 'right' },
          ],
          rows: items.map((item: any) => [
            item.projectName || 'Unknown',
            formatCurrency(item.revenue || 0),
            (item.billableHours || 0).toFixed(1),
            formatCurrency(item.laborCost || 0),
            formatCurrency(item.grossProfit || 0),
            formatPercentage(item.profitMargin || 0),
            formatPercentage(item.markup || 0),
          ]),
          totals: [
            'TOTAL',
            formatCurrency(summary.totalRevenue || 0),
            (summary.totalBillableHours || 0).toFixed(1),
            formatCurrency(summary.totalLaborCost || 0),
            formatCurrency(summary.grossProfit || 0),
            formatPercentage(summary.profitMargin || 0),
            formatPercentage(summary.averageMarkup || 0),
          ],
          showBorders: true,
          alternateRowColors: true,
        },
      },
    ],
  });
}
