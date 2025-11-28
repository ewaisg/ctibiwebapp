import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';

export interface TimesheetEntry {
  employeeLastName: string;
  employeeFirstName: string;
  day: string; // kept in interface (not displayed)
  date: Date;
  start: string;
  end: string;
  hours: number;
  notes?: string;
}

export interface TimesheetReportInfo {
  companyName: string;
  invoiceNumber: string;
  contractNumber: string;
  projectName: string;
  poNumber: string;
  billingPeriod: string;
  entries: TimesheetEntry[];
}

export async function generateTimesheetReportPdf(report: TimesheetReportInfo): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([842, 595]); // Landscape A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);

  // Colors
  const headerBgColor = rgb(0.9, 0.9, 0.9);
  const borderColor = rgb(0.6, 0.6, 0.6);
  const altRowColor = rgb(0.98, 0.98, 0.985);
  const textColor = rgb(0, 0, 0);

  // Table / cell style constants
  const headerHeight = 26;
  const fontSize = 8;
  const headerFontSize = 10
  ;
  const rowMinHeight = 18;
  const cellPaddingX = 4;
  const cellPaddingY = 4;
  const lineHeight = fontSize + 3;

  // Removed 'Day' column
  const tableHeaders = ['Last Name', 'First Name', 'Date', 'Start Time', 'End Time', 'Hours', 'Notes'];
  // Base fixed widths (except Notes which consumes remainder)
  const fixedWidths = [100, 100, 70, 55, 55, 55];
  const fixedSum = fixedWidths.reduce((a, b) => a + b, 0);
  const notesWidth = contentWidth - fixedSum;
  const columnWidths = [...fixedWidths, notesWidth];

  let currentY = pageHeight - margin;

  // Helper functions -------------------------------------------------------
  const drawLine = (x1: number, y1: number, x2: number, y2: number, color = borderColor) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color });
  };
  const drawRect = (x: number, y: number, width: number, height: number, fillColor?: any, bColor?: any) => {
    if (fillColor) page.drawRectangle({ x, y, width, height, color: fillColor });
    if (bColor) page.drawRectangle({ x, y, width, height, borderColor: bColor, borderWidth: 0.5 });
  };
  const wrapTextByWidth = (text: string, maxWidth: number, f = font, size = fontSize): string[] => {
    if (!text) return [''];
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const lines: string[] = [];
    let current = '';
    const push = () => { if (current) { lines.push(current); current = ''; } };
    for (const w of words) {
      const tentative = current ? current + ' ' + w : w;
      if (f.widthOfTextAtSize(tentative, size) <= maxWidth) { current = tentative; continue; }
      if (!current) { // break long word
        let slice = '';
        for (const ch of w) { const test = slice + ch; if (f.widthOfTextAtSize(test, size) > maxWidth && slice) { lines.push(slice); slice = ch; } else { slice = test; } }
        if (slice) lines.push(slice);
      } else { push(); if (f.widthOfTextAtSize(w, size) <= maxWidth) { current = w; } else { let slice = ''; for (const ch of w) { const test = slice + ch; if (f.widthOfTextAtSize(test, size) > maxWidth && slice) { lines.push(slice); slice = ch; } else { slice = test; } } if (slice) current = slice; } }
    }
    push();
    return lines.length ? lines : [''];
  };

  const addNewPageWithHeader = () => { page = pdfDoc.addPage([842, 595]); currentY = pageHeight - margin; drawTableHeader(); };

  const drawTableHeader = () => {
    const y = currentY;
    drawRect(margin, y - headerHeight, contentWidth, headerHeight, headerBgColor, borderColor);
    let x = margin;
    tableHeaders.forEach((h, i) => { page.drawText(h, { x: x + cellPaddingX, y: y - headerHeight + (headerHeight - headerFontSize) / 2, size: headerFontSize, font: boldFont }); if (i < tableHeaders.length - 1) drawLine(x + columnWidths[i], y, x + columnWidths[i], y - headerHeight); x += columnWidths[i]; });
    // outer border already drawn by rect; ensure top/bottom lines consistent
    drawLine(margin, y, margin + contentWidth, y); // top
    drawLine(margin, y - headerHeight, margin + contentWidth, y - headerHeight); // bottom
    currentY = y - headerHeight;
  };

  // Header section ---------------------------------------------------------
  page.drawText(report.companyName, { x: margin, y: currentY, size: 16, font: boldFont, color: textColor });
  const headerBoxHeight = 60; const headerBoxY = currentY - 30;
  drawRect(margin, headerBoxY - headerBoxHeight, 200, headerBoxHeight, rgb(0.95, 0.95, 0.95), borderColor);
  page.drawText('Invoice Information', { x: margin + 10, y: headerBoxY - 15, size: 10, font: boldFont });
  page.drawText(`Invoice#: ${report.invoiceNumber}`, { x: margin + 10, y: headerBoxY - 30, size: 9, font });
  page.drawText(`Contract#: ${report.contractNumber}`, { x: margin + 10, y: headerBoxY - 45, size: 9, font });
  drawRect(margin + 220, headerBoxY - headerBoxHeight, 280, headerBoxHeight, rgb(0.95, 0.95, 0.95), borderColor);
  page.drawText('Project Information', { x: margin + 230, y: headerBoxY - 15, size: 10, font: boldFont });
  page.drawText(`Project: ${report.projectName}`, { x: margin + 230, y: headerBoxY - 30, size: 9, font });
  page.drawText(`PO Number: ${report.poNumber}`, { x: margin + 230, y: headerBoxY - 45, size: 9, font });
  drawRect(margin + 520, headerBoxY - headerBoxHeight, 180, headerBoxHeight, rgb(0.95, 0.95, 0.95), borderColor);
  page.drawText('Billing Period', { x: margin + 530, y: headerBoxY - 15, size: 10, font: boldFont });
  page.drawText(report.billingPeriod, { x: margin + 530, y: headerBoxY - 35, size: 9, font });
  currentY = headerBoxY - headerBoxHeight - 28;
  page.drawText('Direct Labor Report', { x: margin, y: currentY, size: 14, font: boldFont });
  currentY -= 18;
  drawTableHeader();

  // Data rows --------------------------------------------------------------
  const totalHours = report.entries.reduce((s, e) => s + (typeof e.hours === 'number' ? e.hours : Number(e.hours) || 0), 0);
  const remainingSpaceOnPage = () => currentY - margin;

  const drawLogicalRow = (entry: TimesheetEntry, rowIdx: number) => {
    const formattedDate = entry.date instanceof Date && !isNaN(entry.date.getTime()) ? format(entry.date, 'MM/dd/yyyy') : '';
    const hours = typeof entry.hours === 'number' ? entry.hours : Number(entry.hours) || 0;
    const baseCells = [entry.employeeLastName, entry.employeeFirstName, formattedDate, entry.start, entry.end, hours.toFixed(2)]; // no day
    const noteLines = wrapTextByWidth(entry.notes || '', columnWidths[6] - cellPaddingX * 2);
    const totalRowHeight = Math.max(rowMinHeight, noteLines.length * lineHeight + cellPaddingY * 2);
    const pageCapacity = pageHeight - margin - margin - headerHeight;
    if (totalRowHeight <= remainingSpaceOnPage()) { drawPhysicalRow(baseCells, noteLines, totalRowHeight, rowIdx, false, false); return; }
    if (totalRowHeight <= pageCapacity) { addNewPageWithHeader(); drawPhysicalRow(baseCells, noteLines, totalRowHeight, rowIdx, false, false); return; }
    // Split across pages
    let startLine = 0; let seg = 0;
    while (startLine < noteLines.length) {
      const avail = remainingSpaceOnPage();
      const usable = avail - cellPaddingY * 2;
      const linesFit = Math.max(1, Math.floor(usable / lineHeight));
      const endLine = Math.min(noteLines.length, startLine + linesFit);
      const segLines = noteLines.slice(startLine, endLine);
      if (!segLines.length) { addNewPageWithHeader(); continue; }
      const segHeight = Math.max(rowMinHeight, segLines.length * lineHeight + cellPaddingY * 2);
      drawPhysicalRow(baseCells, segLines, segHeight, rowIdx, seg > 0, endLine < noteLines.length);
      startLine = endLine; seg++; if (startLine < noteLines.length) addNewPageWithHeader();
    }
  };

  const drawPhysicalRow = (baseCells: string[], noteLines: string[], height: number, rowIdx: number, isContinuation: boolean, willContinue: boolean) => {
    if (height > remainingSpaceOnPage()) addNewPageWithHeader();
    const topY = currentY; const bottomY = topY - height;
    if (rowIdx % 2 === 0) drawRect(margin, bottomY, contentWidth, height, altRowColor);
    // Left border
    drawLine(margin, topY, margin, bottomY);
    let x = margin;
    baseCells.forEach((txt, i) => {
      const colW = columnWidths[i];
      let val = txt || '';
      const maxW = colW - cellPaddingX * 2;
      while (val.length && font.widthOfTextAtSize(val + (font.widthOfTextAtSize(val, fontSize) > maxW ? '…' : ''), fontSize) > maxW) {
        val = val.slice(0, -1);
      }
      if (font.widthOfTextAtSize(val, fontSize) > maxW) val = val.slice(0, -1);
      if (font.widthOfTextAtSize(val, fontSize) > maxW) val = val.slice(0, -2);
      if (font.widthOfTextAtSize(val, fontSize) > maxW) val = val.slice(0, -3);
      if (font.widthOfTextAtSize(val, fontSize) > maxW) val = val.slice(0, -4);
      if (font.widthOfTextAtSize(val, fontSize) > maxW) val = val.slice(0, -5);
      if (font.widthOfTextAtSize(val, fontSize) > maxW) val = val.slice(0, -6);
      if (font.widthOfTextAtSize(val, fontSize) > maxW) val = val.slice(0, -7);
      if (txt !== val) val += '…';
      if (i === 0 && isContinuation) val += ' (cont.)';
      page.drawText(val, { x: x + cellPaddingX, y: topY - cellPaddingY - fontSize, size: fontSize, font });
      // Vertical separator for this column
      drawLine(x + colW, topY, x + colW, bottomY);
      x += colW;
    });
    // Notes column (last)
    const notesX = margin + columnWidths.slice(0, columnWidths.length - 1).reduce((a, b) => a + b, 0);
    noteLines.forEach((line, i) => { page.drawText(line, { x: notesX + cellPaddingX, y: topY - cellPaddingY - fontSize - i * lineHeight, size: fontSize, font }); });
    // Right border already partly by last vertical line? ensure outer right border
    drawLine(margin + contentWidth, topY, margin + contentWidth, bottomY);
    if (willContinue) {
      const marker = '↳ continues next page';
      page.drawText(marker, { x: margin + contentWidth - cellPaddingX - font.widthOfTextAtSize(marker, fontSize), y: bottomY + 2, size: fontSize - 1, font });
    }
    // Bottom border
    drawLine(margin, bottomY, margin + contentWidth, bottomY);
    currentY = bottomY;
  };

  report.entries.forEach((e, i) => drawLogicalRow(e, i));

  // Summary box
  const summaryHeight = 24;
  if (currentY - summaryHeight < margin) addNewPageWithHeader();
  const summaryTop = currentY - 10;
  drawRect(margin + contentWidth - 200, summaryTop - summaryHeight, 200, summaryHeight, rgb(0.9, 0.9, 0.9), borderColor);
  page.drawText('Total Hours:', { x: margin + contentWidth - 190, y: summaryTop - 14, size: 10, font: boldFont });
  page.drawText(totalHours.toFixed(2), { x: margin + contentWidth - 100, y: summaryTop - 14, size: 10, font: boldFont });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Preview function with sample data
