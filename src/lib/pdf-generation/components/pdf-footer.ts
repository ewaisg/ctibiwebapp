/**
 * PDF Footer Component
 * Renders consistent footer with page numbers and generation info
 */

import { PDFPage, PDFFont } from 'pdf-lib';
import { REPORT_COLORS, REPORT_TYPOGRAPHY, REPORT_LAYOUT, COMPANY_INFO } from '../constants/design-tokens';
import { drawText, drawHorizontalLine } from '../utils/pdf-helpers';
import { formatDateTime } from '../utils/formatting';

export interface FooterOptions {
  pageNumber: number;
  totalPages: number;
  showGeneratedDate?: boolean;
  showConfidential?: boolean;
  customText?: string;
}

export function drawFooter(
  page: PDFPage,
  fonts: { helvetica: PDFFont; helveticaBold: PDFFont },
  options: FooterOptions
): void {
  const { helvetica } = fonts;
  const { width } = page.getSize();

  const footerY = REPORT_LAYOUT.MARGIN_BOTTOM - 10;

  // Draw horizontal line above footer
  drawHorizontalLine(
    page,
    REPORT_LAYOUT.MARGIN_LEFT,
    footerY + 15,
    width - REPORT_LAYOUT.MARGIN_LEFT - REPORT_LAYOUT.MARGIN_RIGHT,
    0.5,
    REPORT_COLORS.BORDER_LIGHT
  );

  // Left side: Page number
  const pageText = `Page ${options.pageNumber} of ${options.totalPages}`;
  drawText(page, pageText, REPORT_LAYOUT.MARGIN_LEFT, footerY, {
    font: helvetica,
    size: REPORT_TYPOGRAPHY.SIZE_FOOTER,
    color: REPORT_COLORS.BODY_TEXT_MUTED,
    align: 'left',
  });

  // Center: Custom text or confidential notice
  if (options.customText) {
    const centerX = width / 2;
    drawText(page, options.customText, centerX, footerY, {
      font: helvetica,
      size: REPORT_TYPOGRAPHY.SIZE_FOOTER,
      color: REPORT_COLORS.BODY_TEXT_MUTED,
      align: 'center',
      maxWidth: width / 3,
    });
  } else if (options.showConfidential !== false) {
    const centerX = width / 2;
    const confidentialText = `${COMPANY_INFO.NAME} - Confidential`;
    const textWidth = helvetica.widthOfTextAtSize(confidentialText, REPORT_TYPOGRAPHY.SIZE_FOOTER);
    drawText(page, confidentialText, centerX - textWidth / 2, footerY, {
      font: helvetica,
      size: REPORT_TYPOGRAPHY.SIZE_FOOTER,
      color: REPORT_COLORS.BODY_TEXT_MUTED,
      align: 'left',
    });
  }

  // Right side: Generated date
  if (options.showGeneratedDate !== false) {
    const generatedText = `Generated: ${formatDateTime(new Date())}`;
    const textWidth = helvetica.widthOfTextAtSize(generatedText, REPORT_TYPOGRAPHY.SIZE_FOOTER);
    drawText(
      page,
      generatedText,
      width - REPORT_LAYOUT.MARGIN_RIGHT - textWidth,
      footerY,
      {
        font: helvetica,
        size: REPORT_TYPOGRAPHY.SIZE_FOOTER,
        color: REPORT_COLORS.BODY_TEXT_MUTED,
        align: 'left',
      }
    );
  }
}
