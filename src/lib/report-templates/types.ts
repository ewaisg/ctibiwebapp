/**
 * Report Template Type Definitions
 */

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  projectId?: string;
  contractId?: string;
  status?: string;
  employeeId?: string;
  companyId?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Financial' | 'Labor' | 'Project' | 'Compliance' | 'Executive' | 'Operations';
  requiredDataSources: string[];
  requiredFilters?: string[];
  optionalFilters?: string[];
  icon?: string;
  color?: string;
  processorFunction: string; // Name of the processor function to call
}

export interface ReportData {
  summary?: any;
  details?: any;
  items?: any[];
  charts?: any[];
  metadata?: {
    generatedAt: string;
    filters: ReportFilters;
    recordCount: number;
  };
}

export type ReportProcessor = (filters: ReportFilters, rawData?: any) => Promise<ReportData>;
