import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { format } from 'date-fns';
import type { Project } from '@/types';

export interface ProjectsReportInfo {
  companyName?: string;
  contractNumber?: string | number;
  contractName?: string;
  projects: Project[];
}

export async function generateProjectsReportPdf(report: ProjectsReportInfo): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([842, 595]); // Landscape A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const headerBgColor = rgb(0.9, 0.9, 0.9);
  const borderColor = rgb(0.6, 0.6, 0.6);
  const textColor = rgb(0, 0, 0);

  let currentY = pageHeight - margin;

  const drawLine = (x1: number, y1: number, x2: number, y2: number, color = borderColor) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color });
  };

  const drawRect = (x: number, y: number, width: number, height: number, fillColor?: any, bColor?: any) => {
    if (fillColor) {
      page.drawRectangle({ x, y, width, height, color: fillColor });
    }
    if (bColor) {
      page.drawRectangle({ x, y, width, height, borderColor: bColor, borderWidth: 0.5 });
    }
  };

  // Header
  page.drawText(report.companyName || 'Company', { x: margin, y: currentY, size: 16, font: boldFont, color: textColor });
  page.drawText(`Projects Report`, { x: margin + 300, y: currentY, size: 14, font: boldFont, color: textColor });
  currentY -= 20;
  page.drawText(`Contract: ${report.contractNumber || ''}`, { x: margin, y: currentY, size: 10, font, color: textColor });
  page.drawText(`${report.contractName || ''}`, { x: margin + 220, y: currentY, size: 10, font, color: textColor });
  page.drawText(`Generated: ${format(new Date(), 'MM/dd/yyyy')}`, { x: margin + contentWidth - 150, y: currentY, size: 9, font, color: textColor });

  currentY -= 30;

  // Table headers
  const tableHeaders = [
    'Project Name',
    'PO Number',
    'PMIS #',
    'Approving Supervisor',
    'Original PO',
    'Change Orders',
    'New PO',
    'Previously Billed',
    'Remaining'
  ];

  const columnWidths = [220, 70, 70, 120, 70, 70, 70, 70, 70];
  const rowHeight = 20;
  const headerHeight = 25;

  let tableX = margin;
  let tableY = currentY;

  // Draw header background
  drawRect(tableX, tableY - headerHeight, contentWidth, headerHeight, headerBgColor, borderColor);

  // Header text
  let xPos = tableX;
  tableHeaders.forEach((h, i) => {
    page.drawText(h, { x: xPos + 5, y: tableY - 17, size: 10, font: boldFont, color: textColor });
    if (i < tableHeaders.length - 1) drawLine(xPos + columnWidths[i], tableY, xPos + columnWidths[i], tableY - headerHeight);
    xPos += columnWidths[i];
  });
  drawLine(tableX, tableY, tableX + contentWidth, tableY);
  drawLine(tableX, tableY - headerHeight, tableX + contentWidth, tableY - headerHeight);

  currentY = tableY - headerHeight;

  // Track rows on the current page so pagination math stays correct across pages
  let rowsOnPage = 0;

  // Rows
  for (let rowIndex = 0; rowIndex < report.projects.length; rowIndex++) {
    const proj = report.projects[rowIndex];
    let rowY = currentY - rowsOnPage * rowHeight;

    // New page check
    if (rowY - rowHeight < margin + 40) {
      // draw borders for current page
      drawLine(tableX, tableY, tableX, rowY - rowHeight);
      drawLine(tableX + contentWidth, tableY, tableX + contentWidth, rowY - rowHeight);

      // add new page
      page = pdfDoc.addPage([842, 595]);
      currentY = pageHeight - margin;
      tableY = currentY;

      // redraw header on new page
      drawRect(tableX, tableY - headerHeight, contentWidth, headerHeight, headerBgColor, borderColor);
      xPos = tableX;
      tableHeaders.forEach((h, i) => {
        page.drawText(h, { x: xPos + 5, y: tableY - 17, size: 10, font: boldFont, color: textColor });
        if (i < tableHeaders.length - 1) drawLine(xPos + columnWidths[i], tableY, xPos + columnWidths[i], tableY - headerHeight);
        xPos += columnWidths[i];
      });
      drawLine(tableX, tableY, tableX + contentWidth, tableY);
      drawLine(tableX, tableY - headerHeight, tableX + contentWidth, tableY - headerHeight);

      // reset rows counter for the new page
      rowsOnPage = 0;

      // recompute rowY for the new page
      rowY = currentY - rowsOnPage * rowHeight;
    }

    const displayValues = [
      proj.projectName || '',
      proj.poNumber || '',
      proj.pmisNumber || '',
      proj.approvingSupervisor || '',
      typeof proj.originalPoAmount === 'number' ? proj.originalPoAmount.toFixed(2) : (proj.originalPoAmount ? String(proj.originalPoAmount) : ''),
      typeof proj.changeOrderAmount === 'number' ? proj.changeOrderAmount.toFixed(2) : (proj.changeOrderAmount ? String(proj.changeOrderAmount) : ''),
      typeof proj.newPoAmount === 'number' ? proj.newPoAmount.toFixed(2) : (proj.newPoAmount ? String(proj.newPoAmount) : ''),
      typeof proj.previouslyInvoicedAmount === 'number' ? proj.previouslyInvoicedAmount.toFixed(2) : (proj.previouslyInvoicedAmount ? String(proj.previouslyInvoicedAmount) : ''),
      typeof proj.remainingPoAmount === 'number' ? proj.remainingPoAmount.toFixed(2) : (proj.remainingPoAmount ? String(proj.remainingPoAmount) : '')
    ];

    let rowX = tableX;
    for (let col = 0; col < columnWidths.length; col++) {
      const cell = displayValues[col] || '';
      // truncate longer project name
      let text = String(cell);
      if (col === 0 && text.length > 60) text = text.substring(0, 57) + '...';
      if (col !== 0 && text.length > 20) text = text.substring(0, 17) + '...';

      const yText = rowY - 14;
      page.drawText(text, { x: rowX + 5, y: yText, size: 9, font, color: textColor });

      // vertical line
      if (col < columnWidths.length - 1) drawLine(rowX + columnWidths[col], rowY, rowX + columnWidths[col], rowY - rowHeight);
      rowX += columnWidths[col];
    }

    // draw horizontal grid line
    drawLine(tableX, rowY - rowHeight, tableX + contentWidth, rowY - rowHeight);

    // increment rows on current page
    rowsOnPage++;
  }

  // Final borders (based on how many rows are on the last page)
  const finalY = currentY - rowsOnPage * rowHeight;
  drawLine(tableX, tableY, tableX, finalY);
  drawLine(tableX + contentWidth, tableY, tableX + contentWidth, finalY);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
