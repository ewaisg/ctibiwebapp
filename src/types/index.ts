// The information in this file is the source of truth for all Firestore collections and their fields and must must not be changed. All code, functions, scripts, queries, etc. in the entire project files must conform to this structure. Anything that deviates from this structure is a bug and must be fixed immediately to match the defined interfaces below.

import { Timestamp } from 'firebase/firestore';
import { FlexibleReference } from '@/lib/document-reference-utils';


export interface Client {
  id: string; // auto-generated ID by Firestore
  clientName: string;
  contactName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  title?: string;
}

export interface Company {
  id: string; // Custom document ID matching the string value of companyCode which is unique to each company
  companyName: string;
  companyCode: string;
  isSubconsultant: boolean;
  isInactive: boolean;
  diversityCertification?: 'MWBE' | 'WBE' | 'SBE' | 'None';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Contract {
  id: string; // auto-generated ID by Firestore
  contractName: string;
  contractNumber: number;
  clientId: FlexibleReference; // Document Reference for 'clients' collection or string ID
  clientName: string; // Denormalized for easier querying
  contractEffectiveDate: Timestamp;
  contractCapacity: number;
  contractDuration: string;
  supplierContractNumber?: string;
  mwbeGoalPercent: number;
}

export interface Division {
  id: string; // Custom document ID matching the string value of divisionCode which is unique to each division
  divisionCode: string;
  divisionName: string;
  isInactive: boolean;
}

export interface Department {
  id: string; // Custom document ID matching the string value of departmentCode which is unique to each department
  divisionId: FlexibleReference; // Document Reference for 'divisions' collection or string ID
  departmentCode: string;
  departmentName: string;
  isInactive: boolean;
}

export interface CompanyRateTemplate {
    id:              string;  // auto-generated ID by Firestore
    companyId:       FlexibleReference; // Document Reference for 'companies' collection or string ID
    companyName:     string; // Denormalized for easier querying
    createdAt:       Timestamp;
    deletedAt?:      Timestamp;
    description:     string;
    isActive:        boolean;
    isSubconsultant: boolean; 
    services:        CompanyService[];
    updatedAt:       Timestamp;
    version:         number;
}

// Service definition for CompanyRateTemplate
export interface CompanyService {
    isActive:      boolean;
    markdownRate?: number;
    notes:         string;
    serviceId:     FlexibleReference; // Document Reference for 'services' collection or string ID
    serviceName:   string;
    standardRate?: number;
}

// Standalone Service collection
export interface Service {
    id: string; // auto-generated ID by Firestore
    serviceDescription: string;
    serviceName: string;
    isActive?: boolean;
}

// Rate collection for billing rates
export interface Rate {
    id: string; // auto-generated ID by Firestore
    companyId: FlexibleReference; // Document Reference for 'companies' collection or string ID
    serviceId: FlexibleReference; // Document Reference for 'services' collection or string ID
    rate: number;
}

export interface Project {
  isComplete?: boolean; // Optional field to mark project as complete
  id: string; // Custom document ID matching the string value of poNumber which is unique to each project
  projectName: string;
  contractId: FlexibleReference; // Document Reference for 'contracts' collection or string ID
  departmentId?: FlexibleReference; // Document Reference for 'departments' collection or string ID
  departmentCode?: string; // Denormalized for easier querying
  contractNumber?: number; // Denormalized for easier querying
  projectManager?: string;
  approvingSupervisor?: string;
  ipmssiStaff?: string;
  pmisNumber?: string;
  poNumber: string;
  isInactive: boolean;
  files?: {
    fileName: string;
    fileUrl: string;
  }[];
  originalPoAmount?: number;
  changeOrderAmount?: number;
  newPoAmount?: number;
  previouslyInvoicedAmount?: number;
  remainingPoAmount?: number;
  budgetedHours?: number;
  usedHours?: number;
  remainingHours?: number;
  assignedCompanies?: {
    companyId: FlexibleReference; // Document Reference for 'companies' collection or string ID
    companyName: string; // Denormalized for easier querying
    assignedEmployees?: {
      employeeId: FlexibleReference; // Document Reference for 'employees' collection or string ID
      employeeName: string; // Denormalized for easier querying
    }[];
    assignedServices?: {
      serviceId: FlexibleReference; // Document Reference for 'services' collection or string ID
      serviceName: string; // Denormalized for easier querying
      description?: string;
      billingRate: number;
      isActive?: boolean;
    }[];
  }[];
}

export interface Employee {
  id: string; // Custom document ID matching the string value of employeeId which is unique to each employee
  role?: string;
  divisionId?: FlexibleReference; // Document Reference for 'divisions' collection or string ID
  divisionCode?: string; // Denormalized for easier querying
  departmentId?: FlexibleReference; // Document Reference for 'departments' collection or string ID
  departmentCode?: string; // Denormalized for easier querying
  companyId: FlexibleReference; // Document ID from 'companies' collection or string ID
  companyName: string; // Denormalized for easier querying
  employeeId: number; // Integer ID from iSolved/imports/manual entry
  employeeNumber: string; // Internal String ID from CTI/manual entry/imports/iSolved and its different from employeeId but still unique to each employee
  employmentStatus: 'Active' | 'Terminated';
  firstName: string;
  lastName: string;
  middleInitial?: string;
  formalName: string;
  selfServiceEmail?: string; // Optional - only required for Prime/Internal employees
  weeklyCapacityHours: number;
  isAdmin: boolean;
  isInternal: boolean;
  isSubconsultant: boolean;
}

export interface Invoice {
  id?: string; // Auto-generated ID by Firestore
  approvedAt: Timestamp;
  approvedBy: FlexibleReference; // Document Reference for 'users' collection using uid or string ID
  approvedByName: string; // name of the user who approved the invoice, referenced using approvedBy
  approvingSupervisor: string;
  autofillSource: string;
  contractId: FlexibleReference; // Document Reference for 'contracts' collection or string ID
  departmentId?: string; // Path to the department document
  contractNumber: number; // Denormalized for easier querying
  contractSummary: ContractSummary;
  createdAt: Timestamp;
  directLaborReportFileName: string;
  directLaborReportUrl: string;
  dueDate: Timestamp;
  fromDate: Timestamp;
  history: History[];
  invoiceItems: InvoiceItem[];
  invoiceItemsTotal: number;
  invoiceNumber: string;
  invoiceTotal: number;
  isHistorical?: boolean; // Flag for manually entered historical invoices
  pdfFileName: string;
  pdfUrl: string;
  pdfVersions: PDFVersion[];
  pmisNumber: string;
  poNumber: string;
  projectId: FlexibleReference; // Document Reference for 'projects' collection which also matches the string ID of the poNumber or string ID
  reimbursableExpenses: ReimbursableExpense[];
  reimbursableExpensesTotal: number;
  status: string;
  submitterCompany: string; // Denormalized for easier querying
  submitterCompanyId: FlexibleReference; // Document Reference for 'companies' collection for the user who submitted the invoice or string ID
  submitterName: string; // name of the user who submitted the invoice
  termOfWeek: string; // e.g., "4-Weeks/5-Weeks"
  toDate: Timestamp;
  uploadedFiles: UploadedFile[];
  userId: FlexibleReference; // Document Reference for 'users' collection using uid or string ID

