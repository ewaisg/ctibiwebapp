/**
 * Labor Report Templates
 */

import type { ReportTemplate } from './types';

export const laborReports: ReportTemplate[] = [
  {
    id: 'direct-labor-by-project',
    name: 'Direct Labor Hours by Project',
    description: 'Detailed breakdown of labor hours spent on each project with employee details',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'projects', 'employees'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId', 'employeeId'],
    icon: 'Clock',
    color: 'blue',
    processorFunction: 'processDirectLaborByProject',
  },
  {
    id: 'employee-utilization',
    name: 'Employee Utilization Report',
    description: 'Utilization rates for employees showing billable vs non-billable hours',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'employees', 'departments'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'employeeId'],
    icon: 'Users',
    color: 'green',
    processorFunction: 'processEmployeeUtilization',
  },
  {
    id: 'billable-vs-nonbillable',
    name: 'Billable vs Non-Billable Hours',
    description: 'Comparison of billable and non-billable hours by department and employee',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'departments', 'employees'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId'],
    icon: 'BarChart3',
    color: 'purple',
    processorFunction: 'processBillableVsNonBillable',
  },
  {
    id: 'overtime-analysis',
    name: 'Overtime Analysis',
    description: 'Analysis of overtime hours by employee and project',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'employees', 'projects'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId', 'employeeId'],
    icon: 'Clock',
    color: 'red',
    processorFunction: 'processOvertimeAnalysis',
  },
  {
    id: 'labor-cost-analysis',
    name: 'Labor Cost Analysis',
    description: 'Labor costs by project with billing rate comparisons',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'invoices', 'projects', 'employees'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId'],
    icon: 'DollarSign',
    color: 'orange',
    processorFunction: 'processLaborCostAnalysis',
  },
];
