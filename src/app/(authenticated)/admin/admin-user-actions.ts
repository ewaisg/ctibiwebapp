'use server';

import * as XLSX from 'xlsx';
import { getAuth } from 'firebase-admin/auth';
import type { User } from '@/types';
import {
  adminDb,
  Timestamp,
  sanitizeForLog,
  UserFormData,
  UserImportResult,
  UserActionResult,
  checkUserExists,
  getCompanyById,
  generateSecurePassword,
  discoverUserColumnMapping,
  getCellValue,
} from './admin-shared';

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

    await adminDb!.collection('users').doc(firebaseUser.uid).set(userDoc);

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

    await adminDb!.collection('users').doc(uid).update(updateData);

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
        const role = getCellValue(worksheet, XLSX.utils.encode_cell({ r: rowIndex, c: columnMapping.ROLE! }))?.toString().trim() as any;
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

export async function deleteUserAndAccount(uid: string): Promise<{ success: boolean; message: string }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  try {
    const auth = getAuth();

    // Delete from Auth first to prevent orphaned login access
    await auth.deleteUser(uid);

    // Then delete Firestore user document
    await adminDb!.collection('users').doc(uid).delete();

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', sanitizeForLog(error));
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete user' };
  }
}
