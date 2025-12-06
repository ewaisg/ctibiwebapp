/**
 * Data Source Schemas for Visual Field Mapping
 *
 * This file defines the schema for each Firestore collection to enable
 * visual field selection in the form designer. Each schema maps directly
 * to the interfaces defined in src/types/index.ts
 */

export interface DataSourceField {
  path: string; // Field path (e.g., 'invoiceNumber', 'contract.contractName')
  label: string; // Human-readable label
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object' | 'reference';
  description?: string;
  example?: string;
  children?: DataSourceField[]; // For nested objects
  referenceCollection?: string; // For FlexibleReference fields
}

export interface CollectionSchema {
  collection: string;
  label: string;
  fields: DataSourceField[];
  relationships?: {
    field: string;
    collection: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-one';
  }[];
}

/**
 * CLIENT SCHEMA
 */
export const clientSchema: CollectionSchema = {
  collection: 'clients',
  label: 'Clients',
  fields: [
    { path: 'id', label: 'Client ID', type: 'string' },
    { path: 'clientName', label: 'Client Name', type: 'string', example: 'Acme Corporation' },
    { path: 'contactName', label: 'Contact Name', type: 'string', example: 'John Doe' },
    { path: 'emailAddress', label: 'Email Address', type: 'string', example: 'john@acme.com' },
    { path: 'phoneNumber', label: 'Phone Number', type: 'string', example: '555-1234' },
    { path: 'streetAddress', label: 'Street Address', type: 'string' },
    { path: 'city', label: 'City', type: 'string' },
    { path: 'state', label: 'State', type: 'string' },
    { path: 'zipCode', label: 'Zip Code', type: 'string' },
    { path: 'title', label: 'Title', type: 'string' },
  ],
};

/**
 * COMPANY SCHEMA
 */
export const companySchema: CollectionSchema = {
  collection: 'companies',
  label: 'Companies',
  fields: [
    { path: 'id', label: 'Company ID', type: 'string' },
    { path: 'companyName', label: 'Company Name', type: 'string', example: 'CTI Consulting' },
    { path: 'companyCode', label: 'Company Code', type: 'string', example: 'CTI' },
    { path: 'isSubconsultant', label: 'Is Subconsultant', type: 'boolean' },
    { path: 'isInactive', label: 'Is Inactive', type: 'boolean' },
    { path: 'diversityCertification', label: 'Diversity Certification', type: 'string', example: 'MWBE | WBE | SBE | None' },
    { path: 'createdAt', label: 'Created At', type: 'date' },
    { path: 'updatedAt', label: 'Updated At', type: 'date' },
  ],
};

/**
 * CONTRACT SCHEMA
 */
export const contractSchema: CollectionSchema = {
  collection: 'contracts',
  label: 'Contracts',
  fields: [
    { path: 'id', label: 'Contract ID', type: 'string' },
    { path: 'contractName', label: 'Contract Name', type: 'string', example: 'Annual Services Agreement' },
    { path: 'contractNumber', label: 'Contract Number', type: 'number', example: '2024-001' },
    { path: 'clientId', label: 'Client Reference', type: 'reference', referenceCollection: 'clients' },
    { path: 'clientName', label: 'Client Name', type: 'string', description: 'Denormalized from clients' },
    { path: 'contractEffectiveDate', label: 'Effective Date', type: 'date' },
    { path: 'contractCapacity', label: 'Contract Capacity', type: 'number' },
    { path: 'contractDuration', label: 'Contract Duration', type: 'string', example: '12 months' },
    { path: 'supplierContractNumber', label: 'Supplier Contract Number', type: 'string' },
    { path: 'mwbeGoalPercent', label: 'MWBE Goal Percent', type: 'number', example: '30' },
  ],
  relationships: [
    { field: 'clientId', collection: 'clients', type: 'many-to-one' },
  ],
};

/**
 * DIVISION SCHEMA
 */
export const divisionSchema: CollectionSchema = {
  collection: 'divisions',
  label: 'Divisions',
  fields: [
    { path: 'id', label: 'Division ID', type: 'string' },
    { path: 'divisionCode', label: 'Division Code', type: 'string', example: 'ENG' },
    { path: 'divisionName', label: 'Division Name', type: 'string', example: 'Engineering' },
    { path: 'isInactive', label: 'Is Inactive', type: 'boolean' },
  ],
};

/**
 * DEPARTMENT SCHEMA
 */
