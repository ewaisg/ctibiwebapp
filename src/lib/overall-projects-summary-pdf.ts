import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProjectSummaryEntry {
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
  contractNumber: string;
  isInactive: boolean;
}

export interface MWBECompanySummary {
  companyCode: string;
  companyName: string;
  diversityCertification: 'MWBE' | 'WBE' | 'SBE' | 'None';
  totalInvoiced: number;
  percentOfTotal: number;
}

export interface SubConsultantSummary {
  companyCode: string;
  companyName: string;
  totalCommitment: number;
  totalInvoiced: number;
  totalPaid: number;
  remainingCommitted: number;
  percentInvoiced: number;
}

export interface ContractGroup {
  contractId: string;
  contractName: string;
  contractNumber: string;
  projects: ProjectSummaryEntry[];
  totals: {
    originalPoAmount: number;
    changeOrderAmount: number;
    newPoAmount: number;
    previouslyInvoiced: number;
    remainingPoAmount: number;
  };
}

export interface OverallProjectsSummaryReport {
  // Report metadata
  departmentName: string;
  contractName?: string; // Optional: filter by specific contract
  reportingPeriod: string;
  generatedDate: string;
  includeInactiveProjects: boolean;

  // Section A: PO Budget Summary
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

  // Section B: MWBE Compliance
  mwbeData: {
    contractMwbeGoal: number; // Percentage goal from contract
    mwbeCompanies: MWBECompanySummary[];
    totalMwbeInvoiced: number;
    totalNonMwbeInvoiced: number;
    mwbePercentAchieved: number;
    dsboParticipation: number; // DSBO (Disadvantaged Small Business Owner) participation %
  };

  // Section C: Sub-Consultant Breakdown
  subConsultants: SubConsultantSummary[];
  subConsultantTotals: {
    totalCommitment: number;
    totalInvoiced: number;
    totalPaid: number;
    remainingCommitted: number;
  };
}

// ============================================================================
// PDF GENERATION FUNCTION
// ============================================================================

