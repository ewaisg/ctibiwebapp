'use server';

import type { Division, Department } from '@/types';
import {
  adminDb,
  sanitizeForLog,
} from './admin-shared';

export async function createDivision(divisionData: {
  divisionCode: string;
  divisionName: string;
  isInactive: boolean;
}): Promise<{ success: boolean; message: string; division?: Division }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const existingDivision = await adminDb!.collection('divisions').doc(divisionData.divisionCode).get();
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

    await adminDb!.collection('divisions').doc(divisionData.divisionCode).set(divisionDoc);

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

    await adminDb!.collection('divisions').doc(divisionId).update(updateData);

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

export async function createDepartment(departmentData: {
  departmentCode: string;
  departmentName: string;
  divisionId: string;
  isInactive: boolean;
}): Promise<{ success: boolean; message: string; department?: Department }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  try {
    const existingDepartment = await adminDb!.collection('departments').doc(departmentData.departmentCode).get();
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

    await adminDb!.collection('departments').doc(departmentData.departmentCode).set(departmentDoc);

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

    await adminDb!.collection('departments').doc(departmentId).update(updateData);

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