export const departmentSchema: CollectionSchema = {
  collection: 'departments',
  label: 'Departments',
  fields: [
    { path: 'id', label: 'Department ID', type: 'string' },
    { path: 'divisionId', label: 'Division Reference', type: 'reference', referenceCollection: 'divisions' },
    { path: 'departmentCode', label: 'Department Code', type: 'string', example: 'IT' },
    { path: 'departmentName', label: 'Department Name', type: 'string', example: 'Information Technology' },
    { path: 'isInactive', label: 'Is Inactive', type: 'boolean' },
  ],
  relationships: [
    { field: 'divisionId', collection: 'divisions', type: 'many-to-one' },
  ],
};

/**
 * SERVICE SCHEMA
 */
export const serviceSchema: CollectionSchema = {
  collection: 'services',
  label: 'Services',
  fields: [
    { path: 'id', label: 'Service ID', type: 'string' },
    { path: 'serviceName', label: 'Service Name', type: 'string', example: 'Software Development' },
    { path: 'serviceDescription', label: 'Service Description', type: 'string' },
    { path: 'isActive', label: 'Is Active', type: 'boolean' },
  ],
};

/**
 * PROJECT SCHEMA
 */
export const projectSchema: CollectionSchema = {
  collection: 'projects',
  label: 'Projects',
  fields: [
    { path: 'id', label: 'Project ID (PO Number)', type: 'string' },
    { path: 'projectName', label: 'Project Name', type: 'string', example: 'Website Redesign' },
    { path: 'poNumber', label: 'PO Number', type: 'string', example: 'PO-2024-001' },
    { path: 'contractId', label: 'Contract Reference', type: 'reference', referenceCollection: 'contracts' },
    { path: 'contractNumber', label: 'Contract Number', type: 'number', description: 'Denormalized from contracts' },
    { path: 'departmentId', label: 'Department Reference', type: 'reference', referenceCollection: 'departments' },
    { path: 'departmentCode', label: 'Department Code', type: 'string', description: 'Denormalized from departments' },
    { path: 'projectManager', label: 'Project Manager', type: 'string' },
    { path: 'approvingSupervisor', label: 'Approving Supervisor', type: 'string' },
    { path: 'ipmssiStaff', label: 'IPMSSI Staff', type: 'string' },
    { path: 'pmisNumber', label: 'PMIS Number', type: 'string' },
    { path: 'isInactive', label: 'Is Inactive', type: 'boolean' },
    { path: 'isComplete', label: 'Is Complete', type: 'boolean' },
    { path: 'originalPoAmount', label: 'Original PO Amount', type: 'number', example: '100000' },
    { path: 'changeOrderAmount', label: 'Change Order Amount', type: 'number', example: '10000' },
    { path: 'newPoAmount', label: 'New PO Amount', type: 'number', example: '110000' },
    { path: 'previouslyInvoicedAmount', label: 'Previously Invoiced Amount', type: 'number' },
    { path: 'remainingPoAmount', label: 'Remaining PO Amount', type: 'number' },
    { path: 'budgetedHours', label: 'Budgeted Hours', type: 'number' },
    { path: 'usedHours', label: 'Used Hours', type: 'number' },
    { path: 'remainingHours', label: 'Remaining Hours', type: 'number' },
  ],
  relationships: [
    { field: 'contractId', collection: 'contracts', type: 'many-to-one' },
    { field: 'departmentId', collection: 'departments', type: 'many-to-one' },
  ],
};

/**
 * EMPLOYEE SCHEMA
 */
export const employeeSchema: CollectionSchema = {
  collection: 'employees',
  label: 'Employees',
  fields: [
    { path: 'id', label: 'Employee ID', type: 'string' },
    { path: 'employeeId', label: 'Employee ID (Number)', type: 'number' },
    { path: 'employeeNumber', label: 'Employee Number', type: 'string' },
    { path: 'firstName', label: 'First Name', type: 'string' },
    { path: 'lastName', label: 'Last Name', type: 'string' },
    { path: 'middleInitial', label: 'Middle Initial', type: 'string' },
    { path: 'formalName', label: 'Formal Name', type: 'string', example: 'John A. Doe' },
    { path: 'role', label: 'Role', type: 'string' },
    { path: 'companyId', label: 'Company Reference', type: 'reference', referenceCollection: 'companies' },
    { path: 'companyName', label: 'Company Name', type: 'string', description: 'Denormalized from companies' },
    { path: 'divisionId', label: 'Division Reference', type: 'reference', referenceCollection: 'divisions' },
    { path: 'divisionCode', label: 'Division Code', type: 'string', description: 'Denormalized from divisions' },
    { path: 'departmentId', label: 'Department Reference', type: 'reference', referenceCollection: 'departments' },
    { path: 'departmentCode', label: 'Department Code', type: 'string', description: 'Denormalized from departments' },
    { path: 'employmentStatus', label: 'Employment Status', type: 'string', example: 'Active | Terminated' },
    { path: 'selfServiceEmail', label: 'Self Service Email', type: 'string' },
    { path: 'weeklyCapacityHours', label: 'Weekly Capacity Hours', type: 'number' },
    { path: 'isAdmin', label: 'Is Admin', type: 'boolean' },
    { path: 'isInternal', label: 'Is Internal', type: 'boolean' },
    { path: 'isSubconsultant', label: 'Is Subconsultant', type: 'boolean' },
  ],
  relationships: [
    { field: 'companyId', collection: 'companies', type: 'many-to-one' },
    { field: 'divisionId', collection: 'divisions', type: 'many-to-one' },
    { field: 'departmentId', collection: 'departments', type: 'many-to-one' },
  ],
};

