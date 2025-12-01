/**
 * Overall Projects Summary Package Generator
 *
 * Orchestrates the generation of 3 professional PDF reports:
 * 1. PO Budget Summary
 * 2. MWBE Compliance Report
 * 3. Sub-Consultant Breakdown
 *
 * Packages all 3 PDFs into a single ZIP file for download.
 */

import JSZip from 'jszip';
import { aggregateOverallProjectsSummary, type AggregationFilters } from './overall-projects-summary-aggregator';
import { generatePOBudgetSummaryPdf, type POBudgetSummaryReport, type POBudgetProject } from './po-budget-summary-pdf';
import { generateMWBECompliancePdf, type MWBEComplianceReport, type MWBECompany } from './mwbe-compliance-pdf';
import { generateSubConsultantBreakdownPdf, type SubConsultantSummaryReport, type SubConsultant } from './sub-consultant-breakdown-pdf';

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transforms aggregated data into PO Budget Summary format
 */
function transformToPOBudgetReport(aggregatedData: Awaited<ReturnType<typeof aggregateOverallProjectsSummary>>): POBudgetSummaryReport {
  const { contractGroups, grandTotals, departmentName, generatedDate } = aggregatedData;

  // Transform projects to include utilization percentage
  const transformedGroups = contractGroups.map((group) => ({
    ...group,
    projects: group.projects.map((proj): POBudgetProject => ({
      ...proj,
      utilizationPercent: proj.newPoAmount > 0
        ? (proj.previouslyInvoiced / proj.newPoAmount) * 100
        : 0,
    })),
  }));

  // Identify critical projects (< 10% remaining)
  const criticalProjects: POBudgetProject[] = [];
  transformedGroups.forEach((group) => {
    group.projects.forEach((proj) => {
      const remainingPercent = 100 - proj.utilizationPercent;
      if (remainingPercent < 10 && remainingPercent > 0) {
        criticalProjects.push(proj);
      }
    });
  });

  return {
    departmentName,
    generatedDate,
    contractGroups: transformedGroups,
    grandTotals: {
      ...grandTotals,
      overallUtilizationPercent: grandTotals.newPoAmount > 0
        ? (grandTotals.previouslyInvoiced / grandTotals.newPoAmount) * 100
        : 0,
    },
    criticalProjects: criticalProjects.sort((a, b) => a.remainingPoAmount - b.remainingPoAmount),
  };
}

/**
 * Transforms aggregated data into MWBE Compliance format
 */
function transformToMWBEReport(aggregatedData: Awaited<ReturnType<typeof aggregateOverallProjectsSummary>>): MWBEComplianceReport {
  const { mwbeData, grandTotals, departmentName, generatedDate } = aggregatedData;

  // Transform MWBE companies
  const mwbeCompanies: MWBECompany[] = mwbeData.mwbeCompanies.map((company) => ({
    companyName: company.companyName,
    certificationType: company.certifications,
    totalInvoiced: company.totalInvoiced,
    percentOfTotal: company.percentOfTotal,
  }));

  // Calculate certification breakdown
  const certMap = new Map<string, {totalInvoiced: number; companies: Set<string>}>();

  mwbeCompanies.forEach((company) => {
    company.certificationType.forEach((cert) => {
      if (!certMap.has(cert)) {
        certMap.set(cert, {totalInvoiced: 0, companies: new Set()});
      }
      const entry = certMap.get(cert)!;
      entry.totalInvoiced += company.totalInvoiced;
      entry.companies.add(company.companyName);
    });
  });

  const certificationBreakdown = Array.from(certMap.entries()).map(([certificationType, data]) => ({
    certificationType,
    totalInvoiced: data.totalInvoiced,
    percentOfTotal: mwbeData.totalInvoiced > 0
      ? (data.totalInvoiced / mwbeData.totalInvoiced) * 100
      : 0,
    companyCount: data.companies.size,
  })).sort((a, b) => b.totalInvoiced - a.totalInvoiced);

  // Top 5 MWBE companies
  const topMwbeCompanies = [...mwbeCompanies]
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
    .slice(0, 5);

  return {
    departmentName,
    generatedDate,
    contractMwbeGoal: mwbeData.contractMwbeGoal,
    mwbePercentAchieved: mwbeData.mwbePercentAchieved,
    achievedGoal: mwbeData.achievedGoal,
    totalContractValue: grandTotals.newPoAmount,
    totalInvoiced: mwbeData.totalInvoiced,
    totalMwbeInvoiced: mwbeData.totalMwbeInvoiced,
    nonMwbeInvoiced: mwbeData.nonMwbeInvoiced,
    mwbeCompanies,
    certificationBreakdown,
    topMwbeCompanies,
  };
}

/**
 * Transforms aggregated data into Sub-Consultant Breakdown format
 */