  // Added: Immutable approval snapshot and idempotency
  approvalSnapshot?: {
    total: number; // approvedTotals
    hours: number; // approvedHours
    createdAt: Timestamp;
    approvedBy: FlexibleReference; // user reference
    approvedByName: string; // denormalized name
  };
  approvalRunId?: string; // idempotency key for approval transaction

  // Added: PDF version counter to avoid duplicate version numbers
  pdfVersionCounter?: number;

  // Added: optional rejection notes surfaced to UI (authoritative copy is in history trail)
  rejectedNotes?: string;
}

export interface ContractSummary {
  originalContractPoAmount: number; // same as originalPoAmount in Project
  previouslyInvoiced: number; // same as previouslyInvoicedAmount in Project
  remainingPoAmount: number; // same as remainingPoAmount in Project
  changeOrderAmount: number; // original PO amount + change order amount - previously invoiced amount = remaining PO amount
  newPoAmount: number; // original PO amount + change order amount
  budgetedHours: number;
  usedHours: number; 
  remainingHours: number; // budgeted hours - used hours
}

export interface History {
  date: Timestamp;
  notes: string;
  status: string;
  userId: FlexibleReference; // Document Reference for 'users' collection or string ID
  userName: string; // name of the user who made this change, referenced using userId and from field 'displayName' in 'users' collection
}

export interface InvoiceItem {
  amount: number;
  billingRate: number;
  companyId: FlexibleReference; // Document Reference for 'companies' collection or string ID
  companyName?: string; // Denormalized for easier querying
  employeeId: FlexibleReference; // Document Reference for 'employees' collection or string ID
  employeeName?: string; // Denormalized for easier querying
  serviceId?: FlexibleReference; // Document Reference for 'services' collection or string ID
  serviceName?: string; // Denormalized for easier querying
  hours: number;
  markdown: number; // percentage markdown applied to the billing rate as an additive and NOT a discount
  notes: string;
}

// Financial Administration interfaces
export interface InvoiceTemplate {
  id: string; // auto-generated ID by Firestore
  templateName: string;
  templateType: 'Standard' | 'MWBE' | 'Custom';
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GlobalRate {
  id: string; // auto-generated ID by Firestore
  serviceId: FlexibleReference; // Document Reference for 'services' collection or string ID
  serviceName: string; // Denormalized for easier querying
  standardRate: number;
  effectiveDate: Timestamp;
  expirationDate?: Timestamp;
  approvedBy: FlexibleReference; // Document Reference for 'users' collection or string ID
  approvedByName: string; // Denormalized for easier querying
  approvalDate: Timestamp;
  isActive: boolean;
  notes?: string;
}

export interface PaymentTracking {
  id: string; // auto-generated ID by Firestore
  invoiceId: FlexibleReference; // Document Reference for 'invoices' collection or string ID
  invoiceNumber: string; // Denormalized for easier querying
  projectId: FlexibleReference; // Document Reference for 'projects' collection or string ID
  departmentId?: string; // Path to the department document
  projectName: string; // Denormalized for easier querying
  invoiceAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentDate?: Timestamp;
  paymentMethod?: 'Check' | 'ACH' | 'Wire' | 'Credit Card';
  paymentReference?: string;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  dueDate: Timestamp;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FinancialReport {
  id: string; // auto-generated ID by Firestore
  reportName: string;
  reportType: 'Revenue' | 'Outstanding' | 'Utilization' | 'Profitability';
  dateRange: {
    startDate: Timestamp;
    endDate: Timestamp;
  };
  filters: {
    companyIds?: string[];
    projectIds?: string[];
    departmentIds?: string[];
  };
  data: any; // Report-specific data structure
  generatedBy: FlexibleReference; // Document Reference for 'users' collection or string ID
  generatedByName: string; // Denormalized for easier querying
  generatedAt: Timestamp;
}

export interface PdfTemplate {
  id: string; // auto-generated ID by Firestore
  templateName: string;
  templateType: 'Invoice' | 'CoverPage' | 'Report' | 'Custom';
  reportType?: 'General' | 'DateRange'; // New field for report type
  category?: string; // New field for report category
  base64Data: string;
  storageUrl?: string; // For large templates stored in Firebase Storage
  fieldMappings: TemplateFieldMapping[];
  previewImageUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: FlexibleReference; // user reference
  createdByName: string; // Denormalized for easier querying
  manualOnly?: boolean; // When true, UI is manual-first and mapping uses only manualData
}

export interface TemplateFieldMapping {
  fieldName: string; // PDF form field name
  sourceCollection: string; // e.g., "invoice", "project", "contract", "department"; use "manual" for user-entered fields
  sourceField: string; // e.g., "invoiceNumber", "projectName", "contractEffectiveDate"
  relationshipPath?: string; // e.g., "invoice.contractId -> contract.id" for cross-collection lookups
  isRequired: boolean;
  defaultValue?: string;
  fieldType?: 'text' | 'number' | 'date' | 'currency';
  // Legacy support
  dataPath?: string; // Deprecated, use sourceCollection.sourceField instead
  // UI hints (optional) for dynamic wizards/forms
  uiLabel?: string;
  inputType?: 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'checkbox' | 'signature' | 'image';
  placeholder?: string;
  helpText?: string;
  section?: string;
  order?: number;
  options?: string[]; // for select inputs (static)
  optionsSource?: { // dynamic options for selects
    type: 'static' | 'collection';
    staticOptions?: string[];
    collection?: string; // e.g., 'companies', 'projects'
    labelField?: string; // e.g., 'companyName'
    valueField?: string; // e.g., 'id'
    filterField?: string;
    filterValue?: string;
  };
  validation?: {
    pattern?: string; // regex
    min?: number;
    max?: number;
    required?: boolean; // override isRequired for UI
  };
}

export interface TemplateAssignment {
  id: string; // auto-generated ID by Firestore
  assignmentType: 'Contract' | 'Department' | 'Project' | 'Global';
  assignmentId: FlexibleReference; // contract/department/project ID or 'global'
  assignmentName: string; // Denormalized name for easier querying
  templateId: FlexibleReference; // template reference
  templateName: string; // Denormalized for easier querying
  templateType: 'Invoice' | 'CoverPage' | 'Report' | 'Custom';
  templateSource?: 'pdf' | 'visual'; // Optional: source of the template
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: FlexibleReference; // user reference
  createdByName: string; // Denormalized for easier querying
}

// ============================================================================
// EXTENDED PDF TEMPLATE TYPES (Syncfusion Form Designer Support)
// ============================================================================

/**
 * Syncfusion form field extracted from PDF or created in Form Designer
 * Maps to Syncfusion ej2-pdfviewer form field types
 */
export interface SyncfusionFormField {
  name: string;
  type: 'Textbox' | 'Checkbox' | 'RadioButton' | 'DropDown' | 'ListBox' | 'SignatureField' | 'Password' | 'InitialField';
  bounds: {
    X: number;
    Y: number;
    Width: number;
    Height: number;
  };
  pageNumber: number;
  isRequired?: boolean;
  isReadOnly?: boolean;
  defaultValue?: string;
  maxLength?: number;
  // For dropdown/listbox/radio
  options?: string[];
  // For signature
  signatureType?: string;
}

/**
 * Table mapping for dynamic repeating data (e.g., invoice line items)
 * Maps array data to PDF form fields in a tabular pattern
 */
export interface TableMapping {
  id: string;
  name: string;
  dataPath: string; // e.g., 'invoiceItems' for invoice.invoiceItems array
  sourceCollection: string; // e.g., 'invoices'
  startY: number; // Y coordinate where table starts
  rowHeight: number; // Height of each row in points
  maxRows: number; // Maximum number of rows to render
  columns: TableColumnMapping[];
}

/**
 * Individual column in a table mapping
 */
export interface TableColumnMapping {
  formFieldPattern: string; // e.g., 'item_description_{row}' where {row} is replaced with row number
  dataField: string; // Field name in the array item, e.g., 'description' for item.description
  width?: number; // Column width for reference
  transform?: TemplateFieldMapping['fieldType']; // Optional transform: 'date' | 'currency' | etc.
  format?: string; // Format string for transforms, e.g., 'MM/DD/YYYY' or '$0,0.00'
}

/**
 * Enhanced data source configuration for form generation
 */
export interface DataSourceConfig {
  primaryCollection: string; // Main collection: 'invoices', 'projects', 'contracts', etc.
  joins?: DataJoin[]; // Related collections to fetch
  defaultFilters?: DataFilter[]; // Default filters when selecting data
}

/**
 * Join configuration for fetching related collections
 */
export interface DataJoin {
  collection: string; // Collection to join: 'contracts', 'projects', 'departments', etc.
  localField: string; // Field in primary collection: 'contractId', 'projectId', etc.
  foreignField: string; // Field in joined collection: typically 'id'
  alias: string; // Alias for joined data: 'contract', 'project', etc.
  required?: boolean; // Whether join is required
}

/**
 * Filter configuration for data selection
 */
export interface DataFilter {
  field: string; // Field to filter on
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'array-contains' | 'array-contains-any';
  value: any; // Filter value
}

/**
 * Extended assignment with more granular control
 * Extends TemplateAssignment with additional assignment levels
 */
export interface ExtendedTemplateAssignment extends TemplateAssignment {
  assignmentLevel?: 'type' | 'entity' | 'relationship'; // More granular than assignmentType
  priority?: number; // Higher number = higher priority (entity > relationship > type)

