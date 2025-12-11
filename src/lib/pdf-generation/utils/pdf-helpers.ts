/**
 * PDF Helper Utilities
 * Common operations for PDF generation
 */

import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';
import { REPORT_COLORS, REPORT_TYPOGRAPHY, hexToRgb } from '../constants/design-tokens';

/**
 * Load company logo as PNG image
 */
export async function loadLogo(pdfDoc: PDFDocument): Promise<any> {
  try {
    const logoPath = join(process.cwd(), 'public', 'CTI_Horizontal.png');
    const logoBytes = readFileSync(logoPath);
    return await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

/**
 * Embed standard fonts
 */
export async function embedFonts(pdfDoc: PDFDocument) {
  const [helvetica, helveticaBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
  ]);

  return { helvetica, helveticaBold };
}

/**
 * Get RGB color from hex
 */
export function getColor(hexColor: string) {
  const { r, g, b } = hexToRgb(hexColor);
  return rgb(r, g, b);
}

/**
 * Draw horizontal line
 */
export function drawHorizontalLine(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  thickness: number = 0.5,
  color: string = REPORT_COLORS.BORDER_COLOR
) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness,
    color: getColor(color),
  });
}

/**
 * Draw rectangle with border
 */
export function drawRectangle(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fillColor?: string;
    borderColor?: string;
    borderWidth?: number;
  } = {}
) {
  const {
    fillColor,
    borderColor = REPORT_COLORS.BORDER_COLOR,
    borderWidth = 0.5,
  } = options;

  // Fill
  if (fillColor) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: getColor(fillColor),
    });
  }

  // Border
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: getColor(borderColor),
    borderWidth,
  });
}

/**
 * Draw text with alignment
 */
export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: {
    font: PDFFont;
    size?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    maxWidth?: number;
  }
) {
  const {
    font,
    size = REPORT_TYPOGRAPHY.SIZE_BODY,
    color = REPORT_COLORS.BODY_TEXT,
    align = 'left',
    maxWidth,
  } = options;

  let displayText = text;
  let textWidth = font.widthOfTextAtSize(text, size);

  // Truncate if exceeds maxWidth
  if (maxWidth && textWidth > maxWidth) {
    while (textWidth > maxWidth && displayText.length > 3) {
      displayText = displayText.substring(0, displayText.length - 4) + '...';
      textWidth = font.widthOfTextAtSize(displayText, size);
    }
  }

  // Calculate x position based on alignment
  let xPos = x;
  if (align === 'center' && maxWidth) {
    xPos = x + (maxWidth - textWidth) / 2;
  } else if (align === 'right' && maxWidth) {
    xPos = x + maxWidth - textWidth;
  }

  page.drawText(displayText, {
    x: xPos,
    y,
    size,
    font,
    color: getColor(color),
  });
}

/**
 * Calculate text width
 */
export function getTextWidth(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

/**
 * Wrap text to fit within width
 */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Check if new page is needed
 */
export function needsNewPage(currentY: number, requiredHeight: number, minY: number): boolean {
  return currentY - requiredHeight < minY;
}

/**
 * Add new page with same setup
 */
export async function addNewPage(
  pdfDoc: PDFDocument,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<PDFPage> {
  const page = pdfDoc.addPage(
    orientation === 'portrait'
      ? [612, 792]
      : [792, 612]
  );
  return page;
}
