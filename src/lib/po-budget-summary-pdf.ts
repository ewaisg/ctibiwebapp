/**
 * PO Budget Summary PDF Generator
 *
 * Tells the story: "Where does our money stand?"
 *
 * This report provides a comprehensive view of all project budgets, showing:
 * - Total budget across all projects
 * - How much has been invoiced to date
 * - Remaining budget available
 * - Critical projects nearing budget exhaustion
 */

import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  CTI_COLORS,
  FONT_SIZES,
  LAYOUT,
  drawPageHeader,
  drawPageFooter,
  drawCalloutBox,
  drawProgressBar,
  drawKeyMetric,
  drawTable,
  formatCurrency,
  formatPercentage,
  getStatusColor,
  type TableColumn,
} from './professional-pdf-design';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface POBudgetProject {
  poNumber: string;
  projectName: string;
  contractName: string;
  contractNumber: string;
  originalPoAmount: number;
  changeOrderAmount: number;
  newPoAmount: number;
  previouslyInvoiced: number;
  remainingPoAmount: number;
  utilizationPercent: number;
}

export interface POBudgetContractGroup {
  contractId: string;
  contractName: string;
  contractNumber: string;
  projects: POBudgetProject[];
  totals: {
    originalPoAmount: number;
    changeOrderAmount: number;
    newPoAmount: number;
    previouslyInvoiced: number;
    remainingPoAmount: number;
  };
}

export interface POBudgetSummaryReport {
  departmentName: string;
  reportingPeriod?: string;
  generatedDate: string;
  contractGroups: POBudgetContractGroup[];
  grandTotals: {
    totalContracts: number;
    totalProjects: number;
    originalPoAmount: number;
    changeOrderAmount: number;
    newPoAmount: number;
    previouslyInvoiced: number;
    remainingPoAmount: number;
    overallUtilizationPercent: number;
  };
  criticalProjects: POBudgetProject[];  // Projects with <10% remaining
}

// ============================================================================
// PDF GENERATION
// ============================================================================

