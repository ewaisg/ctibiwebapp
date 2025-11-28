// src/app/manpower/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Assignment } from '@/types';

// Add a single assignment
export async function addAssignmentAction(data: Omit<Assignment, 'id'>) {
    if (!adminDb) throw new Error("Firestore is not initialized.");
    
    // Convert weekStartDate to proper Date for Timestamp.fromDate
    let weekStartDate: Date;
    if (data.weekStartDate instanceof Date) {
        weekStartDate = data.weekStartDate;
    } else if (data.weekStartDate && typeof data.weekStartDate === 'object' && 'toDate' in data.weekStartDate) {
        weekStartDate = (data.weekStartDate as any).toDate();
    } else {
        weekStartDate = new Date(data.weekStartDate as string);
    }

    const assignmentData = {
        ...data,
        weekStartDate: Timestamp.fromDate(weekStartDate),
    };

    await adminDb.collection('resource_allocations').add(assignmentData);
    revalidatePath('/manpower');
}

// Update a single assignment
export async function updateAssignmentAction(id: string, data: Partial<Omit<Assignment, 'id'>>) {
    if (!adminDb) throw new Error("Firestore is not initialized.");
    
    const dataToUpdate = { ...data };
    if (data.weekStartDate) {
        let weekStartDate: Date;
        if (data.weekStartDate instanceof Date) {
            weekStartDate = data.weekStartDate;
        } else if (data.weekStartDate && typeof data.weekStartDate === 'object' && 'toDate' in data.weekStartDate) {
            weekStartDate = (data.weekStartDate as any).toDate();
        } else {
            weekStartDate = new Date(data.weekStartDate as string);
        }
        (dataToUpdate as any).weekStartDate = Timestamp.fromDate(weekStartDate);
    }

    await adminDb.collection('resource_allocations').doc(id).update(dataToUpdate);
    revalidatePath('/manpower');
}

// Delete a single assignment
export async function deleteAssignmentAction(id: string) {
    if (!adminDb) throw new Error("Firestore is not initialized.");
    await adminDb.collection('resource_allocations').doc(id).delete();
    revalidatePath('/manpower');
}

// Delete all assignments for a specific employee-project combination
export async function deleteProjectAssignmentsAction(employeeId: string, projectId: string) {
    if (!adminDb) throw new Error("Firestore is not initialized.");

    const querySnapshot = await adminDb.collection('resource_allocations')
        .where('employeeId', '==', employeeId)
        .where('projectId', '==', projectId)
        .get();

    if (querySnapshot.empty) {
        return; // No documents to delete
    }

    const batch = adminDb.batch();
    querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    revalidatePath('/manpower');
}

// Update the service title (role) for all assignments of an employee on a project
export async function updateAssignmentRoleAction(employeeId: string, projectId: string, serviceTitle: string, serviceId: string) {
    if (!adminDb) throw new Error("Firestore is not initialized.");

    const querySnapshot = await adminDb.collection('resource_allocations')
        .where('employeeId', '==', employeeId)
        .where('projectId', '==', projectId)
        .get();

    if (querySnapshot.empty) {
        return;
    }

    const batch = adminDb.batch();
    querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { serviceTitle, serviceId });
    });

    await batch.commit();
    revalidatePath('/manpower');
}


// Switch all assignments from one project to another for an employee
export async function switchProjectAssignmentsAction(employeeId: string, oldProjectId: string, newProjectId: string) {
    if (!adminDb) throw new Error("Firestore is not initialized.");

    const querySnapshot = await adminDb.collection('resource_allocations')
        .where('employeeId', '==', employeeId)
        .where('projectId', '==', oldProjectId)
        .get();

    if (querySnapshot.empty) {
        return;
    }

    const batch = adminDb.batch();
    querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { projectId: newProjectId });
    });

    await batch.commit();
    revalidatePath('/manpower');
}
