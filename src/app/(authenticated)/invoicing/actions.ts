'use server';

import { z } from 'zod';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { format, startOfDay, endOfDay, addMonths, endOfMonth } from 'date-fns';
import { sanitizeForLog, validateInvoiceId, validateContractNumber } from '@/lib/security-utils';
import { createReferenceResolver, toReferenceId } from '@/lib/document-reference-utils';
import type { CtiTimesheet, Employee, Company, Service, Rate, Project, Department, User } from '@/types';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

// Initialize Firebase Admin for server-side operations
if (!getApps().length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (projectId && clientEmail && privateKeyRaw) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
        storageBucket,
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

const clientPermissionWarnings = new Set<string>();

// Helper: upload PDF buffer to Firebase Storage and return a signed URL
async function uploadPdfBufferToStorage(invoiceId: string, filenameBase: string, buffer: Buffer): Promise<{ url: string; filePath: string; fileName: string; }>
{
  if (!buffer || !buffer.length) throw new Error('Empty PDF buffer');
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const storage = getStorage();
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const safeName = `${filenameBase}-${Date.now()}.pdf`;
  const filePath = `invoices/${invoiceId}/${safeName}`;
  const file = bucket.file(filePath);
  await file.save(buffer, { contentType: 'application/pdf', resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
  // Generate long-lived signed URL
  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '2100-01-01' });
  return { url: signedUrl, filePath, fileName: safeName };
}

// Helper function to get data from either client or admin SDK
interface CollectionFetchOptions {
  context?: string;
}

async function getCollectionData(collectionName: string, options: CollectionFetchOptions = {}) {
  const { context } = options;
  // Use client SDK only in browser; server should prefer Admin SDK
  if (typeof window !== 'undefined' && db) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      const errorCode = (error as { code?: string })?.code;
      const key = `${collectionName}:${context ?? ''}`;
      if (errorCode === 'permission-denied') {
        if (!clientPermissionWarnings.has(key)) {
          clientPermissionWarnings.add(key);
          const location = context ? ` in ${context}` : '';
          console.warn(`Client SDK permission denied for collection "${collectionName}"${location}. Falling back to Admin SDK.`);
        }
      } else {
        console.error('Error fetching collection with client SDK:', sanitizeForLog(error));
      }
    }
  }
  
  // Fallback to admin SDK (primary path on server)
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

    const employeeResolver = createReferenceResolver(employees, {
      collection: 'employees',
      context: 'autofillFromTimesheets:employee-lookup',
    });
    const companyResolver = createReferenceResolver(companies, {
      collection: 'companies',
      context: 'autofillFromTimesheets:company-lookup',
    });
    const serviceResolver = createReferenceResolver(services, {
      collection: 'services',
      context: 'autofillFromTimesheets:service-lookup',
    });

    const rateLookup = new Map<string, Rate>();
    rates.forEach(rate => {
      const companyId = toReferenceId(rate.companyId);
      const serviceId = toReferenceId(rate.serviceId);
      if (companyId && serviceId) {
        rateLookup.set(`${companyId}::${serviceId}`, rate);
      }
    });

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

    // Precompute project lookup maps for faster resolution
  type AssignedCompany = NonNullable<Project['assignedCompanies']>[number];
  type AssignedService = NonNullable<AssignedCompany['assignedServices']>[number];

  const assignedCompaniesById = new Map<string, AssignedCompany>();
    project.assignedCompanies?.forEach(assignedCompany => {
      const { id } = companyResolver.resolve(assignedCompany.companyId, 'autofillFromTimesheets:project-assigned-company');
      if (id) {
        assignedCompaniesById.set(id, assignedCompany);
      }
    });

    // Convert to invoice items with improved rate lookup
    let totalAggregatedHours = 0;
    const items = Object.entries(hoursByEmployee)
      .filter(([, data]) => data.hours > 0) // Filter out invalid entries
      .map(([employeeIdStr, data]) => {
      const { hours, entries } = data;
      
      const { item: employee } = employeeResolver.resolve(employeeIdStr, 'autofillFromTimesheets:employee-hours');
      if (!employee) {
        console.warn(`Employee not found for ID: ${employeeIdStr}`);
        return null;
      }
      
      totalAggregatedHours += hours;

      const companyResolution = companyResolver.resolve(employee.companyId, `autofillFromTimesheets:employee:${employeeIdStr}:company`);
      const empCompanyId = companyResolution.id;
      const company = companyResolution.item;

      if (!empCompanyId) {
        console.warn(`Company reference missing for employee ${employeeIdStr}`);
        return null;
      }

      // Find service and rate from project's assignedServices
      let service: Service | undefined;
      let billingRate = 0;

      const assignedCompany = assignedCompaniesById.get(empCompanyId);

      if (assignedCompany?.assignedServices?.length) {
        let bestServiceEntry = assignedCompany.assignedServices[0];

        for (const entry of entries) {
          const serviceLabor = entry.labors?.find(l => l.laborTitle === 'Service' || l.laborTitle === 'Category');

          if (serviceLabor?.laborValue) {
            const laborValue = serviceLabor.laborValue.toLowerCase();
            const matchingService = assignedCompany.assignedServices.find((assignment: AssignedService) => {
              const { item: svc } = serviceResolver.resolve(assignment.serviceId, 'autofillFromTimesheets:assigned-service-lookup');
              if (!svc?.serviceName) {
                return false;
              }
              const name = svc.serviceName.toLowerCase();
              return name.includes(laborValue) || laborValue.includes(name);
            });

            if (matchingService) {
              bestServiceEntry = matchingService;
              break;
            }
          }
        }

        const serviceResolution = serviceResolver.resolve(bestServiceEntry.serviceId, 'autofillFromTimesheets:best-service');
        service = serviceResolution.item;
        const bestServiceId = serviceResolution.id;
        billingRate = bestServiceEntry.billingRate || 0;

        if (!billingRate && bestServiceId) {
          const rate = rateLookup.get(`${empCompanyId}::${bestServiceId}`);
          if (rate) {
            billingRate = rate.rate;
          }
        }
      }

      if ((!service || !billingRate) && assignedCompany?.assignedServices?.length) {
        const primaryService = assignedCompany.assignedServices[0];
        const primaryResolution = serviceResolver.resolve(primaryService.serviceId, 'autofillFromTimesheets:primary-assigned-service');
        service = service ?? primaryResolution.item;
        if (!billingRate) {
          billingRate = primaryService.billingRate || 0;
        }
        const primaryServiceId = primaryResolution.id;
        if (!billingRate && primaryServiceId) {
          const rate = rateLookup.get(`${empCompanyId}::${primaryServiceId}`);
          if (rate) {
            billingRate = rate.rate;
          }
        }
      }

      if (!billingRate && service?.id) {
        const fallbackRate = rateLookup.get(`${empCompanyId}::${service.id}`);
        if (fallbackRate) {
          billingRate = fallbackRate.rate;
        }
      }
      
      if (billingRate <= 0) {
        console.warn(`No billing rate resolved for employee ${employeeIdStr} and company ${empCompanyId}`);
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

export async function getEmployees(): Promise<Employee[]> {
  return await getCollectionData('employees', { context: 'invoicing:getEmployees' }) as Employee[];
}

export async function getCompanies(): Promise<Company[]> {
  return await getCollectionData('companies', { context: 'invoicing:getCompanies' }) as Company[];
}

export async function getServices(): Promise<Service[]> {
  return await getCollectionData('services', { context: 'invoicing:getServices' }) as Service[];
}

export async function getRates(): Promise<Rate[]> {
  return await getCollectionData('rates', { context: 'invoicing:getRates' }) as Rate[];
}

export async function getProjects(): Promise<Project[]> {
  return await getCollectionData('projects', { context: 'invoicing:getProjects' }) as Project[];
}

export async function getAllTimesheetEntries(): Promise<CtiTimesheet[]> {
  return await getCollectionData('cti_timesheets', { context: 'invoicing:getAllTimesheetEntries' }) as CtiTimesheet[];
}

export async function getDepartments(): Promise<Department[]> {
  return await getCollectionData('departments', { context: 'invoicing:getDepartments' }) as Department[];
}

export async function getUsers(): Promise<User[]> {
  const raw = await getCollectionData('users', { context: 'invoicing:getUsers' }) as any[];
  // Ensure uid field exists
  return raw.map(u => ({ uid: u.uid || u.id, ...u })) as unknown as User[];
}

function isDocumentReferenceLike(value: unknown): value is { id: string; path?: string } {
  return !!value && typeof value === 'object' && typeof (value as any).id === 'string';
}

function isTimestampLike(value: unknown): value is { seconds: number; nanoseconds: number } {
  return !!value && typeof value === 'object' && typeof (value as any).seconds === 'number' && typeof (value as any).nanoseconds === 'number';
}

function serializeFirestoreValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeFirestoreValue(item));
  }

  if (typeof value === 'object') {
    if (isDocumentReferenceLike(value)) {
      const path = typeof (value as any).path === 'string' ? (value as any).path : undefined;
      return { id: (value as any).id, path };
    }

    if (typeof (value as any).toDate === 'function') {
      try {
        const date = (value as any).toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // ignore conversion errors and fall through to generic object handling
      }
    }

    if (isTimestampLike(value)) {
      return { seconds: (value as any).seconds, nanoseconds: (value as any).nanoseconds };
    }

    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, serializeFirestoreValue(val)]));
  }

  return value;
}

