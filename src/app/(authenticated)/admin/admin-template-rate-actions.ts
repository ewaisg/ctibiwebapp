'use server';

import {
  adminDb,
  Timestamp,
  sanitizeForLog,
} from './admin-shared';

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

    const docRef = await adminDb!.collection('invoice_templates').add(templateDoc);

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

    await adminDb!.collection('invoice_templates').doc(templateId).update(updateData);

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
      serviceId: adminDb!.doc(`services/${rateData.serviceId}`),
      serviceName: rateData.serviceName,
      standardRate: rateData.standardRate,
      effectiveDate: Timestamp.fromDate(rateData.effectiveDate),
      expirationDate: rateData.expirationDate ? Timestamp.fromDate(rateData.expirationDate) : null,
      approvedBy: adminDb!.doc(`users/${rateData.approvedBy}`),
      approvedByName: rateData.approvedByName,
      approvalDate: Timestamp.now(),
      isActive: rateData.isActive,
      notes: rateData.notes || null,
    };

    const docRef = await adminDb!.collection('global_rates').add(rateDoc);

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

    await adminDb!.collection('global_rates').doc(rateId).update(updateData);

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
