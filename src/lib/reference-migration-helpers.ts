import { 
  extractId, 
  findByReference, 
  filterByReference, 
  convertReferencesToIds,
  convertIdsToReferences,
  referencesEqual,
  FlexibleReference 
} from '@/lib/document-reference-utils';
import type { 
  Employee, 
  Company, 
  Project, 
  Department, 
  User,
  Contract,
  Invoice
} from '@/types';

/**
 * Migration helpers for common operations that were previously done manually
 * These functions help standardize the way we handle document references
 */

/**
 * Helper to safely extract company ID from employee
 */
export function getEmployeeCompanyId(employee: Employee): string | undefined {
  return extractId(employee.companyId);
}

/**
 * Helper to safely extract department ID from employee or project
 */
export function getDepartmentId(item: Employee | Project): string | undefined {
  return extractId(item.departmentId);
}

/**
 * Helper to safely extract division ID from employee or department
 */
export function getDivisionId(item: Employee | Department): string | undefined {
  return extractId('divisionId' in item ? item.divisionId : undefined);
}

/**
 * Helper to find company by comparing with employee's companyId
 */
export function findEmployeeCompany(employee: Employee, companies: Company[]): Company | undefined {
  return findByReference(companies, (c) => c.id, employee.companyId);
}

/**
 * Helper to find department by comparing with employee's departmentId
 */
export function findEmployeeDepartment(employee: Employee, departments: Department[]): Department | undefined {
  return findByReference(departments, (d) => d.id, employee.departmentId);
}

/**
 * Helper to find project department
 */
export function findProjectDepartment(project: Project, departments: Department[]): Department | undefined {
  return findByReference(departments, (d) => d.id, project.departmentId);
}

/**
 * Helper to find contract by project's contractId
 */
export function findProjectContract(project: Project, contracts: Contract[]): Contract | undefined {
  return findByReference(contracts, (c) => c.id, project.contractId);
}

/**
 * Helper to filter employees by company
 */
export function filterEmployeesByCompany(employees: Employee[], companyId: FlexibleReference): Employee[] {
  return filterByReference(employees, (e) => e.companyId, companyId);
}

/**
 * Helper to filter projects by department
 */
export function filterProjectsByDepartment(projects: Project[], departmentId: FlexibleReference): Project[] {
  return filterByReference(projects, (p) => p.departmentId, departmentId);
}

/**
 * Helper to check if user belongs to a specific company
 */
export function isUserInCompany(user: User, companyId: FlexibleReference): boolean {
  return referencesEqual(user.companyId, companyId);
}

/**
 * Helper for invoice item processing - extract all reference IDs
 */
export function processInvoiceItemReferences(invoiceItem: any): {
  companyId: string | undefined;
  employeeId: string | undefined;
  serviceId: string | undefined;
} {
  return {
    companyId: extractId(invoiceItem.companyId),
    employeeId: extractId(invoiceItem.employeeId),
    serviceId: extractId(invoiceItem.serviceId),
  };
}

/**
 * Helper for invoice processing - extract main reference IDs
 */
export function processInvoiceReferences(invoice: Invoice): {
  projectId: string | undefined;
  userId: string | undefined;
  submitterCompanyId: string | undefined;
  contractId: string | undefined;
  approvedBy: string | undefined;
} {
  return {
    projectId: extractId(invoice.projectId),
    userId: extractId(invoice.userId),
    submitterCompanyId: extractId(invoice.submitterCompanyId),
    contractId: extractId(invoice.contractId),
    approvedBy: extractId(invoice.approvedBy),
  };
}

/**
 * Helper for project assigned companies processing
 */
export function processProjectAssignedCompanies(project: Project): Array<{
  companyId: string | undefined;
  companyName: string;
  assignedEmployeeIds: string[];
  assignedServiceIds: string[];
}> {
  if (!project.assignedCompanies) return [];

  return project.assignedCompanies.map(ac => ({
    companyId: extractId(ac.companyId),
    companyName: ac.companyName,
    assignedEmployeeIds: ac.assignedEmployees?.map(ae => extractId(ae.employeeId)).filter(id => id !== undefined) as string[] || [],
    assignedServiceIds: ac.assignedServices?.map(as => extractId(as.serviceId)).filter(id => id !== undefined) as string[] || [],
  }));
}

/**
 * Helper for form data conversion - converts all reference fields to strings
 */
export function convertFormDataReferencesToIds<T extends Record<string, any>>(
  formData: T,
  referenceFields: (keyof T)[]
): T {
  return convertReferencesToIds(formData, referenceFields);
}

/**
 * Helper for Firestore submission - converts string IDs to DocumentReferences
 */
export function prepareDataForFirestore<T extends Record<string, any>>(
  data: T,
  referenceConfig: Record<keyof T, string>
): T {
  return convertIdsToReferences(data, referenceConfig);
}

/**
 * Common reference field configurations for different entities
 */
export const REFERENCE_CONFIGS = {
  employee: {
    companyId: 'companies',
    departmentId: 'departments',
    divisionId: 'divisions',
  },
  project: {
    contractId: 'contracts',
    departmentId: 'departments',
  },
  invoice: {
    projectId: 'projects',
    userId: 'users',
    submitterCompanyId: 'companies',
    contractId: 'contracts',
    approvedBy: 'users',
  },
  invoiceItem: {
    companyId: 'companies',
    employeeId: 'employees',
    serviceId: 'services',
  },
  user: {
    companyId: 'companies',
  },
  department: {
    divisionId: 'divisions',
  },
  contract: {
    clientId: 'clients',
  },
} as const;

/**
 * Utility to quickly prepare common entities for Firestore
 */
export function prepareEmployeeForFirestore(employee: Partial<Employee>): Partial<Employee> {
  return convertIdsToReferences(employee, REFERENCE_CONFIGS.employee as any);
}

export function prepareProjectForFirestore(project: Partial<Project>): Partial<Project> {
  return convertIdsToReferences(project, REFERENCE_CONFIGS.project as any);
}

export function prepareInvoiceForFirestore(invoice: Partial<Invoice>): Partial<Invoice> {
  return convertIdsToReferences(invoice, REFERENCE_CONFIGS.invoice as any);
}

export function prepareUserForFirestore(user: Partial<User>): Partial<User> {
  return convertIdsToReferences(user, REFERENCE_CONFIGS.user as any);
}