  // For relationship-level assignments (e.g., "all invoices for client X")
  relationshipFilters?: {
    field: string; // e.g., 'clientId'
    operator: '==' | '!=' | 'in';
    value: string | string[]; // e.g., 'client123' or ['client1', 'client2']
  }[];
}

/**
 * Extended PdfTemplate with Syncfusion form fields and enhanced features
 * Backward compatible - all new fields are optional
 */
export interface ExtendedPdfTemplate extends PdfTemplate {
  // Syncfusion form fields (optional - for forms created/edited with Syncfusion Form Designer)
  syncfusionFormFields?: SyncfusionFormField[];

  // Table mappings for dynamic repeating data
  tableMappings?: TableMapping[];

  // Enhanced data source configuration
  dataSourceConfig?: DataSourceConfig;

  // Metadata
  pageCount?: number;
  version?: number; // Template version for tracking changes
}

// User role and permission types
export type UserRole = 'Admin' | 'Prime' | 'Subconsultant';



// Form version of InvoiceItem (used in UI)
export interface InvoiceItemForm {
  amount: number;
  billingRate: number;
  companyId: FlexibleReference; // String ID for form input, converted to DocumentReference when saving
  companyName: string; // Denormalized for easier querying
  employeeId: FlexibleReference; // String ID for form input, converted to DocumentReference when saving
  employeeName: string; // Denormalized for easier querying
  hours: number;
  markdown: number;
  notes: string;
  serviceId: FlexibleReference; // String ID for form input, converted to DocumentReference when saving
  serviceName?: string; // Denormalized for easier querying
}

export interface PDFVersion {
  createdAt: Timestamp;
  uid: FlexibleReference; // Document Reference for 'users' collection or string ID
  createdByName: string; // name of the user who created this version, referenced using uid and from field 'displayName' in 'users' collection
  fileName: string;
  notes: string;
  type: string;
  url: string;
  version: number;
}

export interface ReimbursableExpense {
  amount: number;
  companyId: FlexibleReference; // Document Reference for 'companies' collection or string ID
  companyName: string; // Denormalized for easier querying
  date: Timestamp;
  description: string;
}

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  uploadedAt?: Timestamp;
}

export interface CtiTimesheet {
  id: string; // custom ID
  employeeId: number; // this matches the field 'employeeId' in the collection 'employees', which is a number.
  employeeNumber: string; // this matches the field 'employeeNumber' in the collection 'employees', which is a string.
  employeeFirstName: string;
  employeeLastName: string;
  timecardDate: Timestamp;
  day?: string;
  startTime?: string;
  endTime?: string;
  totalHoursActual: number; // Sum of all payItemHours reported for the day
  labors: { laborTitle: string; laborValue: string; }[];
  payItems: { payItemCode: string; payItemHours: number; payItemName: string; }[];
  notes?: string;
}

// Timesheet Pay Item Code Classifications
export const BILLABLE_PAY_ITEM_CODES = ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP'];
export const NON_BILLABLE_PAY_ITEM_CODES = ['SAL', 'CTI_REG', 'CTI_OVT', '1099COMP (only when linked to NON_BILLABLE_DEPARTMENT_CODES)'];
export const PTO_PAY_ITEM_CODES = ['PTO', 'HOL', 'FLTHOL', 'BER', 'JURY', 'LV_UNPD', 'MIL'];

// Non-billable Customer/Department codes 
export const NON_BILLABLE_DEPARTMENT_CODES = ['100', '500', '900', '905', '910', '915', '920'];

export type LaborTitle = 'Division' | 'Customer' | 'Department' | 'Project/Categories' | 'Project/Job'; // customer is the same as department, Project/Categories is the same as Project/Job.

export interface ResourceAllocation {
  id: string; // auto-generated ID by Firestore
  employeeId: FlexibleReference; // Document Reference for 'employees' collection or string ID
  projectId: FlexibleReference; // Document Reference for 'projects' collection or string ID
  serviceId?: FlexibleReference; // Document Reference for 'services' collection or string ID
  weekStartDate: Timestamp; // always starts on a Sunday
  scheduledHours: number;
}

// Assignment interface for manpower planning (alias for ResourceAllocation with additional fields)
export interface Assignment {
  id: string; // auto-generated ID by Firestore
  employeeId: FlexibleReference; // Employee ID as string for UI
  projectId: FlexibleReference; // Project ID as string for UI
  serviceId?: FlexibleReference; // Service ID as string for UI
  serviceTitle?: string; // Service name for display
  weekStartDate: Timestamp | Date | string; // Flexible date handling
  scheduledHours: number;
}


export interface User {
  uid: string; // From Firebase Auth (user's unique ID)
  displayName: string; 
  email: string;
  role: UserRole; // Admin, Prime, Subconsultant
  companyId: FlexibleReference; // Document Reference for 'companies' collection or string ID
  isActive: boolean;
  lastLoginAt?: Timestamp; // Last login timestamp
  createdAt?: Timestamp; // Account creation timestamp
  isOnboardingComplete?: boolean; // Onboarding completion status
  onboardingCompletedAt?: Timestamp; // Onboarding completion timestamp
  profileImageUrl?: string; // URL of the user's profile image
  bio?: string; // User's bio or description
  phone?: string;
  theme?: 'light' | 'dark' | 'system'; // User's preferred theme
}

// Role-based permissions (we'll expand this as needed)
export interface RolePermissions {
  canAccessDashboard: boolean;
  canAccessProjects: boolean;
  canAccessInvoices: boolean;
  canAccessTimesheet: boolean;
  canAccessManpower: boolean;
  canAccessUtilization: boolean;
  canAccessAdmin: boolean;
}

// Permission mapping by role
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  Admin: {
    canAccessDashboard: true,
    canAccessProjects: true,
    canAccessInvoices: true,
    canAccessTimesheet: true,
    canAccessManpower: true,
    canAccessUtilization: true,
    canAccessAdmin: true,
  },
  // Prime = Internal
  Prime: {
    canAccessDashboard: true,
    canAccessProjects: true,
    canAccessInvoices: true,
    canAccessTimesheet: true,
    canAccessManpower: true,
    canAccessUtilization: true,
    canAccessAdmin: false,
  },
  Subconsultant: {
    canAccessInvoices: true, // view and create invoices only of their own submissions
    canAccessDashboard: false,
    canAccessProjects: false,
    canAccessTimesheet: false,
    canAccessManpower: false,
    canAccessUtilization: false,
    canAccessAdmin: false,
  },
};


export interface IsolvedTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface StoredTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface IsolvedTimecardEntry {
  inPunchDateTimeEffective: string;
  timecardDate: string;
  totalHoursActual: number;
  labors: { laborTitle: string; laborValue: string; }[];
  payItems: { payItemCode: string; payItemHours: number; payItemName: string; }[];
}

export type TimelineView = 'week' | 'month' | 'quarter' | 'year';

export interface DashboardData {
  kpi: {
    unbillableHours: number; 
    billableHours: number;
    totalHours: number;
    utilization: number; // Percentage of billable hours / total hours
    totalInvoicedAmount: number;
    totalPaidAmount: number;
    totalOutstandingAmount: number;
  };
  timeAllocationByCompany: {
    companyId: FlexibleReference; // Document Reference for 'companies' collection or string ID
    companyName: string; // Denormalized for easier querying
    billableHours: number;
    invoicedAmount: number;
  }[];
  departmentalUtilization: {
    name: string; // departmentName
    departmentId: FlexibleReference; // Document Reference for 'departments' collection or string ID
    billableHours: number;
    unbillableHours: number;
    totalHours: number;
    Holiday: number;
    unpaidHours: number;
  }[];
  billableTrends: {
    date: Timestamp;
    billableHours: number;
    unbillableHours: number;
  }[];
  projectHealth: {
    name: string; // projectName
    projectId: FlexibleReference; // Document Reference for 'projects' collection or string ID
    originalPoAmount: number;
    previouslyInvoicedAmount: number;
    utilization: number; // Percentage of invoiced amount / original PO amount
    remainingPoAmount: number;
  }[];
  topEmployees: {
    name: string; // formalName
    employeeId: FlexibleReference; // Document Reference for 'employees' collection or string ID
    billableHours: number;
    unbillableHours: number;
    utilization: number; // Percentage of billable hours / total hours
  }[];
}

export interface DetailedUtilizationRow {
  employee: {
    id: string; // same as employeeId below
    formalName: string; // formalName from employees collection
    employeeId: FlexibleReference; // Document Reference for 'employees' collection or string ID
    weeklyCapacityHours: number; // Weekly capacity hours from employees collection
  };
  weeklyMetrics: {
    billableHours: number;
    scheduledHours: number;
    utilization: number; // Percentage of billable hours / weekly capacity hours
  }[];
}

export interface UtilizationData {
  annual: { week: number; capacity: number; scheduled: number; actual: number; }[];
  weekly: { week: number; scheduled: number; actual: number; utilization: number }[];
}

export interface AnalyseUtilizationDataInput {
  year: string;
  filterDescription: string;
  annualData: string;
  weeklyData: string;
  detailedBreakdown: string;
}

export interface AnalyseUtilizationDataOutput {
  executiveSummary: string;
  kpiAnalysis: {
    overallUtilization: {
      value: number;
      comment: string;
    };
    scheduleVariance: {
      value: number;
      comment: string;
    };
    totalHours: {
      scheduled: number;
      actual: number;
    };
  };
  keyFindings: Array<{
    title: string;
    description: string;
    severity: 'Positive' | 'Neutral' | 'Warning' | 'Critical';
  }>;
  recommendations: string[];
}

export interface Role {
  id: string; // auto-generated ID by Firestore
  name: string; // role name
  description: string; // role description
  permissions: string[]; // list of permissions associated with the role
}

// Once more, the information in this file is the source of truth for all Firestore collections and their fields and must must not be changed. All code, functions, scripts, queries, etc. in the entire project files must conform to this structure. Anything that deviates from this structure is a bug and must be fixed immediately to match the defined interfaces above.