/**
 * Professional PDF Design System for CTI Reports
 *
 * Provides consistent branding, typography, colors, and layout utilities
 * for all CTI-generated PDF reports.
 */

import { PDFDocument, PDFPage, PDFFont, rgb, RGB } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// BRAND COLORS (from CTI logo)
// ============================================================================

export const CTI_COLORS = {
  // Primary brand colors
  navyBlue: rgb(0.17, 0.21, 0.45),      // #2B3674 - Primary brand color
  lightGray: rgb(0.52, 0.55, 0.64),     // #858CA2 - Secondary brand color

  // Status colors
  success: rgb(0.13, 0.54, 0.13),       // #228B22 - Forest Green
  warning: rgb(0.85, 0.65, 0.13),       // #D9A621 - Amber
  danger: rgb(0.77, 0.12, 0.23),        // #C41E3A - Crimson
  info: rgb(0.25, 0.41, 0.88),          // #4169E1 - Royal Blue

  // Neutral colors
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
  lightBg: rgb(0.97, 0.97, 0.98),       // #F7F7FA - Light background
  borderGray: rgb(0.85, 0.85, 0.85),    // #D9D9D9 - Borders
  textGray: rgb(0.33, 0.33, 0.33),      // #545454 - Secondary text

  // Table colors
  tableHeaderBg: rgb(0.17, 0.21, 0.45), // Navy blue header
  tableAltRow: rgb(0.98, 0.98, 0.99),   // Very light gray for alternating rows
  tableBorder: rgb(0.75, 0.75, 0.75),   // Medium gray borders
} as const;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export const FONT_SIZES = {
  h1: 24,        // Main title
  h2: 18,        // Section headers
  h3: 14,        // Subsection headers
  h4: 12,        // Table headers
  body: 10,      // Regular text
  small: 8,      // Fine print, footers
  tiny: 7,       // Very small annotations
} as const;

export const LINE_HEIGHTS = {
  h1: 32,
  h2: 24,
  h3: 18,
  h4: 16,
  body: 14,
  small: 11,
  tiny: 9,
} as const;

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const LAYOUT = {
  // Page dimensions (US Letter Portrait)
  pageWidth: 612,
  pageHeight: 792,

  // Page dimensions (US Letter Landscape)
  pageWidthLandscape: 792,
  pageHeightLandscape: 612,

  // Margins
  marginTop: 60,
  marginBottom: 50,
  marginLeft: 40,
  marginRight: 40,

  // Spacing
  sectionSpacing: 30,
  paragraphSpacing: 12,
  lineSpacing: 6,

  // Header/Footer
  headerHeight: 50,
  footerHeight: 30,

  // Callout boxes
  calloutPadding: 12,
  calloutBorderRadius: 4,

  // Tables
  tableRowHeight: 20,
  tableCellPadding: 4,
  tableHeaderHeight: 25,
} as const;

// ============================================================================
// LOGO UTILITIES
// ============================================================================

/**
 * Embeds the CTI logo into a PDF document
 * @param pdfDoc - PDF document
 * @returns Promise<PDFImage> or null if logo not found
 */
export async function embedCTILogo(pdfDoc: PDFDocument) {
  try {
    const logoPath = join(process.cwd(), 'public', 'CTI_Icon_black.png');
    const logoBytes = readFileSync(logoPath);
    return await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    console.warn('CTI logo not found, skipping logo embed:', error);
    return null;
  }
}

// ============================================================================
// HEADER & FOOTER UTILITIES
// ============================================================================

export interface PageHeaderOptions {
  title: string;
  subtitle?: string;
  logoWidth?: number;
  logoHeight?: number;
}

/**
 * Draws a professional header on the page with CTI logo and title
 */
