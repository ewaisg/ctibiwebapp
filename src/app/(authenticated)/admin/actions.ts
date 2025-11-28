'use server';

import * as XLSX from 'xlsx';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
// Add Node crypto for secure password generation
import { randomInt } from 'crypto';
import { sanitizeForLog } from '@/lib/security-utils';
import type { User, UserRole, Company, Project, Department, Division } from '@/types';

// Sanitize project data to enforce schema compliance and remove non-serializable objects
function sanitizeProjectData(rawProject: any): Project {
  // Only include fields defined in Project interface
  const allowedFields: (keyof Project)[] = [
    'isComplete', 'id', 'projectName', 'contractId', 'departmentId', 'departmentCode',
    'contractNumber', 'projectManager', 'approvingSupervisor', 'ipmssiStaff', 'pmisNumber',
    'poNumber', 'isInactive', 'files', 'originalPoAmount', 'changeOrderAmount', 'newPoAmount',
    'previouslyInvoicedAmount', 'remainingPoAmount', 'budgetedHours', 'usedHours', 'remainingHours',
    'assignedCompanies'
  ];

  const sanitized: any = {};
  
  // Copy only allowed fields
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
      .map((f: any) => ({ fileName: f.fileName, fileUrl: f.fileUrl }));
  }

  return sanitized as Project;
}

interface UserFormData {
  displayName: string;
  email: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  phone?: string;
  bio?: string;
  // Allow optional password entry from admin UI; if omitted, we will auto-generate one
  password?: string;
}

interface UserImportResult {
  success: boolean;
  message: string;
  processed?: number;
  duplicates?: number;
  errors?: number;
  users?: User[];
}

interface UserActionResult {
  success: boolean;
  message: string;
  user?: User;
  // When we auto-generate or accept a provided password, return it so admin can share with the user
  tempPassword?: string;
}

// Column mapping for user import
interface UserColumnMapping {
  DISPLAY_NAME?: number;
  EMAIL?: number;
  ROLE?: number;
  COMPANY_ID?: number;
  PHONE?: number;
  BIO?: number;
  IS_ACTIVE?: number;
}

function discoverUserColumnMapping(worksheet: XLSX.WorkSheet): UserColumnMapping {
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

function getCellValue(worksheet: XLSX.WorkSheet, cellAddress: string): unknown {
  const cell = worksheet[cellAddress];
  return cell ? cell.v : undefined;
}

async function checkUserExists(email: string): Promise<boolean> {
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

async function getCompanyById(companyId: string): Promise<Company | null> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
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
function generateSecurePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}';
  return Array.from({ length }, () => chars[randomInt(chars.length)]).join('');
}

export async function createUser(userData: UserFormData): Promise<UserActionResult> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    // Check if user already exists
    const userExists = await checkUserExists(userData.email);
    if (userExists) {
      return {
        success: false,
        message: "A user with this email already exists"
      };
    }

    // Validate company exists
    const company = await getCompanyById(userData.companyId);
    if (!company) {
      return {
        success: false,
        message: "Invalid company selected"
      };
    }

    // Determine password (provided or auto-generated)
    const tempPassword = (userData.password && userData.password.trim().length >= 8)
      ? userData.password.trim()
      : generateSecurePassword(14);

    // Create Firebase Auth user with email + password
    const auth = getAuth();
    const firebaseUser = await auth.createUser({
      email: userData.email,
      displayName: userData.displayName,
      emailVerified: false,
      password: tempPassword,
      disabled: false,
    });

    // Create Firestore user document
    const userDoc = {
      uid: firebaseUser.uid,
      displayName: userData.displayName,
      email: userData.email,
      role: userData.role,
      companyId: userData.companyId,
      isActive: userData.isActive,
      phone: userData.phone || null,
      bio: userData.bio || null,
      createdAt: Timestamp.now(),
      isOnboardingComplete: false,
    };

    await adminDb.collection('users').doc(firebaseUser.uid).set(userDoc);

    const createdUser: User = {
      uid: firebaseUser.uid,
      displayName: userData.displayName,
      email: userData.email,
      role: userData.role,
      companyId: userData.companyId,
      isActive: userData.isActive,
      phone: userData.phone,
      bio: userData.bio,
      isOnboardingComplete: false,
    };

    return {
      success: true,
      message: "User created successfully",
      user: createdUser,
      tempPassword,
    };

  } catch (error) {
    console.error('Error creating user:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create user"
    };
  }
}

export async function updateUser(uid: string, userData: UserFormData): Promise<UserActionResult> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    // Validate company exists
    const company = await getCompanyById(userData.companyId);
    if (!company) {
      return {
        success: false,
        message: "Invalid company selected"
      };
    }

    // Update Firebase Auth user
    const auth = getAuth();
    await auth.updateUser(uid, {
      displayName: userData.displayName,
    });

    // Update Firestore user document
    const updateData = {
      displayName: userData.displayName,
      role: userData.role,
      companyId: userData.companyId,
      isActive: userData.isActive,
      phone: userData.phone || null,
      bio: userData.bio || null,
      updatedAt: Timestamp.now(),
    };

    await adminDb.collection('users').doc(uid).update(updateData);

    const updatedUser: User = {
      uid,
      displayName: userData.displayName,
      email: userData.email, // Email doesn't change
      role: userData.role,
      companyId: userData.companyId,
      isActive: userData.isActive,
      phone: userData.phone,
      bio: userData.bio,
    };

    return {
      success: true,
      message: "User updated successfully",
      user: updatedUser
    };

  } catch (error) {
    console.error('Error updating user:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update user"
    };
  }
}

// Company management functions
export async function createCompany(companyData: {
  companyName: string;
  companyCode: string;
  isSubconsultant: boolean;
  isInactive: boolean;
  diversityCertification: 'MWBE' | 'WBE' | 'SBE' | 'None';
}): Promise<{ success: boolean; message: string; company?: Company }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    // Check if company code already exists
    const existingCompany = await adminDb.collection('companies').doc(companyData.companyCode).get();
    if (existingCompany.exists) {
      return {
        success: false,
        message: "A company with this code already exists"
      };
    }

    const companyDoc = {
      id: companyData.companyCode,
      companyName: companyData.companyName,
      companyCode: companyData.companyCode,
      isSubconsultant: companyData.isSubconsultant,
      isInactive: companyData.isInactive,
      diversityCertification: companyData.diversityCertification,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await adminDb.collection('companies').doc(companyData.companyCode).set(companyDoc);

    // Exclude timestamp fields from client response
    const { createdAt, updatedAt, ...clientSafeCompany } = companyDoc;
    
    return {
      success: true,
      message: "Company created successfully",
      company: clientSafeCompany as Company
    };
  } catch (error) {
    console.error('Error creating company:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create company"
    };
  }
}