export async function generatePOBudgetSummaryPdf(
  report: POBudgetSummaryReport
): Promise<Buffer> {
  try {
    // Create PDF document (Landscape US Letter for wide tables)
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Use landscape layout
    const pageWidth = LAYOUT.pageWidthLandscape;
    const pageHeight = LAYOUT.pageHeightLandscape;
    const contentWidth = pageWidth - (LAYOUT.marginLeft + LAYOUT.marginRight);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
      title: 'PO Budget Summary Report',
      subtitle: report.reportingPeriod || `${report.departmentName}`,
    });

    // ========================================================================
    // EXECUTIVE SUMMARY
    // ========================================================================

    currentY -= 20;

    // Executive summary box
    const summaryBoxX = LAYOUT.marginLeft;
    const summaryBoxWidth = contentWidth;
    const summaryBoxHeight = 100;

    drawCalloutBox(page, font, boldFont, {
      x: summaryBoxX,
      y: currentY,
      width: summaryBoxWidth,
      height: summaryBoxHeight,
      title: 'EXECUTIVE SUMMARY',
      backgroundColor: CTI_COLORS.lightBg,
      borderColor: CTI_COLORS.navyBlue,
    });

    // Executive summary text
    const { grandTotals } = report;
    const summaryLines = [
      `This report provides a comprehensive overview of budget status across ${grandTotals.totalProjects} active projects`,
      `under ${grandTotals.totalContracts} contracts managed by ${report.departmentName}.`,
      ``,
      `Total Budget: ${formatCurrency(grandTotals.newPoAmount)}  |  Invoiced: ${formatCurrency(grandTotals.previouslyInvoiced)}  |  Remaining: ${formatCurrency(grandTotals.remainingPoAmount)}`,
      ``,
      `Overall Budget Utilization: ${formatPercentage(grandTotals.overallUtilizationPercent)}`,
    ];

    let summaryY = currentY - 30;
    summaryLines.forEach((line) => {
      page.drawText(line, {
        x: summaryBoxX + 12,
        y: summaryY,
        size: FONT_SIZES.small,
        font: line.includes('Total Budget') || line.includes('Overall') ? boldFont : font,
        color: CTI_COLORS.black,
      });
      summaryY -= FONT_SIZES.small + 2;
    });

    currentY -= summaryBoxHeight + 25;

    // ========================================================================
    // KEY METRICS
    // ========================================================================

    const metricBoxWidth = (summaryBoxWidth - 30) / 4;
    let metricX = LAYOUT.marginLeft;

    // Metric 1: Total Budget
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'TOTAL BUDGET',
      value: formatCurrency(grandTotals.newPoAmount),
      sublabel: `${grandTotals.totalProjects} projects`,
      valueColor: CTI_COLORS.navyBlue,
    });

    metricX += metricBoxWidth + 10;

    // Metric 2: Total Invoiced
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'TOTAL INVOICED',
      value: formatCurrency(grandTotals.previouslyInvoiced),
      sublabel: formatPercentage(grandTotals.overallUtilizationPercent),
      valueColor: CTI_COLORS.success,
    });

    metricX += metricBoxWidth + 10;

    // Metric 3: Remaining Budget
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'REMAINING BUDGET',
      value: formatCurrency(grandTotals.remainingPoAmount),
      sublabel: formatPercentage(100 - grandTotals.overallUtilizationPercent) + ' available',
      valueColor: grandTotals.overallUtilizationPercent > 90 ? CTI_COLORS.danger : CTI_COLORS.info,
    });

    metricX += metricBoxWidth + 10;

    // Metric 4: Change Orders
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'CHANGE ORDERS',
      value: formatCurrency(grandTotals.changeOrderAmount),
      sublabel: grandTotals.changeOrderAmount >= 0 ? 'Increases' : 'Decreases',
      valueColor: grandTotals.changeOrderAmount >= 0 ? CTI_COLORS.success : CTI_COLORS.warning,
    });

    currentY -= 75;

    // ========================================================================
    // BUDGET UTILIZATION PROGRESS BAR
    // ========================================================================

    const progressBarWidth = summaryBoxWidth;
    const progressBarHeight = 30;

    page.drawText('OVERALL BUDGET UTILIZATION', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h4,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 25;

    // Determine color based on utilization
    let progressColor = CTI_COLORS.success;
    if (grandTotals.overallUtilizationPercent > 90) {
      progressColor = CTI_COLORS.danger;
    } else if (grandTotals.overallUtilizationPercent > 75) {
      progressColor = CTI_COLORS.warning;
    }

    drawProgressBar(page, font, boldFont, {
      x: LAYOUT.marginLeft,
      y: currentY,
      width: progressBarWidth,
      height: progressBarHeight,
      percentage: grandTotals.overallUtilizationPercent,
      showPercentage: true,
      color: progressColor,
    });

    currentY -= progressBarHeight + 30;

    // ========================================================================
    // CRITICAL PROJECTS ALERT
    // ========================================================================

    if (report.criticalProjects.length > 0) {
      // Critical projects callout
      const alertBoxHeight = 60 + (report.criticalProjects.length * 14);

      drawCalloutBox(page, font, boldFont, {
        x: LAYOUT.marginLeft,
        y: currentY,
        width: summaryBoxWidth,
        height: Math.min(alertBoxHeight, 120),
        title: `[CRITICAL] ${report.criticalProjects.length} Project(s) Below 10% Remaining Budget`,
        backgroundColor: CTI_COLORS.warning,
        borderColor: CTI_COLORS.danger,
        titleColor: CTI_COLORS.white,
      });

      let alertY = currentY - 35;
      const criticalToShow = report.criticalProjects.slice(0, 5); // Show max 5

      criticalToShow.forEach((proj) => {
        const alertText = `${proj.poNumber} - ${proj.projectName}: ${formatCurrency(proj.remainingPoAmount)} (${formatPercentage(100 - proj.utilizationPercent)}) remaining`;
        page.drawText(alertText, {
          x: LAYOUT.marginLeft + 15,
          y: alertY,
          size: FONT_SIZES.small,
          font: font,
          color: CTI_COLORS.white,
          maxWidth: summaryBoxWidth - 30,
        });
        alertY -= 14;
      });

      currentY -= Math.min(alertBoxHeight, 120) + 25;
    }

    // Check if we need a new page
    if (currentY < 200) {
      drawPageFooter(page, font, {
        pageNumber: 1,
        totalPages: 2, // We'll update this later
        generatedDate: report.generatedDate,
      });

      page = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
        title: 'PO Budget Summary Report',
        subtitle: 'Detailed Breakdown by Contract',
      });
      currentY -= 20;
    }

    // ========================================================================
    // DETAILED BREAKDOWN BY CONTRACT
    // ========================================================================

    page.drawText('DETAILED BREAKDOWN BY CONTRACT', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h2,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 25;

    // Define table columns (optimized for landscape: 712px content width)
    const columns: TableColumn[] = [
      { header: 'PO Number', width: 75, align: 'left' },
      { header: 'Project Name', width: 180, align: 'left' },
      { header: 'Original PO', width: 85, align: 'right' },
      { header: 'Change Orders', width: 85, align: 'right' },
      { header: 'New PO Amount', width: 90, align: 'right' },
      { header: 'Invoiced', width: 85, align: 'right' },
      { header: 'Remaining', width: 85, align: 'right' },
    ];
    // Total width: 685 pixels (fits comfortably in 712px content width)

    // Draw tables for each contract
    for (const contractGroup of report.contractGroups) {
      // Check if we need a new page
      if (currentY < 150) {
        const pageIndex = pdfDoc.getPageCount();
        drawPageFooter(page, font, {
          pageNumber: pageIndex,
          totalPages: pdfDoc.getPageCount() + 1,
          generatedDate: report.generatedDate,
        });

        page = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
          title: 'PO Budget Summary Report',
          subtitle: 'Detailed Breakdown (continued)',
        });
        currentY -= 20;
      }

      // Contract header
      page.drawText(`Contract ${contractGroup.contractNumber}: ${contractGroup.contractName}`, {
        x: LAYOUT.marginLeft,
        y: currentY,
        size: FONT_SIZES.h3,
        font: boldFont,
        color: CTI_COLORS.navyBlue,
      });

      currentY -= 20;

      // Prepare table rows
      const rows: string[][] = contractGroup.projects.map((proj) => [
        proj.poNumber,
        proj.projectName.length > 35 ? proj.projectName.substring(0, 32) + '...' : proj.projectName,
        formatCurrency(proj.originalPoAmount),
        formatCurrency(proj.changeOrderAmount),
        formatCurrency(proj.newPoAmount),
        formatCurrency(proj.previouslyInvoiced),
        formatCurrency(proj.remainingPoAmount),
      ]);

      // Add totals row
      rows.push([
        '',
        'SUBTOTAL',
        formatCurrency(contractGroup.totals.originalPoAmount),
        formatCurrency(contractGroup.totals.changeOrderAmount),
        formatCurrency(contractGroup.totals.newPoAmount),
        formatCurrency(contractGroup.totals.previouslyInvoiced),
        formatCurrency(contractGroup.totals.remainingPoAmount),
      ]);

      // Draw table
      currentY = drawTable(page, font, boldFont, {
        x: LAYOUT.marginLeft,
        y: currentY,
        columns,
        rows,
        alternateRows: true,
        fontSize: FONT_SIZES.small,
      });

      currentY -= 25;
    }

    // ========================================================================
    // GRAND TOTALS
    // ========================================================================

    if (currentY < 100) {
      const pageIndex = pdfDoc.getPageCount();
      drawPageFooter(page, font, {
        pageNumber: pageIndex,
        totalPages: pdfDoc.getPageCount() + 1,
        generatedDate: report.generatedDate,
      });

      page = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
        title: 'PO Budget Summary Report',
        subtitle: 'Grand Totals',
      });
      currentY -= 20;
    }

    // Grand totals box
    const totalsBoxHeight = 80;
    drawCalloutBox(page, font, boldFont, {
      x: LAYOUT.marginLeft,
      y: currentY,
      width: summaryBoxWidth,
      height: totalsBoxHeight,
      title: 'GRAND TOTALS (All Contracts)',
      backgroundColor: CTI_COLORS.navyBlue,
      borderColor: CTI_COLORS.navyBlue,
      titleColor: CTI_COLORS.white,
    });

    const totalRows = [
      ['Original PO Amount:', formatCurrency(grandTotals.originalPoAmount)],
      ['Change Orders:', formatCurrency(grandTotals.changeOrderAmount)],
      ['New PO Amount:', formatCurrency(grandTotals.newPoAmount)],
      ['Total Invoiced:', formatCurrency(grandTotals.previouslyInvoiced)],
      ['Remaining Budget:', formatCurrency(grandTotals.remainingPoAmount)],
    ];

    let totalsY = currentY - 35;
    totalRows.forEach(([label, value]) => {
      page.drawText(label, {
        x: LAYOUT.marginLeft + 15,
        y: totalsY,
        size: FONT_SIZES.body,
        font: font,
        color: CTI_COLORS.white,
      });

      const valueWidth = boldFont.widthOfTextAtSize(value, FONT_SIZES.body);
      page.drawText(value, {
        x: LAYOUT.marginLeft + summaryBoxWidth - valueWidth - 15,
        y: totalsY,
        size: FONT_SIZES.body,
        font: boldFont,
        color: CTI_COLORS.white,
      });

      totalsY -= 12;
    });

    // ========================================================================
    // FOOTER ON ALL PAGES
    // ========================================================================

    const totalPages = pdfDoc.getPageCount();
    pdfDoc.getPages().forEach((p, index) => {
      drawPageFooter(p, font, {
        pageNumber: index + 1,
        totalPages,
        generatedDate: report.generatedDate,
      });
    });

    // ========================================================================
    // SAVE AND RETURN
    // ========================================================================

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating PO Budget Summary PDF:', error);
    throw new Error(`Failed to generate PO Budget Summary PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
