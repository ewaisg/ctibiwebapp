/**
 * Project Report Templates
 */

import type { ReportTemplate } from './types';

export const projectReports: ReportTemplate[] = [
  {
    id: 'project-status-summary',
    name: 'Project Status Summary',
    description: 'Overview of all active projects with status, budget, and completion percentage',
    category: 'Project',
    requiredDataSources: ['projects', 'invoices', 'contracts'],
    optionalFilters: ['departmentId', 'contractId', 'status'],
    icon: 'FolderKanban',
    color: 'blue',
    processorFunction: 'processProjectStatusSummary',
  },
  {
    id: 'budget-vs-actual',
    name: 'Budget vs Actual',
    description: 'Compare budgeted amounts vs actual invoiced amounts by project',
    category: 'Project',
    requiredDataSources: ['projects', 'invoices'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId'],
    icon: 'Calculator',
    color: 'green',
    processorFunction: 'processBudgetVsActual',
  },
  {
    id: 'change-order-summary',
    name: 'Change Order Summary',
    description: 'Summary of all change orders by project with impact analysis',
    category: 'Project',
    requiredDataSources: ['projects', 'contracts'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId', 'contractId'],
    icon: 'FileEdit',
    color: 'yellow',
    processorFunction: 'processChangeOrderSummary',
  },
  {
    id: 'project-completion-forecast',
    name: 'Project Completion Forecast',
    description: 'Forecast project completion dates based on current progress and burn rate',
    category: 'Project',
    requiredDataSources: ['projects', 'invoices', 'timesheets'],
    optionalFilters: ['departmentId', 'projectId', 'status'],
    icon: 'TrendingUp',
    color: 'purple',
    processorFunction: 'processProjectCompletionForecast',
  },
  {
    id: 'project-hours-summary',
    name: 'Project Hours Summary',
    description: 'Total hours spent on each project with budget comparison',
    category: 'Project',
    requiredDataSources: ['projects', 'timesheets', 'invoices'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId'],
    icon: 'Clock',
    color: 'blue',
    processorFunction: 'processProjectHoursSummary',
  },
];