export async function updateCompany(companyId: string, companyData: {
  companyName: string;
  companyCode: string;
  isSubconsultant: boolean;
  isInactive: boolean;
  diversityCertification: 'MWBE' | 'WBE' | 'SBE' | 'None';
}): Promise<{ success: boolean; message: string; company?: Company }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const updateData = {
      companyName: companyData.companyName,
      isSubconsultant: companyData.isSubconsultant,
      isInactive: companyData.isInactive,
      diversityCertification: companyData.diversityCertification,
      updatedAt: Timestamp.now(),
    };

    await adminDb.collection('companies').doc(companyId).update(updateData);

    // Exclude timestamp fields from client response
    const { updatedAt, ...clientSafeUpdateData } = updateData;
    
    const updatedCompany: Company = {
      id: companyId,
      companyCode: companyData.companyCode,
      ...clientSafeUpdateData
    } as Company;

    return {
      success: true,
      message: "Company updated successfully",
      company: updatedCompany
    };
  } catch (error) {
    console.error('Error updating company:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update company"
    };
  }
}

export async function processCompanyImport(file: File): Promise<{
  success: boolean;
  message: string;
  processed?: number;
  duplicates?: number;
  errors?: number;
  companies?: Company[];
}> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      return { success: false, message: "No worksheet found" };
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    let processed = 0, duplicates = 0, errors = 0;
    const importedCompanies: Company[] = [];

    for (let rowIndex = 1; rowIndex < range.e.r + 1; rowIndex++) {
      try {
        const companyName = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 0 }))?.toString().trim();
        const companyCode = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 1 }))?.toString().trim();
        
        if (!companyName || !companyCode) {
          errors++;
          continue;
        }

        const isSubconsultant = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 2 }))?.toString().toLowerCase() === 'true';
        const isInactive = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 3 }))?.toString().toLowerCase() === 'true';
        const diversityCertification = (getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 4 }))?.toString() || 'None') as 'MWBE' | 'WBE' | 'SBE' | 'None';

        const result = await createCompany({
          companyName,
          companyCode,
          isSubconsultant,
          isInactive,
          diversityCertification
        });

        if (result.success && result.company) {
          importedCompanies.push(result.company);
          processed++;
        } else if (result.message.includes('already exists')) {
          duplicates++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return {
      success: true,
      message: `Import complete: ${processed} processed, ${duplicates} duplicates, ${errors} errors`,
      processed,
      duplicates,
      errors,
      companies: importedCompanies
    };
  } catch (error) {
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Project management functions
export async function createProject(projectData: {
  projectName: string;
  poNumber: string;
  contractId: string;
  departmentId?: string;
  projectManager?: string;
  approvingSupervisor?: string;
  ipmssiStaff?: string;
  pmisNumber?: string;
  originalPoAmount?: number;
  changeOrderAmount?: number;
  budgetedHours?: number;
  isInactive: boolean;
  isComplete?: boolean;
}): Promise<{ success: boolean; message: string; project?: Project }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    // Check if project with PO number already exists
    const existingProject = await adminDb.collection('projects').doc(projectData.poNumber).get();
    if (existingProject.exists) {
      return {
        success: false,
        message: "A project with this PO number already exists"
      };
    }

    // Get contract for denormalized data
    const contractDoc = await adminDb.collection('contracts').doc(projectData.contractId).get();
    const contract = contractDoc.exists ? contractDoc.data() : null;

    // Get department for denormalized data
    let department = null;
    if (projectData.departmentId) {
      const departmentDoc = await adminDb.collection('departments').doc(projectData.departmentId).get();
      department = departmentDoc.exists ? departmentDoc.data() : null;
    }

    // Calculate amounts
    const originalAmount = projectData.originalPoAmount || 0;
    const changeOrder = projectData.changeOrderAmount || 0;
    const newPoAmount = originalAmount + changeOrder;
    const remainingPoAmount = newPoAmount;
    const remainingHours = projectData.budgetedHours || 0;

    const projectDoc = {
      id: projectData.poNumber,
      projectName: projectData.projectName,
      poNumber: projectData.poNumber,
      contractId: projectData.contractId,
      contractNumber: contract?.contractNumber || null,
      departmentId: projectData.departmentId || null,
      departmentCode: department?.departmentCode || null,
      projectManager: projectData.projectManager || null,
      approvingSupervisor: projectData.approvingSupervisor || null,
      ipmssiStaff: projectData.ipmssiStaff || null,
      pmisNumber: projectData.pmisNumber || null,
      originalPoAmount: originalAmount,
      changeOrderAmount: changeOrder,
      newPoAmount,
      previouslyInvoicedAmount: 0,
      remainingPoAmount,
      budgetedHours: projectData.budgetedHours || 0,
      usedHours: 0,
      remainingHours,
      isInactive: projectData.isInactive,
      isComplete: projectData.isComplete || false,
      files: [],
      assignedCompanies: [],
    };

    await adminDb.collection('projects').doc(projectData.poNumber).set(projectDoc);

    const createdProject = { ...projectDoc, id: projectData.poNumber, poNumber: projectData.poNumber };
    
    return {
      success: true,
      message: "Project created successfully",
      project: sanitizeProjectData(createdProject)
    };
  } catch (error) {
    console.error('Error creating project:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create project"
    };
  }
}

