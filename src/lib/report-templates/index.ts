/**
 * Report Templates Index
 * Central registry of all available report templates
 */

import { financialReports } from './financial-reports';
import { laborReports } from './labor-reports';
import { projectReports } from './project-reports';
import { complianceReports } from './compliance-reports';
import type { ReportTemplate } from './types';

export * from './types';

/**
 * All available report templates
 */
export const allReportTemplates: ReportTemplate[] = [
  ...financialReports,
  ...laborReports,
  ...projectReports,
  ...complianceReports,
];

/**
 * Get report templates by category
 */
export function getReportsByCategory(category: ReportTemplate['category']): ReportTemplate[] {
  return allReportTemplates.filter(report => report.category === category);
}

/**
 * Get a specific report template by ID
 */
export function getReportTemplate(id: string): ReportTemplate | undefined {
  return allReportTemplates.find(report => report.id === id);
}

/**
 * Get all report categories
 */
export function getReportCategories(): ReportTemplate['category'][] {
  return ['Financial', 'Labor', 'Project', 'Compliance'];
}

/**
 * Search report templates by name or description
 */
export function searchReportTemplates(query: string): ReportTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return allReportTemplates.filter(
    report =>
      report.name.toLowerCase().includes(lowercaseQuery) ||
      report.description.toLowerCase().includes(lowercaseQuery)
  );
}

export {
  financialReports,
  laborReports,
  projectReports,
  complianceReports,
};
