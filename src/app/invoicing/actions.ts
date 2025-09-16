'use server';

import { z } from 'zod';
import { collection, getDocs, Timestamp, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { format, startOfDay, endOfDay, addMonths, endOfMonth } from 'date-fns';
import { sanitizeForLog, validateInvoiceId, validateContractNumber } from '@/lib/security-utils';
import type { CtiTimesheet, Employee, Company, Service, Rate, Project } from '@/types';

// Initialize Firebase Admin for server-side operations
if (!getApps().length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', sanitizeForLog(error));
  }
}

// Use admin SDK for server-side operations
const adminDb = getApps().length > 0 ? getAdminFirestore() : null;

// Helper function to get data from either client or admin SDK
async function getCollectionData(collectionName: string) {
  // Try client SDK first
  if (db) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching collection with client SDK:', sanitizeForLog(error));
    }
  }
  
  // Fallback to admin SDK
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection(collectionName).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching collection with admin SDK:', sanitizeForLog(error));
    }
  }
  
  console.error('Database not initialized for collection');
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AutofillInputSchema = z.object({
  projectId: z.string().describe('The ID of the project to generate an invoice for.'),
  fromDate: z.string().describe('The start date for the invoice period in ISO format.'),
  toDate: z.string().describe('The end date for the invoice period in ISO format.'),
});

export type AutofillInput = z.infer<typeof AutofillInputSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AutofillOutputSchema = z.object({
  items: z.array(z.object({
    employeeId: z.string(),
    employeeName: z.string(),
    companyId: z.string(),
    companyName: z.string(),
    serviceId: z.string(),
    serviceName: z.string(),
    hours: z.number(),
    billingRate: z.number(),
    amount: z.number(),
    markdown: z.number(),
    notes: z.string(),
  })),
  entriesFound: z.number(),
  totalHours: z.number(),
  projectData: z.object({
    approvingSupervisor: z.string().optional(),
    contractNumber: z.string().optional(),
    poNumber: z.string().optional(),
    pmisNumber: z.string().optional(),
  }).optional(),
  dueDate: z.string().optional(),
  termOfWeek: z.string().optional(),
});

export type AutofillOutput = z.infer<typeof AutofillOutputSchema>;

const BILLABLE_CODES = new Set(['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP']);

