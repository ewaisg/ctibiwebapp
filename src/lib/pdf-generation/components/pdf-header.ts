/**
 * PDF Header Component
 * Renders consistent header with logo, title, and contract information
 */

import { PDFDocument, PDFPage, PDFFont } from 'pdf-lib';
import {
  REPORT_COLORS,
  REPORT_TYPOGRAPHY,
  REPORT_LAYOUT,
  COMPANY_INFO,
} from '../constants/design-tokens';
import { loadLogo, drawText, drawHorizontalLine } from '../utils/pdf-helpers';

export interface HeaderOptions {
  title: string;
  contractNo?: string;
  contractName?: string;
  invoiceNo?: string;
  invoicePacketNo?: string;
  billingPeriod?: string;
  customFields?: Array<{ label: string; value: string }>;
}

export async function drawHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  fonts: { helvetica: PDFFont; helveticaBold: PDFFont },
  options: HeaderOptions
): Promise<number> {
  const { helvetica, helveticaBold } = fonts;
  const { width, height } = page.getSize();

  let currentY = height - REPORT_LAYOUT.MARGIN_TOP;

  // 1. Draw logo (top left)
  const logo = await loadLogo(pdfDoc);
  if (logo) {
    page.drawImage(logo, {
      x: REPORT_LAYOUT.MARGIN_LEFT,
      y: currentY - REPORT_LAYOUT.LOGO_HEIGHT,
      width: REPORT_LAYOUT.LOGO_WIDTH,
      height: REPORT_LAYOUT.LOGO_HEIGHT,
    });
  }

  // 2. Draw report title (top right)
  const titleWidth = width - REPORT_LAYOUT.MARGIN_LEFT - REPORT_LAYOUT.MARGIN_RIGHT - REPORT_LAYOUT.LOGO_WIDTH - 30;
  drawText(page, options.title, width - REPORT_LAYOUT.MARGIN_RIGHT - titleWidth, currentY - 10, {
    font: helveticaBold,
    size: REPORT_TYPOGRAPHY.SIZE_TITLE,
    color: REPORT_COLORS.BODY_TEXT,
    align: 'center',
    maxWidth: titleWidth,
  });

  // Add spacing below logo
  currentY -= REPORT_LAYOUT.LOGO_HEIGHT + REPORT_LAYOUT.LOGO_BOTTOM_SPACING;

  // 3. Draw contract information fields (if provided)
  const fields: Array<{ label: string; value: string; xPos: number }> = [];
  const leftColumnX = REPORT_LAYOUT.MARGIN_LEFT;
  const rightColumnX = width / 2 + 20;

  // Left column fields
  if (options.contractNo) {
    fields.push({ label: 'CONTRACT NO.', value: options.contractNo, xPos: leftColumnX });
  }
  if (options.contractName) {
    fields.push({ label: 'CONTRACT NAME', value: options.contractName, xPos: leftColumnX });
  }

  // Right column fields
  if (options.invoicePacketNo) {
    fields.push({ label: 'INVOICE PACKET #', value: options.invoicePacketNo, xPos: rightColumnX });
  } else if (options.invoiceNo) {
    fields.push({ label: 'INVOICE NO.', value: options.invoiceNo, xPos: rightColumnX });
  }
  if (options.billingPeriod) {
    fields.push({ label: 'BILLING PERIOD', value: options.billingPeriod, xPos: rightColumnX });
  }

  // Custom fields
  if (options.customFields) {
    options.customFields.forEach(field => {
      fields.push({
        label: field.label,
        value: field.value,
        xPos: fields.length % 2 === 0 ? leftColumnX : rightColumnX,
      });
    });
  }

  // Draw fields in two columns
  let leftY = currentY;
  let rightY = currentY;

  for (const field of fields) {
    const yPos = field.xPos === leftColumnX ? leftY : rightY;

    // Label
    drawText(page, field.label, field.xPos, yPos, {
      font: helveticaBold,
      size: REPORT_TYPOGRAPHY.SIZE_BODY,
      color: REPORT_COLORS.BODY_TEXT,
    });

    // Value with underline
    const labelWidth = helveticaBold.widthOfTextAtSize(field.label, REPORT_TYPOGRAPHY.SIZE_BODY);
    const valueX = field.xPos + labelWidth + 5;
    const valueMaxWidth = (width / 2 - 40) - labelWidth - 5;

    drawText(page, field.value, valueX, yPos, {
      font: helvetica,
      size: REPORT_TYPOGRAPHY.SIZE_BODY,
      color: REPORT_COLORS.BODY_TEXT,
      maxWidth: valueMaxWidth,
    });

    // Underline
    drawHorizontalLine(page, valueX, yPos - 2, valueMaxWidth, 0.5, REPORT_COLORS.BORDER_COLOR);

    // Update Y position
    if (field.xPos === leftColumnX) {
      leftY -= REPORT_LAYOUT.LINE_SPACING + 5;
    } else {
      rightY -= REPORT_LAYOUT.LINE_SPACING + 5;
    }
  }

  currentY = Math.min(leftY, rightY) - REPORT_LAYOUT.HEADER_SPACING;

  // 4. Draw horizontal separator line
  drawHorizontalLine(
    page,
    REPORT_LAYOUT.MARGIN_LEFT,
    currentY,
    width - REPORT_LAYOUT.MARGIN_LEFT - REPORT_LAYOUT.MARGIN_RIGHT,
    1,
    REPORT_COLORS.BORDER_COLOR
  );

  currentY -= 10;

  return currentY;
}
