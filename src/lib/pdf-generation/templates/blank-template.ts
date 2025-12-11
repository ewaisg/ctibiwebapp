/**
 * Blank Report Template
 * For custom reports - provides header/footer with empty content area
 */

import { createBasePDF, finalizePDF, BaseReportOptions } from './base-template';

/**
 * Generate a blank report with header and footer
 * Returns context for custom content drawing
 */
export async function generateBlankReport(options: BaseReportOptions): Promise<Uint8Array> {
  // Create base PDF
  const context = await createBasePDF(options);

  // No content - just header and footer
  // This template is meant to be extended by custom report generators

  // Finalize PDF with footers
  const pdfBytes = await finalizePDF(context);

  return pdfBytes;
}

/**
 * Export context type for custom report generators
 */
export type BlankReportContext = Awaited<ReturnType<typeof createBasePDF>>;
