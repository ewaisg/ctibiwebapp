/**
 * Table Report Template
 * For data-heavy reports with tables (most reports use this)
 */

import { createBasePDF, finalizePDF, BaseReportOptions } from './base-template';
import { drawSummarySection, SummaryOptions } from '../components/pdf-summary-section';
import { drawTable, TableOptions } from '../components/pdf-table';

export interface TableReportOptions extends BaseReportOptions {
  summary?: SummaryOptions;
  tables: Array<{
    title?: string;
    options: TableOptions;
  }>;
}

/**
 * Generate a table-based report
 */
export async function generateTableReport(options: TableReportOptions): Promise<Uint8Array> {
  const { summary, tables } = options;

  // Create base PDF
  const context = await createBasePDF(options);
  let { pdfDoc, page, fonts, currentY, minY, pageNumber, orientation, headerInfo, footerOptions } =
    context;

  // Draw summary section (if provided)
  if (summary) {
    currentY = drawSummarySection(page, fonts, currentY, summary);
  }

  // Draw tables
  for (const table of tables) {
    // Table title (if provided)
    if (table.title) {
      const { helveticaBold } = fonts;
      page.drawText(table.title.toUpperCase(), {
        x: context.pdfDoc.getPage(0).getSize().width / 2 - 100,
        y: currentY,
        size: 11,
        font: helveticaBold,
      });
      currentY -= 20;
    }

    // Draw table
    const tableResult = await drawTable(
      {
        pdfDoc,
        page,
        fonts,
        currentY,
        minY,
        pageNumber,
        headerOptions: headerInfo,
        orientation,
      },
      table.options
    );

    currentY = tableResult.currentY;
    page = tableResult.page;
    pageNumber = tableResult.pageNumber;
    currentY -= 20; // Space between tables
  }

  // Finalize PDF with footers
  const pdfBytes = await finalizePDF({ pdfDoc, fonts, footerOptions });

  return pdfBytes;
}