export async function drawPageHeader(
  page: PDFPage,
  pdfDoc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
  options: PageHeaderOptions
): Promise<number> {
  const { title, subtitle, logoWidth = 40, logoHeight = 40 } = options;
  const { width, height } = page.getSize();

  let currentY = height - LAYOUT.marginTop;

  // Draw header background bar
  page.drawRectangle({
    x: 0,
    y: height - LAYOUT.headerHeight,
    width: width,
    height: LAYOUT.headerHeight,
    color: CTI_COLORS.navyBlue,
  });

  // Try to embed and draw logo
  const logo = await embedCTILogo(pdfDoc);
  if (logo) {
    page.drawImage(logo, {
      x: LAYOUT.marginLeft,
      y: height - LAYOUT.headerHeight + (LAYOUT.headerHeight - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
    });
  }

  // Draw title
  const titleX = logo ? LAYOUT.marginLeft + logoWidth + 15 : LAYOUT.marginLeft;
  page.drawText(title, {
    x: titleX,
    y: height - LAYOUT.headerHeight + (LAYOUT.headerHeight / 2) + 4,
    size: FONT_SIZES.h2,
    font: boldFont,
    color: CTI_COLORS.white,
  });

  // Draw subtitle if provided
  if (subtitle) {
    page.drawText(subtitle, {
      x: titleX,
      y: height - LAYOUT.headerHeight + (LAYOUT.headerHeight / 2) - 12,
      size: FONT_SIZES.small,
      font: font,
      color: CTI_COLORS.lightBg,
    });
  }

  // Return Y position for content to start
  return height - LAYOUT.headerHeight - LAYOUT.sectionSpacing;
}

export interface PageFooterOptions {
  pageNumber: number;
  totalPages: number;
  generatedDate: string;
  confidential?: boolean;
}

/**
 * Draws a professional footer with page numbers and metadata
 */
export function drawPageFooter(
  page: PDFPage,
  font: PDFFont,
  options: PageFooterOptions
): void {
  const { pageNumber, totalPages, generatedDate, confidential = true } = options;
  const { width } = page.getSize();

  const footerY = LAYOUT.marginBottom - 20;

  // Draw footer separator line
  page.drawLine({
    start: { x: LAYOUT.marginLeft, y: footerY + 15 },
    end: { x: width - LAYOUT.marginRight, y: footerY + 15 },
    color: CTI_COLORS.borderGray,
    thickness: 0.5,
  });

  // Left: Confidential notice
  if (confidential) {
    page.drawText('CONFIDENTIAL - CTI INTERNAL USE', {
      x: LAYOUT.marginLeft,
      y: footerY,
      size: FONT_SIZES.tiny,
      font: font,
      color: CTI_COLORS.textGray,
    });
  }

  // Center: Generated date
  const dateText = `Generated: ${generatedDate}`;
  const dateWidth = font.widthOfTextAtSize(dateText, FONT_SIZES.tiny);
  page.drawText(dateText, {
    x: (width - dateWidth) / 2,
    y: footerY,
    size: FONT_SIZES.tiny,
    font: font,
    color: CTI_COLORS.textGray,
  });

  // Right: Page number
  const pageText = `Page ${pageNumber} of ${totalPages}`;
  const pageWidth = font.widthOfTextAtSize(pageText, FONT_SIZES.tiny);
  page.drawText(pageText, {
    x: width - LAYOUT.marginRight - pageWidth,
    y: footerY,
    size: FONT_SIZES.tiny,
    font: font,
    color: CTI_COLORS.textGray,
  });
}

// ============================================================================
// CALLOUT BOX UTILITIES
// ============================================================================

export interface CalloutBoxOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  backgroundColor?: RGB;
  borderColor?: RGB;
  titleColor?: RGB;
}

/**
 * Draws a professional callout box with optional title
 */
export function drawCalloutBox(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  options: CalloutBoxOptions
): number {
  const {
    x,
    y,
    width,
    height,
    title,
    backgroundColor = CTI_COLORS.lightBg,
    borderColor = CTI_COLORS.borderGray,
    titleColor = CTI_COLORS.navyBlue,
  } = options;

  // Draw background
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: backgroundColor,
    borderColor: borderColor,
    borderWidth: 1,
  });

  // Draw title if provided
  if (title) {
    page.drawText(title, {
      x: x + LAYOUT.calloutPadding,
      y: y - LAYOUT.calloutPadding - FONT_SIZES.h4,
      size: FONT_SIZES.h4,
      font: boldFont,
      color: titleColor,
    });

    // Return Y position for content
    return y - LAYOUT.calloutPadding - FONT_SIZES.h4 - 8;
  }

  return y - LAYOUT.calloutPadding;
}

