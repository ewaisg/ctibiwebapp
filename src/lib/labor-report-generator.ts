import { format } from 'date-fns';
import { extractId } from '@/lib/document-reference-utils';
import { generateTimesheetReportPdf } from '@/lib/timesheet-report-pdf';
import type { Invoice, Project, Employee, Company } from '@/types';

function convertToDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof dateValue === 'object' && dateValue.seconds) {
    return new Date(dateValue.seconds * 1000);
  }
  if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  return null;
}

export async function generateDirectLaborReport(
  invoice: Invoice,
  project: Project,
  employees: Employee[],
  companies: Company[]
): Promise<Buffer | null> {
  console.log(`[Labor Report] Generating for invoice ${invoice.id}`);
  
  // For autofilled invoices, regenerate timesheet data from database
  if (invoice.autofillSource !== 'timesheet') {
    console.log(`[Labor Report] Skipping - not autofilled from timesheet`);
    return null;
  }
  
  // Fetch fresh timesheet data based on invoice period and project
  const { getAllTimesheetEntries } = await import('@/app/invoicing/actions');
  const allTimesheets = await getAllTimesheetEntries();
  
  const fromDate = convertToDate(invoice.fromDate);
  const toDate = convertToDate(invoice.toDate);
  
  if (!fromDate || !toDate) {
    console.log(`[Labor Report] Invalid date range`);
    return null;
  }
  
  // Filter timesheet entries for this invoice's period and project
  const relevantEntries = allTimesheets.filter(entry => {
    const entryDate = convertToDate(entry.timecardDate);
    if (!entryDate) return false;
    
    const isDateInRange = entryDate >= fromDate && entryDate <= toDate;
    if (!isDateInRange) return false;
    
    // Check if entry matches project
    const projectLabor = entry.labors?.find(l => {
      if (!l.laborTitle || !l.laborValue) return false;
      const isProjectLabor = l.laborTitle === 'Project/Categories';
      if (!isProjectLabor) return false;
      const laborValue = l.laborValue.toString().trim();
      return laborValue === project.poNumber;
    });
    
    return !!projectLabor;
  });
  
  const entries: any[] = [];
  
  relevantEntries.forEach(entry => {
    const employee = employees.find(e => e.id === entry.employeeId.toString());
    
    entries.push({
      employeeLastName: employee?.lastName || 'Unknown',
      employeeFirstName: employee?.firstName || 'Unknown',
      day: format(convertToDate(entry.timecardDate) || new Date(), 'EEEE'),
      date: convertToDate(entry.timecardDate) || new Date(),
      start: entry.startTime || '',
      end: entry.endTime || '',
      hours: entry.totalHoursActual || 0,
      notes: entry.notes || ''
    });
  });
  
  console.log(`[Labor Report] Generated ${entries.length} entries for invoice ${invoice.id}`);

  if (entries.length === 0) return null;

  const company = companies.find(c => c.id === extractId(invoice.submitterCompanyId));
  
  const reportInfo = {
    companyName: company?.companyName || 'Unknown Company',
    invoiceNumber: invoice.invoiceNumber || invoice.id || '',
    contractNumber: invoice.contractNumber?.toString() || '',
    projectName: project.projectName || 'Unknown Project',
    poNumber: project.poNumber || '',
    billingPeriod: `${format(convertToDate(invoice.fromDate) || new Date(), 'MM/dd/yyyy')} - ${format(convertToDate(invoice.toDate) || new Date(), 'MM/dd/yyyy')}`,
    entries
  };

  return await generateTimesheetReportPdf(reportInfo);
}

export function shouldGenerateLaborReport(invoice: Invoice): boolean {
  const shouldGenerate = invoice.autofillSource === 'timesheet';
  console.log(`[Labor Report] Invoice ${invoice.id} - autofillSource: ${invoice.autofillSource}, shouldGenerate: ${shouldGenerate}`);
  return shouldGenerate;
}