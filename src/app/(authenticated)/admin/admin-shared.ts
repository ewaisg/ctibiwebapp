import * as XLSX from 'xlsx';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { randomInt } from 'crypto';
import { sanitizeForLog } from '@/lib/security-utils';
import type { UserRole, Company, Project } from '@/types';

export { adminDb, Timestamp, sanitizeForLog };

// TypeScript Interfaces
export interface UserFormData {
  displayName: string;
  email: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  phone?: string;
  bio?: string;
  password?: string;
}

export interface UserImportResult {
  success: boolean;
  message: string;
  processed?: number;
  duplicates?: number;
  errors?: number;
  users?: any[];
}

export interface UserActionResult {
  success: boolean;
  message: string;
  user?: any;
  tempPassword?: string;
}

export interface UserColumnMapping {
  DISPLAY_NAME?: number;
  EMAIL?: number;
  ROLE?: number;
  COMPANY_ID?: number;
  PHONE?: number;
  BIO?: number;
  IS_ACTIVE?: number;
}

// Sanitize project data to enforce schema compliance and remove non-serializable objects
export function sanitizeProjectData(rawProject: any): Project {
  const allowedFields: (keyof Project)[] = [
    'isComplete', 'id', 'projectName', 'contractId', 'departmentId', 'departmentCode',
    'contractNumber', 'projectManager', 'approvingSupervisor', 'ipmssiStaff', 'pmisNumber',
    'poNumber', 'isInactive', 'files', 'originalPoAmount', 'changeOrderAmount', 'newPoAmount',
    'previouslyInvoicedAmount', 'remainingPoAmount', 'budgetedHours', 'usedHours', 'remainingHours',
    'assignedCompanies'
  ];

  const sanitized: any = {};

  allowedFields.forEach(field => {
    if (rawProject[field] !== undefined) {
      sanitized[field] = rawProject[field];
    }
  });

  // Convert DocumentReferences to string IDs
  if (sanitized.contractId && typeof sanitized.contractId === 'object' && sanitized.contractId.id) {
    sanitized.contractId = sanitized.contractId.id;
  }
  if (sanitized.departmentId && typeof sanitized.departmentId === 'object' && sanitized.departmentId.id) {
    sanitized.departmentId = sanitized.departmentId.id;
  }

  // Sanitize assignedCompanies array
  if (Array.isArray(sanitized.assignedCompanies)) {
    sanitized.assignedCompanies = sanitized.assignedCompanies.map((company: any) => {
      const sanitizedCompany: any = {
        companyId: typeof company.companyId === 'object' && company.companyId.id ? company.companyId.id : company.companyId,
        companyName: company.companyName
      };

      if (Array.isArray(company.assignedEmployees)) {
        sanitizedCompany.assignedEmployees = company.assignedEmployees.map((emp: any) => ({
          employeeId: typeof emp.employeeId === 'object' && emp.employeeId.id ? emp.employeeId.id : emp.employeeId,
          employeeName: emp.employeeName
        }));
      }

      if (Array.isArray(company.assignedServices)) {
        sanitizedCompany.assignedServices = company.assignedServices.map((svc: any) => ({
          serviceId: typeof svc.serviceId === 'object' && svc.serviceId.id ? svc.serviceId.id : svc.serviceId,
          serviceName: svc.serviceName,
          description: svc.description || '',
          billingRate: svc.billingRate || 0
        }));
      }

      return sanitizedCompany;
    });
  }

  // Sanitize files array
  if (Array.isArray(sanitized.files)) {
    sanitized.files = sanitized.files
      .filter((f: any) => f && f.fileName && f.fileUrl)
      .map((f: any) => ({
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        filePath: f.filePath,
        size: typeof f.size === 'number' ? f.size : undefined,
        type: typeof f.type === 'string' ? f.type : undefined,
        uploadedAt: typeof f.uploadedAt === 'string' ? f.uploadedAt : undefined,
      }));
  }

  return sanitized as Project;
}

// Excel import helpers
export function discoverUserColumnMapping(worksheet: XLSX.WorkSheet): UserColumnMapping {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const headers: string[] = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    const headerValue = cell ? (cell.v || '').toString().trim() : '';
    headers.push(headerValue);
  }

  console.log('📋 Found user headers:', headers);

  const columnMapping: UserColumnMapping = {};

  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase();

    if (lowerHeader.includes('name') || lowerHeader === 'displayname') {
      columnMapping.DISPLAY_NAME = index;
    } else if (lowerHeader.includes('email')) {
      columnMapping.EMAIL = index;
    } else if (lowerHeader.includes('role')) {
      columnMapping.ROLE = index;
    } else if (lowerHeader.includes('company') && lowerHeader.includes('id')) {
      columnMapping.COMPANY_ID = index;
    } else if (lowerHeader.includes('phone')) {
      columnMapping.PHONE = index;
    } else if (lowerHeader.includes('bio')) {
      columnMapping.BIO = index;
    } else if (lowerHeader.includes('active')) {
      columnMapping.IS_ACTIVE = index;
    }
  });

  console.log('📋 User Column Mapping:', columnMapping);
  return columnMapping;
}

export function getCellValue(worksheet: XLSX.WorkSheet, cellAddress: string): unknown {
  const cell = worksheet[cellAddress];
  return cell ? cell.v : undefined;
}

// User helpers
export async function checkUserExists(email: string): Promise<boolean> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const userSnapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    return !userSnapshot.empty;
  } catch (error) {
    console.error('Error checking user existence:', sanitizeForLog(error));
    return false;
  }
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const companyDoc = await adminDb!.collection('companies').doc(companyId).get();
    if (companyDoc.exists) {
      return { id: companyDoc.id, ...companyDoc.data() } as Company;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company:', sanitizeForLog(error));
    return null;
  }
}

// Secure password generator (mixed charset, avoids ambiguous chars)
export function generateSecurePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}';
  return Array.from({ length }, () => chars[randomInt(chars.length)]).join('');
}

// Timestamp helper
export function nowTs() {
  return Timestamp.now();
}