export async function autofillFromTimesheets(input: AutofillInput) {
  const { projectId, fromDate: fromDateStr, toDate: toDateStr } = input;
  
  const fromDate = startOfDay(new Date(fromDateStr));
  const toDate = endOfDay(new Date(toDateStr));

  try {
    // Fetch all required data
    const [employees, companies, services, rates, projects, allTimesheets] = await Promise.all([
      getEmployees(),
      getCompanies(), 
      getServices(),
      getRates(),
      getProjects(),
      getAllTimesheetEntries()
    ]);

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error(`Project not found for ID: ${projectId}`);
    }

    // Calculate due date (last day of following month)
    const dueDate = endOfMonth(addMonths(toDate, 1));

    // Calculate term of week based on billing period
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeksDiff = Math.ceil(daysDiff / 7);
    const termOfWeek = weeksDiff <= 4 ? "4-Weeks" : "5-Weeks";

    // Filter timesheet entries for project and date range
    const relevantEntries = allTimesheets.filter(entry => {
      let entryDate: Date;
      
      try {
        if (entry.timecardDate instanceof Date) {
          entryDate = entry.timecardDate;
        } else if (entry.timecardDate && typeof (entry.timecardDate as Timestamp).toDate === 'function') {
          entryDate = (entry.timecardDate as Timestamp).toDate();
        } else {
          entryDate = new Date(entry.timecardDate as unknown as string | number);
        }
      } catch (error) {
        console.error('Error parsing timecard date:', error);
        return false;
      }
      
      // Check if entry matches project - strict matching only
      const projectLabor = entry.labors?.find(l => {
        if (!l.laborTitle || !l.laborValue) return false;
        
        // Only match Project/Categories field with PO number for strict validation
        const isProjectLabor = l.laborTitle === 'Project/Categories';
        
        if (!isProjectLabor) return false;
        
        // Match only against PO number for accuracy
        const laborValue = l.laborValue.toString().trim();
        return laborValue === project.poNumber;
      });
      
      const isDateInRange = entryDate >= fromDate && entryDate <= toDate;
      
      return !!projectLabor && isDateInRange;
    });

    // Aggregate hours by employee with improved billable logic
    const hoursByEmployee: Record<string, { hours: number; entries: typeof relevantEntries }> = {};
    
    relevantEntries.forEach(entry => {
      // Calculate billable hours with improved logic
      const billableHours = entry.payItems
        ?.filter(p => {
          if (!p.payItemCode || !p.payItemHours || p.payItemHours <= 0) return false;
          
          // Use billable codes from XLSX import structure
          if (BILLABLE_CODES.has(p.payItemCode)) {
            // Validate against Project/Categories field from XLSX
            const hasValidProject = entry.labors?.some(l => 
              l.laborTitle === 'Project/Categories' && 
              l.laborValue === project.poNumber
            );
            return hasValidProject;
          }
          
          return false;
        })
        .reduce((sum, p) => sum + (p.payItemHours || 0), 0) || 0;

      if (billableHours > 0) {
        const employeeKey = entry.employeeId.toString();
        if (!hoursByEmployee[employeeKey]) {
          hoursByEmployee[employeeKey] = { hours: 0, entries: [] };
        }
        hoursByEmployee[employeeKey].hours += billableHours;
        hoursByEmployee[employeeKey].entries.push(entry);
      }
    });

    // Validate aggregated hours before processing
    Object.entries(hoursByEmployee).forEach(([employeeIdStr, data]) => {
      if (data.hours > 80) {
        console.warn(`Employee ${employeeIdStr} has ${data.hours} hours - may be duplicate aggregation`);
      }
      if (data.hours <= 0) {
        console.warn(`Employee ${employeeIdStr} has ${data.hours} hours - invalid entry`);
      }
    });

    // Convert to invoice items with improved rate lookup
    let totalAggregatedHours = 0;
    const items = Object.entries(hoursByEmployee)
      .filter(([, data]) => data.hours > 0) // Filter out invalid entries
      .map(([employeeIdStr, data]) => {
      const { hours, entries } = data;
      
      // Find employee by id field since timesheet employeeId matches employee document id
      const employee = employees.find(e => e.id === employeeIdStr);
      
      if (!employee) {
        console.warn(`Employee not found for ID: ${employeeIdStr}`);
        return null;
      }
      
      totalAggregatedHours += hours;
      
      const empCompanyId = typeof employee.companyId === 'object' && employee.companyId.id 
        ? employee.companyId.id 
        : employee.companyId;
      
      const company = companies.find(c => c.id === empCompanyId);
      
      // Find service and rate from project's assignedServices
      let service: Service | undefined;
      let billingRate = 0;
      
      // Look for this company in project's assignedCompanies
      const assignedCompany = project.assignedCompanies?.find(ac => {
        const companyId = typeof ac.companyId === 'object' && ac.companyId.id 
          ? ac.companyId.id 
          : ac.companyId;
        return companyId === empCompanyId;
      });
      
      if (assignedCompany?.assignedServices?.length) {
        // Try to find the most appropriate service based on timesheet data
        let bestService = assignedCompany.assignedServices[0];
        
        // Look for service matches in timesheet entries
        for (const entry of entries) {
          const serviceLabor = entry.labors?.find(l => 
            l.laborTitle === 'Service' || l.laborTitle === 'Category'
          );
          
          if (serviceLabor?.laborValue) {
            const matchingService = assignedCompany.assignedServices.find(as => {
              const svc = services.find(s => s.id === (typeof as.serviceId === 'object' ? as.serviceId.id : as.serviceId));
              return svc && (
                svc.serviceName.toLowerCase().includes(serviceLabor.laborValue.toLowerCase()) ||
                serviceLabor.laborValue.toLowerCase().includes(svc.serviceName.toLowerCase())
              );
            });
            
            if (matchingService) {
              bestService = matchingService;
              break;
            }
          }
        }
        
        const serviceId = typeof bestService.serviceId === 'object' && bestService.serviceId.id
          ? bestService.serviceId.id
          : bestService.serviceId;
        
        service = services.find(s => s.id === serviceId);
        billingRate = bestService.billingRate || 0;
      }
      
      // Fallback: look up rate from rates collection
      if (!billingRate && service) {
        const rate = rates.find(r => {
          const rateCompanyId = typeof r.companyId === 'object' && r.companyId.id 
            ? r.companyId.id 
            : r.companyId;
          const rateServiceId = typeof r.serviceId === 'object' && r.serviceId.id 
            ? r.serviceId.id 
            : r.serviceId;
          return rateCompanyId === empCompanyId && rateServiceId === service!.id;
        });
        billingRate = rate?.rate || 0;
      }
      
      // If still no service found, use a default or first available service
      if (!service && assignedCompany?.assignedServices?.length) {
        const firstService = assignedCompany.assignedServices[0];
        const serviceId = typeof firstService.serviceId === 'object' && firstService.serviceId.id
          ? firstService.serviceId.id
          : firstService.serviceId;
        service = services.find(s => s.id === serviceId);
        billingRate = firstService.billingRate || 0;
      }

      return {
        employeeId: employee.id,
        employeeName: employee.formalName,
        companyId: empCompanyId,
        companyName: company?.companyName || 'Unknown Company',
        serviceId: service?.id || '',
        serviceName: service?.serviceName || 'General Labor',
        hours,
        billingRate,
        amount: hours * billingRate,
        markdown: 0,
        notes: `Autofilled from ${entries.length} timesheet entries for ${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d, yyyy')}`
      };
    })
    .filter(Boolean);
    
    return {
      success: true,
      items,
      entriesFound: relevantEntries.length,
      totalHours: totalAggregatedHours,
      projectData: {
        approvingSupervisor: project.approvingSupervisor,
        contractNumber: project.contractNumber?.toString(),
        poNumber: project.poNumber,
        pmisNumber: project.pmisNumber,
      },
      dueDate: dueDate.toISOString(),
      termOfWeek: termOfWeek,
    };

  } catch (error) {
    console.error('Error in autofillFromTimesheets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      items: [],
      entriesFound: 0,
      totalHours: 0
    };
  }
}

