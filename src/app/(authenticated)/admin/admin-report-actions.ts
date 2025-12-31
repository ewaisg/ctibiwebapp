'use server';

import {
  adminDb,
  Timestamp,
  sanitizeForLog,
} from './admin-shared';

// Report data generators (stub implementations)
async function generateRevenueReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { totalRevenue: 0, currency: 'USD' },
    range: dateRange,
    filters,
    items: []
  };
}

async function generateOutstandingReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { totalOutstanding: 0, currency: 'USD' },
    range: dateRange,
    filters,
    items: []
  };
}

async function generateUtilizationReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { avgUtilization: 0 },
    range: dateRange,
    filters,
    items: []
  };
}

async function generateProfitabilityReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { totalProfit: 0, marginPct: 0 },
    range: dateRange,
    filters,
    items: []
  };
}

export async function generateFinancialReport(reportData: {
  reportName: string;
  reportType: 'Revenue' | 'Outstanding' | 'Utilization' | 'Profitability';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters: {
    companyIds?: string[];
    projectIds?: string[];
    departmentIds?: string[];
  };
  generatedBy: string;
  generatedByName: string;
}): Promise<{ success: boolean; message: string; report?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    // Generate report data based on type
    let reportData_generated: any = {};

    switch (reportData.reportType) {
      case 'Revenue':
        reportData_generated = await generateRevenueReport(reportData.dateRange, reportData.filters);
        break;
      case 'Outstanding':
        reportData_generated = await generateOutstandingReport(reportData.dateRange, reportData.filters);
        break;
      case 'Utilization':
        reportData_generated = await generateUtilizationReport(reportData.dateRange, reportData.filters);
        break;
      case 'Profitability':
        reportData_generated = await generateProfitabilityReport(reportData.dateRange, reportData.filters);
        break;
    }

    const reportDoc = {
      reportName: reportData.reportName,
      reportType: reportData.reportType,
      dateRange: {
        startDate: Timestamp.fromDate(reportData.dateRange.startDate),
        endDate: Timestamp.fromDate(reportData.dateRange.endDate),
      },
      filters: reportData.filters,
      data: reportData_generated,
      generatedBy: adminDb!.doc(`users/${reportData.generatedBy}`),
      generatedByName: reportData.generatedByName,
      generatedAt: Timestamp.now(),
    };

    const docRef = await adminDb!.collection('financial_reports').add(reportDoc);

    // Exclude timestamp fields from client response
    const { generatedAt, ...clientSafeReport } = reportDoc;

    return {
      success: true,
      message: "Financial report generated successfully",
      report: { id: docRef.id, ...clientSafeReport }
    };
  } catch (error) {
    console.error('Error generating financial report:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate financial report"
    };
  }
}
