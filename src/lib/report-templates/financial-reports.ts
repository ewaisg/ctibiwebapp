/**
 * Financial Report Templates
 */

import type { ReportTemplate } from './types';

export const financialReports: ReportTemplate[] = [
  {
    id: 'billing-report-by-department',
    name: 'Billing Report By Department',
    description: 'Invoice billing summary by department showing invoiced amounts and status. User can select all departments, one department, or multiple departments. Supports All Time or Date Range options.',
    category: 'Financial',
    requiredDataSources: ['invoices', 'departments'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId'],
    icon: 'Building2',
    color: 'blue',
    processorFunction: 'processBillingReportByDepartment',
  },
  {
    id: 'billing-report-by-project',
    name: 'Billing Report By Project',
    description: 'Invoice billing summary by project showing invoiced amounts and status. User can select all projects, one project, or multiple projects. Supports All Time or Date Range options.',
    category: 'Financial',
    requiredDataSources: ['invoices', 'projects'],
    optionalFilters: ['dateFrom', 'dateTo', 'projectId'],
    icon: 'FolderKanban',
    color: 'green',
    processorFunction: 'processBillingReportByProject',
  },
  {
    id: 'payment-report-by-department',
    name: 'Payment Report by Department',
    description: 'Payment tracking summary by department showing payment status (Pending, Partial, Paid, Overdue). User can select all departments, one department, or multiple departments. Supports All Time or Date Range options.',
    category: 'Financial',
    requiredDataSources: ['payment_tracking', 'departments'],
    optionalFilters: ['dateFrom', 'dateTo', 'departmentId'],
    icon: 'CreditCard',
    color: 'purple',
    processorFunction: 'processPaymentReportByDepartment',
  },
  {
    id: 'payment-report-by-project',
    name: 'Payment Report by Project',
    description: 'Payment tracking summary by project showing payment status (Pending, Partial, Paid, Overdue). User can select all projects, one project, or multiple projects. Supports All Time or Date Range options.',
    category: 'Financial',
    requiredDataSources: ['payment_tracking', 'projects'],
    optionalFilters: ['dateFrom', 'dateTo', 'projectId'],
    icon: 'Receipt',
    color: 'orange',
    processorFunction: 'processPaymentReportByProject',
  },
];