export async function generateOverallProjectsSummaryPdf(
  report: OverallProjectsSummaryReport
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
    const sectionHeaderBgColor = rgb(0.3, 0.5, 0.7);
    const contractHeaderBgColor = rgb(0.9, 0.9, 0.9);
    const altRowColor = rgb(0.98, 0.98, 0.985);
    const borderColor = rgb(0.6, 0.6, 0.6);
    const textColor = rgb(0, 0, 0);
    const whiteColor = rgb(1, 1, 1);
    const mwbeGreenColor = rgb(0.2, 0.7, 0.3);
    const mwbeRedColor = rgb(0.9, 0.3, 0.2);

    // Style constants
    const headerHeight = 20;
    const contractHeaderHeight = 18;
    const fontSize = 6;
    const headerFontSize = 7;
    const titleFontSize = 16;
    const subtitleFontSize = 9;
    const sectionTitleFontSize = 11;
    const rowMinHeight = 14;
    const cellPaddingX = 2;
    const cellPaddingY = 1;

    let currentY = pageHeight - margin;

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    const sanitizeText = (text: string): string => {
      if (!text) return '';
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
        .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, '?')
        .trim();
    };

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
        const maxChars = Math.floor(maxWidth / (fontSize * 0.6));
        return sanitized.length > maxChars ? sanitized.substring(0, maxChars - 3) + '...' : sanitized;
      }
    };

    const addNewPage = () => {
      page = pdfDoc.addPage([842, 595]);
      currentY = pageHeight - margin;
    };

    const checkSpace = (needed: number) => {
      if (currentY - needed < margin + 50) {
        addNewPage();
        return true;
      }
      return false;
    };

    // ========================================================================
    // MAIN REPORT HEADER
    // ========================================================================

    const drawMainHeader = () => {
      // Title
      page.drawText('Overall Projects Summary Report', {
        x: margin,
        y: currentY,
        size: titleFontSize,
        font: boldFont,
        color: textColor
      });

      currentY -= 28;

      // Report metadata
      page.drawText(`Department: ${sanitizeText(report.departmentName)}`, {
        x: margin,
        y: currentY,
        size: subtitleFontSize,
        font: boldFont,
        color: textColor
      });

      if (report.contractName) {
        page.drawText(`Contract: ${sanitizeText(report.contractName)}`, {
          x: margin + 250,
          y: currentY,
          size: subtitleFontSize,
          font: font,
          color: textColor
        });
      }

      page.drawText(`Generated: ${sanitizeText(report.generatedDate)}`, {
        x: margin + 550,
        y: currentY,
        size: subtitleFontSize,
        font: font,
        color: textColor
      });

      currentY -= 18;

      // Summary line
      const summaryText = `${report.grandTotals.totalContracts} Contracts • ${report.grandTotals.totalProjects} Projects (${report.grandTotals.totalActiveProjects} Active${report.includeInactiveProjects ? `, ${report.grandTotals.totalInactiveProjects} Inactive` : ''})`;
      page.drawText(summaryText, {
        x: margin,
        y: currentY,
        size: fontSize + 1,
        font: font,
        color: textColor
      });

      currentY -= 25;
    };

    // ========================================================================
    // SECTION A: PO BUDGET SUMMARY
    // ========================================================================

    const drawPOBudgetSummary = () => {
      checkSpace(80);

      // Section header
      drawRect(margin, currentY - 20, contentWidth, 20, sectionHeaderBgColor);
      page.drawText('SECTION A: PO BUDGET SUMMARY', {
        x: margin + cellPaddingX,
        y: currentY - 14,
        size: sectionTitleFontSize,
        font: boldFont,
        color: whiteColor
      });
      currentY -= 25;

      // Column headers
      const columnHeaders = [
        'PO Number',
        'Project Name',
        'PM',
        'Original PO',
        'Change Orders',
        'New PO',
        'Invoiced',
        'Remaining'
      ];
      const columnWidths = [70, 180, 80, 70, 70, 70, 70, 72];
      const totalTableWidth = columnWidths.reduce((sum, w) => sum + w, 0);

      // Draw table header
      drawRect(margin, currentY - headerHeight, totalTableWidth, headerHeight, headerBgColor);
      let x = margin;
      columnHeaders.forEach((header, i) => {
        page.drawText(header, {
          x: x + cellPaddingX,
          y: currentY - headerHeight + 6,
          size: headerFontSize,
          font: boldFont,
          color: whiteColor
        });
        x += columnWidths[i];
      });
      drawLine(margin, currentY, margin + totalTableWidth, currentY, borderColor);
      drawLine(margin, currentY - headerHeight, margin + totalTableWidth, currentY - headerHeight, borderColor);
      currentY -= headerHeight;

      // Draw projects by contract
      let rowIndex = 0;
      report.contractGroups.forEach(contractGroup => {
        checkSpace(60);

        // Contract header
        drawRect(margin, currentY - contractHeaderHeight, totalTableWidth, contractHeaderHeight, contractHeaderBgColor);
        const contractText = `Contract ${contractGroup.contractNumber}: ${sanitizeText(contractGroup.contractName)} (${contractGroup.projects.length} projects)`;
        page.drawText(contractText, {
          x: margin + cellPaddingX,
          y: currentY - contractHeaderHeight + 5,
          size: fontSize + 1,
          font: boldFont,
          color: textColor
        });
        drawLine(margin, currentY, margin + totalTableWidth, currentY, borderColor);
        drawLine(margin, currentY - contractHeaderHeight, margin + totalTableWidth, currentY - contractHeaderHeight, borderColor);
        currentY -= contractHeaderHeight;

        // Projects
        contractGroup.projects.forEach(project => {
          checkSpace(20);

          if (rowIndex % 2 === 0) {
            drawRect(margin, currentY - rowMinHeight, totalTableWidth, rowMinHeight, altRowColor);
          }

          const rowData = [
            sanitizeText(project.poNumber),
            sanitizeText(project.projectName) + (project.isInactive ? ' (INACTIVE)' : ''),
            sanitizeText(project.projectManager || ''),
            `$${project.originalPoAmount.toLocaleString()}`,
            `$${project.changeOrderAmount.toLocaleString()}`,
            `$${project.newPoAmount.toLocaleString()}`,
            `$${project.previouslyInvoiced.toLocaleString()}`,
            `$${project.remainingPoAmount.toLocaleString()}`
          ];

          x = margin;
          rowData.forEach((data, i) => {
            const truncated = truncateText(data, columnWidths[i] - cellPaddingX * 2, fontSize);
            page.drawText(truncated, {
              x: x + cellPaddingX,
              y: currentY - rowMinHeight + 4,
              size: fontSize,
              font: font,
              color: project.isInactive ? rgb(0.5, 0.5, 0.5) : textColor
            });
            x += columnWidths[i];
          });

          drawLine(margin, currentY, margin + totalTableWidth, currentY, borderColor);
          drawLine(margin, currentY - rowMinHeight, margin + totalTableWidth, currentY - rowMinHeight, borderColor);
          currentY -= rowMinHeight;
          rowIndex++;
        });

        currentY -= 5;
      });

      // Grand totals
      checkSpace(50);
      currentY -= 10;
      const totalsBoxHeight = 45;
      const totalsBoxWidth = 350;
      const totalsBoxX = margin + (contentWidth - totalsBoxWidth) / 2;

      drawRect(totalsBoxX, currentY - totalsBoxHeight, totalsBoxWidth, totalsBoxHeight, headerBgColor);
      page.drawText('GRAND TOTALS', {
        x: totalsBoxX + cellPaddingX * 2,
        y: currentY - 12,
        size: subtitleFontSize,
        font: boldFont,
        color: whiteColor
      });

      const totalsLines = [
        `Original PO: $${report.grandTotals.originalPoAmount.toLocaleString()} | Change Orders: $${report.grandTotals.changeOrderAmount.toLocaleString()}`,
        `New PO Total: $${report.grandTotals.newPoAmount.toLocaleString()}`,
        `Previously Invoiced: $${report.grandTotals.previouslyInvoiced.toLocaleString()}`,
        `Remaining: $${report.grandTotals.remainingPoAmount.toLocaleString()}`
      ];

      let totalsY = currentY - 24;
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

      currentY -= totalsBoxHeight + 20;
    };

    // ========================================================================
    // SECTION B: MWBE COMPLIANCE
    // ========================================================================

    const drawMWBECompliance = () => {
      checkSpace(150);

      // Section header
      drawRect(margin, currentY - 20, contentWidth, 20, sectionHeaderBgColor);
      page.drawText('SECTION B: MWBE COMPLIANCE SUMMARY', {
        x: margin + cellPaddingX,
        y: currentY - 14,
        size: sectionTitleFontSize,
        font: boldFont,
        color: whiteColor
      });
      currentY -= 25;

      // MWBE Goal and Achievement
      const goalBoxWidth = 400;
      const goalBoxHeight = 60;
      const goalBoxX = margin + (contentWidth - goalBoxWidth) / 2;

      drawRect(goalBoxX, currentY - goalBoxHeight, goalBoxWidth, goalBoxHeight, rgb(0.95, 0.95, 0.98));
      drawRect(goalBoxX, currentY - goalBoxHeight, goalBoxWidth, goalBoxHeight, undefined, borderColor);

      // Goal text
      page.drawText(`Contract MWBE Goal: ${report.mwbeData.contractMwbeGoal.toFixed(2)}%`, {
        x: goalBoxX + 10,
        y: currentY - 18,
        size: subtitleFontSize,
        font: boldFont,
        color: textColor
      });

      // Achievement
      const achievementColor = report.mwbeData.mwbePercentAchieved >= report.mwbeData.contractMwbeGoal
        ? mwbeGreenColor
        : mwbeRedColor;

      page.drawText(`MWBE Percentage Achieved: ${report.mwbeData.mwbePercentAchieved.toFixed(2)}%`, {
        x: goalBoxX + 10,
        y: currentY - 35,
        size: subtitleFontSize,
        font: boldFont,
        color: achievementColor
      });

      const statusText = report.mwbeData.mwbePercentAchieved >= report.mwbeData.contractMwbeGoal
        ? '[GOAL MET]'
        : '[BELOW GOAL]';

      page.drawText(statusText, {
        x: goalBoxX + 280,
        y: currentY - 35,
        size: subtitleFontSize,
        font: boldFont,
        color: achievementColor
      });

      // Financial breakdown
      page.drawText(`Total MWBE Invoiced: $${report.mwbeData.totalMwbeInvoiced.toLocaleString()}`, {
        x: goalBoxX + 10,
        y: currentY - 48,
        size: fontSize + 1,
        font: font,
        color: textColor
      });

      page.drawText(`Total Non-MWBE: $${report.mwbeData.totalNonMwbeInvoiced.toLocaleString()}`, {
        x: goalBoxX + 210,
        y: currentY - 48,
        size: fontSize + 1,
        font: font,
        color: textColor
      });

      currentY -= goalBoxHeight + 15;

      // MWBE Company Breakdown Table
      if (report.mwbeData.mwbeCompanies.length > 0) {
        const mwbeHeaders = ['Company Code', 'Company Name', 'Certification', 'Total Invoiced', '% of Total'];
        const mwbeWidths = [80, 200, 100, 120, 100];
        const mwbeTableWidth = mwbeWidths.reduce((sum, w) => sum + w, 0);

        // Table header
        drawRect(margin, currentY - headerHeight, mwbeTableWidth, headerHeight, headerBgColor);
        let x = margin;
        mwbeHeaders.forEach((header, i) => {
          page.drawText(header, {
            x: x + cellPaddingX,
            y: currentY - headerHeight + 6,
            size: headerFontSize,
            font: boldFont,
            color: whiteColor
          });
          x += mwbeWidths[i];
        });
        drawLine(margin, currentY, margin + mwbeTableWidth, currentY, borderColor);
        drawLine(margin, currentY - headerHeight, margin + mwbeTableWidth, currentY - headerHeight, borderColor);
        currentY -= headerHeight;

        // MWBE companies
        report.mwbeData.mwbeCompanies.forEach((company, idx) => {
          checkSpace(20);

          if (idx % 2 === 0) {
            drawRect(margin, currentY - rowMinHeight, mwbeTableWidth, rowMinHeight, altRowColor);
          }

          const rowData = [
            sanitizeText(company.companyCode),
            sanitizeText(company.companyName),
            sanitizeText(company.diversityCertification),
            `$${company.totalInvoiced.toLocaleString()}`,
            `${company.percentOfTotal.toFixed(2)}%`
          ];

          x = margin;
          rowData.forEach((data, i) => {
            const truncated = truncateText(data, mwbeWidths[i] - cellPaddingX * 2, fontSize);
            page.drawText(truncated, {
              x: x + cellPaddingX,
              y: currentY - rowMinHeight + 4,
              size: fontSize,
              font: font,
              color: textColor
            });
            x += mwbeWidths[i];
          });

          drawLine(margin, currentY, margin + mwbeTableWidth, currentY, borderColor);
          drawLine(margin, currentY - rowMinHeight, margin + mwbeTableWidth, currentY - rowMinHeight, borderColor);
          currentY -= rowMinHeight;
        });
      }

      currentY -= 20;
    };

    // ========================================================================
    // SECTION C: SUB-CONSULTANT BREAKDOWN
    // ========================================================================

    const drawSubConsultantBreakdown = () => {
      checkSpace(120);

      // Section header
      drawRect(margin, currentY - 20, contentWidth, 20, sectionHeaderBgColor);
      page.drawText('SECTION C: SUB-CONSULTANT BREAKDOWN', {
        x: margin + cellPaddingX,
        y: currentY - 14,
        size: sectionTitleFontSize,
        font: boldFont,
        color: whiteColor
      });
      currentY -= 25;

      if (report.subConsultants.length === 0) {
        page.drawText('No sub-consultant data available', {
          x: margin + 10,
          y: currentY - 15,
          size: fontSize + 1,
          font: font,
          color: rgb(0.5, 0.5, 0.5)
        });
        currentY -= 30;
        return;
      }

      // Sub-consultant table
      const subHeaders = ['Company', 'Commitment', 'Invoiced', 'Paid', 'Remaining', '% Invoiced'];
      const subWidths = [200, 100, 100, 100, 100, 82];
      const subTableWidth = subWidths.reduce((sum, w) => sum + w, 0);

      // Table header
      drawRect(margin, currentY - headerHeight, subTableWidth, headerHeight, headerBgColor);
      let x = margin;
      subHeaders.forEach((header, i) => {
        page.drawText(header, {
          x: x + cellPaddingX,
          y: currentY - headerHeight + 6,
          size: headerFontSize,
          font: boldFont,
          color: whiteColor
        });
        x += subWidths[i];
      });
      drawLine(margin, currentY, margin + subTableWidth, currentY, borderColor);
      drawLine(margin, currentY - headerHeight, margin + subTableWidth, currentY - headerHeight, borderColor);
      currentY -= headerHeight;

      // Sub-consultant rows
      report.subConsultants.forEach((sub, idx) => {
        checkSpace(20);

        if (idx % 2 === 0) {
          drawRect(margin, currentY - rowMinHeight, subTableWidth, rowMinHeight, altRowColor);
        }

        const rowData = [
          sanitizeText(sub.companyName),
          `$${sub.totalCommitment.toLocaleString()}`,
          `$${sub.totalInvoiced.toLocaleString()}`,
          `$${sub.totalPaid.toLocaleString()}`,
          `$${sub.remainingCommitted.toLocaleString()}`,
          `${sub.percentInvoiced.toFixed(1)}%`
        ];

        x = margin;
        rowData.forEach((data, i) => {
          const truncated = truncateText(data, subWidths[i] - cellPaddingX * 2, fontSize);
          page.drawText(truncated, {
            x: x + cellPaddingX,
            y: currentY - rowMinHeight + 4,
            size: fontSize,
            font: font,
            color: textColor
          });
          x += subWidths[i];
        });

        drawLine(margin, currentY, margin + subTableWidth, currentY, borderColor);
        drawLine(margin, currentY - rowMinHeight, margin + subTableWidth, currentY - rowMinHeight, borderColor);
        currentY -= rowMinHeight;
      });

      // Sub-consultant totals
      checkSpace(40);
      currentY -= 10;
      const subTotalsHeight = 35;
      const subTotalsWidth = 380;
      const subTotalsX = margin + (contentWidth - subTotalsWidth) / 2;

      drawRect(subTotalsX, currentY - subTotalsHeight, subTotalsWidth, subTotalsHeight, headerBgColor);
      page.drawText('SUB-CONSULTANT TOTALS', {
        x: subTotalsX + cellPaddingX * 2,
        y: currentY - 12,
        size: subtitleFontSize,
        font: boldFont,
        color: whiteColor
      });

      const subTotalsLines = [
        `Total Commitment: $${report.subConsultantTotals.totalCommitment.toLocaleString()}`,
        `Total Invoiced: $${report.subConsultantTotals.totalInvoiced.toLocaleString()} | Paid: $${report.subConsultantTotals.totalPaid.toLocaleString()}`,
        `Remaining Committed: $${report.subConsultantTotals.remainingCommitted.toLocaleString()}`
      ];

      let subTotalsY = currentY - 22;
      subTotalsLines.forEach(line => {
        page.drawText(line, {
          x: subTotalsX + cellPaddingX * 2,
          y: subTotalsY,
          size: fontSize,
          font: font,
          color: whiteColor
        });
        subTotalsY -= 7;
      });

      currentY -= subTotalsHeight + 10;
    };

    // ========================================================================
    // GENERATE REPORT
    // ========================================================================

    drawMainHeader();
    drawPOBudgetSummary();

    if (currentY < 200) {
      addNewPage();
    }

    drawMWBECompliance();

    if (currentY < 150) {
      addNewPage();
    }

    drawSubConsultantBreakdown();

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);

  } catch (error) {
    console.error('Error generating overall projects summary PDF:', error);
    throw new Error(`Failed to generate overall projects summary PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
