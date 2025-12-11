/**
 * Sample Report Example
 * Demonstrates how to use the PDF generation library
 */

import { generateTableReport } from '../templates/table-report-template';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatting';

/**
 * Generate a sample revenue report
 * This serves as both a test and documentation example
 */
export async function generateSampleReport(): Promise<Uint8Array> {
  // Sample data
  const sampleData = {
    contractNo: 'C-2024-001',
    contractName: 'Denver Airport Expansion',
    billingPeriod: '01/01/2024 TO 01/31/2024',
    departments: [
      { name: 'Engineering', revenue: 125000, invoices: 5, paid: 100000, pending: 25000 },
      { name: 'Construction', revenue: 250000, invoices: 8, paid: 200000, pending: 50000 },
      { name: 'Management', revenue: 75000, invoices: 3, paid: 75000, pending: 0 },
    ],
  };

  // Calculate totals
  const totals = {
    revenue: sampleData.departments.reduce((sum, d) => sum + d.revenue, 0),
    invoices: sampleData.departments.reduce((sum, d) => sum + d.invoices, 0),
    paid: sampleData.departments.reduce((sum, d) => sum + d.paid, 0),
    pending: sampleData.departments.reduce((sum, d) => sum + d.pending, 0),
  };

  // Generate PDF
  const pdfBytes = await generateTableReport({
    title: 'REVENUE BY DEPARTMENT SUMMARY',
    orientation: 'portrait',
    headerInfo: {
      title: 'REVENUE BY DEPARTMENT SUMMARY',
      contractNo: sampleData.contractNo,
      contractName: sampleData.contractName,
      billingPeriod: sampleData.billingPeriod,
    },
    summary: {
      title: 'Report Summary',
      items: [
        { label: 'Total Revenue', value: formatCurrency(totals.revenue), highlight: true },
        { label: 'Total Invoices', value: totals.invoices.toString() },
        { label: 'Total Paid', value: formatCurrency(totals.paid) },
        { label: 'Total Pending', value: formatCurrency(totals.pending) },
        { label: 'Departments', value: sampleData.departments.length.toString() },
        { label: 'Generated', value: formatDate(new Date(), 'short') },
      ],
    },
    tables: [
      {
        title: 'Department Revenue Breakdown',
        options: {
          columns: [
            { label: 'Department', width: 150, align: 'left' },
            { label: 'Revenue', width: 100, align: 'right' },
            { label: 'Invoices', width: 80, align: 'center' },
            { label: 'Paid', width: 100, align: 'right' },
            { label: 'Pending', width: 100, align: 'right' },
          ],
          rows: sampleData.departments.map(dept => [
            dept.name,
            formatCurrency(dept.revenue),
            dept.invoices.toString(),
            formatCurrency(dept.paid),
            formatCurrency(dept.pending),
          ]),
          totals: [
            'TOTAL',
            formatCurrency(totals.revenue),
            totals.invoices.toString(),
            formatCurrency(totals.paid),
            formatCurrency(totals.pending),
          ],
          showBorders: true,
          alternateRowColors: true,
        },
      },
    ],
  });

  return pdfBytes;
}

/**
 * Generate a blank template example
 */
import { generateBlankReport } from '../templates/blank-template';

export async function generateBlankTemplateExample(): Promise<Uint8Array> {
  const pdfBytes = await generateBlankReport({
    title: 'CUSTOM REPORT TEMPLATE',
    orientation: 'portrait',
    headerInfo: {
      title: 'CUSTOM REPORT TEMPLATE',
      contractNo: '______________',
      contractName: '______________',
      billingPeriod: '______________',
      customFields: [
        { label: 'PROJECT NAME', value: '______________' },
        { label: 'PREPARED BY', value: '______________' },
      ],
    },
  });

  return pdfBytes;
}
