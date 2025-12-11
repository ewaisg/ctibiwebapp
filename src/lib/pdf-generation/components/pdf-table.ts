/**
 * PDF Table Component
 * Renders tables with primary/secondary headers and data rows
 */

import { PDFPage, PDFFont, PDFDocument } from 'pdf-lib';
import { REPORT_COLORS, REPORT_TYPOGRAPHY, REPORT_LAYOUT } from '../constants/design-tokens';
import { drawText, drawRectangle, getColor, needsNewPage, addNewPage } from '../utils/pdf-helpers';
import { drawHeader, HeaderOptions } from './pdf-header';
import { drawFooter } from './pdf-footer';

export interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableOptions {
  columns: TableColumn[];
  rows: Array<Array<string | number>>;
  secondaryHeaders?: Array<{ label: string; colSpan?: number }>;
  totals?: Array<string | number>;
  showBorders?: boolean;
  alternateRowColors?: boolean;
  startY?: number;
}

export interface TableRenderContext {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: { helvetica: PDFFont; helveticaBold: PDFFont };
  currentY: number;
  minY: number;
  pageNumber: number;
  totalPages?: number;
  headerOptions?: HeaderOptions;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Draw a table on the PDF
 * Returns the new Y position and page context
 */
export async function drawTable(
  context: TableRenderContext,
  options: TableOptions
): Promise<{ currentY: number; page: PDFPage; pageNumber: number }> {
  const { pdfDoc, fonts, minY, orientation = 'portrait' } = context;
  let { page, currentY, pageNumber } = context;
  const { helvetica, helveticaBold } = fonts;
  const { columns, rows, secondaryHeaders, totals, showBorders = true, alternateRowColors = false } = options;

  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const startX = (page.getSize().width - tableWidth) / 2;

  // Draw primary headers
  if (needsNewPage(currentY, REPORT_LAYOUT.HEADER_ROW_HEIGHT, minY)) {
    const result = await addNewPageWithHeader(context, orientation);
    page = result.page;
    currentY = result.currentY;
    pageNumber = result.pageNumber;
  }

  // Primary header background
  drawRectangle(page, startX, currentY - REPORT_LAYOUT.HEADER_ROW_HEIGHT, tableWidth, REPORT_LAYOUT.HEADER_ROW_HEIGHT, {
    fillColor: REPORT_COLORS.PRIMARY_HEADER_BG,
    borderColor: showBorders ? REPORT_COLORS.BORDER_COLOR : undefined,
    borderWidth: showBorders ? REPORT_LAYOUT.TABLE_BORDER_WIDTH : 0,
  });

  // Primary header text
  let xPos = startX;
  for (const column of columns) {
    drawText(
      page,
      column.label.toUpperCase(),
      xPos + 5,
      currentY - REPORT_LAYOUT.HEADER_ROW_HEIGHT + 6,
      {
        font: helveticaBold,
        size: REPORT_TYPOGRAPHY.SIZE_HEADER,
        color: REPORT_COLORS.PRIMARY_HEADER_TEXT,
        align: column.align || 'left',
        maxWidth: column.width - 10,
      }
    );
    xPos += column.width;
  }

  currentY -= REPORT_LAYOUT.HEADER_ROW_HEIGHT;

  // Secondary headers (if provided)
  if (secondaryHeaders && secondaryHeaders.length > 0) {
    if (needsNewPage(currentY, REPORT_LAYOUT.SECONDARY_HEADER_ROW_HEIGHT, minY)) {
      const result = await addNewPageWithHeader(context, orientation);
      page = result.page;
      currentY = result.currentY;
      pageNumber = result.pageNumber;
    }

    drawRectangle(
      page,
      startX,
      currentY - REPORT_LAYOUT.SECONDARY_HEADER_ROW_HEIGHT,
      tableWidth,
      REPORT_LAYOUT.SECONDARY_HEADER_ROW_HEIGHT,
      {
        fillColor: REPORT_COLORS.SECONDARY_HEADER_BG,
        borderColor: showBorders ? REPORT_COLORS.BORDER_COLOR : undefined,
        borderWidth: showBorders ? REPORT_LAYOUT.TABLE_BORDER_WIDTH : 0,
      }
    );

    xPos = startX;
    for (const header of secondaryHeaders) {
      const colSpan = header.colSpan || 1;
      const width = columns.slice(0, colSpan).reduce((sum, col) => sum + col.width, 0);

      drawText(
        page,
        header.label.toUpperCase(),
        xPos + 5,
        currentY - REPORT_LAYOUT.SECONDARY_HEADER_ROW_HEIGHT + 6,
        {
          font: helveticaBold,
          size: REPORT_TYPOGRAPHY.SIZE_HEADER,
          color: REPORT_COLORS.SECONDARY_HEADER_TEXT,
          maxWidth: width - 10,
        }
      );
      xPos += width;
    }

    currentY -= REPORT_LAYOUT.SECONDARY_HEADER_ROW_HEIGHT;
  }

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (needsNewPage(currentY, REPORT_LAYOUT.ROW_HEIGHT, minY)) {
      const result = await addNewPageWithHeader(context, orientation);
      page = result.page;
      currentY = result.currentY;
      pageNumber = result.pageNumber;

      // Redraw headers on new page
      const headerResult = await drawTable(
        { ...context, page, currentY, pageNumber },
        { ...options, rows: [], totals: undefined }
      );
      currentY = headerResult.currentY;
      page = headerResult.page;
    }

    // Alternate row color
    if (alternateRowColors && i % 2 === 0) {
      drawRectangle(page, startX, currentY - REPORT_LAYOUT.ROW_HEIGHT, tableWidth, REPORT_LAYOUT.ROW_HEIGHT, {
        fillColor: REPORT_COLORS.TABLE_ROW_ALT,
      });
    }

    // Row border
    if (showBorders) {
      drawRectangle(page, startX, currentY - REPORT_LAYOUT.ROW_HEIGHT, tableWidth, REPORT_LAYOUT.ROW_HEIGHT, {
        borderColor: REPORT_COLORS.BORDER_LIGHT,
        borderWidth: REPORT_LAYOUT.TABLE_BORDER_WIDTH,
      });
    }

    // Row data
    xPos = startX;
    for (let j = 0; j < columns.length; j++) {
      const column = columns[j];
      const value = row[j] !== undefined ? String(row[j]) : '';

      drawText(page, value, xPos + 5, currentY - REPORT_LAYOUT.ROW_HEIGHT + 6, {
        font: helvetica,
        size: REPORT_TYPOGRAPHY.SIZE_BODY,
        color: REPORT_COLORS.BODY_TEXT,
        align: column.align || 'left',
        maxWidth: column.width - 10,
      });
      xPos += column.width;
    }

    currentY -= REPORT_LAYOUT.ROW_HEIGHT;
  }