export async function generatePreviewPDF(): Promise<Buffer> {
  const sampleReport: TimesheetReportInfo = {
    companyName: 'Sample Company Inc.',
    invoiceNumber: 'INV-2024-001',
    contractNumber: 'CTR-2024-001',
    projectName: 'Sample Project',
    poNumber: 'PO-2024-001',
    billingPeriod: 'January 1-31, 2024',
    entries: [
      {
        employeeLastName: 'Smith',
        employeeFirstName: 'John',
        day: 'Monday',
        date: new Date('2024-01-15'),
        start: '09:00',
        end: '17:00',
        hours: 8,
        notes: 'Regular development work on main features'
      },
      {
        employeeLastName: 'Johnson',
        employeeFirstName: 'Sarah',
        day: 'Tuesday',
        date: new Date('2024-01-16'),
        start: '08:30',
        end: '16:30',
        hours: 8,
        notes: 'Testing and bug fixes for the authentication module'
      },
      {
        employeeLastName: 'Williams',
        employeeFirstName: 'Mike',
        day: 'Wednesday',
        date: new Date('2024-01-17'),
        start: '10:00',
        end: '18:00',
        hours: 8,
        notes: 'Database optimization and performance improvements for the reporting system'
      }
    ]
  };
  
  return generateTimesheetReportPdf(sampleReport);
}
