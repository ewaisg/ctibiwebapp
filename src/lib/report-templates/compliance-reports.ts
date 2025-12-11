/**
 * Compliance Report Templates
 */

import type { ReportTemplate } from './types';

export const complianceReports: ReportTemplate[] = [
  {
    id: 'mwbe-summary-report',
    name: 'MWBE Summary Report',
    description: 'Minority and Women-owned Business Enterprise participation summary showing MWBE utilization and compliance. Supports All Time or Date Range options.',
    category: 'Compliance',
    requiredDataSources: ['invoices', 'projects', 'companies', 'contracts'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'projectId', 'contractId'],
    icon: 'ShieldCheck',
    color: 'green',
    processorFunction: 'processMWBESummaryReport',
  },
  {
    id: 'subconsultant-breakdown',
    name: 'Sub-Consultant Breakdown',
    description: 'Detailed breakdown of sub-consultant utilization, hours, and payments. Supports All Time or Date Range options.',
    category: 'Compliance',
    requiredDataSources: ['invoices', 'timesheets', 'projects', 'companies'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'projectId', 'companyId'],
    icon: 'Users',
    color: 'blue',
    processorFunction: 'processSubConsultantBreakdown',
  },
];
