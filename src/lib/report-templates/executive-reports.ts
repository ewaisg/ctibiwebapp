/**
 * Executive Report Templates
 */

import type { ReportTemplate } from './types';

export const executiveReports: ReportTemplate[] = [
  {
    id: 'company-wide-summary',
    name: 'Company-Wide Summary',
    description: 'Executive dashboard with key metrics across all departments',
    category: 'Executive',
    requiredDataSources: ['invoices', 'projects', 'timesheets', 'departments'],
    requiredFilters: ['dateFrom', 'dateTo'],
    icon: 'LayoutDashboard',
    color: 'purple',
    processorFunction: 'processCompanyWideSummary',
  },
  {
    id: 'kpi-dashboard',
    name: 'Key Performance Indicators',
    description: 'Critical KPIs including revenue, utilization, and project completion rates',
    category: 'Executive',
    requiredDataSources: ['invoices', 'projects', 'timesheets', 'employees'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId'],
    icon: 'Activity',
    color: 'blue',
    processorFunction: 'processKPIDashboard',
  },
  {
    id: 'trend-analysis',
    name: 'Trend Analysis Report',
    description: 'Revenue, utilization, and profitability trends over time',
    category: 'Executive',
    requiredDataSources: ['invoices', 'timesheets', 'projects'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId'],
    icon: 'LineChart',
    color: 'green',
    processorFunction: 'processTrendAnalysis',
  },
  {
    id: 'department-comparison',
    name: 'Department Comparison',
    description: 'Side-by-side comparison of performance metrics across departments',
    category: 'Executive',
    requiredDataSources: ['departments', 'invoices', 'timesheets', 'projects'],
    requiredFilters: ['dateFrom', 'dateTo'],
    icon: 'BarChart3',
    color: 'orange',
    processorFunction: 'processDepartmentComparison',
  },
];