export async function updateProject(projectId: string, projectData: {
  projectName?: string;
  contractId?: string;
  departmentId?: string;
  projectManager?: string;
  approvingSupervisor?: string;
  ipmssiStaff?: string;
  pmisNumber?: string;
  originalPoAmount?: number;
  changeOrderAmount?: number;
  budgetedHours?: number;
  isInactive?: boolean;
  isComplete?: boolean;
  assignedCompanies?: Project['assignedCompanies'];
}): Promise<{ success: boolean; message: string; project?: Project }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    // Get current project data
    const currentProjectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!currentProjectDoc.exists) {
      return {
        success: false,
        message: "Project not found"
      };
    }
    const currentProject = currentProjectDoc.data();

    // Get contract for denormalized data if contractId is being updated
    let contract = null;
    if (projectData.contractId) {
      const contractDoc = await adminDb.collection('contracts').doc(projectData.contractId).get();
      contract = contractDoc.exists ? contractDoc.data() : null;
    }

    // Get department for denormalized data if departmentId is being updated
    let department = null;
    if (projectData.departmentId) {
      const departmentDoc = await adminDb.collection('departments').doc(projectData.departmentId).get();
      department = departmentDoc.exists ? departmentDoc.data() : null;
    }

    const updateData: any = {};

    // Only add lastModified if we're actually updating fields
    let hasUpdates = false;

    // Only update fields that are provided
    if (projectData.projectName !== undefined) {
      updateData.projectName = projectData.projectName;
      hasUpdates = true;
    }
    if (projectData.contractId !== undefined) {
      updateData.contractId = projectData.contractId;
      updateData.contractNumber = contract?.contractNumber || null;
      hasUpdates = true;
    }
    if (projectData.departmentId !== undefined) {
      updateData.departmentId = projectData.departmentId || null;
      updateData.departmentCode = department?.departmentCode || null;
      hasUpdates = true;
    }
    if (projectData.projectManager !== undefined) {
      updateData.projectManager = projectData.projectManager || null;
      hasUpdates = true;
    }
    if (projectData.approvingSupervisor !== undefined) {
      updateData.approvingSupervisor = projectData.approvingSupervisor || null;
      hasUpdates = true;
    }
    if (projectData.ipmssiStaff !== undefined) {
      updateData.ipmssiStaff = projectData.ipmssiStaff || null;
      hasUpdates = true;
    }
    if (projectData.pmisNumber !== undefined) {
      updateData.pmisNumber = projectData.pmisNumber || null;
      hasUpdates = true;
    }
    if (projectData.originalPoAmount !== undefined) {
      const originalAmount = projectData.originalPoAmount || 0;
      const changeOrder = projectData.changeOrderAmount || currentProject?.changeOrderAmount || 0;
      const newPoAmount = originalAmount + changeOrder;
      const previouslyInvoiced = currentProject?.previouslyInvoicedAmount || 0;
      const remainingPoAmount = newPoAmount - previouslyInvoiced;
      
      updateData.originalPoAmount = originalAmount;
      updateData.changeOrderAmount = changeOrder;
      updateData.newPoAmount = newPoAmount;
      updateData.remainingPoAmount = remainingPoAmount;
      hasUpdates = true;
    }
    if (projectData.budgetedHours !== undefined) {
      const usedHours = currentProject?.usedHours || 0;
      const remainingHours = (projectData.budgetedHours || 0) - usedHours;
      updateData.budgetedHours = projectData.budgetedHours || 0;
      updateData.remainingHours = remainingHours;
      hasUpdates = true;
    }
    if (projectData.isInactive !== undefined) {
      updateData.isInactive = projectData.isInactive;
      hasUpdates = true;
    }
    if (projectData.isComplete !== undefined) {
      updateData.isComplete = projectData.isComplete;
      hasUpdates = true;
    }
    if (projectData.assignedCompanies !== undefined) {
      // Ensure assignedServices have isActive field as shown in database example
      const sanitizedCompanies = (projectData.assignedCompanies || []).map(company => ({
        ...company,
        assignedServices: (company.assignedServices || []).map(service => ({
          ...service,
          isActive: service.isActive !== undefined ? service.isActive : true
        }))
      }));
      updateData.assignedCompanies = sanitizedCompanies;
      hasUpdates = true;
    }

    // Only add timestamp if we have actual updates
    if (hasUpdates) {
      updateData.lastModified = Timestamp.now();
    }

    await adminDb.collection('projects').doc(projectId).update(updateData);

    const updatedProject = {
      ...currentProject,
      ...updateData,
      id: projectId,
      poNumber: currentProject?.poNumber || projectId
    };
    
    return {
      success: true,
      message: "Project updated successfully",
      project: sanitizeProjectData(updatedProject)
    };
  } catch (error) {
    console.error('Error updating project:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update project"
    };
  }
}

export async function assignCompanyToProject(
  projectId: string, 
  companyId: string, 
  employees: { employeeId: string; employeeName: string }[],
  services: { serviceId: string; serviceName: string; description?: string; billingRate: number }[]
): Promise<{ success: boolean; message: string }> {
  if (!adminDb) {
    throw new Error("Firestore is not initialized.");
  }
  
  try {
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, message: "Project not found" };
    }

    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return { success: false, message: "Company not found" };
    }
    const company = companyDoc.data();

    const project = projectDoc.data();
    const assignedCompanies = project?.assignedCompanies || [];

    // Check if company already assigned
    const existingIndex = assignedCompanies.findIndex((ac: any) => 
      ac.companyId?.id === companyId || ac.companyId === companyId
    );

    const assignedEmployees = employees.map(emp => ({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName
    }));

    const assignedServices = services.map(svc => ({
      serviceId: svc.serviceId,
      serviceName: svc.serviceName,
      description: svc.description || null,
      billingRate: svc.billingRate
    }));

    const companyAssignment = {
      companyId: companyId,
      companyName: company?.companyName,
      assignedEmployees,
      assignedServices
    };

    if (existingIndex >= 0) {
      assignedCompanies[existingIndex] = companyAssignment;
    } else {
      assignedCompanies.push(companyAssignment);
    }

    await adminDb.collection('projects').doc(projectId).update({
      assignedCompanies
    });

    return {
      success: true,
      message: "Company assigned to project successfully"
    };
  } catch (error) {
    console.error('Error assigning company to project:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to assign company"
    };
  }
}

