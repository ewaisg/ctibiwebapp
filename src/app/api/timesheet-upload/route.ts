import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { sanitizeDocumentId, sanitizeEmployeeId } from '@/lib/security-utils';
import { getPayItemName } from '@/config/pay-items';

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

  // Sanitize employeeNumber to prevent NoSQL injection
  const sanitizedEmployeeNumber = sanitizeEmployeeId(employeeNumber);
  if (!sanitizedEmployeeNumber) return null;

  const employeesSnapshot = await adminDb
    .collection('employees')
    .where('employeeNumber', '==', sanitizedEmployeeNumber)
    .limit(1)
    .get();

  if (employeesSnapshot.empty) return null;
  const resultId = employeesSnapshot.docs[0].data().id;
  // Sanitize returned ID to prevent injection
  return sanitizeDocumentId(resultId);
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

  // Sanitize employeeId to prevent NoSQL injection in query
  const sanitizedEmployeeId = sanitizeDocumentId(employeeId);
  if (!sanitizedEmployeeId) return false;

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  const existingSnapshot = await adminDb
    .collection('cti_timesheets')
    .where('employeeId', '==', sanitizedEmployeeId)
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

async function postHandler(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.group(`📥 Timesheet upload POST ${requestId}`);
  try {
    console.log(`[${requestId}] Reading form data`);
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadId = formData.get('uploadId') as string;
    console.log(`[${requestId}] Received payload:`, { hasFile: !!file, uploadId, fileName: file?.name, fileSize: file?.size, fileType: file?.type });

    if (!file || !uploadId) {
      console.warn(`[${requestId}] Missing file or uploadId`);
      return NextResponse.json({ error: 'File and uploadId required' }, { status: 400 });
    }

    // Initialize progress
    console.log(`[${requestId}] Initializing progress tracking for upload ${uploadId}`);
    uploadProgress.set(uploadId, {
      status: 'processing',
      currentEntry: 0,
      totalEntries: 0,
      processed: 0,
      duplicates: 0,
      errors: 0,
      message: 'Reading file...'
    });

    console.log(`[${requestId}] Converting file buffer and parsing workbook`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!worksheet) {
      console.error(`[${requestId}] Worksheet not found in file`);
      uploadProgress.set(uploadId, { status: 'error', message: 'Worksheet not found' });
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 400 });
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalRows = range.e.r + 1;
    const totalEntries = totalRows - 1;
    console.log(`[${requestId}] Worksheet stats:`, { totalRows, totalEntries });

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
      console.groupCollapsed(`[${requestId}] Processing row ${rowIndex + 1}/${totalRows}`);
      try {
        // Extract data
        // Sanitize extracted data to prevent XSS and NoSQL injection
        // Remove HTML/script chars AND special chars that could be used in NoSQL injection
        const sanitizeValue = (val: any) => {
          if (!val) return '';
          return String(val)
            .replace(/[<>"'&$]/g, '') // Remove HTML and $ (NoSQL operator)
            .replace(/\{|\}|\[|\]/g, '') // Remove curly braces and brackets (JSON injection)
            .trim()
            .substring(0, 500); // Limit length to prevent DoS
        };

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

        console.log(`[${requestId}] Parsed row values:`, {
          employeeNumber,
          employeeFirstName,
          employeeLastName,
          day,
          startTime,
          endTime,
          payItemHourValue,
          division,
          customer,
          projectCategories,
          notesLength: notes?.length || 0
        });

        // Validate required fields
        if (!employeeNumber || !timecardDateValue || !payItemHourValue || !payItemCode) {
          console.warn(`[${requestId}] Missing required fields, skipping row`);
          errors++;
          continue;
        }

        const timecardDate = parseExcelDate(timecardDateValue);
        const payItemHours = typeof payItemHourValue === 'number' ? payItemHourValue : parseFloat(payItemHourValue?.toString() || '0');
        console.log(`[${requestId}] Parsed date/hours:`, { timecardDate, payItemHours });

        if (!timecardDate || isNaN(payItemHours) || payItemHours <= 0) {
          console.warn(`[${requestId}] Invalid date or hours, skipping row`);
          errors++;
          continue;
        }

        const employeeId = await getEmployeeIdByNumber(employeeNumber);
        console.log(`[${requestId}] Employee lookup result:`, { employeeNumber, employeeId });
        if (!employeeId) {
          console.warn(`[${requestId}] Employee not found, skipping row`);
          errors++;
          continue;
        }

        // Check for duplicates
        const isDuplicate = await checkForDuplicate(
          employeeId, employeeNumber, employeeFirstName, employeeLastName,
          timecardDate, day, startTime, endTime, payItemCode, payItemHours,
          division || '', customer || '', projectCategories || '', notes || ''
        );
        console.log(`[${requestId}] Duplicate check result:`, isDuplicate);

        if (isDuplicate) {
          console.info(`[${requestId}] Duplicate detected, skipping row`);
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
        console.log(`[${requestId}] Prepared timesheet payload`, { docId, laborsCount: labors.length, payItemsCount: payItems.length });
        await adminDb!.collection('cti_timesheets').doc(docId).set(timesheetData);
        console.log(`[${requestId}] Successfully wrote document ${docId}`);

        processed++;

      } catch (error) {
        console.error(`[${requestId}] Error processing row`, error);
        errors++;
      } finally {
        console.groupEnd();
      }
    }

    console.log(`[${requestId}] Processing complete`, { processed, duplicates, errors });

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

    console.groupEnd();
    return NextResponse.json({
      success: true,
      processed,
      duplicates,
      errors,
      message: `Processing complete: ${processed} processed, ${duplicates} duplicates, ${errors} errors`
    });

  } catch (error) {
    console.error(`[${requestId}] Upload error`, error);
    console.groupEnd();
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

async function getHandler(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.group(`📊 Timesheet upload GET ${requestId}`);
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    console.log(`[${requestId}] Query params:`, { uploadId });

    if (!uploadId) {
      console.warn(`[${requestId}] Missing uploadId`);
      return NextResponse.json({ error: 'uploadId required' }, { status: 400 });
    }

    const progress = uploadProgress.get(uploadId);
    console.log(`[${requestId}] Progress lookup result:`, progress);
    if (!progress) {
      console.warn(`[${requestId}] Upload not found`);
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error(`[${requestId}] Progress endpoint error`, error);
    return NextResponse.json({ error: 'Progress check failed' }, { status: 500 });
  } finally {
    console.groupEnd();
  }
}

// Wrap with authentication and rate limiting
export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => postHandler(req));
  // Strict rate limit: 10 uploads per hour (uploading is resource intensive)
  return withRateLimit(handler, { maxRequests: 10, windowMs: 60 * 60 * 1000 })(request);
}

export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => getHandler(req));
  // More lenient for progress checks: 60 per minute
  return withRateLimit(handler, { maxRequests: 60, windowMs: 60 * 1000 })(request);
}