  // Totals row (if provided)
  if (totals && totals.length > 0) {
    if (needsNewPage(currentY, REPORT_LAYOUT.ROW_HEIGHT, minY)) {
      const result = await addNewPageWithHeader(context, orientation);
      page = result.page;
      currentY = result.currentY;
      pageNumber = result.pageNumber;
    }

    drawRectangle(page, startX, currentY - REPORT_LAYOUT.ROW_HEIGHT, tableWidth, REPORT_LAYOUT.ROW_HEIGHT, {
      fillColor: REPORT_COLORS.SECONDARY_HEADER_BG,
      borderColor: showBorders ? REPORT_COLORS.BORDER_COLOR : undefined,
      borderWidth: showBorders ? REPORT_LAYOUT.TABLE_BORDER_WIDTH : 0,
    });

    xPos = startX;
    for (let j = 0; j < columns.length; j++) {
      const column = columns[j];
      const value = totals[j] !== undefined ? String(totals[j]) : '';

      drawText(page, value, xPos + 5, currentY - REPORT_LAYOUT.ROW_HEIGHT + 6, {
        font: helveticaBold,
        size: REPORT_TYPOGRAPHY.SIZE_BODY,
        color: REPORT_COLORS.BODY_TEXT,
        align: column.align || 'left',
        maxWidth: column.width - 10,
      });
      xPos += column.width;
    }

    currentY -= REPORT_LAYOUT.ROW_HEIGHT;
  }

  return { currentY, page, pageNumber };
}

/**
 * Add new page with header redraw
 */
async function addNewPageWithHeader(
  context: TableRenderContext,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<{ page: PDFPage; currentY: number; pageNumber: number }> {
  const { pdfDoc, fonts, headerOptions } = context;
  let { pageNumber } = context;

  const newPage = await addNewPage(pdfDoc, orientation);
  pageNumber++;

  // Redraw header on new page
  let newY = newPage.getSize().height - REPORT_LAYOUT.MARGIN_TOP;
  if (headerOptions) {
    newY = await drawHeader(pdfDoc, newPage, fonts, headerOptions);
    newY -= REPORT_LAYOUT.SECTION_SPACING;
  }

  return { page: newPage, currentY: newY, pageNumber };
}
