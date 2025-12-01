/**
 * PDF Generator from Visual Templates
 * Renders visual templates to PDF with data binding
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Handlebars from 'handlebars';
import type { VisualTemplate, TemplateElement } from '@/types/template-designer';

/**
 * Generate PDF from a visual template with data
 */
export async function generatePDFFromTemplate(
  template: VisualTemplate,
  data: Record<string, any>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([template.width, template.height]);

  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Group elements by page
  const pages: TemplateElement[][] = [[]];
  let currentPage = 0;

  template.elements.forEach((element) => {
    if (element.type === 'pageBreak') {
      currentPage++;
      pages[currentPage] = [];
    } else {
      if (!pages[currentPage]) {
        pages[currentPage] = [];
      }
      pages[currentPage].push(element);
    }
  });

  // Render each page
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    if (pageIndex > 0) {
      page = pdfDoc.addPage([template.width, template.height]);
    }

    const elements = pages[pageIndex];
    for (const element of elements) {
      await renderElement(page, element, data, pdfDoc);
    }
  }

  return await pdfDoc.save();
}

/**
 * Register custom Handlebars helpers
 */
function registerHandlebarsHelpers() {
  // Currency formatter
  Handlebars.registerHelper('currency', (value: number) => {
    if (typeof value !== 'number') return '$0.00';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });

  // Date formatter
  Handlebars.registerHelper('date', (value: string | Date) => {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  // Number formatter
  Handlebars.registerHelper('number', (value: number) => {
    if (typeof value !== 'number') return '0';
    return value.toLocaleString('en-US');
  });
}

/**
 * Render a single element to the PDF page
 */
async function renderElement(
  page: any,
  element: TemplateElement,
  data: Record<string, any>,
  pdfDoc: PDFDocument
) {
  const { height: pageHeight } = page.getSize();

  switch (element.type) {
    case 'text':
      await renderTextElement(page, element, data, pageHeight, pdfDoc);
      break;

    case 'rectangle':
      renderRectangleElement(page, element, pageHeight);
      break;

    case 'line':
      renderLineElement(page, element, pageHeight);
      break;

    case 'table':
      await renderTableElement(page, element, data, pageHeight, pdfDoc);
      break;

    case 'image':
      await renderImageElement(page, element, data, pageHeight, pdfDoc);
      break;
  }
}

/**
 * Render text element with data binding
 */
async function renderTextElement(
  page: any,
  element: TemplateElement & { type: 'text' },
  data: Record<string, any>,
  pageHeight: number,
  pdfDoc: PDFDocument
) {
  try {
    // Apply data binding
    const template = Handlebars.compile(element.content || '');
    const text = template(data);

    // Load font
    const fontMap: Record<string, any> = {
      'Helvetica': StandardFonts.Helvetica,
      'Helvetica-Bold': StandardFonts.HelveticaBold,
      'Times-Roman': StandardFonts.TimesRoman,
      'Times-Bold': StandardFonts.TimesRomanBold,
      'Courier': StandardFonts.Courier,
    };

    let fontKey = StandardFonts.Helvetica;
    if (element.fontWeight === 'bold') {
      fontKey = StandardFonts.HelveticaBold;
    }

    const font = await pdfDoc.embedFont(fontKey);

    // Parse color
    const color = parseColor(element.color);

    // Calculate Y position (PDF coordinates start from bottom)
    const y = pageHeight - element.y - element.fontSize;

    // Draw text
    page.drawText(text, {
      x: element.x,
      y,
      size: element.fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      maxWidth: element.width,
    });
  } catch (error) {
    console.error('Error rendering text element:', error);
  }
}

/**
 * Render rectangle element
 */
function renderRectangleElement(
  page: any,
  element: TemplateElement & { type: 'rectangle' },
  pageHeight: number
) {
  const fillColor = parseColor(element.fillColor);
  const borderColor = parseColor(element.borderColor);

  const y = pageHeight - element.y - element.height;

  page.drawRectangle({
    x: element.x,
    y,
    width: element.width,
    height: element.height,
    color: rgb(fillColor.r, fillColor.g, fillColor.b),
    borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
    borderWidth: element.borderWidth,
  });
}

/**
 * Render line element
 */
function renderLineElement(
  page: any,
  element: TemplateElement & { type: 'line' },
  pageHeight: number
) {
  const color = parseColor(element.color);
  const y = pageHeight - element.y;

  page.drawLine({
    start: { x: element.x, y },
    end: { x: element.x + element.width, y: y - element.height },
    thickness: element.lineWidth,
    color: rgb(color.r, color.g, color.b),
  });
}

/**
 * Render table element with data binding
 */
async function renderTableElement(
  page: any,
  element: TemplateElement & { type: 'table' },
  data: Record<string, any>,
  pageHeight: number,
  pdfDoc: PDFDocument
) {
  try {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Get table data
    const dataSource = element.dataSource ? eval(`data.${element.dataSource}`) : [];
    const rows = Array.isArray(dataSource) ? dataSource : [];

    const cellHeight = 25;
    const fontSize = 10;
    const cellPadding = 5;
    const columnWidth = element.width / element.columns.length;

    let currentY = pageHeight - element.y;

    // Draw header row
    element.columns.forEach((col, colIndex) => {
      const x = element.x + colIndex * columnWidth;

      // Header background
      page.drawRectangle({
        x,
        y: currentY - cellHeight,
        width: columnWidth,
        height: cellHeight,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      // Header text
      page.drawText(col.header, {
        x: x + cellPadding,
        y: currentY - cellHeight + 8,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    });

    currentY -= cellHeight;

    // Draw data rows
    rows.forEach((row) => {
      element.columns.forEach((col, colIndex) => {
        const x = element.x + colIndex * columnWidth;

        // Cell background
        page.drawRectangle({
          x,
          y: currentY - cellHeight,
          width: columnWidth,
          height: cellHeight,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        // Cell text with data binding
        const template = Handlebars.compile(col.dataKey);
        const cellText = template(row);

        page.drawText(String(cellText), {
          x: x + cellPadding,
          y: currentY - cellHeight + 8,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: columnWidth - cellPadding * 2,
        });
      });

      currentY -= cellHeight;
    });
  } catch (error) {
    console.error('Error rendering table element:', error);
  }
}

/**
 * Render image element
 */
async function renderImageElement(
  page: any,
  element: TemplateElement & { type: 'image' },
  data: Record<string, any>,
  pageHeight: number,
  pdfDoc: PDFDocument
) {
  try {
    // Apply data binding to image URL
    const template = Handlebars.compile(element.imageUrl || '');
    const imageUrl = template(data);

    if (!imageUrl) return;

    // Fetch image
    const imageResponse = await fetch(imageUrl);
    const imageBytes = await imageResponse.arrayBuffer();

    // Embed image based on type
    let image;
    if (imageUrl.toLowerCase().endsWith('.png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const y = pageHeight - element.y - element.height;

    page.drawImage(image, {
      x: element.x,
      y,
      width: element.width,
      height: element.height,
    });
  } catch (error) {
    console.error('Error rendering image element:', error);
  }
}

/**
 * Parse hex color to RGB
 */
function parseColor(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}
