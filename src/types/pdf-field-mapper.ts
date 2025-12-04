/**
 * PDF Field Mapper Type Definitions
 * For mapping PDF form fields to data sources
 */

/**
 * Extracted PDF field information
 */
export interface PdfFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'button' | 'signature';
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  page: number;
  defaultValue?: string;
  options?: string[]; // For dropdowns and radio buttons
  required?: boolean;
  readOnly?: boolean;
  multiline?: boolean;
  maxLength?: number;
}

/**
 * Field mapping - maps a PDF field to a data path
 */
export interface FieldMapping {
  pdfFieldName: string;
  dataPath: string; // e.g., "invoice.invoiceNumber", "project.projectName"
  transform?: 'date' | 'currency' | 'uppercase' | 'lowercase' | 'number' | 'boolean';
  format?: string; // e.g., "MM/dd/yyyy" for dates, "$0,0.00" for currency
  defaultValue?: string;
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
  };
}

/**
 * Table/repeating section configuration
 */
export interface TableMapping {
  id: string;
  name: string;
  dataPath: string; // e.g., "invoice.invoiceItems", "timesheet.entries"
  startRow: number; // Which row index to start filling (e.g., 1 for first data row)
  maxRows: number; // Maximum number of rows in the table
  columns: TableColumnMapping[];
}

/**
 * Table column mapping
 */
export interface TableColumnMapping {
  pdfFieldPattern: string; // e.g., "Item_Description_{row}", "Hours_{row}"
  dataPath: string; // e.g., "description", "hours" (relative to table data array)
  transform?: FieldMapping['transform'];
  format?: string;
  width?: number; // For layout reference
}

/**
 * Data source schema for field mapping suggestions
 */
export interface DataSourceSchema {
  collection: string;
  fields: DataSourceField[];
  relationships?: {
    field: string;
    collection: string;
    localField: string;
  }[];
}

/**
 * Individual field in data source
 */
export interface DataSourceField {
  path: string; // e.g., "invoiceNumber", "project.projectName"
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  label: string;
  example?: any;
  isArray?: boolean;
  children?: DataSourceField[]; // For nested objects
}

/**
 * Complete PDF template with field mappings
 */
export interface MappedPdfTemplate {
  id?: string;
  templateName: string;
  description?: string;
  templateType: 'Invoice' | 'Report' | 'CoverPage' | 'Custom';

  // PDF storage
  base64Data?: string;
  storageUrl?: string;

  // Extracted field information
  pdfFields: PdfFieldInfo[];

  // Field mappings
  fieldMappings: FieldMapping[];

  // Table mappings
  tableMappings: TableMapping[];

  // Data source configuration
  dataSource: {
    primaryCollection: string; // e.g., "invoices", "timesheets"
    requiredRelations?: string[]; // e.g., ["project", "contract", "department"]
  };

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;

  // Preview
  thumbnailUrl?: string;
  pageCount?: number;
  pageSize?: {
    width: number;
    height: number;
  };
}

/**
 * Field mapping suggestion from AI/heuristics
 */
export interface FieldMappingSuggestion {
  pdfFieldName: string;
  suggestedDataPath: string;
  confidence: number; // 0-1
  reason: string;
}
