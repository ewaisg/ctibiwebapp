'use server';

import * as XLSX from 'xlsx';
import type { Company } from '@/types';
import {
  adminDb,
  Timestamp,
  sanitizeForLog,
  getCellValue,
} from './admin-shared';

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
    const existingCompany = await adminDb!.collection('companies').doc(companyData.companyCode).get();
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

    await adminDb!.collection('companies').doc(companyData.companyCode).set(companyDoc);

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

    await adminDb!.collection('companies').doc(companyId).update(updateData);

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
