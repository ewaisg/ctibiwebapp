/**
 * MWBE Compliance Report PDF Generator
 *
 * Tells the story: "Are we meeting our diversity goals?"
 *
 * This report provides insights into Minority and Women-owned Business Enterprise
 * (MWBE) participation, showing:
 * - Overall MWBE goal vs. achievement
 * - Progress toward contract goals
 * - Breakdown by certification type (MBE, WBE, DBE, etc.)
 * - Company-level participation details
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

export interface MWBECompany {
  companyName: string;
  certificationType: string[];
  totalInvoiced: number;
  percentOfTotal: number;
}

export interface MWBECertificationBreakdown {
  certificationType: string;
  totalInvoiced: number;
  percentOfTotal: number;
  companyCount: number;
}

export interface MWBEComplianceReport {
  departmentName: string;
  contractName?: string;
  reportingPeriod?: string;
  generatedDate: string;

  // Goal tracking
  contractMwbeGoal: number;               // Target percentage (e.g., 51%)
  mwbePercentAchieved: number;            // Actual percentage achieved
  achievedGoal: boolean;                  // Whether goal was met

  // Financial breakdown
  totalContractValue: number;             // Total contract budget
  totalInvoiced: number;                  // Total invoiced amount
  totalMwbeInvoiced: number;              // MWBE invoiced amount
  nonMwbeInvoiced: number;                // Non-MWBE invoiced amount

  // MWBE details
  mwbeCompanies: MWBECompany[];           // Individual company breakdown
  certificationBreakdown: MWBECertificationBreakdown[];  // By certification type

  // Insights
  topMwbeCompanies: MWBECompany[];        // Top 5 MWBE participants
}

// ============================================================================
// PDF GENERATION
// ============================================================================

export async function generateMWBECompliancePdf(
  report: MWBEComplianceReport
): Promise<Buffer> {
  try {
    // Create PDF document (Portrait US Letter)
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);
    let currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
      title: 'MWBE Compliance Report',
      subtitle: report.contractName || report.departmentName,
    });

    // ========================================================================
    // EXECUTIVE SUMMARY
    // ========================================================================

    currentY -= 20;

    const summaryBoxX = LAYOUT.marginLeft;
    const summaryBoxWidth = LAYOUT.pageWidth - LAYOUT.marginLeft - LAYOUT.marginRight;
    const summaryBoxHeight = 110;

    // Determine status color
    const statusColor = report.achievedGoal ? CTI_COLORS.success : CTI_COLORS.warning;
    const statusText = report.achievedGoal ? '[GOAL MET]' : '[BELOW GOAL]';

    drawCalloutBox(page, font, boldFont, {
      x: summaryBoxX,
      y: currentY,
      width: summaryBoxWidth,
      height: summaryBoxHeight,
      title: 'EXECUTIVE SUMMARY',
      backgroundColor: CTI_COLORS.lightBg,
      borderColor: statusColor,
    });

    // Executive summary text
    const gapText = report.achievedGoal
      ? `exceeding the goal by ${formatPercentage(report.mwbePercentAchieved - report.contractMwbeGoal)}`
      : `falling short by ${formatPercentage(report.contractMwbeGoal - report.mwbePercentAchieved)}`;

    const summaryLines = [
      `This report analyzes MWBE participation ${report.contractName ? `for ${report.contractName}` : `across all projects`}.`,
      ``,
      `Contract MWBE Goal: ${formatPercentage(report.contractMwbeGoal)}  |  Achieved: ${formatPercentage(report.mwbePercentAchieved)}  |  Status: ${statusText}`,
      ``,
      `Out of ${formatCurrency(report.totalInvoiced)} total invoiced, ${formatCurrency(report.totalMwbeInvoiced)} (${formatPercentage(report.mwbePercentAchieved)})`,
      `has been allocated to MWBE-certified companies, ${gapText}.`,
      ``,
      `${report.mwbeCompanies.length} MWBE-certified companies are participating across ${report.certificationBreakdown.length} certification types.`,
    ];

    let summaryY = currentY - 30;
    summaryLines.forEach((line) => {
      const lineFont = line.includes('Goal:') || line.includes('Status:') ? boldFont : font;
      page.drawText(line, {
        x: summaryBoxX + 12,
        y: summaryY,
        size: FONT_SIZES.small,
        font: lineFont,
        color: CTI_COLORS.black,
      });
      summaryY -= FONT_SIZES.small + 2;
    });

    currentY -= summaryBoxHeight + 25;

    // ========================================================================
    // KEY METRICS
    // ========================================================================

    const metricBoxWidth = (summaryBoxWidth - 20) / 3;
    let metricX = LAYOUT.marginLeft;

    // Metric 1: MWBE Goal
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'MWBE GOAL',
      value: formatPercentage(report.contractMwbeGoal),
      sublabel: 'Target percentage',
      valueColor: CTI_COLORS.navyBlue,
    });

    metricX += metricBoxWidth + 10;

    // Metric 2: Achieved
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'ACHIEVED',
      value: formatPercentage(report.mwbePercentAchieved),
      sublabel: statusText,
      valueColor: statusColor,
    });

    metricX += metricBoxWidth + 10;

    // Metric 3: Gap
    const gap = report.mwbePercentAchieved - report.contractMwbeGoal;
    const gapLabel = gap >= 0 ? 'OVER GOAL' : 'UNDER GOAL';
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: gapLabel,
      value: formatPercentage(Math.abs(gap)),
      sublabel: gap >= 0 ? 'Exceeded' : 'Shortfall',
      valueColor: gap >= 0 ? CTI_COLORS.success : CTI_COLORS.danger,
    });

    currentY -= 75;

    // ========================================================================
    // GOAL ACHIEVEMENT PROGRESS BAR
    // ========================================================================

    page.drawText('MWBE GOAL ACHIEVEMENT', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h3,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 25;

    // Large progress bar showing goal achievement
    const progressBarWidth = summaryBoxWidth;
    const progressBarHeight = 40;

    // Calculate percentage relative to goal (cap at 100%)
    const progressPercentage = Math.min((report.mwbePercentAchieved / report.contractMwbeGoal) * 100, 100);

    drawProgressBar(page, font, boldFont, {
      x: LAYOUT.marginLeft,
      y: currentY,
      width: progressBarWidth,
      height: progressBarHeight,
      percentage: progressPercentage,
      showPercentage: false,
      color: report.achievedGoal ? CTI_COLORS.success : CTI_COLORS.warning,
    });

    // Draw goal line marker
    const goalLineX = LAYOUT.marginLeft + progressBarWidth;
    page.drawLine({
      start: { x: goalLineX, y: currentY },
      end: { x: goalLineX, y: currentY + progressBarHeight },
      color: CTI_COLORS.navyBlue,
      thickness: 2,
    });

    page.drawText('GOAL', {
      x: goalLineX - 15,
      y: currentY + progressBarHeight + 5,
      size: FONT_SIZES.tiny,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    // Draw current percentage label
    const currentLabelX = LAYOUT.marginLeft + (progressBarWidth * progressPercentage / 100) - 30;
    page.drawText(formatPercentage(report.mwbePercentAchieved), {
      x: Math.max(LAYOUT.marginLeft + 5, currentLabelX),
      y: currentY + (progressBarHeight / 2) - 4,
      size: FONT_SIZES.h4,
      font: boldFont,
      color: progressPercentage > 50 ? CTI_COLORS.white : CTI_COLORS.black,
    });

    currentY -= progressBarHeight + 35;

    // ========================================================================
    // FINANCIAL BREAKDOWN
    // ========================================================================

    page.drawText('FINANCIAL BREAKDOWN', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h3,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 20;

    // Financial breakdown bar chart
    const barChartWidth = summaryBoxWidth;
    const barChartHeight = 60;

    // MWBE portion
    const mwbeWidth = (barChartWidth * report.mwbePercentAchieved) / 100;
    page.drawRectangle({
      x: LAYOUT.marginLeft,
      y: currentY - barChartHeight,
      width: mwbeWidth,
      height: barChartHeight,
      color: CTI_COLORS.success,
    });

    page.drawText('MWBE', {
      x: LAYOUT.marginLeft + 10,
      y: currentY - (barChartHeight / 2) + 15,
      size: FONT_SIZES.body,
      font: boldFont,
      color: CTI_COLORS.white,
    });

    page.drawText(formatCurrency(report.totalMwbeInvoiced), {
      x: LAYOUT.marginLeft + 10,
      y: currentY - (barChartHeight / 2),
      size: FONT_SIZES.small,
      font: font,
      color: CTI_COLORS.white,
    });

    // Non-MWBE portion
    const nonMwbeWidth = barChartWidth - mwbeWidth;
    if (nonMwbeWidth > 0) {
      page.drawRectangle({
        x: LAYOUT.marginLeft + mwbeWidth,
        y: currentY - barChartHeight,
        width: nonMwbeWidth,
        height: barChartHeight,
        color: CTI_COLORS.lightGray,
      });

      if (nonMwbeWidth > 80) {
        page.drawText('NON-MWBE', {
          x: LAYOUT.marginLeft + mwbeWidth + 10,
          y: currentY - (barChartHeight / 2) + 15,
          size: FONT_SIZES.body,
          font: boldFont,
          color: CTI_COLORS.white,
        });

        page.drawText(formatCurrency(report.nonMwbeInvoiced), {
          x: LAYOUT.marginLeft + mwbeWidth + 10,
          y: currentY - (barChartHeight / 2),
          size: FONT_SIZES.small,
          font: font,
          color: CTI_COLORS.white,
        });
      }
    }

    // Border
    page.drawRectangle({
      x: LAYOUT.marginLeft,
      y: currentY - barChartHeight,
      width: barChartWidth,
      height: barChartHeight,
      borderColor: CTI_COLORS.tableBorder,
      borderWidth: 1,
    });

    currentY -= barChartHeight + 30;

    // ========================================================================
    // CERTIFICATION TYPE BREAKDOWN
    // ========================================================================

    page.drawText('BREAKDOWN BY CERTIFICATION TYPE', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h3,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 20;

    // Table for certification breakdown
    const certColumns: TableColumn[] = [
      { header: 'Certification Type', width: 180, align: 'left' },
      { header: 'Companies', width: 80, align: 'center' },
      { header: 'Total Invoiced', width: 120, align: 'right' },
      { header: '% of Total', width: 100, align: 'right' },
    ];

    const certRows: string[][] = report.certificationBreakdown.map((cert) => [
      cert.certificationType,
      cert.companyCount.toString(),
      formatCurrency(cert.totalInvoiced),
      formatPercentage(cert.percentOfTotal),
    ]);

    currentY = drawTable(page, font, boldFont, {
      x: LAYOUT.marginLeft,
      y: currentY,
      columns: certColumns,
      rows: certRows,
      alternateRows: true,
      fontSize: FONT_SIZES.small,
    });

    currentY -= 30;

    // ========================================================================
    // TOP MWBE PARTICIPANTS
    // ========================================================================

    if (currentY < 200) {
      drawPageFooter(page, font, {
        pageNumber: 1,
        totalPages: 2,
        generatedDate: report.generatedDate,
      });

      page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);
      currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
        title: 'MWBE Compliance Report',
        subtitle: 'Participant Details',
      });
      currentY -= 20;
    }

    page.drawText('TOP MWBE PARTICIPANTS', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h3,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 20;

    // Top 5 MWBE companies table
    const companyColumns: TableColumn[] = [
      { header: 'Company Name', width: 180, align: 'left' },
      { header: 'Certification', width: 120, align: 'left' },
      { header: 'Total Invoiced', width: 120, align: 'right' },
      { header: '% of Total', width: 100, align: 'right' },
    ];

    const companyRows: string[][] = report.topMwbeCompanies.map((company) => [
      company.companyName,
      company.certificationType.join(', '),
      formatCurrency(company.totalInvoiced),
      formatPercentage(company.percentOfTotal),
    ]);

    currentY = drawTable(page, font, boldFont, {
      x: LAYOUT.marginLeft,
      y: currentY,
      columns: companyColumns,
      rows: companyRows,
      alternateRows: true,
      fontSize: FONT_SIZES.small,
    });

    currentY -= 30;

    // ========================================================================
    // ALL MWBE COMPANIES
    // ========================================================================

    if (report.mwbeCompanies.length > report.topMwbeCompanies.length) {
      if (currentY < 150) {
        const pageIndex = pdfDoc.getPageCount();
        drawPageFooter(page, font, {
          pageNumber: pageIndex,
          totalPages: pdfDoc.getPageCount() + 1,
          generatedDate: report.generatedDate,
        });

        page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);
        currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
          title: 'MWBE Compliance Report',
          subtitle: 'All MWBE Participants',
        });
        currentY -= 20;
      }

      page.drawText('ALL MWBE PARTICIPATING COMPANIES', {
        x: LAYOUT.marginLeft,
        y: currentY,
        size: FONT_SIZES.h3,
        font: boldFont,
        color: CTI_COLORS.navyBlue,
      });

      currentY -= 20;

      // All companies table
      const allCompanyRows: string[][] = report.mwbeCompanies.map((company) => [
        company.companyName,
        company.certificationType.join(', '),
        formatCurrency(company.totalInvoiced),
        formatPercentage(company.percentOfTotal),
      ]);

      currentY = drawTable(page, font, boldFont, {
        x: LAYOUT.marginLeft,
        y: currentY,
        columns: companyColumns,
        rows: allCompanyRows,
        alternateRows: true,
        fontSize: FONT_SIZES.small,
      });
    }

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
    console.error('Error generating MWBE Compliance PDF:', error);
    throw new Error(`Failed to generate MWBE Compliance PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
