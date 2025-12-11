/**
 * Report Template Type Definitions
 */

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string | string[]; // Support single or multiple
  projectId?: string | string[]; // Support single or multiple
  contractId?: string | string[]; // Support single or multiple
  status?: string;
  employeeId?: string | string[]; // Support single or multiple
  companyId?: string | string[]; // Support single or multiple
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