// ============================================================================
// PROGRESS BAR UTILITIES
// ============================================================================

export interface ProgressBarOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  color?: RGB;
  backgroundColor?: RGB;
}

/**
 * Draws a professional progress bar with percentage
 */
export function drawProgressBar(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  options: ProgressBarOptions
): void {
  const {
    x,
    y,
    width,
    height,
    percentage,
    label,
    showPercentage = true,
    color = CTI_COLORS.success,
    backgroundColor = CTI_COLORS.lightBg,
  } = options;

  // Clamp percentage between 0-100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Draw background
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: backgroundColor,
    borderColor: CTI_COLORS.borderGray,
    borderWidth: 1,
  });

  // Draw filled portion
  const filledWidth = (width * clampedPercentage) / 100;
  if (filledWidth > 0) {
    page.drawRectangle({
      x,
      y,
      width: filledWidth,
      height,
      color,
    });
  }

  // Draw percentage text in center
  if (showPercentage) {
    const percentText = `${clampedPercentage.toFixed(1)}%`;
    const textWidth = boldFont.widthOfTextAtSize(percentText, FONT_SIZES.body);
    const textX = x + (width - textWidth) / 2;
    const textY = y + (height - FONT_SIZES.body) / 2;

    page.drawText(percentText, {
      x: textX,
      y: textY,
      size: FONT_SIZES.body,
      font: boldFont,
      color: clampedPercentage > 50 ? CTI_COLORS.white : CTI_COLORS.black,
    });
  }

  // Draw label if provided
  if (label) {
    page.drawText(label, {
      x,
      y: y - FONT_SIZES.small - 4,
      size: FONT_SIZES.small,
      font: font,
      color: CTI_COLORS.textGray,
    });
  }
}

// ============================================================================
// KEY METRIC DISPLAY
// ============================================================================

export interface KeyMetricOptions {
  x: number;
  y: number;
  width: number;
  label: string;
  value: string;
  sublabel?: string;
  valueColor?: RGB;
}

/**
 * Draws a key metric display box
 */
export function drawKeyMetric(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  options: KeyMetricOptions
): void {
  const {
    x,
    y,
    width,
    label,
    value,
    sublabel,
    valueColor = CTI_COLORS.navyBlue,
  } = options;

  const boxHeight = sublabel ? 65 : 55;

  // Draw box background
  page.drawRectangle({
    x,
    y: y - boxHeight,
    width,
    height: boxHeight,
    color: CTI_COLORS.white,
    borderColor: CTI_COLORS.borderGray,
    borderWidth: 1,
  });

  // Draw label
  page.drawText(label, {
    x: x + 10,
    y: y - 20,
    size: FONT_SIZES.small,
    font: font,
    color: CTI_COLORS.textGray,
  });

  // Draw value (centered and large)
  const valueWidth = boldFont.widthOfTextAtSize(value, FONT_SIZES.h2);
  page.drawText(value, {
    x: x + (width - valueWidth) / 2,
    y: y - 42,
    size: FONT_SIZES.h2,
    font: boldFont,
    color: valueColor,
  });

  // Draw sublabel if provided
  if (sublabel) {
    const sublabelWidth = font.widthOfTextAtSize(sublabel, FONT_SIZES.tiny);
    page.drawText(sublabel, {
      x: x + (width - sublabelWidth) / 2,
      y: y - 58,
      size: FONT_SIZES.tiny,
      font: font,
      color: CTI_COLORS.textGray,
    });
  }
}

