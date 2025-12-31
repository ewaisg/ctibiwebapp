'use server';

import * as XLSX from 'xlsx';
import type { Project } from '@/types';
import { getAdminStorage } from '@/lib/firebase-admin';
import {
  adminDb,
  Timestamp,
  sanitizeForLog,
  sanitizeProjectData,
  getCellValue,
} from './admin-shared';

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
    const existingProject = await adminDb!.collection('projects').doc(projectData.poNumber).get();
    if (existingProject.exists) {
      return {
        success: false,
        message: "A project with this PO number already exists"
      };
    }

    // Get contract for denormalized data
    const contractDoc = await adminDb!.collection('contracts').doc(projectData.contractId).get();
    const contract = contractDoc.exists ? contractDoc.data() : null;

    // Get department for denormalized data
    let department = null;
    if (projectData.departmentId) {
      const departmentDoc = await adminDb!.collection('departments').doc(projectData.departmentId).get();
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

    await adminDb!.collection('projects').doc(projectData.poNumber).set(projectDoc);

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
    const currentProjectDoc = await adminDb!.collection('projects').doc(projectId).get();
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
      const contractDoc = await adminDb!.collection('contracts').doc(projectData.contractId).get();
      contract = contractDoc.exists ? contractDoc.data() : null;
    }

    // Get department for denormalized data if departmentId is being updated
    let department = null;
    if (projectData.departmentId) {
      const departmentDoc = await adminDb!.collection('departments').doc(projectData.departmentId).get();
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

    await adminDb!.collection('projects').doc(projectId).update(updateData);

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
    const projectDoc = await adminDb!.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, message: "Project not found" };
    }

    const companyDoc = await adminDb!.collection('companies').doc(companyId).get();
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

    await adminDb!.collection('projects').doc(projectId).update({
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
  requesterUid: string,
  file: File
): Promise<{ success: boolean; message: string; file?: { fileName: string; fileUrl: string; filePath?: string; size?: number; type?: string; uploadedAt?: string } }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    if (!requesterUid) {
      return { success: false, message: 'Missing requester' };
    }
    if (!file) {
      return { success: false, message: 'No file provided' };
    }
    // Basic file size guard (keeps server actions safe)
    const maxBytes = 25 * 1024 * 1024; // 25MB
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return { success: false, message: 'File is too large (max 25MB)' };
    }

    const projectDoc = await adminDb!.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, message: "Project not found" };
    }

    const project = projectDoc.data();
    const files = project?.files || [];

    const originalName = (file.name || '').toString();
    const fileName = originalName.replace(/\\/g, '/').split('/').pop() || 'upload';

    // Check if file already exists
    const existingFile = files.find((f: any) => f.fileName === fileName);
    if (existingFile) {
      return { success: false, message: "File with this name already exists" };
    }

    // Upload to Firebase Storage (admin SDK)
    const storage = getAdminStorage();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();

    const uploadedAt = new Date().toISOString();
    const safeName = fileName.replace(/[^a-zA-Z0-9._\- ()]/g, '_');
    const filePath = `projects/${projectId}/files/${Date.now()}-${safeName}`;
    const storageFile = bucket.file(filePath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await storageFile.save(buffer, {
      contentType: file.type || 'application/octet-stream',
      resumable: false,
      metadata: { cacheControl: 'private, max-age=0' },
    });

    const [fileUrl] = await storageFile.getSignedUrl({ action: 'read', expires: '2100-01-01' });

    const fileRecord = {
      fileName,
      fileUrl,
      filePath,
      size: typeof file.size === 'number' ? file.size : undefined,
      type: file.type || undefined,
      uploadedAt,
    };

    files.push(fileRecord);
    await adminDb!.collection('projects').doc(projectId).update({ files });

    return {
      success: true,
      message: "File uploaded successfully",
      file: fileRecord,
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
    const projectDoc = await adminDb!.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return { success: false, message: "Project not found" };
    }

    const project = projectDoc.data();
    const files = project?.files || [];

    const target = files.find((f: any) => f?.fileName === fileName);
    const filePath = target?.filePath as string | undefined;

    // Best-effort delete from storage when we know the path
    if (filePath) {
      try {
        const storage = getAdminStorage();
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
        await bucket.file(filePath).delete({ ignoreNotFound: true });
      } catch (storageErr) {
        console.warn('Storage delete skipped/failed:', sanitizeForLog(storageErr));
      }
    }

    const updatedFiles = files.filter((f: any) => f.fileName !== fileName);

    await adminDb!.collection('projects').doc(projectId).update({ files: updatedFiles });

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