function snapshotToInvoice(snapshot: DocumentSnapshot): Invoice | null {
  const data = snapshot.data();
  if (!data) {
    return null;
  }
  const normalized = serializeFirestoreValue(data) as Record<string, unknown>;
  return { ...normalized, id: snapshot.id } as Invoice;
}

// NEW: Fetch a single invoice by document id or by its invoiceNumber using Admin SDK fallback
export async function getInvoiceByIdOrNumber(identifier: string): Promise<Invoice | null> {
  try {
    if (adminDb) {
      // Try by document id
      const byId = await adminDb.collection('invoices').doc(identifier).get();
      if (byId.exists) {
        return snapshotToInvoice(byId);
      }
      // Fallback: query by invoiceNumber
      const q = await adminDb.collection('invoices').where('invoiceNumber', '==', identifier).limit(1).get();
      if (!q.empty) {
        const d = q.docs[0];
        return snapshotToInvoice(d);
      }
    }
  } catch (error) {
    console.error('Error fetching invoice by id/number:', error);
  }
  return null;
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

export type CreateInvoiceResult =
  | { success: true; message: string; invoiceId: string; invoiceNumber: string }
  | { success: false; error: string };

const UpdateInvoiceSchema = CreateInvoiceSchema.omit({ status: true });

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

type UploadedFileResponse = {
  fileName: string;
  fileUrl: string;
  uploadedAt?: string | undefined;
};

export type UpdateInvoiceResult =
  | { success: true; message: string; uploadedFiles?: UploadedFileResponse[] }
  | { success: false; error: string };

// Helper: upload generic invoice attachments to Firebase Storage (Admin SDK) and return signed URLs
async function uploadInvoiceAttachmentsToStorage(
  files: Array<{ fileName: string; fileData: string; fileType: string }>,
  invoiceId: string
): Promise<Array<{ fileName: string; fileUrl: string; uploadedAt?: FirebaseFirestore.Timestamp }>> {
  if (!files?.length) return [];
  const storage = getStorage();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const results: Array<{ fileName: string; fileUrl: string; uploadedAt?: FirebaseFirestore.Timestamp }> = [];

  const safe = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  for (const f of files) {
    try {
      const base = safe(f.fileName || `file-${Date.now()}`);
      const filePath = `invoices/${invoiceId}/attachments/${base}`;
      const buffer = Buffer.from(f.fileData, 'base64');
      const file = bucket.file(filePath);
      await file.save(buffer, { contentType: f.fileType || 'application/octet-stream', resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '2100-01-01' });
      results.push({ fileName: base, fileUrl: signedUrl, uploadedAt: AdminTs.now() });
    } catch (err) {
      console.error('Attachment upload failed:', err);
    }
  }
  return results;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  try {
    // Validate and sanitize inputs
    const validatedInput = CreateInvoiceSchema.parse(input);
    
    if (validatedInput.contractNumber) {
      validateContractNumber(validatedInput.contractNumber);
    }
    
    const invoiceNumber = validatedInput.invoiceNumber || await generateInvoiceNumber();
    
    // Resolve lookups for denormalized names
    const [employeesLookup, companiesLookup, servicesLookup] = await Promise.all([
      getEmployees(),
      getCompanies(),
      getServices(),
    ]);

    // Build common calculated fields
    const invoiceItemsTotal = validatedInput.invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const reimbursableExpensesTotal = validatedInput.reimbursableExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const invoiceTotal = invoiceItemsTotal + reimbursableExpensesTotal;

    // Prefer Admin SDK for writes to bypass client security rules
    if (adminDb) {
      // Submitter company resolution
      const firstItem = validatedInput.invoiceItems[0];
      let submitterCompanyRef = firstItem?.companyId ? adminDb.doc(`companies/${firstItem.companyId}`) : null as any;
      let submitterCompany = '';
      if (!submitterCompanyRef) {
        try {
          const userSnap = await adminDb.collection('users').doc(validatedInput.userId).get();
          const userData = userSnap.exists ? (userSnap.data() as any) : null;
          const companyRef = userData?.companyId;
          const companyIdStr = typeof companyRef === 'object' && companyRef?.id
            ? companyRef.id
            : (typeof companyRef === 'string' ? companyRef : null);
          if (companyIdStr) submitterCompanyRef = adminDb.doc(`companies/${companyIdStr}`);
        } catch { /* ignore */ }
      }
      if (submitterCompanyRef) {
        const c = companiesLookup.find(cmp => cmp.id === submitterCompanyRef!.id);
        if (c?.companyName) submitterCompany = c.companyName;
      }

      // IMPORTANT: Do not persist base64 attachments in the invoice document
      const { attachedFiles, ...inputWithoutFiles } = validatedInput;

      // Fetch project to get departmentId
      let departmentPath = null;
      if (validatedInput.projectId) {
        try {
          const projectSnap = await adminDb.collection('projects').doc(validatedInput.projectId).get();
          if (projectSnap.exists) {
            const projectData = projectSnap.data();
            const deptRef = projectData?.departmentId;
            if (deptRef) {
              if (typeof deptRef === 'object' && deptRef.path) {
                departmentPath = deptRef.path;
              } else if (typeof deptRef === 'string') {
                departmentPath = deptRef.startsWith('departments/') ? deptRef : `departments/${deptRef}`;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching project for departmentId:', err);
        }
      }

      const invoiceData = {
        ...inputWithoutFiles, // excludes attachedFiles
        projectId: adminDb.doc(`projects/${validatedInput.projectId}`),
        ...(departmentPath && { departmentId: departmentPath }),
        userId: adminDb.doc(`users/${validatedInput.userId}`),
        invoiceNumber,
        invoiceItemsTotal,
        reimbursableExpensesTotal,
        invoiceTotal,
        submitterCompanyId: submitterCompanyRef,
        submitterCompany,
        autofillSource: validatedInput.autofillSource || 'manual',
        status: validatedInput.status || 'draft',
        createdAt: AdminTs.now(),
        fromDate: AdminTs.fromDate(new Date(validatedInput.fromDate)),
        toDate: AdminTs.fromDate(new Date(validatedInput.toDate)),
        dueDate: AdminTs.fromDate(new Date(validatedInput.dueDate)),
        uploadedFiles: [],
        invoiceItems: validatedInput.invoiceItems.map(item => {
          const emp = employeesLookup.find(e => e.id === item.employeeId);
          const cmp = companiesLookup.find(c => c.id === item.companyId);
          const svc = servicesLookup.find(s => s.id === item.serviceId);
          return {
            ...item,
            companyId: adminDb.doc(`companies/${item.companyId}`),
            companyName: cmp?.companyName || '',
            employeeId: adminDb.doc(`employees/${item.employeeId}`),
            employeeName: emp?.formalName || '',
            serviceId: adminDb.doc(`services/${item.serviceId}`),
            serviceName: svc?.serviceName || '',
          } as any;
        }),
        reimbursableExpenses: validatedInput.reimbursableExpenses.map(expense => {
          const company = companiesLookup.find(c => c.id === expense.companyId);
          return {
            ...expense,
            companyId: adminDb!.doc(`companies/${expense.companyId}`),
            companyName: company?.companyName || '',
            date: AdminTs.fromDate(new Date(expense.date)),
          } as any;
        }),
        ...(validatedInput.status === 'approved' && {
          approvedAt: AdminTs.now(),
          approvedBy: validatedInput.userId,
          submittedAt: AdminTs.now(),
        }),
      } as any;

      // Create invoice (Admin)
      const docRef = await adminDb.collection('invoices').add(invoiceData);

      // Upload files if provided, then update (Admin)
      if (attachedFiles?.length) {
        try {
          const uploadedFiles = await uploadInvoiceAttachmentsToStorage(attachedFiles, docRef.id);
          if (uploadedFiles.length > 0) {
            await adminDb.collection('invoices').doc(docRef.id).update({ uploadedFiles });
          }
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
        }
      }

      const statusMessage = validatedInput.status === 'approved' 
        ? 'Invoice created and approved automatically'
        : validatedInput.status === 'draft'
        ? 'Invoice saved as draft'
        : 'Invoice created successfully';

      return { success: true, message: statusMessage, invoiceId: docRef.id, invoiceNumber };
    }

    // Fallback: client SDK (only if Admin not available)
    // Client fallback not implemented for server environment; return a failure explicitly to satisfy type checking
    return { success: false, error: 'Database not initialized: Admin SDK unavailable for writes' };

  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create invoice' };
  }
}

export async function updateInvoiceDetails(invoiceId: string, input: UpdateInvoiceInput): Promise<UpdateInvoiceResult> {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized: Admin SDK unavailable for writes' };
  }

  try {
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const validatedInput = UpdateInvoiceSchema.parse(input);

    if (validatedInput.contractNumber) {
      validateContractNumber(validatedInput.contractNumber);
    }

    const invoiceRef = adminDb.collection('invoices').doc(validatedInvoiceId);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
      return { success: false, error: 'Invoice not found' };
    }

    const existing = invoiceSnap.data() as Record<string, unknown>;
    const role = validatedInput.userRole;
    const isAdminOrPrime = role === 'Admin' || role === 'Prime';
    const authorId = typeof existing.userId === 'object' && existing.userId && typeof (existing.userId as any).id === 'string'
      ? (existing.userId as any).id
      : existing.userId;
    const isAuthor = !!authorId && authorId === validatedInput.userId;

    if (!isAuthor && !isAdminOrPrime) {
      return { success: false, error: 'You do not have permission to update this invoice' };
    }

    const currentStatus = String(existing.status || 'draft').toLowerCase();
    const editableStatuses = new Set(['draft', 'rejected', 'revision_requested']);
    if (!editableStatuses.has(currentStatus) && !isAdminOrPrime) {
      return { success: false, error: `Invoice cannot be edited while ${currentStatus}` };
    }

    const ensureId = (value: unknown, field: string) => {
      const id = String(value || '').trim();
      if (!id) {
        throw new Error(`Missing required ${field}`);
      }
      return id;
    };

    const projectId = ensureId(validatedInput.projectId, 'projectId');

    // Safety: do not allow moving an already-approved invoice to a different project,
    // as that would require rolling back and re-applying multiple rollups.
    if (currentStatus === 'approved') {
      const existingProjectId = typeof (existing as any).projectId === 'object' && (existing as any).projectId && typeof (existing as any).projectId.id === 'string'
        ? (existing as any).projectId.id
        : String((existing as any).projectId || '');
      if (existingProjectId && existingProjectId !== projectId) {
        return { success: false, error: 'Approved invoices cannot change project. Create a new invoice instead.' };
      }
    }

    const fromDate = new Date(validatedInput.fromDate);
    const toDate = new Date(validatedInput.toDate);
    const dueDate = new Date(validatedInput.dueDate);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      throw new Error('Invalid date value provided');
    }

    const [employeesLookup, companiesLookup, servicesLookup] = await Promise.all([
      getEmployees(),
      getCompanies(),
      getServices(),
    ]);

    const invoiceItemsTotal = validatedInput.invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const reimbursableExpensesTotal = validatedInput.reimbursableExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const invoiceTotal = invoiceItemsTotal + reimbursableExpensesTotal;
    const invoiceHours = validatedInput.invoiceItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);

    const firstItem = validatedInput.invoiceItems[0];
    let submitterCompanyRef: FirebaseFirestore.DocumentReference | null = null;
    let submitterCompany = typeof existing.submitterCompany === 'string' ? (existing.submitterCompany as string) : '';

    if (firstItem?.companyId) {
      const firstCompanyId = ensureId(firstItem.companyId, 'invoiceItems[0].companyId');
      submitterCompanyRef = adminDb.doc(`companies/${firstCompanyId}`);
      const companyLookup = companiesLookup.find(cmp => cmp.id === firstCompanyId);
      if (companyLookup?.companyName) {
        submitterCompany = companyLookup.companyName;
      }
    } else if (existing.submitterCompanyId) {
      const existingRef = existing.submitterCompanyId as any;
      if (existingRef && typeof existingRef.path === 'string') {
        submitterCompanyRef = existingRef as FirebaseFirestore.DocumentReference;
      } else if (typeof existingRef === 'string' && existingRef.trim()) {
        submitterCompanyRef = adminDb.doc(`companies/${existingRef.trim()}`);
      }
    }

    if (!submitterCompanyRef) {
      try {
        const userSnap = await adminDb.collection('users').doc(validatedInput.userId).get();
        if (userSnap.exists) {
          const userData = userSnap.data() as any;
          const companyRef = userData?.companyId;
          const companyIdStr = typeof companyRef === 'object' && companyRef?.id
            ? companyRef.id
            : (typeof companyRef === 'string' ? companyRef : null);
          if (companyIdStr) {
            submitterCompanyRef = adminDb.doc(`companies/${companyIdStr}`);
            const companyLookup = companiesLookup.find(cmp => cmp.id === companyIdStr);
            if (companyLookup?.companyName) {
              submitterCompany = companyLookup.companyName;
            }
          }
        }
      } catch {
        // ignore lookup errors
      }
    }

    const invoiceItems = validatedInput.invoiceItems.map((item, index) => {
      const employeeId = ensureId(item.employeeId, `invoiceItems[${index}].employeeId`);
      const companyId = ensureId(item.companyId, `invoiceItems[${index}].companyId`);
      const serviceIdRaw = String(item.serviceId ?? '').trim();

      const employee = employeesLookup.find(e => e.id === employeeId);
      const company = companiesLookup.find(c => c.id === companyId);
      const service = serviceIdRaw ? servicesLookup.find(s => s.id === serviceIdRaw) : undefined;

      return {
        ...item,
        companyId: adminDb.doc(`companies/${companyId}`),
        companyName: company?.companyName || '',
        employeeId: adminDb.doc(`employees/${employeeId}`),
        employeeName: employee?.formalName || '',
        serviceId: serviceIdRaw ? adminDb.doc(`services/${serviceIdRaw}`) : null,
        serviceName: service?.serviceName || '',
      } as any;
    });

    const reimbursableExpenses = validatedInput.reimbursableExpenses.map((expense, index) => {
      const companyId = ensureId(expense.companyId, `reimbursableExpenses[${index}].companyId`);
      const company = companiesLookup.find(c => c.id === companyId);
      const expenseDate = new Date(expense.date);
      if (Number.isNaN(expenseDate.getTime())) {
        throw new Error(`Invalid reimbursable expense date at index ${index}`);
      }

      return {
        ...expense,
        companyId: adminDb.doc(`companies/${companyId}`),
        companyName: company?.companyName || '',
        date: AdminTs.fromDate(expenseDate),
      } as any;
    });

    const invoiceNumber = (validatedInput.invoiceNumber || existing.invoiceNumber || '').toString();

    const updates: Record<string, unknown> = {
      projectId: adminDb.doc(`projects/${projectId}`),
      contractNumber: validatedInput.contractNumber || null,
      poNumber: validatedInput.poNumber || null,
      pmisNumber: validatedInput.pmisNumber || null,
      invoiceNumber: invoiceNumber || null,
      fromDate: AdminTs.fromDate(fromDate),
      toDate: AdminTs.fromDate(toDate),
      dueDate: AdminTs.fromDate(dueDate),
      termOfWeek: validatedInput.termOfWeek || null,
      approvingSupervisor: validatedInput.approvingSupervisor || null,
      invoiceItems,
      reimbursableExpenses,
      invoiceItemsTotal,
      reimbursableExpensesTotal,
      invoiceTotal,
      notes: validatedInput.notes ?? null,
      autofillSource: validatedInput.autofillSource || existing.autofillSource || 'manual',
      updatedAt: AdminTs.now(),
      updatedBy: validatedInput.userId,
    };

    if (submitterCompanyRef) {
      updates.submitterCompanyId = submitterCompanyRef;
      updates.submitterCompany = submitterCompany;
    }

    let uploadedFiles = Array.isArray(existing.uploadedFiles)
      ? [...(existing.uploadedFiles as Array<{ fileName: string; fileUrl: string; uploadedAt?: FirebaseFirestore.Timestamp }>)]
      : [];

    if (validatedInput.attachedFiles?.length) {
      try {
        const newlyUploaded = await uploadInvoiceAttachmentsToStorage(validatedInput.attachedFiles, validatedInvoiceId);
        if (newlyUploaded.length) {
          uploadedFiles = [...uploadedFiles, ...newlyUploaded];
          updates.uploadedFiles = uploadedFiles;
        }
      } catch (uploadError) {
        console.error('Attachment upload failed during update:', uploadError);
      }
    }

    // If Prime/Admin edits an already-approved invoice, keep project rollups consistent
    // by applying only the delta between previous approved totals/hours and the new totals/hours.
    if (currentStatus === 'approved' && isAdminOrPrime) {
      await adminDb.runTransaction(async (t) => {
        const invSnap = await t.get(invoiceRef);
        if (!invSnap.exists) throw new Error('Invoice not found');
        const invNow = invSnap.data() as any;

        const prevTotal = Number(invNow.invoiceTotal || 0);
        const prevHours = Array.isArray(invNow.invoiceItems)
          ? invNow.invoiceItems.reduce((s: number, it: any) => s + (Number(it?.hours) || 0), 0)
          : 0;

        const deltaTotal = Number(invoiceTotal) - prevTotal;
        const deltaHours = Number(invoiceHours) - prevHours;

        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectSnap = await t.get(projectRef);
        if (!projectSnap.exists) throw new Error('Project not found');
        const proj = projectSnap.data() as any;

        const prevUsed = Number(proj.previouslyInvoicedAmount || 0);
        const prevUsedHours = Number(proj.usedHours || 0);
        const orig = Number(proj.originalPoAmount || 0);
        const co = Number(proj.changeOrderAmount || 0);
        const newPo = Number(proj.newPoAmount || 0);
        const capacity = newPo > 0 ? newPo : (orig + co);

        const nextPreviouslyInvoiced = Math.max(0, prevUsed + deltaTotal);
        const nextUsedHours = Math.max(0, prevUsedHours + deltaHours);
        const nextRemainingPo = Math.max(0, capacity - nextPreviouslyInvoiced);
        const nextRemainingHours = Math.max(0, Number(proj.budgetedHours || 0) - nextUsedHours);

        t.update(projectRef, {
          previouslyInvoicedAmount: nextPreviouslyInvoiced,
          usedHours: nextUsedHours,
          remainingPoAmount: nextRemainingPo,
          remainingHours: nextRemainingHours,
        });

        const existingApprovalSnapshot = invNow.approvalSnapshot as any;
        const nextApprovalSnapshot = existingApprovalSnapshot
          ? { ...existingApprovalSnapshot, total: invoiceTotal, hours: invoiceHours }
          : {
              total: invoiceTotal,
              hours: invoiceHours,
              createdAt: AdminTs.now(),
              approvedBy: invNow.approvedBy || validatedInput.userId,
              approvedByName: invNow.approvedByName || 'Unknown',
            };

        t.update(invoiceRef, { ...updates, approvalSnapshot: nextApprovalSnapshot });
      });
    } else {
      await invoiceRef.update(updates);
    }

    await revalidateInvoiceViews(validatedInvoiceId);

    const serializedUploads: UploadedFileResponse[] = Array.isArray(uploadedFiles)
      ? ((serializeFirestoreValue(uploadedFiles) as Array<Record<string, unknown>>).map((entry) => {
          const fileName = typeof entry.fileName === 'string' ? entry.fileName : '';
          const fileUrl = typeof entry.fileUrl === 'string' ? entry.fileUrl : '';
          const uploadedAt = typeof entry.uploadedAt === 'string' ? entry.uploadedAt : undefined;
          if (!fileName || !fileUrl) {
            return null;
          }
          return { fileName, fileUrl, uploadedAt };
        }).filter(Boolean) as UploadedFileResponse[])
      : [];

    return { success: true, message: 'Invoice updated successfully', uploadedFiles: serializedUploads };
  } catch (error) {
    console.error('Error updating invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update invoice' };
  }
}

