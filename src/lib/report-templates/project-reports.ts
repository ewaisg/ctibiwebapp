/**
 * Project Report Templates
 */

import type { ReportTemplate } from './types';

export const projectReports: ReportTemplate[] = [
  {
    id: 'project-overall-summary',
    name: 'Project Overall Summary',
    description: 'Comprehensive overview of projects including status, budget, hours, and completion details. User can select all projects, one project, or multiple projects. Supports All Time or Date Range options.',
    category: 'Project',
    requiredDataSources: ['projects', 'invoices', 'timesheets', 'contracts'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'projectId', 'contractId'],
    icon: 'FolderKanban',
    color: 'blue',
    processorFunction: 'processProjectOverallSummary',
  },
  {
    id: 'project-budget-report',
    name: 'Project Budget (Budgeted, Used, Remaining) Report',
    description: 'Project budget analysis showing budgeted amounts, used amounts, and remaining budget. User can select all projects, one project, or multiple projects. Supports All Time or Date Range options.',
    category: 'Project',
    requiredDataSources: ['projects', 'invoices'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'projectId'],
    icon: 'DollarSign',
    color: 'green',
    processorFunction: 'processProjectBudgetReport',
  },
  {
    id: 'project-hours-report',
    name: 'Project Hours (Budgeted, Used, Remaining) Report',
    description: 'Project hours analysis showing budgeted hours, used hours, and remaining hours. User can select all projects, one project, or multiple projects. Supports All Time or Date Range options.',
    category: 'Project',
    requiredDataSources: ['projects', 'timesheets'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'projectId'],
    icon: 'Clock',
    color: 'purple',
    processorFunction: 'processProjectHoursReport',
  },
];
