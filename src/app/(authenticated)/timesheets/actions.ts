'use server';

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface UploadResult {
    success: boolean;
    message: string;
    processed?: number;
    duplicates?: number;
    errors?: number;
}

// Fixed column structure - columns A to M
interface TimesheetRow {
    employeeNumber: string;        // Column A
    employeeLastName: string;      // Column B
    employeeFirstName: string;     // Column C
    timecardDate: string;          // Column D
    day: string;                   // Column E
    startTime: string;             // Column F
    endTime: string;               // Column G
    division: string;              // Column H
    customer: string;              // Column I
    projectCategories: string;     // Column J
    payItemHour: number;           // Column K
    payItemCode: string;           // Column L
    notes: string;                 // Column M
}

// Pay item code to name mapping
const PAY_ITEM_NAMES: Record<string, string> = {
    '1099COMP': '1099-NEC Comp',
    'BER': 'Bereavement',
    'CTI_REG': 'CTI Regular',
    'CTI_OVT': 'CTI Overtime',
    'FLTHOL': 'Float Holiday',
    'HOL': 'Holiday',
    'JURY': 'Jury Duty',
    'OVT15': 'Overtime @ 1.5',
    'PTO': 'Paid Time Off',
    'HRLY': 'Regular Hourly',
    'SalaryHrs': 'Salary Track',
    'LV_UNPD': 'Unpaid Leave',
    'MIL': 'Military Unpaid'
};

/**
 * Helper function to get cell value from worksheet
 */
function getCellValue(worksheet: XLSX.WorkSheet, row: number, col: number): any {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = worksheet[cellAddress];
    return cell ? cell.v : undefined;
}

/**
 * Parse time value and return formatted time string (e.g., "06:00 AM")
 */
function parseTimeValue(value: any): string | null {
    if (!value) return null;
    
    // Handle string format
    if (typeof value === 'string') {
        const trimmed = value.trim();
        
        // Extract time from datetime string (e.g., "8/11/2025 6:00:00 AM" -> "6:00 AM")
        const datetimeMatch = trimmed.match(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);
        if (datetimeMatch) {
            const timeStr = datetimeMatch[0];
            // Remove seconds (e.g., "6:00:00 AM" -> "6:00 AM")
            return timeStr.replace(/(\d{1,2}:\d{2}):\d{2}(\s*(?:AM|PM))/i, '$1$2');
        }
        
        // Handle simple time format (e.g., "06:00 AM")
        const timeMatch = trimmed.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
        if (timeMatch) {
            return timeMatch[0];
        }
    }
    
    // Handle Excel serial number (decimal between 0 and 1, or extract time from full datetime)
    if (typeof value === 'number') {
        // Extract time portion from full datetime (MOD operation)
        const timePortion = value - Math.floor(value);
        const totalMinutes = Math.round(timePortion * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
    
    return null;
}

/**
 * Parse day value and return just the day name (e.g., "Monday")
 */
function parseDayValue(value: any): string | null {
    if (!value) return null;
    
    // Handle string format
    if (typeof value === 'string') {
        const trimmed = value.trim();
        
        // Extract day from full date string (e.g., "Monday, August 11, 2025" -> "Monday")
        const dayMatch = trimmed.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
        if (dayMatch) {
            return dayMatch[1];
        }
        
        // Parse date and get day name
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', { weekday: 'long' });
        }
    }
    
    // Handle Excel serial number
    if (typeof value === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    return null;
}

/**
 * Parse Excel date value to Date object
 */
function parseExcelDate(value: any): Date | null {
    if (!value) return null;
    
    // Handle Excel serial number (number between 1 and ~50000 for reasonable dates)
    if (typeof value === 'number') {
        // Excel serial date: days since January 1, 1900
        // But Excel incorrectly treats 1900 as a leap year, so we adjust
        const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        
        // Validate the date is reasonable (between 1900 and 2100)
        if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
            return date;
        }
    }
    
    // Handle string dates
    if (typeof value === 'string') {
        const trimmed = value.trim();
        
        // Try MM/dd/yyyy format first
        const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmddyyyyMatch) {
            const month = parseInt(mmddyyyyMatch[1], 10) - 1;
            const day = parseInt(mmddyyyyMatch[2], 10);
            const year = parseInt(mmddyyyyMatch[3], 10);
            return new Date(year, month, day);
        }
        
        // Try native Date parsing
        const date = new Date(trimmed);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
            return date;
        }
    }
    
    return null;
}

/**
 * Helper function to look up employee ID by employee number
 */
async function getEmployeeIdByNumber(employeeNumber: string): Promise<string | null> {
    if (!adminDb) throw new Error("Firestore is not initialized.");
    
    const employeesSnapshot = await adminDb
        .collection('employees')
        .where('employeeNumber', '==', employeeNumber)
        .limit(1)
        .get();

    if (employeesSnapshot.empty) {
        return null;
    }

    const employeeData = employeesSnapshot.docs[0].data();
    return employeeData.id || null;
}

