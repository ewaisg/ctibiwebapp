/**
 * Financial Report Templates
 */

import type { ReportTemplate } from './types';

export const financialReports: ReportTemplate[] = [
  {
    id: 'revenue-by-department',
    name: 'Revenue by Department',
    description: 'Total revenue broken down by department with comparison to previous period',
    category: 'Financial',
    requiredDataSources: ['invoices', 'departments'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'status'],
    icon: 'DollarSign',
    color: 'green',
    processorFunction: 'processRevenueByDepartment',
  },
  {
    id: 'revenue-by-project',
    name: 'Revenue by Project',
    description: 'Revenue analysis by project showing invoiced amounts and payment status',
    category: 'Financial',
    requiredDataSources: ['invoices', 'projects'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId', 'status'],
    icon: 'TrendingUp',
    color: 'blue',
    processorFunction: 'processRevenueByProject',
  },
  {
    id: 'outstanding-invoices',
    name: 'Outstanding Invoices',
    description: 'List of approved invoices awaiting payment with aging analysis',
    category: 'Financial',
    requiredDataSources: ['invoices', 'projects'],
    optionalFilters: ['departmentId', 'projectId'],
    icon: 'AlertCircle',
    color: 'red',
    processorFunction: 'processOutstandingInvoices',
  },
  {
    id: 'payment-tracking',
    name: 'Payment Tracking Report',
    description: 'Track payments received and outstanding balances by client',
    category: 'Financial',
    requiredDataSources: ['invoices', 'projects', 'contracts'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['contractId', 'projectId'],
    icon: 'CreditCard',
    color: 'purple',
    processorFunction: 'processPaymentTracking',
  },
  {
    id: 'profitability-analysis',
    name: 'Profitability Analysis',
    description: 'Revenue vs labor costs analysis by project and department',
    category: 'Financial',
    requiredDataSources: ['invoices', 'timesheets', 'projects', 'employees'],
    requiredFilters: ['dateFrom', 'dateTo'],
    optionalFilters: ['departmentId', 'projectId'],
    icon: 'PieChart',
    color: 'orange',
    processorFunction: 'processProfitabilityAnalysis',
  },
];
