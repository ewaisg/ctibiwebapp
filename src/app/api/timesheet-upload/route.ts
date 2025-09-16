import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Store progress in memory (in production, use Redis or database)
const uploadProgress = new Map<string, any>();


// Helper functions (copied from actions.ts)
function getCellValue(worksheet: XLSX.WorkSheet, row: number, col: number): any {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];
  return cell ? cell.v : undefined;
}

function parseTimeValue(value: any): string | null {
  if (!value) return null;
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const datetimeMatch = trimmed.match(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);
    if (datetimeMatch) {
      const timeStr = datetimeMatch[0];
      return timeStr.replace(/(\d{1,2}:\d{2}):\d{2}(\s*(?:AM|PM))/i, '$1$2');
    }
    const timeMatch = trimmed.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i);
    if (timeMatch) return timeMatch[0];
  }
  
  if (typeof value === 'number') {
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

function parseDayValue(value: any): string | null {
  if (!value) return null;
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dayMatch = trimmed.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
    if (dayMatch) return dayMatch[1];
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
  }
  
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  return null;
}

function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
      return date;
    }
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyMatch) {
      const month = parseInt(mmddyyyyMatch[1], 10) - 1;
      const day = parseInt(mmddyyyyMatch[2], 10);
      const year = parseInt(mmddyyyyMatch[3], 10);
      return new Date(year, month, day);
    }
    const date = new Date(trimmed);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
      return date;
    }
  }
  
  return null;
}

async function getEmployeeIdByNumber(employeeNumber: string): Promise<string | null> {
  if (!adminDb) return null;
  
  const employeesSnapshot = await adminDb
    .collection('employees')
    .where('employeeNumber', '==', employeeNumber)
    .limit(1)
    .get();

  if (employeesSnapshot.empty) return null;
  return employeesSnapshot.docs[0].data().id || null;
}

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
  if (!adminDb) return false;

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  
  const existingSnapshot = await adminDb
    .collection('cti_timesheets')
    .where('employeeId', '==', employeeId)
    .where('timecardDate', '>=', Timestamp.fromDate(startOfDay))
    .where('timecardDate', '<', Timestamp.fromDate(endOfDay))
    .get();

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadId = formData.get('uploadId') as string;

    if (!file || !uploadId) {
      return NextResponse.json({ error: 'File and uploadId required' }, { status: 400 });
    }

    // Initialize progress
    uploadProgress.set(uploadId, {
      status: 'processing',
      currentEntry: 0,
      totalEntries: 0,
      processed: 0,
      duplicates: 0,
      errors: 0,
      message: 'Reading file...'
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      uploadProgress.set(uploadId, { status: 'error', message: 'Worksheet not found' });
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 400 });
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalRows = range.e.r + 1;
    const totalEntries = totalRows - 1; // Exclude header

    // Update progress with total
    uploadProgress.set(uploadId, {
      status: 'processing',
      currentEntry: 0,
      totalEntries,
      processed: 0,
      duplicates: 0,
      errors: 0,
      message: `Processing ${totalEntries} entries...`
    });

    let processed = 0;
    let duplicates = 0;
    let errors = 0;

    // Process each row
    for (let rowIndex = 1; rowIndex < totalRows; rowIndex++) {
      const currentEntry = rowIndex;
      
      try {
        // Extract data
        // Sanitize extracted data to prevent XSS
        const sanitizeValue = (val: any) => val ? String(val).replace(/[<>"'&]/g, '').trim() : '';
        
        const employeeNumber = sanitizeValue(getCellValue(worksheet, rowIndex, 0));
        const employeeLastName = sanitizeValue(getCellValue(worksheet, rowIndex, 1));
        const employeeFirstName = sanitizeValue(getCellValue(worksheet, rowIndex, 2));
        const timecardDateValue = getCellValue(worksheet, rowIndex, 3);
        const dayValue = getCellValue(worksheet, rowIndex, 4);
        const startTimeValue = getCellValue(worksheet, rowIndex, 5);
        const endTimeValue = getCellValue(worksheet, rowIndex, 6);
        const division = sanitizeValue(getCellValue(worksheet, rowIndex, 7));
        const customer = sanitizeValue(getCellValue(worksheet, rowIndex, 8));
        const projectCategories = sanitizeValue(getCellValue(worksheet, rowIndex, 9));
        const payItemHourValue = getCellValue(worksheet, rowIndex, 10);
        const payItemCode = sanitizeValue(getCellValue(worksheet, rowIndex, 11));
        const notes = sanitizeValue(getCellValue(worksheet, rowIndex, 12));

        // Update progress with current employee
        uploadProgress.set(uploadId, {
          status: 'processing',
          currentEntry,
          totalEntries,
          processed,
          duplicates,
          errors,
          currentEmployee: `${employeeFirstName} ${employeeLastName}`,
          message: `Processing ${employeeFirstName} ${employeeLastName}...`
        });

        // Parse values
        const day = parseDayValue(dayValue);
        const startTime = parseTimeValue(startTimeValue);
        const endTime = parseTimeValue(endTimeValue);

        // Validate required fields
        if (!employeeNumber || !timecardDateValue || !payItemHourValue || !payItemCode) {
          errors++;
          continue;
        }

        const timecardDate = parseExcelDate(timecardDateValue);
        const payItemHours = typeof payItemHourValue === 'number' ? payItemHourValue : parseFloat(payItemHourValue?.toString() || '0');

        if (!timecardDate || isNaN(payItemHours) || payItemHours <= 0) {
          errors++;
          continue;
        }

        const employeeId = await getEmployeeIdByNumber(employeeNumber);
        if (!employeeId) {
          errors++;
          continue;
        }

        // Check for duplicates
        const isDuplicate = await checkForDuplicate(
          employeeId, employeeNumber, employeeFirstName, employeeLastName,
          timecardDate, day, startTime, endTime, payItemCode, payItemHours,
          division || '', customer || '', projectCategories || '', notes || ''
        );

        if (isDuplicate) {
          duplicates++;
          continue;
        }

        // Build data and save
        const labors: { laborTitle: string; laborValue: string; }[] = [];
        if (division) labors.push({ laborTitle: 'Division', laborValue: division });
        if (customer) labors.push({ laborTitle: 'Customer', laborValue: customer });
        if (projectCategories) labors.push({ laborTitle: 'Project/Categories', laborValue: projectCategories });

        const payItems = [{
          payItemCode,
          payItemHours,
          payItemName: getPayItemName(payItemCode)
        }];

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

        const docId = `emp${employeeId}_d${timecardDate.toISOString().split('T')[0]}_t${Date.now()}_${Math.random()}`;
        await adminDb!.collection('cti_timesheets').doc(docId).set(timesheetData);

        processed++;

      } catch (error) {
        errors++;
      }
    }

    // Final progress update
    uploadProgress.set(uploadId, {
      status: 'completed',
      currentEntry: totalEntries,
      totalEntries,
      processed,
      duplicates,
      errors,
      message: `Completed! ${processed} processed, ${duplicates} duplicates, ${errors} errors`
    });

    return NextResponse.json({
      success: true,
      processed,
      duplicates,
      errors,
      message: `Processing complete: ${processed} processed, ${duplicates} duplicates, ${errors} errors`
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');

  if (!uploadId) {
    return NextResponse.json({ error: 'uploadId required' }, { status: 400 });
  }

  const progress = uploadProgress.get(uploadId);
  if (!progress) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  return NextResponse.json(progress);
}

function getPayItemName(code: string): string {
  const names: Record<string, string> = {
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
  return names[code] || code;
}