/**
 * Helper function to generate document ID
 */
function generateDocumentId(employeeId: string, date: Date): string {
    const datePart = format(date, 'yyyy-MM-dd');
    const timePart = Date.now() + Math.random();
    return `emp${employeeId}_d${datePart}_t${timePart}`;
}

/**
 * Check for duplicate timesheet entries by comparing all row fields
 */
async function checkForDuplicate(
    employeeId: string,
    employeeNumber: string,
    employeeFirstName: string,
    employeeLastName: string,
    date: Date,
    day: string | null,
    startTime: string | null,
    endTime: string | null,
    payItemCode: string,
    hours: number,
    division: string,
    customer: string,
    projectCategories: string,
    notes: string
): Promise<boolean> {
    if (!adminDb) throw new Error("Firestore is not initialized.");

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const existingSnapshot = await adminDb
        .collection('cti_timesheets')
        .where('employeeId', '==', employeeId)
        .where('timecardDate', '>=', Timestamp.fromDate(startOfDay))
        .where('timecardDate', '<', Timestamp.fromDate(endOfDay))
        .get();

    // Check for exact match of ALL fields
    for (const doc of existingSnapshot.docs) {
        const existing = doc.data();
        const existingPayItem = existing.payItems?.[0];
        const existingDivision = existing.labors?.find((l: { laborTitle: string; laborValue: string }) => l.laborTitle === 'Division')?.laborValue || '';
        const existingCustomer = existing.labors?.find((l: { laborTitle: string; laborValue: string }) => l.laborTitle === 'Customer')?.laborValue || '';
        const existingProject = existing.labors?.find((l: { laborTitle: string; laborValue: string }) => l.laborTitle === 'Project/Categories')?.laborValue || '';
        
        if (existing.employeeNumber === employeeNumber &&
            existing.employeeFirstName === employeeFirstName &&
            existing.employeeLastName === employeeLastName &&
            (existing.day || '') === (day || '') &&
            (existing.startTime || '') === (startTime || '') &&
            (existing.endTime || '') === (endTime || '') &&
            existingPayItem?.payItemCode === payItemCode &&
            existing.totalHoursActual === hours &&
            existingDivision === division &&
            existingCustomer === customer &&
            existingProject === projectCategories &&
            (existing.notes || '') === (notes || '')) {
            return true;
        }
    }

    return false;
}



/**
 * Main function to process timesheet XLSX upload with fixed column structure
 */