export async function uploadProjectFile(
  projectId: string,
  fileName: string,
  fileUrl: string
): Promise<{ success: boolean; message: string }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, message: "Project not found" };
    }

    const project = projectDoc.data();
    const files = project?.files || [];

    // Check if file already exists
    const existingFile = files.find((f: any) => f.fileName === fileName);
    if (existingFile) {
      return { success: false, message: "File with this name already exists" };
    }

    files.push({ fileName, fileUrl });

    await adminDb.collection('projects').doc(projectId).update({ files });

    return {
      success: true,
      message: "File uploaded successfully"
    };
  } catch (error) {
    console.error('Error uploading project file:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload file"
    };
  }
}

export async function deleteProjectFile(
  projectId: string,
  fileName: string
): Promise<{ success: boolean; message: string }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, message: "Project not found" };
    }

    const project = projectDoc.data();
    const files = project?.files || [];

    const updatedFiles = files.filter((f: any) => f.fileName !== fileName);

    await adminDb.collection('projects').doc(projectId).update({ files: updatedFiles });

    return {
      success: true,
      message: "File deleted successfully"
    };
  } catch (error) {
    console.error('Error deleting project file:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete file"
    };
  }
}

export async function processProjectImport(file: File): Promise<{
  success: boolean;
  message: string;
  processed?: number;
  duplicates?: number;
  errors?: number;
  projects?: Project[];
}> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      return { success: false, message: "No worksheet found" };
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    let processed = 0, duplicates = 0, errors = 0;
    const importedProjects: Project[] = [];

    for (let rowIndex = 1; rowIndex < range.e.r + 1; rowIndex++) {
      try {
        const projectName = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 0 }))?.toString().trim();
        const poNumber = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 1 }))?.toString().trim();
        const contractId = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 2 }))?.toString().trim();
        
        if (!projectName || !poNumber || !contractId) {
          errors++;
          continue;
        }

        const departmentId = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 3 }))?.toString().trim();
        const projectManager = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 4 }))?.toString().trim();
        const originalPoAmount = Number(getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 5 }))) || 0;
        const budgetedHours = Number(getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: 6 }))) || 0;

        const result = await createProject({
          projectName,
          poNumber,
          contractId,
          departmentId: departmentId || undefined,
          projectManager: projectManager || undefined,
          originalPoAmount,
          budgetedHours,
          isInactive: false,
          isComplete: false
        });

        if (result.success && result.project) {
          importedProjects.push(sanitizeProjectData(result.project));
          processed++;
        } else if (result.message.includes('already exists')) {
          duplicates++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return {
      success: true,
      message: `Import complete: ${processed} processed, ${duplicates} duplicates, ${errors} errors`,
      processed,
      duplicates,
      errors,
      projects: importedProjects
    };
  } catch (error) {
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Division management functions
export async function createDivision(divisionData: {
  divisionCode: string;
  divisionName: string;
  isInactive: boolean;
}): Promise<{ success: boolean; message: string; division?: Division }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const existingDivision = await adminDb.collection('divisions').doc(divisionData.divisionCode).get();
    if (existingDivision.exists) {
      return {
        success: false,
        message: "A division with this code already exists"
      };
    }

    const divisionDoc = {
      id: divisionData.divisionCode,
      divisionCode: divisionData.divisionCode,
      divisionName: divisionData.divisionName,
      isInactive: divisionData.isInactive,
    };

    await adminDb.collection('divisions').doc(divisionData.divisionCode).set(divisionDoc);

    return {
      success: true,
      message: "Division created successfully",
      division: divisionDoc as Division
    };
  } catch (error) {
    console.error('Error creating division:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create division"
    };
  }
}

export async function updateDivision(divisionId: string, divisionData: {
  divisionName: string;
  isInactive: boolean;
}): Promise<{ success: boolean; message: string; division?: Division }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const updateData = {
      divisionName: divisionData.divisionName,
      isInactive: divisionData.isInactive,
    };

    await adminDb.collection('divisions').doc(divisionId).update(updateData);

    const updatedDivision: Division = {
      id: divisionId,
      divisionCode: divisionId,
      ...updateData
    };

    return {
      success: true,
      message: "Division updated successfully",
      division: updatedDivision
    };
  } catch (error) {
    console.error('Error updating division:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update division"
    };
  }
}

// Department management functions
export async function createDepartment(departmentData: {
  departmentCode: string;
  departmentName: string;
  divisionId: string;
  isInactive: boolean;
}): Promise<{ success: boolean; message: string; department?: Department }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const existingDepartment = await adminDb.collection('departments').doc(departmentData.departmentCode).get();
    if (existingDepartment.exists) {
      return {
        success: false,
        message: "A department with this code already exists"
      };
    }

    const departmentDoc = {
      id: departmentData.departmentCode,
      departmentCode: departmentData.departmentCode,
      departmentName: departmentData.departmentName,
      divisionId: departmentData.divisionId,
      isInactive: departmentData.isInactive,
    };

    await adminDb.collection('departments').doc(departmentData.departmentCode).set(departmentDoc);

    return {
      success: true,
      message: "Department created successfully",
      department: { ...departmentDoc, id: departmentData.departmentCode } as Department
    };
  } catch (error) {
    console.error('Error creating department:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create department"
    };
  }
}

export async function updateDepartment(departmentId: string, departmentData: {
  departmentName: string;
  divisionId: string;
  isInactive: boolean;
}): Promise<{ success: boolean; message: string; department?: Department }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const updateData = {
      departmentName: departmentData.departmentName,
      divisionId: departmentData.divisionId,
      isInactive: departmentData.isInactive,
    };

    await adminDb.collection('departments').doc(departmentId).update(updateData);

    const updatedDepartment: Department = {
      id: departmentId,
      departmentCode: departmentId,
      ...updateData
    };

    return {
      success: true,
      message: "Department updated successfully",
      department: updatedDepartment
    };
  } catch (error) {
    console.error('Error updating department:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update department"
    };
  }
}