export async function submitInvoice(invoiceId: string, userId: string) {
  if (!adminDb) throw new Error('Database not initialized');
  try {
    // Validate inputs
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const validatedUserId = validateInvoiceId(userId); // Same validation pattern
    const invoiceRef = adminDb.collection('invoices').doc(validatedInvoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      throw new Error('Invoice not found');
    }

    await invoiceRef.update({
      status: 'submitted',
      submittedAt: AdminTs.now(),
      submittedBy: validatedUserId,
    });

    let pdfResult: Awaited<ReturnType<typeof generateInvoicePDF>> | null = null;
    try {
      pdfResult = await generateInvoicePDF(validatedInvoiceId);

      if (pdfResult?.success) {
        await invoiceRef.update({
          pdfUrl: pdfResult.pdfUrl,
          pdfFileName: pdfResult.fileName,
          pdfGeneratedAt: AdminTs.now(),
        });
      }
    } catch (pdfError) {
      console.error('PDF generation failed during submission:', pdfError);
    }

    return {
      success: true,
      message: 'Invoice submitted successfully',
      pdfGenerated: Boolean(pdfResult?.success),
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
  if (!adminDb) throw new Error('Database not initialized');
  try {
    // Validate input
    const validatedInvoiceId = validateInvoiceId(invoiceId);
    const invoiceRef = adminDb.collection('invoices').doc(validatedInvoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      throw new Error('Invoice not found');
    }
    const invoiceData = invoiceSnap.data() ?? {};
    const pdfUrl = await generatePDFDocument(invoiceData, validatedInvoiceId);
    
    return {
      success: true,
      message: 'PDF generated successfully',
      pdfUrl,
      fileName: `invoice-${(invoiceData as any).invoiceNumber || validatedInvoiceId}.pdf`,
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
    const filenameBase = `invoice-${(invoiceData as any).invoiceNumber || invoiceId}`;
    if (result.success) {
      if (result.pdfUrl) {
        return result.pdfUrl;
      }
      if (result.pdfBuffer && typeof window === 'undefined') {
        // Server: upload buffer to Storage and return durable URL
        const uploaded = await uploadPdfBufferToStorage(invoiceId, filenameBase, result.pdfBuffer);
        return uploaded.url;
      }
    }
    throw new Error(result.error || 'PDF generation failed');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

export async function deleteInvoice(invoiceId: string, requesterUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  try {
    // Basic validation for invoiceId only
    const validatedInvoiceId = validateInvoiceId(invoiceId);

    // Determine requester role
    const { role } = await getUserRoleAndName(requesterUid);
    if (!role) throw new Error('Unauthorized');

    const ref = adminDb.collection('invoices').doc(validatedInvoiceId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error('Invoice not found');
    }
    const inv = snap.data() as any;

    // Author id
    const invAuthorId = (typeof inv.userId === 'object' && inv.userId?.id)
      ? inv.userId.id
      : inv.userId;

    const status = String(inv.status || '').toLowerCase();
    const isHistorical = inv.isHistorical === true;

    // Authorization rules
    if (role === 'Admin' || role === 'Prime') {
      // No restrictions for Admin/Prime (can delete any invoice including historical)
    } else if (role === 'Subconsultant') {
      // Historical invoices can be deleted by the author regardless of status
      // Regular invoices must be the author and in a deletable state
      if (isHistorical && requesterUid === invAuthorId) {
        // Allow deletion of historical invoices by author
      } else {
        const deletableStatuses = new Set(['draft', 'rejected', 'revision_requested']);
        if (requesterUid !== invAuthorId || !deletableStatuses.has(status)) {
          throw new Error('You do not have permission to delete this invoice');
        }
      }
    } else {
      throw new Error('You do not have permission to delete this invoice');
    }

    // Perform delete
    await ref.delete();

    await revalidateInvoiceViews(validatedInvoiceId);
    return { success: true, message: 'Invoice deleted successfully' };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete invoice' };
  }
}

// Delete multiple invoices function
export async function deleteMultipleInvoices(invoiceIds: string[], requesterUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  try {
    const results: Array<{ invoiceId: string; success: boolean; message?: string; error?: string }> = [];
    for (const id of invoiceIds) {
      try {
        const validatedId = validateInvoiceId(id);
        const res = await deleteInvoice(validatedId, requesterUid);
        results.push({ invoiceId: validatedId, ...(res as any) });
      } catch (err: any) {
        results.push({ invoiceId: id, success: false, error: err?.message || String(err) });
      }
    }
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
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

// Phase 2: Server-only guards and state transitions for invoicing workflow
import { revalidatePath } from 'next/cache';
import type { UserRole, Invoice } from '@/types';
import { extractId } from '@/lib/document-reference-utils';
import { notifyAdminsPrimes, notifyAuthor } from '@/lib/notifications';
import { Timestamp as AdminTs } from 'firebase-admin/firestore';

// Helpers
async function getUserRoleAndName(uid: string): Promise<{ role: UserRole | null; displayName: string | null }> {
  if (!adminDb) return { role: null, displayName: null };
  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    if (!snap.exists) return { role: null, displayName: null };
    const d = snap.data() as any;
    return { role: (d?.role as UserRole) || null, displayName: (d?.displayName as string) || null };
  } catch {
    return { role: null, displayName: null };
  }
}

function assertAllowed(role: UserRole | null | undefined, allowed: UserRole[]): void {
  if (!role || !allowed.includes(role)) {
    throw new Error('Insufficient permissions');
  }
}

function sumInvoiceHours(inv: Invoice): number {
  try {
    return (inv.invoiceItems || []).reduce((s: number, it: any) => s + (Number(it.hours) || 0), 0);
  } catch { return 0; }
}

function nowTs() { return AdminTs.now(); }

async function revalidateInvoiceViews(invoiceId: string) {
  try {
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
  } catch {}
}

// Submit for review (Subconsultant: from draft -> submitted; from rejected -> resubmitted)
export async function submitInvoiceForReview(invoiceId: string, authorUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(authorUid);
  // All roles can submit their own draft; Subconsultant flow is primary
  assertAllowed(role, ['Admin','Prime','Subconsultant']);

  const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
  await adminDb.runTransaction(async (t) => {
    const snap = await t.get(invoiceRef);
    if (!snap.exists) throw new Error('Invoice not found');
    const inv = snap.data() as any as Invoice;

    const invAuthorId = extractId(inv.userId) || '';
    if (role === 'Subconsultant' && invAuthorId !== authorUid) throw new Error('Cannot submit someone else\'s invoice');

    const cur = String(inv.status || 'draft').toLowerCase();
    if (cur === 'submitted' || cur === 'resubmitted' || cur === 'approved') {
      throw new Error('Invoice is locked and cannot be submitted');
    }

    const nextStatus = cur === 'rejected' ? 'resubmitted' : 'submitted';
    const history = Array.isArray(inv.history) ? inv.history.slice() : [];
    history.push({
      date: nowTs(),
      notes: nextStatus === 'resubmitted' ? 'Resubmitted by author' : 'Submitted by author',
      status: nextStatus,
      userId: authorUid,
      userName: displayName || 'Unknown',
    } as any);

    const invoiceItems = Array.isArray((inv as any).invoiceItems) ? (inv as any).invoiceItems : [];
    const reimbursableExpenses = Array.isArray((inv as any).reimbursableExpenses) ? (inv as any).reimbursableExpenses : [];
    const invoiceItemsTotal = Number((inv as any).invoiceItemsTotal || 0);
    const reimbursableExpensesTotal = Number((inv as any).reimbursableExpensesTotal || 0);
    const invoiceTotal = Number((inv as any).invoiceTotal || (invoiceItemsTotal + reimbursableExpensesTotal) || 0);

    const submittedSnapshot = {
      capturedAt: nowTs(),
      capturedBy: (inv as any).userId || authorUid,
      capturedByName: (inv as any).submitterName || displayName || 'Unknown',
      invoiceItems,
      reimbursableExpenses,
      invoiceItemsTotal,
      reimbursableExpensesTotal,
      invoiceTotal,
    };

    t.update(invoiceRef, {
      status: nextStatus,
      history,
      rejectedNotes: nextStatus === 'resubmitted' ? null : (inv as any).rejectedNotes ?? null,
      submittedSnapshot,
    });
  });

  await notifyAdminsPrimes('invoice-submitted', { invoiceId, by: authorUid });
  await revalidateInvoiceViews(invoiceId);

  return { success: true, message: 'Invoice submitted for review' };
}

export async function resubmitInvoice(invoiceId: string, authorUid: string) {
  return submitInvoiceForReview(invoiceId, authorUid);
}

// Approve (Admin/Prime only) with idempotency and rollups
export async function approveInvoice(invoiceId: string, approverUid: string, approvalRunId: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(approverUid);
  assertAllowed(role, ['Admin','Prime']);

  const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
  await adminDb.runTransaction(async (t) => {
    const snap = await t.get(invoiceRef);
    if (!snap.exists) throw new Error('Invoice not found');
    const inv = snap.data() as any as Invoice;

    const cur = String(inv.status || '').toLowerCase();
    if (cur === 'approved' && (inv.approvalRunId === approvalRunId || !approvalRunId)) {
      return; // idempotent
    }
    if (!(cur === 'submitted' || cur === 'resubmitted' || cur === 'draft')) {
      throw new Error('Invoice not in approvable state');
    }

    const total = Number(inv.invoiceTotal || 0);
    const hours = sumInvoiceHours(inv);

    // Update invoice fields
    const history = Array.isArray(inv.history) ? inv.history.slice() : [];
    history.push({ date: nowTs(), notes: 'Approved', status: 'approved', userId: approverUid, userName: displayName || 'Unknown' } as any);

    const approvalSnapshot = {
      total,
      hours,
      createdAt: nowTs(),
      approvedBy: approverUid as any,
      approvedByName: displayName || 'Unknown',
    };

    const needsSubmittedSnapshot = !(inv as any).submittedSnapshot;
    const submittedSnapshot = needsSubmittedSnapshot
      ? {
          capturedAt: nowTs(),
          capturedBy: (inv as any).userId || null,
          capturedByName: (inv as any).submitterName || 'Unknown',
          invoiceItems: Array.isArray((inv as any).invoiceItems) ? (inv as any).invoiceItems : [],
          reimbursableExpenses: Array.isArray((inv as any).reimbursableExpenses) ? (inv as any).reimbursableExpenses : [],
          invoiceItemsTotal: Number((inv as any).invoiceItemsTotal || 0),
          reimbursableExpensesTotal: Number((inv as any).reimbursableExpensesTotal || 0),
          invoiceTotal: Number((inv as any).invoiceTotal || 0),
        }
      : undefined;

    // Apply project rollups
    const projectId = extractId(inv.projectId);
    if (!projectId) throw new Error('Missing projectId');
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await t.get(projectRef);
    if (!projectSnap.exists) throw new Error('Project not found');
    const proj = projectSnap.data() as any;

    const prevUsed = Number(proj.previouslyInvoicedAmount || 0);
    const prevHours = Number(proj.usedHours || 0);
    const orig = Number(proj.originalPoAmount || 0);
    const co = Number(proj.changeOrderAmount || 0);
    const newPo = Number(proj.newPoAmount || 0);
    const capacity = newPo > 0 ? newPo : (orig + co);

    const nextPreviouslyInvoiced = prevUsed + total;
    const nextUsedHours = prevHours + hours;
    const nextRemainingPo = Math.max(0, capacity - nextPreviouslyInvoiced);
    const nextRemainingHours = Math.max(0, Number(proj.budgetedHours || 0) - nextUsedHours);

    t.update(projectRef, {
      previouslyInvoicedAmount: nextPreviouslyInvoiced,
      usedHours: nextUsedHours,
      remainingPoAmount: nextRemainingPo,
      remainingHours: nextRemainingHours,
    });

    t.update(invoiceRef, {
      status: 'approved',
      approvedAt: nowTs(),
      approvedBy: approverUid as any,
      approvedByName: displayName || 'Unknown',
      approvalSnapshot,
      approvalRunId,
      history,
      ...(submittedSnapshot ? { submittedSnapshot } : {}),
    });
  });

  await notifyAuthor(extractId((await adminDb!.collection('invoices').doc(invoiceId).get()).data()!.userId)!, 'invoice-approved', { invoiceId, by: approverUid });
  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'Invoice approved' };
}

// Reject (Admin/Prime only). If reversing a prior approval, rollback rollups.
export async function rejectInvoice(invoiceId: string, approverUid: string, reason: string, options?: { reversePriorApproval?: boolean }) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(approverUid);
  assertAllowed(role, ['Admin','Prime']);

  const reverse = Boolean(options?.reversePriorApproval);

  const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
  await adminDb.runTransaction(async (t) => {
    const snap = await t.get(invoiceRef);
    if (!snap.exists) throw new Error('Invoice not found');
    const inv = snap.data() as any as Invoice;

    const cur = String(inv.status || '').toLowerCase();
    if (!(cur === 'submitted' || cur === 'resubmitted' || cur === 'approved')) {
      throw new Error('Invoice not in reviewable state');
    }

    // If reversing a previously approved invoice
    if (reverse && inv.approvalSnapshot) {
      const projectId = extractId(inv.projectId);
      if (projectId) {
        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectSnap = await t.get(projectRef);
        if (projectSnap.exists) {
          const proj = projectSnap.data() as any;
          const cap = Number(proj.newPoAmount || 0) || (Number(proj.originalPoAmount || 0) + Number(proj.changeOrderAmount || 0));
          const prevUsed = Number(proj.previouslyInvoicedAmount || 0);
          const prevHours = Number(proj.usedHours || 0);
          const nextUsed = Math.max(0, prevUsed - Number(inv.approvalSnapshot.total || 0));
          const nextHours = Math.max(0, prevHours - Number(inv.approvalSnapshot.hours || 0));
          const nextRemainPo = Math.max(0, cap - nextUsed);
          const nextRemainHours = Math.max(0, Number(proj.budgetedHours || 0) - nextHours);
          t.update(projectRef, {
            previouslyInvoicedAmount: nextUsed,
            usedHours: nextHours,
            remainingPoAmount: nextRemainPo,
            remainingHours: nextRemainHours,
          });
        }
      }
    }

    const history = Array.isArray(inv.history) ? inv.history.slice() : [];
    history.push({ date: nowTs(), notes: reason || 'Rejected', status: 'rejected', userId: approverUid, userName: displayName || 'Unknown' } as any);

    t.update(invoiceRef, { status: 'rejected', rejectedNotes: reason || '', history });
  });

  const authorId = extractId((await adminDb!.collection('invoices').doc(invoiceId).get()).data()!.userId)!;
  await notifyAuthor(authorId, 'invoice-rejected', { invoiceId, by: approverUid, reason });
  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'Invoice rejected' };
}

// Generate PDF (Admin/Prime only, approved status). Append version and update current.
export async function generateInvoicePdf(invoiceId: string, requesterUid: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(requesterUid);
  assertAllowed(role, ['Admin','Prime']);

  // Ensure approved status
  const invSnapAdmin = await adminDb.collection('invoices').doc(invoiceId).get();
  if (!invSnapAdmin.exists) throw new Error('Invoice not found');
  const inv = invSnapAdmin.data() as any as Invoice;
  if (String(inv.status || '').toLowerCase() !== 'approved') throw new Error('PDF generation allowed only for approved invoices');

  // Use existing generator
  const { generateClientSidePdf } = await import('@/lib/pdf-generator');
  const projectId = extractId(inv.projectId) || '';
  const contractId = extractId((inv as any).contractId) || '';

  const filenameBase = `invoice-${inv.invoiceNumber || invoiceId}`;

  const pdfRes = await generateClientSidePdf(invoiceId, {
    category: 'Invoice',
    userContext: { system: 'invoicing-actions' },
    projectId,
    contractId,
  });
  let pdfUrl = pdfRes?.pdfUrl;
  if (!pdfUrl) {
    if (pdfRes?.success && pdfRes?.pdfBuffer && typeof window === 'undefined') {
      const uploaded = await uploadPdfBufferToStorage(invoiceId, filenameBase, pdfRes.pdfBuffer);
      pdfUrl = uploaded.url;
    } else {
      throw new Error(pdfRes?.error || 'PDF generation failed');
    }
  }

  // Append pdf version in transaction
  await adminDb.runTransaction(async (t) => {
    const ref = adminDb.collection('invoices').doc(invoiceId);
    const s = await t.get(ref);
    if (!s.exists) throw new Error('Invoice not found');
    const cur = s.data() as any;
    const counter = Number(cur.pdfVersionCounter || 0) + 1;

    const pdfVersion = {
      createdAt: nowTs(),
      uid: requesterUid as any,
      createdByName: displayName || 'Unknown',
      fileName: `${filenameBase}-v${counter}.pdf`,
      notes: 'Generated',
      type: counter === 1 ? 'initial' : 'replacement',
      url: pdfUrl,
      version: counter,
    };

    const nextVersions = Array.isArray(cur.pdfVersions) ? [...cur.pdfVersions, pdfVersion] : [pdfVersion];

    t.update(ref, {
      pdfUrl,
      pdfFileName: pdfVersion.fileName,
      pdfVersions: nextVersions,
      pdfVersionCounter: counter,
    });
  });

  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'PDF generated', pdfUrl: (await adminDb.collection('invoices').doc(invoiceId).get()).data()?.pdfUrl };
}

// Submit internal revision (Admin/Prime only, approved status)
export async function submitInvoiceWithInternalChanges(invoiceId: string, requesterUid: string, notes?: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(requesterUid);
  assertAllowed(role, ['Admin','Prime']);

  const invSnapAdmin = await adminDb.collection('invoices').doc(invoiceId).get();
  if (!invSnapAdmin.exists) throw new Error('Invoice not found');
  const inv = invSnapAdmin.data() as any as Invoice;
  if (String(inv.status || '').toLowerCase() !== 'approved') throw new Error('Only approved invoices can be revised');

  // Simulate generating a new PDF from internal edits (re-use generator but mark type)
  const { generateClientSidePdf } = await import('@/lib/pdf-generator');
  const projectId = extractId(inv.projectId) || '';
  const contractId = extractId((inv as any).contractId) || '';
  const filenameBase = `invoice-${inv.invoiceNumber || invoiceId}`;

  const pdfRes = await generateClientSidePdf(invoiceId, {
    category: 'Invoice',
    userContext: { system: 'invoicing-internal-revision' },
    projectId,
    contractId,
  });
  if (!pdfRes?.success || !pdfRes?.pdfUrl) throw new Error(pdfRes?.error || 'PDF generation failed');

  await adminDb.runTransaction(async (t) => {
    const ref = adminDb.collection('invoices').doc(invoiceId);
    const s = await t.get(ref);
    if (!s.exists) throw new Error('Invoice not found');
    const cur = s.data() as any;
    const counter = Number(cur.pdfVersionCounter || 0) + 1;

    const pdfVersion = {
      createdAt: nowTs(),
      uid: requesterUid as any,
      createdByName: displayName || 'Unknown',
      fileName: `${filenameBase}-v${counter}.pdf`,
      notes: notes || 'Internal revision',
      type: 'internal-revision',
      url: pdfRes.pdfUrl,
      version: counter,
    };

    const nextVersions = Array.isArray(cur.pdfVersions) ? [...cur.pdfVersions, pdfVersion] : [pdfVersion];

    t.update(ref, {
      pdfUrl: pdfRes.pdfUrl,
      pdfFileName: pdfVersion.fileName,
      pdfVersions: nextVersions,
      pdfVersionCounter: counter,
    });
  });

  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'Internal revision submitted' };
}

// Restore specific pdf version (Admin/Prime only, approved status)
export async function restoreInvoicePdfVersion(invoiceId: string, requesterUid: string, versionNumber: number, notes?: string) {
  if (!adminDb) throw new Error('Database not initialized');
  const { role, displayName } = await getUserRoleAndName(requesterUid);
  assertAllowed(role, ['Admin','Prime']);

  await adminDb.runTransaction(async (t) => {
    const ref = adminDb.collection('invoices').doc(invoiceId);
    const s = await t.get(ref);
    if (!s.exists) throw new Error('Invoice not found');
    const cur = s.data() as any;
    if (String(cur.status || '').toLowerCase() !== 'approved') throw new Error('Only approved invoices can restore PDF');

    const versions = Array.isArray(cur.pdfVersions) ? cur.pdfVersions : [];
    const target = versions.find((v: any) => v.version === versionNumber);
    if (!target) throw new Error('Version not found');

    const counter = Number(cur.pdfVersionCounter || 0) + 1;
    const replacement = {
      createdAt: nowTs(),
      uid: requesterUid as any,
      createdByName: displayName || 'Unknown',
      fileName: target.fileName,
      notes: notes || `Restore v${versionNumber}`,
      type: 'replacement',
      url: target.url,
      version: counter,
    };

    const nextVersions = [...versions, replacement];

    t.update(ref, {
      pdfUrl: target.url,
      pdfFileName: target.fileName,
      pdfVersions: nextVersions,
      pdfVersionCounter: counter,
    });
  });

  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'PDF version restored' };
}