/**
 * INVOICE SCHEMA
 */
export const invoiceSchema: CollectionSchema = {
  collection: 'invoices',
  label: 'Invoices',
  fields: [
    { path: 'id', label: 'Invoice ID', type: 'string' },
    { path: 'invoiceNumber', label: 'Invoice Number', type: 'string', example: 'INV-2024-001' },
    { path: 'status', label: 'Status', type: 'string', example: 'Draft | Submitted | Approved | Rejected' },
    { path: 'projectId', label: 'Project Reference', type: 'reference', referenceCollection: 'projects' },
    { path: 'poNumber', label: 'PO Number', type: 'string', description: 'Denormalized from projects' },
    { path: 'contractId', label: 'Contract Reference', type: 'reference', referenceCollection: 'contracts' },
    { path: 'contractNumber', label: 'Contract Number', type: 'number', description: 'Denormalized from contracts' },
    { path: 'pmisNumber', label: 'PMIS Number', type: 'string' },
    { path: 'invoiceTotal', label: 'Invoice Total', type: 'number', example: '50000' },
    { path: 'invoiceItemsTotal', label: 'Invoice Items Total', type: 'number' },
    { path: 'reimbursableExpensesTotal', label: 'Reimbursable Expenses Total', type: 'number' },
    { path: 'fromDate', label: 'From Date', type: 'date' },
    { path: 'toDate', label: 'To Date', type: 'date' },
    { path: 'dueDate', label: 'Due Date', type: 'date' },
    { path: 'createdAt', label: 'Created At', type: 'date' },
    { path: 'approvedAt', label: 'Approved At', type: 'date' },
    { path: 'approvedBy', label: 'Approved By Reference', type: 'reference', referenceCollection: 'users' },
    { path: 'approvedByName', label: 'Approved By Name', type: 'string' },
    { path: 'approvingSupervisor', label: 'Approving Supervisor', type: 'string' },
    { path: 'submitterName', label: 'Submitter Name', type: 'string' },
    { path: 'submitterCompany', label: 'Submitter Company', type: 'string' },
    { path: 'submitterCompanyId', label: 'Submitter Company Reference', type: 'reference', referenceCollection: 'companies' },
    { path: 'termOfWeek', label: 'Term of Week', type: 'string', example: '4-Weeks/5-Weeks' },
    { path: 'pdfFileName', label: 'PDF File Name', type: 'string' },
    { path: 'pdfUrl', label: 'PDF URL', type: 'string' },
    { path: 'directLaborReportFileName', label: 'Direct Labor Report File Name', type: 'string' },
    { path: 'directLaborReportUrl', label: 'Direct Labor Report URL', type: 'string' },
    // Nested objects
    {
      path: 'contractSummary',
      label: 'Contract Summary',
      type: 'object',
      children: [
        { path: 'contractSummary.originalContractPoAmount', label: 'Original Contract PO Amount', type: 'number' },
        { path: 'contractSummary.previouslyInvoiced', label: 'Previously Invoiced', type: 'number' },
        { path: 'contractSummary.remainingPoAmount', label: 'Remaining PO Amount', type: 'number' },
        { path: 'contractSummary.changeOrderAmount', label: 'Change Order Amount', type: 'number' },
        { path: 'contractSummary.newPoAmount', label: 'New PO Amount', type: 'number' },
        { path: 'contractSummary.budgetedHours', label: 'Budgeted Hours', type: 'number' },
        { path: 'contractSummary.usedHours', label: 'Used Hours', type: 'number' },
        { path: 'contractSummary.remainingHours', label: 'Remaining Hours', type: 'number' },
      ],
    },
    // Array of invoice items
    {
      path: 'invoiceItems',
      label: 'Invoice Items',
      type: 'array',
      description: 'Array of line items',
      children: [
        { path: 'invoiceItems[].employeeName', label: 'Employee Name', type: 'string' },
        { path: 'invoiceItems[].companyName', label: 'Company Name', type: 'string' },
        { path: 'invoiceItems[].serviceName', label: 'Service Name', type: 'string' },
        { path: 'invoiceItems[].hours', label: 'Hours', type: 'number' },
        { path: 'invoiceItems[].billingRate', label: 'Billing Rate', type: 'number' },
        { path: 'invoiceItems[].markdown', label: 'Markdown %', type: 'number' },
        { path: 'invoiceItems[].amount', label: 'Amount', type: 'number' },
        { path: 'invoiceItems[].notes', label: 'Notes', type: 'string' },
      ],
    },
    // Array of reimbursable expenses
    {
      path: 'reimbursableExpenses',
      label: 'Reimbursable Expenses',
      type: 'array',
      children: [
        { path: 'reimbursableExpenses[].description', label: 'Description', type: 'string' },
        { path: 'reimbursableExpenses[].amount', label: 'Amount', type: 'number' },
        { path: 'reimbursableExpenses[].date', label: 'Date', type: 'date' },
        { path: 'reimbursableExpenses[].companyName', label: 'Company Name', type: 'string' },
      ],
    },
  ],
  relationships: [
    { field: 'projectId', collection: 'projects', type: 'many-to-one' },
    { field: 'contractId', collection: 'contracts', type: 'many-to-one' },
    { field: 'approvedBy', collection: 'users', type: 'many-to-one' },
    { field: 'submitterCompanyId', collection: 'companies', type: 'many-to-one' },
  ],
};

