/**
 * Report Processors Index
 * Central export for all report processors
 */

// Financial Reports
export {
  processBillingReportByDepartment,
  processBillingReportByProject,
  processPaymentReportByDepartment,
  processPaymentReportByProject,
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
  processPOStatusReport,
} from './project-processors';

// Compliance Reports
export {
  processMWBECompliance,
  processSubConsultantBreakdown,
  processDBEParticipation,
} from './compliance-processors';


/**
 * Processor function registry
 * Maps processor function names to actual functions
 */
export const PROCESSOR_REGISTRY: Record<string, (filters: any) => Promise<any>> = {
  // Financial
  processBillingReportByDepartment: async (filters) => (await import('./financial-processors')).processBillingReportByDepartment(filters),
  processBillingReportByProject: async (filters) => (await import('./financial-processors')).processBillingReportByProject(filters),
  processPaymentReportByDepartment: async (filters) => (await import('./financial-processors')).processPaymentReportByDepartment(filters),
  processPaymentReportByProject: async (filters) => (await import('./financial-processors')).processPaymentReportByProject(filters),

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