// Return invoice for edits (neutral alternative to rejection)
export async function returnInvoiceForEdits(
  invoiceId: string,
  requesterUid: string,
  reason: string = 'Returned for revisions'
) {
  if (!validateInvoiceId(invoiceId)) throw new Error('Invalid invoice ID');
  
  const adminDb = getAdminFirestore();
  const nowTs = () => Timestamp.now();
  
  return await adminDb.runTransaction(async (t) => {
    const ref = adminDb.collection('invoices').doc(invoiceId);
    const snap = await t.get(ref);
    if (!snap.exists) throw new Error('Invoice not found');
    
    const cur = snap.data()!;
    const currentStatus = String(cur.status || '').toLowerCase();
    
    // Can return submitted, resubmitted, or approved invoices for edits
    if (!['submitted', 'resubmitted', 'approved'].includes(currentStatus)) {
      throw new Error(`Cannot return ${currentStatus} invoice for edits`);
    }
    
    // Get requester info
    const reqUser = await adminDb.collection('users').doc(requesterUid).get();
    if (!reqUser.exists) throw new Error('Requester not found');
    const reqData = reqUser.data()!;
    const displayName = reqData.displayName || reqData.email || 'Unknown';
    
    const historyEntry = {
      action: 'returned_for_edits',
      timestamp: nowTs(),
      userId: requesterUid,
      userDisplayName: displayName,
      notes: reason,
      previousStatus: cur.status,
      newStatus: 'revision_requested'
    };
    
    const nextHistory = Array.isArray(cur.history) ? [...cur.history, historyEntry] : [historyEntry];
    
    t.update(ref, {
      status: 'revision_requested',
      history: nextHistory,
      lastModified: nowTs(),
      lastModifiedBy: requesterUid
    });
  });

  await revalidateInvoiceViews(invoiceId);
  return { success: true, message: 'Invoice returned for edits' };
}