/**
 * TIMESHEET SCHEMA (cti_timesheets)
 */
export const timesheetSchema: CollectionSchema = {
  collection: 'cti_timesheets',
  label: 'Timesheets',
  fields: [
    { path: 'id', label: 'Timesheet ID', type: 'string' },
    { path: 'employeeId', label: 'Employee ID', type: 'number' },
    { path: 'employeeNumber', label: 'Employee Number', type: 'string' },
    { path: 'employeeFirstName', label: 'Employee First Name', type: 'string' },
    { path: 'employeeLastName', label: 'Employee Last Name', type: 'string' },
    { path: 'timecardDate', label: 'Timecard Date', type: 'date' },
    { path: 'day', label: 'Day', type: 'string' },
    { path: 'startTime', label: 'Start Time', type: 'string' },
    { path: 'endTime', label: 'End Time', type: 'string' },
    { path: 'totalHoursActual', label: 'Total Hours Actual', type: 'number' },
    { path: 'notes', label: 'Notes', type: 'string' },
    {
      path: 'labors',
      label: 'Labors',
      type: 'array',
      children: [
        { path: 'labors[].laborTitle', label: 'Labor Title', type: 'string' },
        { path: 'labors[].laborValue', label: 'Labor Value', type: 'string' },
      ],
    },
    {
      path: 'payItems',
      label: 'Pay Items',
      type: 'array',
      children: [
        { path: 'payItems[].payItemCode', label: 'Pay Item Code', type: 'string' },
        { path: 'payItems[].payItemName', label: 'Pay Item Name', type: 'string' },
        { path: 'payItems[].payItemHours', label: 'Pay Item Hours', type: 'number' },
      ],
    },
  ],
};

/**
 * All schemas indexed by collection name
 */
export const allSchemas: Record<string, CollectionSchema> = {
  clients: clientSchema,
  companies: companySchema,
  contracts: contractSchema,
  divisions: divisionSchema,
  departments: departmentSchema,
  services: serviceSchema,
  projects: projectSchema,
  employees: employeeSchema,
  invoices: invoiceSchema,
  cti_timesheets: timesheetSchema,
};

/**
 * Get schema for a specific collection
 */
export function getSchemaForCollection(collection: string): CollectionSchema | undefined {
  return allSchemas[collection];
}

/**
 * Get all available collections
 */
export function getAllCollections(): string[] {
  return Object.keys(allSchemas);
}

/**
 * Get human-readable label for a collection
 */
export function getCollectionLabel(collection: string): string {
  return allSchemas[collection]?.label || collection;
}

/**
 * Search for fields across all collections
 */
export function searchFields(query: string): Array<{
  collection: string;
  collectionLabel: string;
  field: DataSourceField;
}> {
  const results: Array<{
    collection: string;
    collectionLabel: string;
    field: DataSourceField;
  }> = [];

  const lowerQuery = query.toLowerCase();

  Object.values(allSchemas).forEach(schema => {
    schema.fields.forEach(field => {
      if (
        field.path.toLowerCase().includes(lowerQuery) ||
        field.label.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          collection: schema.collection,
          collectionLabel: schema.label,
          field,
        });
      }

      // Search nested fields
      if (field.children) {
        field.children.forEach(child => {
          if (
            child.path.toLowerCase().includes(lowerQuery) ||
            child.label.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              collection: schema.collection,
              collectionLabel: schema.label,
              field: child,
            });
          }
        });
      }
    });
  });

  return results;
}