// ============================================================================
// TABLE UTILITIES
// ============================================================================

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableOptions {
  x: number;
  y: number;
  columns: TableColumn[];
  rows: string[][];
  headerColor?: RGB;
  headerTextColor?: RGB;
  alternateRows?: boolean;
  fontSize?: number;
}

/**
 * Draws a professional table with headers and data rows
 */
export function drawTable(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  options: TableOptions
): number {
  const {
    x,
    y,
    columns,
    rows,
    headerColor = CTI_COLORS.tableHeaderBg,
    headerTextColor = CTI_COLORS.white,
    alternateRows = true,
    fontSize = FONT_SIZES.body,
  } = options;

  let currentY = y;
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  // Draw header row
  page.drawRectangle({
    x,
    y: currentY - LAYOUT.tableHeaderHeight,
    width: totalWidth,
    height: LAYOUT.tableHeaderHeight,
    color: headerColor,
  });

  let currentX = x;
  columns.forEach((col) => {
    page.drawText(col.header, {
      x: currentX + LAYOUT.tableCellPadding,
      y: currentY - LAYOUT.tableHeaderHeight + 8,
      size: FONT_SIZES.h4,
      font: boldFont,
      color: headerTextColor,
    });
    currentX += col.width;
  });

  currentY -= LAYOUT.tableHeaderHeight;

  // Draw data rows
  rows.forEach((row, rowIndex) => {
    // Alternate row background
    if (alternateRows && rowIndex % 2 === 0) {
      page.drawRectangle({
        x,
        y: currentY - LAYOUT.tableRowHeight,
        width: totalWidth,
        height: LAYOUT.tableRowHeight,
        color: CTI_COLORS.tableAltRow,
      });
    }

    // Draw cell borders
    page.drawRectangle({
      x,
      y: currentY - LAYOUT.tableRowHeight,
      width: totalWidth,
      height: LAYOUT.tableRowHeight,
      borderColor: CTI_COLORS.tableBorder,
      borderWidth: 0.5,
    });

    // Draw cell contents
    currentX = x;
    row.forEach((cell, colIndex) => {
      const col = columns[colIndex];
      let cellX = currentX + LAYOUT.tableCellPadding;

      // Handle text alignment
      if (col.align === 'right') {
        const textWidth = font.widthOfTextAtSize(cell, fontSize);
        cellX = currentX + col.width - textWidth - LAYOUT.tableCellPadding;
      } else if (col.align === 'center') {
        const textWidth = font.widthOfTextAtSize(cell, fontSize);
        cellX = currentX + (col.width - textWidth) / 2;
      }

      page.drawText(cell, {
        x: cellX,
        y: currentY - LAYOUT.tableRowHeight + 6,
        size: fontSize,
        font: font,
        color: CTI_COLORS.black,
        maxWidth: col.width - (2 * LAYOUT.tableCellPadding),
      });

      currentX += col.width;
    });

    currentY -= LAYOUT.tableRowHeight;
  });

  // Return final Y position
  return currentY;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats currency values for display
 */
export function formatCurrency(amount: number | undefined | null): string {
  const value = amount ?? 0;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats percentage values for display
 */
export function formatPercentage(value: number | undefined | null): string {
  const safeValue = value ?? 0;
  return `${safeValue.toFixed(1)}%`;
}

/**
 * Truncates text to fit within a specified width
 */
export function truncateText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  const width = font.widthOfTextAtSize(text, fontSize);
  if (width <= maxWidth) return text;

  const ellipsis = '...';
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, fontSize);

  let truncated = text;
  while (font.widthOfTextAtSize(truncated + ellipsis, fontSize) > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + ellipsis;
}

/**
 * Determines color based on status
 */
export function getStatusColor(status: 'success' | 'warning' | 'danger' | 'info'): RGB {
  switch (status) {
    case 'success': return CTI_COLORS.success;
    case 'warning': return CTI_COLORS.warning;
    case 'danger': return CTI_COLORS.danger;
    case 'info': return CTI_COLORS.info;
    default: return CTI_COLORS.textGray;
  }
}