export async function createHistoricalInvoice(invoiceData: Partial<Invoice>, paymentStatus: string, projectName: string) {
  if (!adminDb) {
    return { success: false, error: 'Database connection not available' };
  }

  try {
    // Ensure isHistorical is true
    const dataToSave = {
      ...invoiceData,
      isHistorical: true,
      createdAt: AdminTimestamp.now(),
    };

    // Convert any Date objects or strings to Timestamps if needed
    // The incoming invoiceData might have Timestamps or Dates depending on how it's passed
    // But since it's coming from a client component via server action, it will be serialized.
    // Dates will be strings or numbers. Timestamps will be objects.
    
    // We need to ensure the fields are correct for Firestore
    if (typeof dataToSave.fromDate === 'string') dataToSave.fromDate = AdminTimestamp.fromDate(new Date(dataToSave.fromDate)) as any;
    if (typeof dataToSave.toDate === 'string') dataToSave.toDate = AdminTimestamp.fromDate(new Date(dataToSave.toDate)) as any;
    if (typeof dataToSave.dueDate === 'string') dataToSave.dueDate = AdminTimestamp.fromDate(new Date(dataToSave.dueDate)) as any;
    if (typeof dataToSave.approvedAt === 'string') dataToSave.approvedAt = AdminTimestamp.fromDate(new Date(dataToSave.approvedAt)) as any;

    const docRef = await adminDb.collection('invoices').add(dataToSave);

    // Create Payment Tracking record
    const paymentData = {
      invoiceId: docRef.id,
      invoiceNumber: dataToSave.invoiceNumber || '',
      projectId: dataToSave.projectId || '',
      departmentId: dataToSave.departmentId || '',
      projectName: projectName,
      invoiceAmount: dataToSave.invoiceTotal || 0,
      paidAmount: paymentStatus === 'Paid' ? (dataToSave.invoiceTotal || 0) : 0,
      outstandingAmount: paymentStatus === 'Paid' ? 0 : (dataToSave.invoiceTotal || 0),
      status: paymentStatus,
      dueDate: dataToSave.dueDate || AdminTimestamp.now(),
      createdAt: AdminTimestamp.now(),
      updatedAt: AdminTimestamp.now(),
    };

    await adminDb.collection('payment_tracking').add(paymentData);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating historical invoice:', error);
    return { success: false, error: 'Failed to create historical invoice' };
  }
}
