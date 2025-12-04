/**
 * Report Processors Index
 * Central export for all report processors
 */

// Financial Reports
export {
  processRevenueByDepartment,
  processOutstandingInvoices,
  processRevenueByProject,
  processPaymentHistory,
  processProfitabilityAnalysis,
} from './financial-processors';

// Labor Reports
export {
  processDirectLaborHours,
  processEmployeeUtilization,
  processBillableVsNonBillable,
  processOvertimeAnalysis,
  processLaborCostAnalysis,
} from './labor-processors';

// Project Reports
export {
  processProjectStatus,
  processBudgetVsActual,
  processChangeOrderImpact,
  processProjectForecast,
  processProjectHours,
} from './project-processors';

// Compliance Reports
export {
  processMWBECompliance,
  processSubConsultantBreakdown,
  processDBEParticipation,
  processCertifiedPayroll,
} from './compliance-processors';

// Executive Reports
export {
  processCompanyWideSummary,
  processKPIDashboard,
  processTrendAnalysis,
  processDepartmentComparison,
} from './executive-processors';

/**
 * Processor function registry
 * Maps processor function names to actual functions
 */
export const PROCESSOR_REGISTRY: Record<string, (filters: any) => Promise<any>> = {
  // Financial
  processRevenueByDepartment: async (filters) => (await import('./financial-processors')).processRevenueByDepartment(filters),
  processOutstandingInvoices: async (filters) => (await import('./financial-processors')).processOutstandingInvoices(filters),
  processRevenueByProject: async (filters) => (await import('./financial-processors')).processRevenueByProject(filters),
  processPaymentHistory: async (filters) => (await import('./financial-processors')).processPaymentHistory(filters),
  processProfitabilityAnalysis: async (filters) => (await import('./financial-processors')).processProfitabilityAnalysis(filters),

  // Labor
  processDirectLaborHours: async (filters) => (await import('./labor-processors')).processDirectLaborHours(filters),
  processEmployeeUtilization: async (filters) => (await import('./labor-processors')).processEmployeeUtilization(filters),
  processBillableVsNonBillable: async (filters) => (await import('./labor-processors')).processBillableVsNonBillable(filters),
  processOvertimeAnalysis: async (filters) => (await import('./labor-processors')).processOvertimeAnalysis(filters),
  processLaborCostAnalysis: async (filters) => (await import('./labor-processors')).processLaborCostAnalysis(filters),

  // Project
  processProjectStatus: async (filters) => (await import('./project-processors')).processProjectStatus(filters),
  processBudgetVsActual: async (filters) => (await import('./project-processors')).processBudgetVsActual(filters),
  processChangeOrderImpact: async (filters) => (await import('./project-processors')).processChangeOrderImpact(filters),
  processProjectForecast: async (filters) => (await import('./project-processors')).processProjectForecast(filters),
  processProjectHours: async (filters) => (await import('./project-processors')).processProjectHours(filters),

  // Compliance
  processMWBECompliance: async (filters) => (await import('./compliance-processors')).processMWBECompliance(filters),
  processSubConsultantBreakdown: async (filters) => (await import('./compliance-processors')).processSubConsultantBreakdown(filters),
  processDBEParticipation: async (filters) => (await import('./compliance-processors')).processDBEParticipation(filters),
  processCertifiedPayroll: async (filters) => (await import('./compliance-processors')).processCertifiedPayroll(filters),

  // Executive
  processCompanyWideSummary: async (filters) => (await import('./executive-processors')).processCompanyWideSummary(filters),
  processKPIDashboard: async (filters) => (await import('./executive-processors')).processKPIDashboard(filters),
  processTrendAnalysis: async (filters) => (await import('./executive-processors')).processTrendAnalysis(filters),
  processDepartmentComparison: async (filters) => (await import('./executive-processors')).processDepartmentComparison(filters),
};

/**
 * Get processor function by name
 */
export function getProcessor(processorName: string): ((filters: any) => Promise<any>) | undefined {
  return PROCESSOR_REGISTRY[processorName];
}

/**
 * Check if a processor exists
 */
export function hasProcessor(processorName: string): boolean {
  return processorName in PROCESSOR_REGISTRY;
}
