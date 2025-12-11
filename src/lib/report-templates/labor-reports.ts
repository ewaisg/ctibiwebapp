/**
 * Labor Report Templates
 */

import type { ReportTemplate } from './types';

export const laborReports: ReportTemplate[] = [
  {
    id: 'direct-labor-hours-report',
    name: 'Direct Labor Hours Report',
    description: 'Summary of direct labor hours spent on billable projects. Supports All Time or Date Range options.',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'projects', 'employees'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'projectId', 'employeeId'],
    icon: 'Clock',
    color: 'blue',
    processorFunction: 'processDirectLaborHoursReport',
  },
  {
    id: 'indirect-labor-hours-report',
    name: 'Indirect Labor Hours Report',
    description: 'Summary of indirect labor hours spent on non-billable activities. Supports All Time or Date Range options.',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'employees', 'departments'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'employeeId'],
    icon: 'ClipboardList',
    color: 'orange',
    processorFunction: 'processIndirectLaborHoursReport',
  },
  {
    id: 'staff-utilization-summary',
    name: 'Staff Utilization Summary',
    description: 'Staff utilization rates showing billable vs non-billable hours by employee. Supports All Time or Date Range options.',
    category: 'Labor',
    requiredDataSources: ['timesheets', 'employees', 'departments'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId', 'employeeId'],
    icon: 'Users',
    color: 'green',
    processorFunction: 'processStaffUtilizationSummary',
  },
];