async function getEmployees(): Promise<Employee[]> {
  return await getCollectionData('employees') as Employee[];
}

async function getCompanies(): Promise<Company[]> {
  return await getCollectionData('companies') as Company[];
}

async function getServices(): Promise<Service[]> {
  return await getCollectionData('services') as Service[];
}

async function getRates(): Promise<Rate[]> {
  return await getCollectionData('rates') as Rate[];
}

async function getProjects(): Promise<Project[]> {
  return await getCollectionData('projects') as Project[];
}

export async function getAllTimesheetEntries(): Promise<CtiTimesheet[]> {
  return await getCollectionData('cti_timesheets') as CtiTimesheet[];
}

// Invoice creation schema
const CreateInvoiceSchema = z.object({
  projectId: z.string(),
  contractNumber: z.string().optional(),
  poNumber: z.string(),
  pmisNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  fromDate: z.string(),
  toDate: z.string(),
  dueDate: z.string(),
  termOfWeek: z.string().optional(),
  approvingSupervisor: z.string().optional(),
  invoiceItems: z.array(z.object({
    employeeId: z.string(),
    companyId: z.string(),
    serviceId: z.string(),
    hours: z.number(),
    billingRate: z.number(),
    markdown: z.number(),
    amount: z.number(),
    notes: z.string(),
  })),
  reimbursableExpenses: z.array(z.object({
    amount: z.number(),
    companyId: z.string(),
    date: z.string(),
    description: z.string(),
  })),
  attachedFiles: z.array(z.object({
    fileName: z.string(),
    fileData: z.string(),
    fileType: z.string(),
  })).optional(),
  autofillSource: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string(),
  userRole: z.enum(['Admin', 'Prime', 'Subconsultant']),
  status: z.enum(['draft', 'submitted', 'approved']).optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export async function createInvoice(input: CreateInvoiceInput) {
  try {
    // Validate and sanitize inputs
    const validatedInput = CreateInvoiceSchema.parse(input);
    
    // Additional security validation
    if (validatedInput.contractNumber) {
      validateContractNumber(validatedInput.contractNumber);
    }
    
    // Generate invoice number if not provided
    const invoiceNumber = validatedInput.invoiceNumber || await generateInvoiceNumber();
    
    // Calculate totals
    const invoiceItemsTotal = validatedInput.invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const reimbursableExpensesTotal = validatedInput.reimbursableExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const invoiceTotal = invoiceItemsTotal + reimbursableExpensesTotal;
    
    // Get submitter company from first invoice item and convert to DocumentReference
    const firstItem = validatedInput.invoiceItems[0];
    let submitterCompanyId = firstItem?.companyId ? doc(db, 'companies', firstItem.companyId) : null;

    // Fallback: use user's companyId if first item missing companyId
    if (!submitterCompanyId && adminDb) {
      try {
        const userSnap = await adminDb.collection('users').doc(validatedInput.userId).get();
        const userData = userSnap.exists ? (userSnap.data() as any) : null;
        const companyRef = userData?.companyId;
        const companyIdStr = typeof companyRef === 'object' && companyRef?.id
          ? companyRef.id
          : (typeof companyRef === 'string' ? companyRef : null);
        if (companyIdStr) {
          submitterCompanyId = doc(db, 'companies', companyIdStr);
        }
      } catch (e) {
        console.warn('Failed to resolve submitterCompanyId fallback from user.companyId');
      }
    }
    
    // Create invoice document
    const invoiceData = {
      ...validatedInput,
      projectId: doc(db, 'projects', validatedInput.projectId),
      userId: doc(db, 'users', validatedInput.userId),
      invoiceNumber,
      invoiceItemsTotal,
      reimbursableExpensesTotal,
      invoiceTotal,
      submitterCompanyId,
      autofillSource: validatedInput.autofillSource || 'manual',
      status: validatedInput.status || 'draft',
      createdAt: Timestamp.now(),
      fromDate: Timestamp.fromDate(new Date(validatedInput.fromDate)),
      toDate: Timestamp.fromDate(new Date(validatedInput.toDate)),
      dueDate: Timestamp.fromDate(new Date(validatedInput.dueDate)),
      uploadedFiles: [],
      invoiceItems: validatedInput.invoiceItems.map(item => ({
        ...item,
        companyId: doc(db, 'companies', item.companyId),
        employeeId: doc(db, 'employees', item.employeeId),
        serviceId: doc(db, 'services', item.serviceId),
      })),
      reimbursableExpenses: await Promise.all(validatedInput.reimbursableExpenses.map(async expense => {
        const companies = await getCompanies();
        const company = companies.find(c => c.id === expense.companyId);
        return {
          ...expense,
          companyId: doc(db, 'companies', expense.companyId),
          companyName: company?.companyName || '',
          date: Timestamp.fromDate(new Date(expense.date)),
        };
      })),
      // Add approval fields for auto-approved invoices
      ...(validatedInput.status === 'approved' && {
        approvedAt: Timestamp.now(),
        approvedBy: validatedInput.userId,
        submittedAt: Timestamp.now(),
      }),
    };
    
    // Save to Firestore
    const invoicesRef = collection(db, 'invoices');
    const docRef = await addDoc(invoicesRef, invoiceData);
    
    // Upload files if provided
    if (validatedInput.attachedFiles?.length) {
      try {
        const { uploadFilesToStorage } = await import('@/lib/file-upload');
        const uploadedFiles = await uploadFilesToStorage(validatedInput.attachedFiles, docRef.id);
        
        if (uploadedFiles.length > 0) {
          await updateDoc(doc(db, 'invoices', docRef.id), { uploadedFiles });
        }
      } catch (uploadError) {
        console.error('File upload failed:', uploadError);
        // Don't fail invoice creation if file upload fails
      }
    }
    
    const statusMessage = validatedInput.status === 'approved' 
      ? 'Invoice created and approved automatically'
      : validatedInput.status === 'draft'
      ? 'Invoice saved as draft'
      : 'Invoice created successfully';
    
    return {
      success: true,
      message: statusMessage,
      invoiceId: docRef.id,
      invoiceNumber,
    };
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    };
  }
}

export async function submitInvoice(invoiceId: string, userId: string) {
  try {
    // Validate inputs
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const validatedUserId = validateInvoiceId(userId); // Same validation pattern
    
    const { getDoc } = await import('firebase/firestore');
    const invoiceRef = doc(db, 'invoices', validatedInvoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    // Update status to submitted
    await updateDoc(invoiceRef, {
      status: 'submitted',
      submittedAt: Timestamp.now(),
      submittedBy: userId,
    });
    
    // Generate PDF for final submission
    let pdfResult = null;
    try {
      pdfResult = await generateInvoicePDF(invoiceId);
      
      // Update invoice with PDF info if generated successfully
      if (pdfResult.success) {
        await updateDoc(invoiceRef, {
          pdfUrl: pdfResult.pdfUrl,
          pdfFileName: pdfResult.fileName,
          pdfGeneratedAt: Timestamp.now(),
        });
      }
    } catch (pdfError) {
      console.error('PDF generation failed during submission:', pdfError);
      // Don't fail submission if PDF generation fails
    }
    
    return {
      success: true,
      message: 'Invoice submitted successfully',
      pdfGenerated: pdfResult?.success || false,
      pdfUrl: pdfResult?.pdfUrl,
    };
    
  } catch (error) {
    console.error('Error submitting invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit invoice',
    };
  }
}

export async function generateInvoicePDF(invoiceId: string) {
  try {
    // Validate input
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    
    const { getDoc } = await import('firebase/firestore');
    const invoiceRef = doc(db, 'invoices', validatedInvoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoiceData = invoiceSnap.data();
    const pdfUrl = await generatePDFDocument(invoiceData, invoiceId);
    
    return {
      success: true,
      message: 'PDF generated successfully',
      pdfUrl,
      fileName: `invoice-${invoiceData.invoiceNumber || invoiceId}.pdf`,
    };
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}

// PDF generation using base64 templates
async function generatePDFDocument(invoiceData: Record<string, unknown>, invoiceId: string): Promise<string> {
  try {
    const { generateClientSidePdf } = await import('@/lib/pdf-generator');
    const { extractId } = await import('@/lib/document-reference-utils');
    
    const projectId = extractId(invoiceData?.projectId as any) || '';
    const contractId = extractId(invoiceData?.contractId as any) || '';

    const result = await generateClientSidePdf(invoiceId, {
      category: 'Invoice',
      userContext: { system: 'invoicing-actions' },
      projectId,
      contractId,
    });
    
    if (result.success && result.pdfUrl) {
      return result.pdfUrl;
    } else {
      throw new Error(result.error || 'PDF generation failed');
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

// Delete invoice function
export async function deleteInvoice(invoiceId: string, userId: string) {
  try {
    // Validate inputs
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const validatedUserId = validateInvoiceId(userId); // Same validation pattern
    
    const { getDoc, deleteDoc } = await import('firebase/firestore');
    const invoiceRef = doc(db, 'invoices', validatedInvoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoiceData = invoiceSnap.data();
    
    // Check if user has permission to delete
    const invoiceUserId = typeof invoiceData.userId === 'object' && invoiceData.userId.id 
      ? invoiceData.userId.id 
      : invoiceData.userId;
    
    if (invoiceUserId !== validatedUserId) {
      throw new Error('You do not have permission to delete this invoice');
    }
    
    // Allow deletion of draft, submitted, and approved invoices
    if (!['draft', 'submitted', 'approved'].includes(invoiceData.status)) {
      throw new Error('This invoice cannot be deleted');
    }
    
    // Delete the invoice
    await deleteDoc(invoiceRef);
    
    return {
      success: true,
      message: 'Invoice deleted successfully',
    };
    
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete invoice',
    };
  }
}

// Delete multiple invoices function
export async function deleteMultipleInvoices(invoiceIds: string[], userId: string) {
  try {
    // Validate inputs
    const validatedUserId = validateInvoiceId(userId);
    const validatedInvoiceIds = invoiceIds.map(id => validateInvoiceId(id));
    
    const results = [];
    
    for (const invoiceId of validatedInvoiceIds) {
      const result = await deleteInvoice(invoiceId, validatedUserId);
      results.push({ invoiceId, ...result });
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return {
      success: failureCount === 0,
      message: `${successCount} invoice(s) deleted successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
    };
    
  } catch (error) {
    console.error('Error deleting multiple invoices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete invoices',
      results: [],
    };
  }
}

async function generateInvoiceNumber(): Promise<string> {
  // Generate a unique invoice number
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  return `INV-${year}${month}-${timestamp}`;
}