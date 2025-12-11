/**
 * Base PDF Report Template
 * Foundation for all report types
 */

import { PDFDocument } from 'pdf-lib';
import { getPageSize } from '../constants/layout-config';
import { REPORT_LAYOUT } from '../constants/design-tokens';
import { embedFonts } from '../utils/pdf-helpers';
import { drawHeader, HeaderOptions } from '../components/pdf-header';
import { drawFooter } from '../components/pdf-footer';

export interface BaseReportOptions {
  title: string;
  orientation?: 'portrait' | 'landscape';
  headerInfo?: HeaderOptions;
  footer?: {
    showPageNumbers?: boolean;
    showGeneratedDate?: boolean;
    showConfidential?: boolean;
    customText?: string;
  };
}

/**
 * Create a base PDF document with header and footer
 * Returns the PDF document, fonts, and starting Y position
 */
export async function createBasePDF(options: BaseReportOptions) {
  const { title, orientation = 'portrait', headerInfo, footer = {} } = options;

  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  // Get page size
  const pageSize = getPageSize(orientation);

  // Add first page
  const page = pdfDoc.addPage([pageSize.width, pageSize.height]);

  // Embed fonts
  const fonts = await embedFonts(pdfDoc);

  // Draw header
  const currentY = await drawHeader(pdfDoc, page, fonts, {
    title,
    ...headerInfo,
  });

  // Calculate minimum Y (where footer starts)
  const minY = REPORT_LAYOUT.MARGIN_BOTTOM + REPORT_LAYOUT.FOOTER_HEIGHT;

  return {
    pdfDoc,
    page,
    fonts,
    currentY: currentY - REPORT_LAYOUT.SECTION_SPACING,
    minY,
    pageNumber: 1,
    orientation,
    headerInfo: { title, ...headerInfo },
    footerOptions: {
      showPageNumbers: footer.showPageNumbers !== false,
      showGeneratedDate: footer.showGeneratedDate !== false,
      showConfidential: footer.showConfidential !== false,
      customText: footer.customText,
    },
  };
}

/**
 * Finalize PDF by adding footers to all pages
 */
export async function finalizePDF(context: {
  pdfDoc: PDFDocument;
  fonts: any;
  footerOptions: any;
}) {
  const { pdfDoc, fonts, footerOptions } = context;
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Add footer to each page
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    drawFooter(page, fonts, {
      pageNumber: i + 1,
      totalPages,
      ...footerOptions,
    });
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
