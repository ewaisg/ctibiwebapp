/**
 * Sub-Consultant Breakdown Report PDF Generator
 *
 * Tells the story: "How are we managing our partners?"
 *
 * This report provides a comprehensive view of sub-consultant engagement, showing:
 * - Total commitments vs. actual invoicing
 * - Payment status for each sub-consultant
 * - Outstanding balances and remaining commitments
 * - Identification of over-committed or under-utilized subs
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

export interface SubConsultant {
  companyName: string;
  totalCommitment: number;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  remainingCommitment: number;
  utilizationPercent: number;
  isOverCommitted: boolean;
}

export interface SubConsultantSummaryReport {
  departmentName: string;
  contractName?: string;
  reportingPeriod?: string;
  generatedDate: string;

  // Aggregate totals
  totalCommitments: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalRemainingCommitments: number;
  overallUtilizationPercent: number;

  // Sub-consultant details
  subConsultants: SubConsultant[];

  // Insights
  overCommittedSubs: SubConsultant[];      // Subs with invoiced > commitment
  topSubConsultants: SubConsultant[];      // Top 5 by invoiced amount
  paymentPendingSubs: SubConsultant[];     // Subs with outstanding > $5000
}

// ============================================================================
// PDF GENERATION
// ============================================================================

export async function generateSubConsultantBreakdownPdf(
  report: SubConsultantSummaryReport
): Promise<Buffer> {
  try {
    // Create PDF document (US Letter Landscape for wider tables)
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([LAYOUT.pageWidthLandscape, LAYOUT.pageHeightLandscape]);
    let currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
      title: 'Sub-Consultant Breakdown Report',
      subtitle: report.contractName || report.departmentName,
    });

    const pageWidth = LAYOUT.pageWidthLandscape;
    const contentWidth = pageWidth - (LAYOUT.marginLeft + LAYOUT.marginRight);

    // ========================================================================
    // EXECUTIVE SUMMARY
    // ========================================================================

    currentY -= 20;

    const summaryBoxHeight = 100;

    drawCalloutBox(page, font, boldFont, {
      x: LAYOUT.marginLeft,
      y: currentY,
      width: contentWidth,
      height: summaryBoxHeight,
      title: 'EXECUTIVE SUMMARY',
      backgroundColor: CTI_COLORS.lightBg,
      borderColor: CTI_COLORS.navyBlue,
    });

    // Executive summary text
    const summaryLines = [
      `This report provides a comprehensive analysis of sub-consultant engagement and financial performance`,
      `${report.contractName ? `for ${report.contractName}` : `across all contracts`}.`,
      ``,
      `Total Commitments: ${formatCurrency(report.totalCommitments)}  |  Invoiced: ${formatCurrency(report.totalInvoiced)}  |  Paid: ${formatCurrency(report.totalPaid)}`,
      `Outstanding Balance: ${formatCurrency(report.totalOutstanding)}  |  Remaining Commitments: ${formatCurrency(report.totalRemainingCommitments)}`,
      ``,
      `${report.subConsultants.length} sub-consultants are engaged with an overall utilization rate of ${formatPercentage(report.overallUtilizationPercent)}.`,
    ];

    let summaryY = currentY - 30;
    summaryLines.forEach((line) => {
      page.drawText(line, {
        x: LAYOUT.marginLeft + 12,
        y: summaryY,
        size: FONT_SIZES.small,
        font: line.includes('Total') || line.includes('Outstanding') ? boldFont : font,
        color: CTI_COLORS.black,
      });
      summaryY -= FONT_SIZES.small + 2;
    });

    currentY -= summaryBoxHeight + 25;

    // ========================================================================
    // KEY METRICS
    // ========================================================================

    const metricBoxWidth = (contentWidth - 40) / 5;
    let metricX = LAYOUT.marginLeft;

    // Metric 1: Total Commitments
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'TOTAL COMMITMENTS',
      value: formatCurrency(report.totalCommitments),
      sublabel: `${report.subConsultants.length} subs`,
      valueColor: CTI_COLORS.navyBlue,
    });

    metricX += metricBoxWidth + 10;

    // Metric 2: Total Invoiced
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'TOTAL INVOICED',
      value: formatCurrency(report.totalInvoiced),
      sublabel: formatPercentage(report.overallUtilizationPercent),
      valueColor: CTI_COLORS.success,
    });

    metricX += metricBoxWidth + 10;

    // Metric 3: Total Paid
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'TOTAL PAID',
      value: formatCurrency(report.totalPaid),
      sublabel: 'Completed payments',
      valueColor: CTI_COLORS.info,
    });

    metricX += metricBoxWidth + 10;

    // Metric 4: Outstanding
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'OUTSTANDING',
      value: formatCurrency(report.totalOutstanding),
      sublabel: 'Pending payment',
      valueColor: report.totalOutstanding > 0 ? CTI_COLORS.warning : CTI_COLORS.success,
    });

    metricX += metricBoxWidth + 10;

    // Metric 5: Remaining
    drawKeyMetric(page, font, boldFont, {
      x: metricX,
      y: currentY,
      width: metricBoxWidth,
      label: 'REMAINING',
      value: formatCurrency(report.totalRemainingCommitments),
      sublabel: 'Available to invoice',
      valueColor: CTI_COLORS.lightGray,
    });

    currentY -= 75;

    // ========================================================================
    // COMMITMENT UTILIZATION PROGRESS BAR
    // ========================================================================

    page.drawText('OVERALL COMMITMENT UTILIZATION', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h3,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 25;

    const progressBarHeight = 35;

    // Determine color based on utilization
    let progressColor = CTI_COLORS.success;
    if (report.overallUtilizationPercent > 95) {
      progressColor = CTI_COLORS.danger;
    } else if (report.overallUtilizationPercent > 80) {
      progressColor = CTI_COLORS.warning;
    }

    drawProgressBar(page, font, boldFont, {
      x: LAYOUT.marginLeft,
      y: currentY,
      width: contentWidth,
      height: progressBarHeight,
      percentage: report.overallUtilizationPercent,
      showPercentage: true,
      color: progressColor,
    });

    currentY -= progressBarHeight + 30;

    // ========================================================================
    // ALERTS: OVER-COMMITTED SUBS
    // ========================================================================

    if (report.overCommittedSubs.length > 0) {
      const alertBoxHeight = 60 + (Math.min(report.overCommittedSubs.length, 3) * 14);

      drawCalloutBox(page, font, boldFont, {
        x: LAYOUT.marginLeft,
        y: currentY,
        width: contentWidth,
        height: alertBoxHeight,
        title: `[ALERT] ${report.overCommittedSubs.length} Sub-Consultant(s) Over-Committed`,
        backgroundColor: CTI_COLORS.danger,
        borderColor: CTI_COLORS.danger,
        titleColor: CTI_COLORS.white,
      });

      let alertY = currentY - 35;
      const subsToShow = report.overCommittedSubs.slice(0, 3);

      subsToShow.forEach((sub) => {
        const alertText = `${sub.companyName}: Invoiced ${formatCurrency(sub.totalInvoiced)} against commitment of ${formatCurrency(sub.totalCommitment)}`;
        page.drawText(alertText, {
          x: LAYOUT.marginLeft + 15,
          y: alertY,
          size: FONT_SIZES.small,
          font: font,
          color: CTI_COLORS.white,
          maxWidth: contentWidth - 30,
        });
        alertY -= 14;
      });

      currentY -= alertBoxHeight + 20;
    }

    // ========================================================================
    // ALERTS: PAYMENT PENDING SUBS
    // ========================================================================

    if (report.paymentPendingSubs.length > 0) {
      const pendingBoxHeight = 60 + (Math.min(report.paymentPendingSubs.length, 3) * 14);

      drawCalloutBox(page, font, boldFont, {
        x: LAYOUT.marginLeft,
        y: currentY,
        width: contentWidth,
        height: pendingBoxHeight,
        title: `[ACTION NEEDED] ${report.paymentPendingSubs.length} Sub-Consultant(s) with Significant Outstanding Balance`,
        backgroundColor: CTI_COLORS.warning,
        borderColor: CTI_COLORS.warning,
        titleColor: CTI_COLORS.white,
      });

      let pendingY = currentY - 35;
      const pendingToShow = report.paymentPendingSubs.slice(0, 3);

      pendingToShow.forEach((sub) => {
        const pendingText = `${sub.companyName}: Outstanding balance of ${formatCurrency(sub.outstanding)}`;
        page.drawText(pendingText, {
          x: LAYOUT.marginLeft + 15,
          y: pendingY,
          size: FONT_SIZES.small,
          font: font,
          color: CTI_COLORS.white,
          maxWidth: contentWidth - 30,
        });
        pendingY -= 14;
      });

      currentY -= pendingBoxHeight + 25;
    }

    // ========================================================================
    // NEW PAGE FOR DETAILED BREAKDOWN
    // ========================================================================

    drawPageFooter(page, font, {
      pageNumber: 1,
      totalPages: 2,
      generatedDate: report.generatedDate,
    });

    page = pdfDoc.addPage([LAYOUT.pageWidthLandscape, LAYOUT.pageHeightLandscape]);
    currentY = await drawPageHeader(page, pdfDoc, font, boldFont, {
      title: 'Sub-Consultant Breakdown Report',
      subtitle: 'Detailed Financial Breakdown',
    });

    currentY -= 20;

    // ========================================================================
    // DETAILED BREAKDOWN TABLE
    // ========================================================================

    page.drawText('DETAILED SUB-CONSULTANT BREAKDOWN', {
      x: LAYOUT.marginLeft,
      y: currentY,
      size: FONT_SIZES.h2,
      font: boldFont,
      color: CTI_COLORS.navyBlue,
    });

    currentY -= 25;

    // Define table columns (landscape allows more columns)
    const columns: TableColumn[] = [
      { header: 'Company Name', width: 150, align: 'left' },
      { header: 'Commitment', width: 95, align: 'right' },
      { header: 'Invoiced', width: 95, align: 'right' },
      { header: 'Utilization %', width: 85, align: 'right' },
      { header: 'Paid', width: 95, align: 'right' },
      { header: 'Outstanding', width: 95, align: 'right' },
      { header: 'Remaining', width: 95, align: 'right' },
    ];

    // Sort by total invoiced (descending)
    const sortedSubs = [...report.subConsultants].sort((a, b) => b.totalInvoiced - a.totalInvoiced);

    // Prepare table rows
    const rows: string[][] = sortedSubs.map((sub) => {
      const utilizationText = sub.isOverCommitted
        ? `${formatPercentage(sub.utilizationPercent)} [!]`
        : formatPercentage(sub.utilizationPercent);

      return [
        sub.companyName.length > 28 ? sub.companyName.substring(0, 25) + '...' : sub.companyName,
        formatCurrency(sub.totalCommitment),
        formatCurrency(sub.totalInvoiced),
        utilizationText,
        formatCurrency(sub.totalPaid),
        formatCurrency(sub.outstanding),
        formatCurrency(sub.remainingCommitment),
      ];
    });

    // Add totals row
    rows.push([
      'TOTAL',
      formatCurrency(report.totalCommitments),
      formatCurrency(report.totalInvoiced),
      formatPercentage(report.overallUtilizationPercent),
      formatCurrency(report.totalPaid),
      formatCurrency(report.totalOutstanding),
      formatCurrency(report.totalRemainingCommitments),
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

    // ========================================================================
    // PAYMENT STATUS VISUALIZATION
    // ========================================================================

    if (currentY > 150) {
      currentY -= 30;

      page.drawText('PAYMENT STATUS BY SUB-CONSULTANT', {
        x: LAYOUT.marginLeft,
        y: currentY,
        size: FONT_SIZES.h3,
        font: boldFont,
        color: CTI_COLORS.navyBlue,
      });

      currentY -= 25;

      // Show top 5 subs with payment status bars
      const top5Subs = sortedSubs.slice(0, 5);

      top5Subs.forEach((sub) => {
        // Company name
        page.drawText(sub.companyName, {
          x: LAYOUT.marginLeft,
          y: currentY,
          size: FONT_SIZES.small,
          font: boldFont,
          color: CTI_COLORS.black,
        });

        currentY -= 15;

        // Payment status bar
        const statusBarWidth = contentWidth - 150;
        const statusBarHeight = 18;
        const statusBarX = LAYOUT.marginLeft + 150;

        // Calculate percentages
        const paidPercent = (sub.totalPaid / sub.totalInvoiced) * 100 || 0;
        const outstandingPercent = (sub.outstanding / sub.totalInvoiced) * 100 || 0;

        // Draw paid portion (green)
        const paidWidth = (statusBarWidth * paidPercent) / 100;
        if (paidWidth > 0) {
          page.drawRectangle({
            x: statusBarX,
            y: currentY - statusBarHeight,
            width: paidWidth,
            height: statusBarHeight,
            color: CTI_COLORS.success,
          });
        }

        // Draw outstanding portion (orange)
        const outstandingWidth = (statusBarWidth * outstandingPercent) / 100;
        if (outstandingWidth > 0) {
          page.drawRectangle({
            x: statusBarX + paidWidth,
            y: currentY - statusBarHeight,
            width: outstandingWidth,
            height: statusBarHeight,
            color: CTI_COLORS.warning,
          });
        }

        // Border
        page.drawRectangle({
          x: statusBarX,
          y: currentY - statusBarHeight,
          width: statusBarWidth,
          height: statusBarHeight,
          borderColor: CTI_COLORS.tableBorder,
          borderWidth: 1,
        });

        // Labels
        page.drawText(`Paid: ${formatCurrency(sub.totalPaid)}`, {
          x: statusBarX + 5,
          y: currentY - statusBarHeight + 5,
          size: FONT_SIZES.tiny,
          font: font,
          color: paidPercent > 30 ? CTI_COLORS.white : CTI_COLORS.black,
        });

        if (outstandingPercent > 15) {
          page.drawText(`Outstanding: ${formatCurrency(sub.outstanding)}`, {
            x: statusBarX + paidWidth + 5,
            y: currentY - statusBarHeight + 5,
            size: FONT_SIZES.tiny,
            font: font,
            color: CTI_COLORS.white,
          });
        }

        currentY -= statusBarHeight + 10;
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
    console.error('Error generating Sub-Consultant Breakdown PDF:', error);
    throw new Error(`Failed to generate Sub-Consultant Breakdown PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
