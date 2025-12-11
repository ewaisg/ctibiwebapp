/**
 * PDF Summary Section Component
 * Renders summary boxes with key metrics and KPIs
 */

import { PDFPage, PDFFont } from 'pdf-lib';
import { REPORT_COLORS, REPORT_TYPOGRAPHY, REPORT_LAYOUT } from '../constants/design-tokens';
import { drawText, drawRectangle } from '../utils/pdf-helpers';

export interface SummaryItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface SummaryOptions {
  title?: string;
  items: SummaryItem[];
  columns?: number; // Number of columns for layout (default: 2)
}

/**
 * Draw a summary section with labeled values
 * Returns the new Y position
 */
export function drawSummarySection(
  page: PDFPage,
  fonts: { helvetica: PDFFont; helveticaBold: PDFFont },
  currentY: number,
  options: SummaryOptions
): number {
  const { helvetica, helveticaBold } = fonts;
  const { title, items, columns = 2 } = options;
  const { width } = page.getSize();

  const contentWidth = width - REPORT_LAYOUT.MARGIN_LEFT - REPORT_LAYOUT.MARGIN_RIGHT;
  const columnWidth = contentWidth / columns - 10;
  const startX = REPORT_LAYOUT.MARGIN_LEFT;

  // Draw title if provided
  if (title) {
    drawText(page, title.toUpperCase(), startX, currentY, {
      font: helveticaBold,
      size: REPORT_TYPOGRAPHY.SIZE_SUBTITLE,
      color: REPORT_COLORS.BODY_TEXT,
    });
    currentY -= REPORT_LAYOUT.LINE_SPACING + 5;
  }

  // Draw background box
  const boxHeight = Math.ceil(items.length / columns) * (REPORT_LAYOUT.LINE_SPACING + 8) + 15;
  drawRectangle(page, startX, currentY - boxHeight, contentWidth, boxHeight, {
    fillColor: REPORT_COLORS.SECONDARY_HEADER_BG,
    borderColor: REPORT_COLORS.BORDER_COLOR,
    borderWidth: REPORT_LAYOUT.TABLE_BORDER_WIDTH,
  });

  currentY -= 10;

  // Draw items in columns
  let columnIndex = 0;
  let rowY = currentY;

  for (const item of items) {
    const xPos = startX + 10 + (columnIndex * (columnWidth + 10));

    // Label
    drawText(page, item.label.toUpperCase(), xPos, rowY, {
      font: helveticaBold,
      size: REPORT_TYPOGRAPHY.SIZE_BODY,
      color: REPORT_COLORS.BODY_TEXT,
    });

    // Value
    const labelWidth = helveticaBold.widthOfTextAtSize(item.label.toUpperCase(), REPORT_TYPOGRAPHY.SIZE_BODY);
    const valueX = xPos + labelWidth + 10;

    drawText(page, String(item.value), valueX, rowY, {
      font: item.highlight ? helveticaBold : helvetica,
      size: REPORT_TYPOGRAPHY.SIZE_BODY,
      color: item.highlight ? REPORT_COLORS.PRIMARY_HEADER_BG : REPORT_COLORS.BODY_TEXT,
    });

    // Move to next column or row
    columnIndex++;
    if (columnIndex >= columns) {
      columnIndex = 0;
      rowY -= REPORT_LAYOUT.LINE_SPACING + 8;
    }
  }

  currentY -= boxHeight + REPORT_LAYOUT.SECTION_SPACING;

  return currentY;
}

/**
 * Draw KPI cards (for executive reports)
 */
export interface KPICard {
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  unit?: string;
}

export function drawKPICards(
  page: PDFPage,
  fonts: { helvetica: PDFFont; helveticaBold: PDFFont },
  currentY: number,
  kpis: KPICard[]
): number {
  const { helvetica, helveticaBold } = fonts;
  const { width } = page.getSize();

  const contentWidth = width - REPORT_LAYOUT.MARGIN_LEFT - REPORT_LAYOUT.MARGIN_RIGHT;
  const cardsPerRow = Math.min(kpis.length, 4);
  const cardWidth = (contentWidth / cardsPerRow) - 10;
  const cardHeight = 60;

  let xPos = REPORT_LAYOUT.MARGIN_LEFT;

  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i];

    // Card background
    drawRectangle(page, xPos, currentY - cardHeight, cardWidth, cardHeight, {
      fillColor: REPORT_COLORS.PAGE_BACKGROUND,
      borderColor: REPORT_COLORS.PRIMARY_HEADER_BG,
      borderWidth: 2,
    });

    // Label
    drawText(page, kpi.label.toUpperCase(), xPos + 10, currentY - 15, {
      font: helveticaBold,
      size: REPORT_TYPOGRAPHY.SIZE_SMALL,
      color: REPORT_COLORS.BODY_TEXT_MUTED,
      maxWidth: cardWidth - 20,
    });

    // Value
    drawText(page, String(kpi.value), xPos + 10, currentY - 35, {
      font: helveticaBold,
      size: REPORT_TYPOGRAPHY.SIZE_SUBTITLE,
      color: REPORT_COLORS.PRIMARY_HEADER_BG,
    });

    // Delta (if provided)
    if (kpi.delta) {
      const trendSymbol = kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→';
      const trendColor =
        kpi.trend === 'up'
          ? REPORT_COLORS.SUCCESS
          : kpi.trend === 'down'
          ? REPORT_COLORS.DANGER
          : REPORT_COLORS.BODY_TEXT_MUTED;

      drawText(page, `${trendSymbol} ${kpi.delta}`, xPos + 10, currentY - 50, {
        font: helvetica,
        size: REPORT_TYPOGRAPHY.SIZE_SMALL,
        color: trendColor,
      });
    }

    // Move to next card position
    xPos += cardWidth + 10;

    // New row if needed
    if ((i + 1) % cardsPerRow === 0 && i < kpis.length - 1) {
      xPos = REPORT_LAYOUT.MARGIN_LEFT;
      currentY -= cardHeight + 10;
    }
  }

  currentY -= cardHeight + REPORT_LAYOUT.SECTION_SPACING;

  return currentY;
}
