import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface DepartmentalProjectReportEntry {
  poNumber: string;
  projectName: string;
  projectManager: string;
  approvingSupervisor: string;
  ipmssiStaff: string;
  originalPoAmount: number;
  changeOrderAmount: number;
  newPoAmount: number;
  previouslyInvoiced: number;
  remainingPoAmount: number;
  contractId: string;
  contractName: string;
  isInactive: boolean;
}

export interface ContractGroup {
  contractId: string;
  contractName: string;
  contractNumber: string;
  projects: DepartmentalProjectReportEntry[];
  totals: {
    originalPoAmount: number;
    changeOrderAmount: number;
    newPoAmount: number;
    previouslyInvoiced: number;
    remainingPoAmount: number;
  };
}

export interface DepartmentalProjectReportInfo {
  departmentName: string;
  reportingPeriod: string;
  generatedDate: string;
  includeInactiveProjects: boolean;
  contractGroups: ContractGroup[];
  grandTotals: {
    totalContracts: number;
    totalProjects: number;
    totalActiveProjects: number;
    totalInactiveProjects: number;
    originalPoAmount: number;
    changeOrderAmount: number;
    newPoAmount: number;
    previouslyInvoiced: number;
    remainingPoAmount: number;
  };
}

export async function generateDepartmentalProjectReportPdf(
  report: DepartmentalProjectReportInfo
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([842, 595]); // Landscape A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const contentWidth = pageWidth - (margin * 2);

  // Colors
  const headerBgColor = rgb(0.2, 0.4, 0.6);
  const contractHeaderBgColor = rgb(0.9, 0.9, 0.9);
  const altRowColor = rgb(0.98, 0.98, 0.985);
  const borderColor = rgb(0.6, 0.6, 0.6);
  const textColor = rgb(0, 0, 0);
  const whiteColor = rgb(1, 1, 1);
  // Table style constants
  const headerHeight = 20;
  const contractHeaderHeight = 18;
  const fontSize = 6;
  const headerFontSize = 7;
  const titleFontSize = 16;
  const subtitleFontSize = 9;
  const rowMinHeight = 14;
  const cellPaddingX = 2;
  const cellPaddingY = 1;

  // Column definitions for project table - optimized for smaller fonts
  const columnHeaders = [
    'PO Number',
    'Project Name',
    'Project Manager',
    'Approving Supervisor',
    'IPMSSI Staff',
    'Original PO Amount',
    'Change Orders',
    'New PO Amount',
    'Previously Invoiced',
    'Remaining PO Amount'
  ];

  // Column widths - optimized for landscape format with smaller fonts
  const columnWidths = [60, 120, 70, 70, 70, 68, 58, 68, 75, 75];
  const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  let currentY = pageHeight - margin;

  // Helper functions
  const drawLine = (x1: number, y1: number, x2: number, y2: number, color = borderColor, thickness = 0.5) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  };

  const drawRect = (x: number, y: number, width: number, height: number, fillColor?: any, borderColor?: any) => {
    if (fillColor) {
      page.drawRectangle({ x, y, width, height, color: fillColor });
    }
    if (borderColor) {
      page.drawRectangle({ x, y, width, height, borderColor, borderWidth: 0.5 });
    }
  };
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    if (!text) return [''];
    const sanitized = sanitizeText(text);
    const words = sanitized.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    try {
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Handle very long words
            lines.push(word);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines.length ? lines : [''];
    } catch (error) {
      console.warn('Error measuring text width in wrapText, using fallback:', error);
      // Fallback: simple character-based wrapping
      const maxChars = Math.floor(maxWidth / (fontSize * 0.6)); // Rough estimate
      const lines: string[] = [];
      for (let i = 0; i < sanitized.length; i += maxChars) {
        lines.push(sanitized.substring(i, i + maxChars));
      }
      return lines.length ? lines : [''];
    }
  };  const sanitizeText = (text: string): string => {
    if (!text) return '';
    // Sanitize for XSS and encode for PDF
    return String(text)
      .replace(/[<>"'&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      })
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2026]/g, '...')
      .replace(/[\u00A0]/g, ' ')
      .replace(/[\u00B7]/g, '·')
      .replace(/[\u00AE]/g, '(R)')
      .replace(/[\u00A9]/g, '(C)')
      .replace(/[\u2122]/g, '(TM)')
      .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, '?')
      .trim();
  };

  const truncateText = (text: string, maxWidth: number, fontSize: number): string => {
    if (!text) return '';
    const sanitized = sanitizeText(text);
    let truncated = sanitized;
    
    try {
      while (font.widthOfTextAtSize(truncated + '...', fontSize) > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      return truncated === sanitized ? sanitized : truncated + '...';
    } catch (error) {
      console.warn('Error measuring text width, using fallback truncation:', error);
      // Fallback: simple character-based truncation
      const maxChars = Math.floor(maxWidth / (fontSize * 0.6)); // Rough estimate
      return sanitized.length > maxChars ? sanitized.substring(0, maxChars - 3) + '...' : sanitized;
    }
  };

  const addNewPage = () => {
    page = pdfDoc.addPage([842, 595]);
    currentY = pageHeight - margin;
    drawPageHeader();
  };  const drawPageHeader = () => {
    // Main title
    page.drawText('Overall PO Summary', {
      x: margin,
      y: currentY,
      size: titleFontSize,
      font: boldFont,
      color: textColor
    });

    // Department and report info - similar to timecard layout
    currentY -= 28;
    
    // First row of header info
    page.drawText(`Department: ${sanitizeText(report.departmentName)}`, {
      x: margin,
      y: currentY,
      size: subtitleFontSize,
      font: boldFont,
      color: textColor
    });

    page.drawText(`Reporting Period: ${sanitizeText(report.reportingPeriod)}`, {
      x: margin + 250,
      y: currentY,
      size: subtitleFontSize,
      font: font,
      color: textColor
    });

    page.drawText(`Generated: ${sanitizeText(report.generatedDate)}`, {
      x: margin + 550,
      y: currentY,
      size: subtitleFontSize,
      font: font,
      color: textColor
    });

    currentY -= 18;

    // Summary statistics in a more organized way
    const summaryText = `Summary: ${report.grandTotals.totalContracts} Contracts • ${report.grandTotals.totalProjects} Projects (${report.grandTotals.totalActiveProjects} Active${report.includeInactiveProjects ? `, ${report.grandTotals.totalInactiveProjects} Inactive` : ''})`;
    page.drawText(summaryText, {
      x: margin,
      y: currentY,
      size: fontSize + 1,
      font: font,
      color: textColor
    });

    // Financial summary on the same line
    const financialSummary = `Total PO Amount: $${report.grandTotals.newPoAmount.toLocaleString()} • Remaining: $${report.grandTotals.remainingPoAmount.toLocaleString()}`;
    const financialWidth = font.widthOfTextAtSize(financialSummary, fontSize + 1);
    page.drawText(financialSummary, {
      x: margin + totalTableWidth - financialWidth,
      y: currentY,
      size: fontSize + 1,
      font: font,
      color: textColor
    });

    currentY -= 25;
  };

  const drawTableHeader = () => {
    if (currentY - headerHeight < margin + 100) {
      addNewPage();
    }

    // Draw header background
    drawRect(margin, currentY - headerHeight, totalTableWidth, headerHeight, headerBgColor);

    // Draw header text
    let x = margin;
    columnHeaders.forEach((header, i) => {
      const headerText = truncateText(header, columnWidths[i] - cellPaddingX * 2, headerFontSize);
      page.drawText(headerText, {
        x: x + cellPaddingX,
        y: currentY - headerHeight + (headerHeight - headerFontSize) / 2,
        size: headerFontSize,
        font: boldFont,
        color: whiteColor
      });

      // Draw vertical separators
      if (i < columnHeaders.length - 1) {
        drawLine(x + columnWidths[i], currentY, x + columnWidths[i], currentY - headerHeight, whiteColor);
      }
      x += columnWidths[i];
    });

    // Draw table border
    drawLine(margin, currentY, margin + totalTableWidth, currentY, borderColor);
    drawLine(margin, currentY - headerHeight, margin + totalTableWidth, currentY - headerHeight, borderColor);
    drawLine(margin, currentY, margin, currentY - headerHeight, borderColor);
    drawLine(margin + totalTableWidth, currentY, margin + totalTableWidth, currentY - headerHeight, borderColor);

    currentY -= headerHeight;
  };  const drawContractHeader = (contractGroup: ContractGroup) => {
    if (currentY - contractHeaderHeight < margin + 50) {
      addNewPage();
    }

    // Contract header background
    drawRect(margin, currentY - contractHeaderHeight, totalTableWidth, contractHeaderHeight, contractHeaderBgColor);

    // Contract information - more compact layout
    const contractText = `Contract ${sanitizeText(contractGroup.contractNumber)}: ${sanitizeText(contractGroup.contractName)}`;
    page.drawText(contractText, {
      x: margin + cellPaddingX,
      y: currentY - contractHeaderHeight + (contractHeaderHeight - fontSize - 1) / 2,
      size: fontSize + 1,
      font: boldFont,
      color: textColor
    });

    // Contract totals - more compact
    const totalsText = `${contractGroup.projects.length} projects • Total: $${contractGroup.totals.newPoAmount.toLocaleString()} • Remaining: $${contractGroup.totals.remainingPoAmount.toLocaleString()}`;
    const totalsWidth = font.widthOfTextAtSize(totalsText, fontSize);
    page.drawText(totalsText, {
      x: margin + totalTableWidth - totalsWidth - cellPaddingX,
      y: currentY - contractHeaderHeight + (contractHeaderHeight - fontSize) / 2,
      size: fontSize,
      font: font,
      color: textColor
    });

    // Draw border
    drawLine(margin, currentY, margin + totalTableWidth, currentY, borderColor);
    drawLine(margin, currentY - contractHeaderHeight, margin + totalTableWidth, currentY - contractHeaderHeight, borderColor);
    drawLine(margin, currentY, margin, currentY - contractHeaderHeight, borderColor);
    drawLine(margin + totalTableWidth, currentY, margin + totalTableWidth, currentY - contractHeaderHeight, borderColor);

    currentY -= contractHeaderHeight;
  };

  const drawProjectRow = (project: DepartmentalProjectReportEntry, rowIndex: number) => {
    if (currentY - rowMinHeight < margin + 50) {
      addNewPage();
      drawTableHeader();
    }

    // Alternate row colors
    if (rowIndex % 2 === 0) {
      drawRect(margin, currentY - rowMinHeight, totalTableWidth, rowMinHeight, altRowColor);
    }    // Project data
    const rowData = [
      sanitizeText(project.poNumber || ''),
      sanitizeText(project.projectName || '') + (project.isInactive ? ' (INACTIVE)' : ''),
      sanitizeText(project.projectManager || ''),
      sanitizeText(project.approvingSupervisor || ''),
      sanitizeText(project.ipmssiStaff || ''),
      `$${project.originalPoAmount.toLocaleString()}`,
      `$${project.changeOrderAmount.toLocaleString()}`,
      `$${project.newPoAmount.toLocaleString()}`,
      `$${project.previouslyInvoiced.toLocaleString()}`,
      `$${project.remainingPoAmount.toLocaleString()}`
    ];

    // Draw cell content
    let x = margin;
    rowData.forEach((cellData, i) => {
      const truncatedText = truncateText(cellData, columnWidths[i] - cellPaddingX * 2, fontSize);
      page.drawText(truncatedText, {
        x: x + cellPaddingX,
        y: currentY - rowMinHeight + (rowMinHeight - fontSize) / 2,
        size: fontSize,
        font: project.isInactive ? font : font, // Could use italic for inactive
        color: project.isInactive ? rgb(0.5, 0.5, 0.5) : textColor
      });

      // Draw vertical separators
      if (i < rowData.length - 1) {
        drawLine(x + columnWidths[i], currentY, x + columnWidths[i], currentY - rowMinHeight, borderColor);
      }
      x += columnWidths[i];
    });

    // Draw row borders
    drawLine(margin, currentY, margin + totalTableWidth, currentY, borderColor);
    drawLine(margin, currentY - rowMinHeight, margin + totalTableWidth, currentY - rowMinHeight, borderColor);
    drawLine(margin, currentY, margin, currentY - rowMinHeight, borderColor);
    drawLine(margin + totalTableWidth, currentY, margin + totalTableWidth, currentY - rowMinHeight, borderColor);

    currentY -= rowMinHeight;
  };
  const drawGrandTotals = () => {
    if (currentY - 65 < margin) {
      addNewPage();
    }

    currentY -= 15;

    // Grand totals box - more compact
    const totalsBoxHeight = 50;
    const totalsBoxWidth = 320;
    const totalsBoxX = margin + (totalTableWidth - totalsBoxWidth) / 2;

    drawRect(totalsBoxX, currentY - totalsBoxHeight, totalsBoxWidth, totalsBoxHeight, headerBgColor);

    // Grand totals title
    page.drawText('GRAND TOTALS', {
      x: totalsBoxX + cellPaddingX * 2,
      y: currentY - 12,
      size: subtitleFontSize,
      font: boldFont,
      color: whiteColor
    });

    // Totals data - more compact layout
    const totalsLines = [
      `Original PO: $${report.grandTotals.originalPoAmount.toLocaleString()} | Change Orders: $${report.grandTotals.changeOrderAmount.toLocaleString()}`,
      `New PO Total: $${report.grandTotals.newPoAmount.toLocaleString()}`,
      `Previously Invoiced: $${report.grandTotals.previouslyInvoiced.toLocaleString()}`,
      `Remaining: $${report.grandTotals.remainingPoAmount.toLocaleString()}`
    ];

    let totalsY = currentY - 25;
    totalsLines.forEach(line => {
      page.drawText(line, {
        x: totalsBoxX + cellPaddingX * 2,
        y: totalsY,
        size: fontSize,
        font: font,
        color: whiteColor
      });
      totalsY -= 8;
    });

    // Draw border
    drawRect(totalsBoxX, currentY - totalsBoxHeight, totalsBoxWidth, totalsBoxHeight, undefined, whiteColor);

    currentY -= totalsBoxHeight;
  };

  // Generate the report
  drawPageHeader();
  drawTableHeader();

  let globalRowIndex = 0;

  // Draw contract groups and projects
  report.contractGroups.forEach(contractGroup => {
    drawContractHeader(contractGroup);
    
    contractGroup.projects.forEach(project => {
      drawProjectRow(project, globalRowIndex);
      globalRowIndex++;
    });

    // Add some spacing between contracts
    currentY -= 5;
  });
  // Draw grand totals
  drawGrandTotals();

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
  } catch (error) {
    console.error('Error generating departmental project report PDF:', error);
    // Log the report data for debugging
    console.error('Report data:', {
      departmentName: report.departmentName,
      contractCount: report.contractGroups.length,
      totalProjects: report.grandTotals.totalProjects
    });
    throw new Error(`Failed to generate departmental project report PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