export async function processUserImport(file: File): Promise<UserImportResult> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return { success: false, message: `Sheet "${sheetName}" not found` };
    }

    const columnMapping = discoverUserColumnMapping(worksheet);
    
    // Validate required columns
    if (columnMapping.DISPLAY_NAME === undefined || 
        columnMapping.EMAIL === undefined || 
        columnMapping.ROLE === undefined || 
        columnMapping.COMPANY_ID === undefined) {
      return { 
        success: false, 
        message: `Required columns missing. Need: displayName, email, role, companyId` 
      };
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalRows = range.e.r + 1;

    let processed = 0;
    let duplicates = 0;
    let errors = 0;
    const importedUsers: User[] = [];

    console.log(`📊 Processing ${totalRows - 1} user rows...`);

    // Process each row (skip header row)
    for (let rowIndex = 1; rowIndex < totalRows; rowIndex++) {
      try {
        const displayName = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.DISPLAY_NAME! }))?.toString().trim();
        const email = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.EMAIL! }))?.toString().trim();
        const role = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.ROLE! }))?.toString().trim() as UserRole;
        const companyId = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.COMPANY_ID! }))?.toString().trim();

        if (!displayName || !email || !role || !companyId) {
          console.warn(`⚠️ Row ${rowIndex + 1}: Missing required data - skipping`);
          errors++;
          continue;
        }

        // Validate role
        if (!['Admin', 'Prime', 'Subconsultant'].includes(role)) {
          console.warn(`⚠️ Row ${rowIndex + 1}: Invalid role "${role}" - skipping`);
          errors++;
          continue;
        }

        // Check for duplicates
        const userExists = await checkUserExists(email);
        if (userExists) {
          console.warn(`⚠️ Row ${rowIndex + 1}: User with email ${email} already exists - skipping`);
          duplicates++;
          continue;
        }

        // Validate company exists
        const company = await getCompanyById(companyId);
        if (!company) {
          console.warn(`⚠️ Row ${rowIndex + 1}: Company ${companyId} not found - skipping`);
          errors++;
          continue;
        }

        // Get optional fields
        const phone = columnMapping.PHONE ? getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.PHONE }))?.toString() : undefined;
        const bio = columnMapping.BIO ? getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.BIO }))?.toString() : undefined;
        const isActiveValue = columnMapping.IS_ACTIVE ? getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.IS_ACTIVE })) : true;
        const isActive = typeof isActiveValue === 'boolean' ? isActiveValue : 
                         typeof isActiveValue === 'string' ? isActiveValue.toLowerCase() === 'true' : true;

        const userData: UserFormData = {
          displayName,
          email,
          role,
          companyId,
          isActive,
          phone,
          bio,
        };

        const result = await createUser(userData);
        if (result.success && result.user) {
          importedUsers.push(result.user);
          processed++;
          console.log(`✅ Row ${rowIndex + 1}: Created user ${email}`);
        } else {
          console.error(`❌ Row ${rowIndex + 1}: Failed to create user ${sanitizeForLog(email)}: ${sanitizeForLog(result.message)}`);
          errors++;
        }

      } catch (error) {
        console.error(`❌ Row ${rowIndex + 1}: Error processing:`, sanitizeForLog(error));
        errors++;
      }
    }

    return {
      success: true,
      message: `Import complete: ${processed} processed, ${duplicates} duplicates, ${errors} errors`,
      processed,
      duplicates,
      errors,
      users: importedUsers
    };

  } catch (error) {
    console.error('Error processing user import:', sanitizeForLog(error));
    return {
      success: false,
      message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Financial Administration Actions

// Invoice Template Management
export async function createInvoiceTemplate(templateData: {
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
}): Promise<{ success: boolean; message: string; template?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const templateDoc = {
      templateName: templateData.templateName,
      templateType: templateData.templateType,
      logoUrl: templateData.logoUrl || null,
      headerText: templateData.headerText || null,
      footerText: templateData.footerText || null,
      companyInfo: templateData.companyInfo,
      isActive: templateData.isActive,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await adminDb.collection('invoice_templates').add(templateDoc);

    // Exclude timestamp fields from client response
    const { createdAt, updatedAt, ...clientSafeTemplate } = templateDoc;
    
    return {
      success: true,
      message: "Invoice template created successfully",
      template: { id: docRef.id, ...clientSafeTemplate }
    };
  } catch (error) {
    console.error('Error creating invoice template:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create invoice template"
    };
  }
}

export async function updateInvoiceTemplate(templateId: string, templateData: {
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
}): Promise<{ success: boolean; message: string; template?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const updateData = {
      templateName: templateData.templateName,
      templateType: templateData.templateType,
      logoUrl: templateData.logoUrl || null,
      headerText: templateData.headerText || null,
      footerText: templateData.footerText || null,
      companyInfo: templateData.companyInfo,
      isActive: templateData.isActive,
      updatedAt: Timestamp.now(),
    };

    await adminDb.collection('invoice_templates').doc(templateId).update(updateData);

    // Exclude timestamp fields from client response
    const { updatedAt, ...clientSafeUpdateData } = updateData;
    
    return {
      success: true,
      message: "Invoice template updated successfully",
      template: { id: templateId, ...clientSafeUpdateData }
    };
  } catch (error) {
    console.error('Error updating invoice template:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update invoice template"
    };
  }
}

// Global Rate Management
export async function createGlobalRate(rateData: {
  serviceId: string;
  serviceName: string;
  standardRate: number;
  effectiveDate: Date;
  expirationDate?: Date;
  approvedBy: string;
  approvedByName: string;
  isActive: boolean;
  notes?: string;
}): Promise<{ success: boolean; message: string; rate?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const rateDoc = {
      serviceId: adminDb.doc(`services/${rateData.serviceId}`),
      serviceName: rateData.serviceName,
      standardRate: rateData.standardRate,
      effectiveDate: Timestamp.fromDate(rateData.effectiveDate),
      expirationDate: rateData.expirationDate ? Timestamp.fromDate(rateData.expirationDate) : null,
      approvedBy: adminDb.doc(`users/${rateData.approvedBy}`),
      approvedByName: rateData.approvedByName,
      approvalDate: Timestamp.now(),
      isActive: rateData.isActive,
      notes: rateData.notes || null,
    };

    const docRef = await adminDb.collection('global_rates').add(rateDoc);

    // Exclude timestamp fields from client response
    const { approvalDate, ...clientSafeRate } = rateDoc;
    
    return {
      success: true,
      message: "Global rate created successfully",
      rate: { id: docRef.id, ...clientSafeRate }
    };
  } catch (error) {
    console.error('Error creating global rate:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create global rate"
    };
  }
}