function transformToSubConsultantReport(aggregatedData: Awaited<ReturnType<typeof aggregateOverallProjectsSummary>>): SubConsultantSummaryReport {
  const { subConsultants, grandTotals, departmentName, generatedDate } = aggregatedData;

  // Transform sub-consultants
  const transformedSubs: SubConsultant[] = subConsultants.map((sub) => {
    const utilizationPercent = sub.commitment > 0
      ? (sub.invoiced / sub.commitment) * 100
      : 0;

    return {
      companyName: sub.companyName,
      totalCommitment: sub.commitment,
      totalInvoiced: sub.invoiced,
      totalPaid: sub.paid,
      outstanding: sub.outstanding,
      remainingCommitment: sub.remaining,
      utilizationPercent,
      isOverCommitted: sub.invoiced > sub.commitment,
    };
  });

  // Calculate totals
  const totalCommitments = transformedSubs.reduce((sum, sub) => sum + sub.totalCommitment, 0);
  const totalInvoiced = transformedSubs.reduce((sum, sub) => sum + sub.totalInvoiced, 0);
  const totalPaid = transformedSubs.reduce((sum, sub) => sum + sub.totalPaid, 0);
  const totalOutstanding = transformedSubs.reduce((sum, sub) => sum + sub.outstanding, 0);
  const totalRemainingCommitments = transformedSubs.reduce((sum, sub) => sum + sub.remainingCommitment, 0);
  const overallUtilizationPercent = totalCommitments > 0
    ? (totalInvoiced / totalCommitments) * 100
    : 0;

  // Identify insights
  const overCommittedSubs = transformedSubs.filter((sub) => sub.isOverCommitted);
  const topSubConsultants = [...transformedSubs]
    .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
    .slice(0, 5);
  const paymentPendingSubs = transformedSubs.filter((sub) => sub.outstanding > 5000);

  return {
    departmentName,
    generatedDate,
    totalCommitments,
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    totalRemainingCommitments,
    overallUtilizationPercent,
    subConsultants: transformedSubs,
    overCommittedSubs,
    topSubConsultants,
    paymentPendingSubs,
  };
}

// ============================================================================
// ZIP PACKAGE GENERATION
// ============================================================================

export interface OverallProjectsSummaryPackageOptions extends AggregationFilters {
  // Additional package-specific options can go here
}

export interface OverallProjectsSummaryPackageResult {
  zipBuffer: Buffer;
  filename: string;
  reportCount: number;
  generatedDate: string;
}

/**
 * Generates all 3 professional PDF reports and packages them into a ZIP file
 */
export async function generateOverallProjectsSummaryPackage(
  options: OverallProjectsSummaryPackageOptions
): Promise<OverallProjectsSummaryPackageResult> {
  try {
    console.log('[Package] Starting Overall Projects Summary package generation');

    // Step 1: Aggregate all data from Firestore
    const aggregatedData = await aggregateOverallProjectsSummary(options);
    console.log('[Package] Data aggregation complete');

    // Step 2: Transform data for each report type
    const poBudgetData = transformToPOBudgetReport(aggregatedData);
    const mwbeComplianceData = transformToMWBEReport(aggregatedData);
    const subConsultantData = transformToSubConsultantReport(aggregatedData);
    console.log('[Package] Data transformation complete');

    // Step 3: Generate all 3 PDFs in parallel
    console.log('[Package] Generating PDFs...');
    const [poBudgetPdf, mwbeCompliancePdf, subConsultantPdf] = await Promise.all([
      generatePOBudgetSummaryPdf(poBudgetData),
      generateMWBECompliancePdf(mwbeComplianceData),
      generateSubConsultantBreakdownPdf(subConsultantData),
    ]);
    console.log('[Package] All PDFs generated successfully');

    // Step 4: Create ZIP package
    const zip = new JSZip();

    // Add PDFs to ZIP with descriptive names
    zip.file('1-PO-Budget-Summary.pdf', poBudgetPdf);
    zip.file('2-MWBE-Compliance-Report.pdf', mwbeCompliancePdf);
    zip.file('3-Sub-Consultant-Breakdown.pdf', subConsultantPdf);

    // Add a README file explaining the contents
    const readmeContent = `Overall Projects Summary Report Package
Generated: ${aggregatedData.generatedDate}
Department: ${aggregatedData.departmentName}

This package contains 3 comprehensive reports:

1. PO Budget Summary (1-PO-Budget-Summary.pdf)
   - Comprehensive budget tracking across all projects
   - Shows original PO amounts, change orders, invoiced amounts, and remaining balances
   - Highlights critical projects nearing budget exhaustion
   - Grouped by contract with subtotals and grand totals

2. MWBE Compliance Report (2-MWBE-Compliance-Report.pdf)
   - Analyzes Minority and Women-owned Business Enterprise participation
   - Tracks progress toward contract MWBE goals
   - Breaks down participation by certification type (MBE, WBE, DBE, etc.)
   - Lists all MWBE participating companies with financial details

3. Sub-Consultant Breakdown (3-Sub-Consultant-Breakdown.pdf)
   - Financial overview of all sub-consultant engagements
   - Tracks commitments, invoiced amounts, payments, and outstanding balances
   - Identifies over-committed sub-consultants
   - Highlights payment status and pending actions

For questions or support, contact your CTI administrator.
`;

    zip.file('README.txt', readmeContent);

    // Generate ZIP buffer
    console.log('[Package] Creating ZIP file...');
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const departmentSlug = aggregatedData.departmentName.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `Overall-Projects-Summary-${departmentSlug}-${timestamp}.zip`;

    console.log('[Package] Package generation complete', {
      filename,
      zipSize: zipBuffer.length,
      reportCount: 3,
    });

    return {
      zipBuffer,
      filename,
      reportCount: 3,
      generatedDate: aggregatedData.generatedDate,
    };
  } catch (error) {
    console.error('[Package] Error generating Overall Projects Summary package:', error);
    throw new Error(`Failed to generate Overall Projects Summary package: ${error instanceof Error ? error.message : String(error)}`);
  }
}
