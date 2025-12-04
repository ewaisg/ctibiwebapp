/**
 * Compliance Report Templates
 */

import type { ReportTemplate } from './types';

export const complianceReports: ReportTemplate[] = [
  {
    id: 'mwbe-compliance',
    name: 'MWBE Compliance Report',
    description: 'Minority and Women-owned Business Enterprise participation report',
    category: 'Compliance',
    requiredDataSources: ['invoices', 'projects', 'companies'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId', 'contractId'],
    icon: 'ShieldCheck',
    color: 'green',
    processorFunction: 'processMWBECompliance',
  },
  {
    id: 'subconsultant-breakdown',
    name: 'Sub-Consultant Breakdown',
    description: 'Detailed breakdown of sub-consultant utilization and payments',
    category: 'Compliance',
    requiredDataSources: ['invoices', 'projects', 'companies'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId', 'companyId'],
    icon: 'Users',
    color: 'blue',
    processorFunction: 'processSubConsultantBreakdown',
  },
  {
    id: 'dbe-participation',
    name: 'DBE Participation Report',
    description: 'Disadvantaged Business Enterprise participation tracking',
    category: 'Compliance',
    requiredDataSources: ['invoices', 'projects', 'companies', 'contracts'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['contractId', 'projectId'],
    icon: 'Award',
    color: 'purple',
    processorFunction: 'processDBEParticipation',
  },
  {
    id: 'certified-payroll',
    name: 'Certified Payroll Report',
    description: 'Certified payroll report for prevailing wage compliance',
    category: 'Compliance',
    requiredDataSources: ['timesheets', 'employees', 'projects'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['projectId', 'employeeId'],
    icon: 'FileCheck',
    color: 'red',
    processorFunction: 'processCertifiedPayroll',
  },
];