export async function updateGlobalRate(rateId: string, rateData: {
  standardRate: number;
  effectiveDate: Date;
  expirationDate?: Date;
  isActive: boolean;
  notes?: string;
}): Promise<{ success: boolean; message: string; rate?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    const updateData = {
      standardRate: rateData.standardRate,
      effectiveDate: Timestamp.fromDate(rateData.effectiveDate),
      expirationDate: rateData.expirationDate ? Timestamp.fromDate(rateData.expirationDate) : null,
      isActive: rateData.isActive,
      notes: rateData.notes || null,
    };

    await adminDb.collection('global_rates').doc(rateId).update(updateData);

    return {
      success: true,
      message: "Global rate updated successfully",
      rate: { id: rateId, ...updateData }
    };
  } catch (error) {
    console.error('Error updating global rate:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update global rate"
    };
  }
}

// Financial Report Generation
export async function generateFinancialReport(reportData: {
  reportName: string;
  reportType: 'Revenue' | 'Outstanding' | 'Utilization' | 'Profitability';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters: {
    companyIds?: string[];
    projectIds?: string[];
    departmentIds?: string[];
  };
  generatedBy: string;
  generatedByName: string;
}): Promise<{ success: boolean; message: string; report?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    // Generate report data based on type
    let reportData_generated: any = {};
    
    switch (reportData.reportType) {
      case 'Revenue':
        reportData_generated = await generateRevenueReport(reportData.dateRange, reportData.filters);
        break;
      case 'Outstanding':
        reportData_generated = await generateOutstandingReport(reportData.dateRange, reportData.filters);
        break;
      case 'Utilization':
        reportData_generated = await generateUtilizationReport(reportData.dateRange, reportData.filters);
        break;
      case 'Profitability':
        reportData_generated = await generateProfitabilityReport(reportData.dateRange, reportData.filters);
        break;
    }

    const reportDoc = {
      reportName: reportData.reportName,
      reportType: reportData.reportType,
      dateRange: {
        startDate: Timestamp.fromDate(reportData.dateRange.startDate),
        endDate: Timestamp.fromDate(reportData.dateRange.endDate),
      },
      filters: reportData.filters,
      data: reportData_generated,
      generatedBy: adminDb.doc(`users/${reportData.generatedBy}`),
      generatedByName: reportData.generatedByName,
      generatedAt: Timestamp.now(),
    };

    const docRef = await adminDb.collection('financial_reports').add(reportDoc);

    // Exclude timestamp fields from client response
    const { generatedAt, ...clientSafeReport } = reportDoc;
    
    return {
      success: true,
      message: "Financial report generated successfully",
      report: { id: docRef.id, ...clientSafeReport }
    };
  } catch (error) {
    console.error('Error generating financial report:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate financial report"
    };
  }
}

// Payment Tracking
export async function recordPayment(paymentData: {
  invoiceId: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  paidAmount: number;
  paymentDate: Date;
  paymentMethod: 'Check' | 'ACH' | 'Wire' | 'Credit Card';
  paymentReference?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; payment?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  
  try {
    // Get invoice to calculate outstanding amount
    const invoiceDoc = await adminDb.collection('invoices').doc(paymentData.invoiceId).get();
    if (!invoiceDoc.exists) {
      return { success: false, message: "Invoice not found" };
    }
    
    const invoice = invoiceDoc.data();
    const invoiceAmount = invoice?.invoiceTotal || 0;
    const currentPaidAmount = paymentData.paidAmount;
    const outstandingAmount = Math.max(0, invoiceAmount - currentPaidAmount);
    
    let status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
    if (currentPaidAmount >= invoiceAmount) {
      status = 'Paid';
    } else if (currentPaidAmount > 0) {
      status = 'Partial';
    } else if (invoice?.dueDate && new Date() > invoice.dueDate.toDate()) {
      status = 'Overdue';
    }

    const paymentDoc = {
      invoiceId: adminDb.doc(`invoices/${paymentData.invoiceId}`),
      invoiceNumber: paymentData.invoiceNumber,
      projectId: adminDb.doc(`projects/${paymentData.projectId}`),
      projectName: paymentData.projectName,
      invoiceAmount,
      paidAmount: currentPaidAmount,
      outstandingAmount,
      paymentDate: Timestamp.fromDate(paymentData.paymentDate),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference || null,
      status,
      dueDate: invoice?.dueDate || Timestamp.now(),
      notes: paymentData.notes || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await adminDb.collection('payment_tracking').add(paymentDoc);

    // Return a JSON-serializable payload (no DocumentReferences/Timestamps)
    const clientPayment = {
      id: docRef.id,
      invoiceId: paymentData.invoiceId,
      invoiceNumber: paymentData.invoiceNumber,
      projectId: paymentData.projectId,
      projectName: paymentData.projectName,
      invoiceAmount,
      paidAmount: currentPaidAmount,
      outstandingAmount,
      paymentDate: paymentData.paymentDate.toISOString(),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference || null,
      status,
      dueDate: invoice?.dueDate ? invoice.dueDate.toDate().toISOString() : null,
      notes: paymentData.notes || null,
      createdAt: new Date().toISOString(),
    };
    
    return {
      success: true,
      message: "Payment recorded successfully",
      payment: clientPayment
    };
  } catch (error) {
    console.error('Error recording payment:', sanitizeForLog(error));
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to record payment"
    };
  }
}

// Payment history for an invoice
export async function getPaymentHistory(invoiceId: string): Promise<{ success: boolean; items?: any[]; message?: string }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  try {
    const invRef = adminDb.doc(`invoices/${invoiceId}`);
    const snap = await adminDb
      .collection('payment_tracking')
      .where('invoiceId', '==', invRef)
      .orderBy('createdAt', 'desc')
      .get();

    const items = snap.docs.map(d => {
      const data = d.data() as any;
      const paymentDateTs = data.paymentDate as Timestamp | null | undefined;
      const dueDateTs = data.dueDate as Timestamp | null | undefined;
      const createdAtTs = data.createdAt as Timestamp | null | undefined;
      const updatedAtTs = data.updatedAt as Timestamp | null | undefined;
      // Convert DocumentReferences to string ids and Timestamps to ISO strings
      const invoiceRef = data.invoiceId;
      const projectRef = data.projectId;
      return {
        id: d.id,
        invoiceId: typeof invoiceRef === 'object' && invoiceRef?.id ? invoiceRef.id : invoiceId,
        projectId: typeof projectRef === 'object' && projectRef?.id ? projectRef.id : null,
        invoiceNumber: data.invoiceNumber,
        projectName: data.projectName,
        invoiceAmount: data.invoiceAmount,
        paidAmount: data.paidAmount,
        outstandingAmount: data.outstandingAmount,
        paymentMethod: data.paymentMethod ?? null,
        paymentReference: data.paymentReference ?? null,
        status: data.status,
        notes: data.notes ?? null,
        entryType: data.entryType,
        deltaAmount: data.deltaAmount,
        paymentDate: paymentDateTs ? paymentDateTs.toDate().toISOString() : null,
        dueDate: dueDateTs ? dueDateTs.toDate().toISOString() : null,
        createdAt: createdAtTs ? createdAtTs.toDate().toISOString() : null,
        updatedAt: updatedAtTs ? updatedAtTs.toDate().toISOString() : null,
      };
    });

    return { success: true, items };
  } catch (error) {
    console.error('Error fetching payment history:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch payment history' };
  }
}

