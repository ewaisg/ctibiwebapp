/**
 * PDF Generators Index
 * Central export for all report PDF generators
 */

// Financial Reports
export {
  generateRevenueByDepartmentPDF,
  generateRevenueByProjectPDF,
  generateOutstandingInvoicesPDF,
  generatePaymentTrackingPDF,
  generateProfitabilityAnalysisPDF,
} from './financial-reports';

/**
 * Generator Registry
 * Maps report template IDs to PDF generator functions
 */
export const PDF_GENERATOR_REGISTRY: Record<string, (data: any, filters: any) => Promise<Uint8Array>> = {
  // Financial Reports - Phase 1 Complete
  'revenue-by-department': async (data, filters) =>
    (await import('./financial-reports')).generateRevenueByDepartmentPDF(data, filters),
  'revenue-by-project': async (data, filters) =>
    (await import('./financial-reports')).generateRevenueByProjectPDF(data, filters),
  'outstanding-invoices': async (data, filters) =>
    (await import('./financial-reports')).generateOutstandingInvoicesPDF(data, filters),
  'payment-tracking': async (data, filters) =>
    (await import('./financial-reports')).generatePaymentTrackingPDF(data, filters),
  'profitability-analysis': async (data, filters) =>
    (await import('./financial-reports')).generateProfitabilityAnalysisPDF(data, filters),

  // More generators will be added in subsequent phases
};

/**
 * Get PDF generator by report template ID
 */
export function getPDFGenerator(reportTemplateId: string): ((data: any, filters: any) => Promise<Uint8Array>) | undefined {
  return PDF_GENERATOR_REGISTRY[reportTemplateId];
}

/**
 * Check if a PDF generator exists for a report
 */
export function hasPDFGenerator(reportTemplateId: string): boolean {
  return reportTemplateId in PDF_GENERATOR_REGISTRY;
}