export async function processTimesheetUpload(file: File): Promise<UploadResult> {
    console.log('🚀 Starting timesheet upload process');
    console.log('📁 File info:', { name: file.name, size: file.size, type: file.type });
    
    if (!adminDb) throw new Error("Firestore is not initialized.");

    try {
        console.log('📖 Reading file buffer...');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log('📊 Parsing XLSX workbook...');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
            console.error('❌ Worksheet not found');
            return { success: false, message: 'Worksheet not found' };
        }

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const totalRows = range.e.r + 1;
        console.log(`📋 Found ${totalRows} rows (including header)`);

        let processed = 0;
        let duplicates = 0;
        let errors = 0;

        // Process each row (skip header row)
        for (let rowIndex = 1; rowIndex < totalRows; rowIndex++) {
            console.log(`\n🔄 Processing row ${rowIndex + 1}/${totalRows}`);
            try {
                // Extract data from fixed columns A-M
                const employeeNumber = getCellValue(worksheet, rowIndex, 0)?.toString().trim(); // A
                const employeeLastName = getCellValue(worksheet, rowIndex, 1)?.toString().trim(); // B
                const employeeFirstName = getCellValue(worksheet, rowIndex, 2)?.toString().trim(); // C
                const timecardDateValue = getCellValue(worksheet, rowIndex, 3); // D
                const dayValue = getCellValue(worksheet, rowIndex, 4); // E
                const startTimeValue = getCellValue(worksheet, rowIndex, 5); // F
                const endTimeValue = getCellValue(worksheet, rowIndex, 6); // G
                const division = getCellValue(worksheet, rowIndex, 7)?.toString().trim(); // H
                const customer = getCellValue(worksheet, rowIndex, 8)?.toString().trim(); // I
                const projectCategories = getCellValue(worksheet, rowIndex, 9)?.toString().trim(); // J
                const payItemHourValue = getCellValue(worksheet, rowIndex, 10); // K
                const payItemCode = getCellValue(worksheet, rowIndex, 11)?.toString().trim(); // L
                const notes = getCellValue(worksheet, rowIndex, 12)?.toString().trim(); // M

                console.log('📝 Raw cell values:', {
                    employeeNumber, employeeLastName, employeeFirstName,
                    timecardDateValue, dayValue, startTimeValue, endTimeValue,
                    division, customer, projectCategories, payItemHourValue, payItemCode, notes
                });

                // Parse values to proper formats
                const day = parseDayValue(dayValue);
                const startTime = parseTimeValue(startTimeValue);
                const endTime = parseTimeValue(endTimeValue);
                
                console.log('🔄 Parsed values:', { day, startTime, endTime });

                // Validate required fields
                if (!employeeNumber || !timecardDateValue || !payItemHourValue || !payItemCode) {
                    errors++;
                    continue;
                }

                // Parse date and hours
                const timecardDate = parseExcelDate(timecardDateValue);
                const payItemHours = typeof payItemHourValue === 'number' ? payItemHourValue : parseFloat(payItemHourValue?.toString() || '0');
                
                console.log('📅 Date parsing:', { timecardDateValue, timecardDate });
                console.log('⏰ Hours parsing:', { payItemHourValue, payItemHours });

                if (!timecardDate || isNaN(payItemHours) || payItemHours <= 0) {
                    console.warn('⚠️ Invalid data - skipping row:', { timecardDate, payItemHours });
                    errors++;
                    continue;
                }

                // Get employee ID
                console.log('👤 Looking up employee:', employeeNumber);
                const employeeId = await getEmployeeIdByNumber(employeeNumber);
                if (!employeeId) {
                    console.warn('❌ Employee not found:', employeeNumber);
                    errors++;
                    continue;
                }
                console.log('✅ Employee found:', { employeeNumber, employeeId });

                // Check for duplicates
                console.log('🔍 Checking for duplicates...');
                const isDuplicate = await checkForDuplicate(
                    employeeId,
                    employeeNumber,
                    employeeFirstName,
                    employeeLastName,
                    timecardDate,
                    day,
                    startTime,
                    endTime,
                    payItemCode,
                    payItemHours,
                    division || '',
                    customer || '',
                    projectCategories || '',
                    notes || ''
                );

                if (isDuplicate) {
                    console.log('🔄 Duplicate found - skipping');
                    duplicates++;
                    continue;
                }

                // Build labors array
                const labors: { laborTitle: string; laborValue: string; }[] = [];
                if (division) labors.push({ laborTitle: 'Division', laborValue: division });
                if (customer) labors.push({ laborTitle: 'Customer', laborValue: customer });
                if (projectCategories) labors.push({ laborTitle: 'Project/Categories', laborValue: projectCategories });

                // Build pay items array
                const payItems = [{
                    payItemCode,
                    payItemHours,
                    payItemName: PAY_ITEM_NAMES[payItemCode] || payItemCode
                }];

                // Create timesheet document
                const timesheetData = {
                    employeeId,
                    employeeNumber,
                    employeeFirstName,
                    employeeLastName,
                    timecardDate: Timestamp.fromDate(timecardDate),
                    day: day || null,
                    startTime: startTime || null,
                    endTime: endTime || null,
                    totalHoursActual: payItemHours,
                    labors,
                    payItems,
                    notes: notes || null
                };

                console.log('💾 Final timesheet data:', timesheetData);

                // Save to Firestore
                const docId = generateDocumentId(employeeId, timecardDate);
                console.log('🔥 Saving to Firestore with ID:', docId);
                await adminDb.collection('cti_timesheets').doc(docId).set(timesheetData);
                console.log('✅ Successfully saved to Firestore');

                processed++;

            } catch (error) {
                console.error(`❌ Row ${rowIndex + 1} error:`, error);
                errors++;
            }
        }
        
        console.log('\n📊 Final results:', { processed, duplicates, errors });

        const result = {
            success: true,
            message: `Processing complete: ${processed} processed, ${duplicates} duplicates, ${errors} errors`,
            processed,
            duplicates,
            errors
        };
        
        console.log('🎉 Upload completed successfully:', result);
        return result;

    } catch (error) {
        console.error('💥 Fatal error processing timesheet upload:', error);
        return {
            success: false,
            message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Delete selected timesheet entries by IDs
 */
export async function deleteTimesheetEntries(entryIds: string[]): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");
  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return { success: false, deleted: 0, errors: ['No entry IDs provided'] };
  }

  const errors: string[] = [];
  let deleted = 0;

  try {
    const batch = adminDb.batch();
    
    for (const entryId of entryIds) {
      const docRef = adminDb.collection('cti_timesheets').doc(entryId);
      batch.delete(docRef);
    }
    
    await batch.commit();
    deleted = entryIds.length;
    
    return { success: true, deleted, errors };
  } catch {
    const error = new Error('Unknown error during deletion');
    errors.push(error.message);
    return { success: false, deleted, errors };
  }
}

/**
 * Delete all timesheets
 */
export async function deleteAllTimesheets(): Promise<{ success: boolean; deleted: number; errors?: string[] }> {
  if (!adminDb) throw new Error("Firestore is not initialized.");

  let deleted = 0;
  const errors: string[] = [];

  try {
    while (true) {
      const snapshot = await adminDb.collection('cti_timesheets').limit(500).get();
      
      if (snapshot.empty) break;
      
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deleted += snapshot.docs.length;
    }
    } catch (e: unknown) {
        const error = e as Error;
    errors.push(error?.message || 'Unknown error during bulk deletion');
    return { success: false, deleted, errors };
  }

  return { success: true, deleted };
}