// Add a payment-related entry and recompute cumulative fields
export async function addPaymentEntry(args: {
  invoiceId: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  entryType: 'payment' | 'write_off' | 'credit' | 'refund';
  amount: number;
  paymentDate?: Date;
  paymentMethod?: 'Check' | 'ACH' | 'Wire' | 'Credit Card';
  paymentReference?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; entry?: any }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const invoiceDoc = await adminDb.collection('invoices').doc(args.invoiceId).get();
    if (!invoiceDoc.exists) return { success: false, message: 'Invoice not found' };

    const invoice = invoiceDoc.data() as any;
    const invoiceAmount = Number(invoice?.invoiceTotal || 0);
    const dueDateTs: Timestamp | undefined = invoice?.dueDate;

    // Get latest cumulative values
    const invRef = adminDb.doc(`invoices/${args.invoiceId}`);
    const latestSnap = await adminDb
      .collection('payment_tracking')
      .where('invoiceId', '==', invRef)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    const latest = latestSnap.empty ? null : latestSnap.docs[0].data();
    const prevPaid = Number(latest?.paidAmount || 0);
    const prevOutstanding = Number(latest?.outstandingAmount ?? Math.max(0, invoiceAmount - prevPaid));

    const delta = Math.max(0, Number(args.amount || 0));
    if (!Number.isFinite(delta) || delta <= 0) {
      return { success: false, message: 'Enter a valid positive amount' };
    }

    // Logical validations
    if (args.entryType === 'payment') {
      if (prevOutstanding <= 0) {
        return { success: false, message: 'Invoice is fully paid. No additional payments allowed.' };
      }
      if (delta > prevOutstanding) {
        return { success: false, message: 'Payment amount exceeds outstanding balance.' };
      }
    } else if (args.entryType === 'refund') {
      if (prevPaid <= 0) {
        return { success: false, message: 'No payments recorded to refund.' };
      }
      if (delta > prevPaid) {
        return { success: false, message: 'Refund amount exceeds total paid.' };
      }
    } else if (args.entryType === 'write_off' || args.entryType === 'credit') {
      if (prevOutstanding <= 0) {
        return { success: false, message: 'No outstanding balance to adjust.' };
      }
      if (delta > prevOutstanding) {
        return { success: false, message: 'Adjustment amount exceeds outstanding balance.' };
      }
    }

    let newPaid = prevPaid;
    let newOutstanding = prevOutstanding;

    switch (args.entryType) {
      case 'payment':
        newPaid = prevPaid + delta;
        newOutstanding = Math.max(0, invoiceAmount - newPaid);
        break;
      case 'write_off':
      case 'credit':
        newOutstanding = Math.max(0, prevOutstanding - delta);
        break;
      case 'refund':
        newPaid = Math.max(0, prevPaid - delta);
        newOutstanding = Math.max(0, invoiceAmount - newPaid);
        break;
    }

    let derivedStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
    if (newPaid >= invoiceAmount) derivedStatus = 'Paid';
    else if (newPaid > 0) derivedStatus = 'Partial';
    else if (dueDateTs && new Date() > (dueDateTs as Timestamp).toDate()) derivedStatus = 'Overdue';

    const docData = {
      invoiceId: invRef,
      invoiceNumber: args.invoiceNumber,
      projectId: adminDb.doc(`projects/${args.projectId}`),
      projectName: args.projectName,
      invoiceAmount,
      paidAmount: newPaid,
      outstandingAmount: newOutstanding,
      paymentDate: args.paymentDate ? Timestamp.fromDate(args.paymentDate) : null,
      paymentMethod: args.paymentMethod || null,
      paymentReference: args.paymentReference || null,
      status: derivedStatus,
      dueDate: dueDateTs || Timestamp.now(),
      notes: args.notes || null,
      entryType: args.entryType,
      deltaAmount: delta,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const ref = await adminDb.collection('payment_tracking').add(docData);

    const entry = {
      id: ref.id,
      invoiceId: args.invoiceId,
      invoiceNumber: args.invoiceNumber,
      projectId: args.projectId,
      projectName: args.projectName,
      invoiceAmount,
      paidAmount: newPaid,
      outstandingAmount: newOutstanding,
      paymentMethod: args.paymentMethod || null,
      paymentReference: args.paymentReference || null,
      status: derivedStatus,
      notes: args.notes || null,
      entryType: args.entryType,
      deltaAmount: delta,
      paymentDate: args.paymentDate ? args.paymentDate.toISOString() : null,
      dueDate: dueDateTs ? dueDateTs.toDate().toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Entry recorded',
      entry,
    };
  } catch (error) {
    console.error('Error adding payment entry:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to add entry' };
  }
}

// Recompute cumulative payment fields for all entries of an invoice
async function recomputeInvoicePayments(invoiceId: string): Promise<{ paid: number; outstanding: number; status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' }> {
  if (!adminDb) throw new Error('Firestore is not initialized.');
  const invoiceDoc = await adminDb.collection('invoices').doc(invoiceId).get();
  if (!invoiceDoc.exists) throw new Error('Invoice not found');
  const invoice = invoiceDoc.data() as any;
  const invoiceAmount = Number(invoice?.invoiceTotal || 0);
  const dueDateTs: Timestamp | undefined = invoice?.dueDate;

  const invRef = adminDb.doc(`invoices/${invoiceId}`);
  const snap = await adminDb
    .collection('payment_tracking')
    .where('invoiceId', '==', invRef)
    .orderBy('createdAt', 'asc')
    .get();

  let paid = 0;
  let outstanding = Math.max(0, invoiceAmount - paid);
  const batch = adminDb.batch();

  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const voided = !!data.voided;
    const entryType = data.entryType as 'payment' | 'write_off' | 'credit' | 'refund';
    const delta = Number(data.deltaAmount || 0);

    // Apply only non-voided entries to cumulative
    if (!voided) {
      if (entryType === 'payment') {
        paid = paid + delta;
      } else if (entryType === 'refund') {
        paid = Math.max(0, paid - delta);
      } else if (entryType === 'write_off' || entryType === 'credit') {
        // write-off/credit reduces outstanding directly
        // note: outstanding is recalculated after updating paid
      }
    }
    outstanding = Math.max(0, invoiceAmount - paid);

    let status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
    if (paid >= invoiceAmount && invoiceAmount > 0) status = 'Paid';
    else if (paid > 0) status = 'Partial';
    else if (dueDateTs && new Date() > dueDateTs.toDate()) status = 'Overdue';

    batch.update(doc.ref, {
      paidAmount: paid,
      outstandingAmount: outstanding,
      status,
      updatedAt: Timestamp.now(),
    });

    // After cumulative update, if this entry is write-off/credit, reflect reduction in outstanding from this entry
    if (!voided && (entryType === 'write_off' || entryType === 'credit')) {
      // Reduce outstanding by delta but not below zero, then update current doc to reflect post-adjustment snapshot
      const adjustedOutstanding = Math.max(0, outstanding - delta);
      outstanding = adjustedOutstanding;
      batch.update(doc.ref, {
        outstandingAmount: adjustedOutstanding,
        updatedAt: Timestamp.now(),
      });
    }
  }

  await batch.commit();

  let finalStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' = 'Pending';
  if (paid >= invoiceAmount && invoiceAmount > 0) finalStatus = 'Paid';
  else if (paid > 0) finalStatus = 'Partial';
  else if (dueDateTs && new Date() > dueDateTs.toDate()) finalStatus = 'Overdue';

  return { paid, outstanding, status: finalStatus };
}

export async function updatePaymentEntry(args: {
  entryId: string;
  invoiceId: string;
  entryType: 'payment' | 'write_off' | 'credit' | 'refund';
  amount: number;
  paymentDate?: Date;
  paymentMethod?: 'Check' | 'ACH' | 'Wire' | 'Credit Card';
  paymentReference?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; summary?: { paid: number; outstanding: number; status: string } }> {
  if (!adminDb) throw new Error('Firestore is not initialized.');
  try {
    if (!args.amount || args.amount <= 0 || !Number.isFinite(args.amount)) {
      return { success: false, message: 'Enter a valid positive amount' };
    }

    const entryRef = adminDb.collection('payment_tracking').doc(args.entryId);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) return { success: false, message: 'Entry not found' };

    await entryRef.update({
      entryType: args.entryType,
      deltaAmount: args.amount,
      paymentDate: args.paymentDate ? Timestamp.fromDate(args.paymentDate) : null,
      paymentMethod: args.paymentMethod || null,
      paymentReference: args.paymentReference || null,
      notes: args.notes || null,
      updatedAt: Timestamp.now(),
    });

    const summary = await recomputeInvoicePayments(args.invoiceId);
    return { success: true, message: 'Entry updated', summary: { paid: summary.paid, outstanding: summary.outstanding, status: summary.status } };
  } catch (error) {
    console.error('Error updating payment entry:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update entry' };
  }
}

export async function voidPaymentEntry(args: {
  entryId: string;
  invoiceId: string;
  reason?: string;
}): Promise<{ success: boolean; message: string; summary?: { paid: number; outstanding: number; status: string } }> {
  if (!adminDb) throw new Error('Firestore is not initialized.');
  try {
    const entryRef = adminDb.collection('payment_tracking').doc(args.entryId);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) return { success: false, message: 'Entry not found' };

    await entryRef.update({
      voided: true,
      voidedAt: Timestamp.now(),
      voidReason: args.reason || null,
      updatedAt: Timestamp.now(),
    });

    const summary = await recomputeInvoicePayments(args.invoiceId);
    return { success: true, message: 'Entry voided', summary: { paid: summary.paid, outstanding: summary.outstanding, status: summary.status } };
  } catch (error) {
    console.error('Error voiding payment entry:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to void entry' };
  }
}

// Report data generators (stub implementations to resolve compile-time references)
// TODO: Replace with real aggregations from Firestore as needed
async function generateRevenueReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { totalRevenue: 0, currency: 'USD' },
    range: dateRange,
    filters,
    items: []
  };
}

async function generateOutstandingReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { totalOutstanding: 0, currency: 'USD' },
    range: dateRange,
    filters,
    items: []
  };
}

async function generateUtilizationReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { avgUtilization: 0 },
    range: dateRange,
    filters,
    items: []
  };
}

async function generateProfitabilityReport(
  dateRange: { startDate: Date; endDate: Date },
  filters: { companyIds?: string[]; projectIds?: string[]; departmentIds?: string[] }
): Promise<any> {
  return {
    summary: { totalProfit: 0, marginPct: 0 },
    range: dateRange,
    filters,
    items: []
  };
}

export async function deleteUserAndAccount(uid: string): Promise<{ success: boolean; message: string }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  try {
    const auth = getAuth();

    // Delete from Auth first to prevent orphaned login access
    await auth.deleteUser(uid);

    // Then delete Firestore user document
    await adminDb.collection('users').doc(uid).delete();

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete user' };
  }
}