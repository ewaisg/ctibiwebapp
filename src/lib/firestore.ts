import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { extractId } from '@/lib/document-reference-utils';

// Initialize Firebase Admin for server-side operations
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

// Use admin SDK for server-side operations when client SDK is not available
const adminDb = getApps().length > 0 ? getAdminFirestore() : null;

// Helper function to serialize Firestore data
function serializeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle Firestore Timestamp objects
  if (typeof obj === 'object' && ('seconds' in obj || '_seconds' in obj || 'nanoseconds' in obj || '_nanoseconds' in obj)) {
    const seconds = obj.seconds || obj._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toISOString();
    }
  }
  
  // Handle DocumentReference objects
  if (typeof obj === 'object' && 'id' in obj && 'path' in obj) {
    return obj.id;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializeFirestoreData);
  }
  
  // Handle plain objects
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeFirestoreData(value);
    }
    return result;
  }
  
  return obj;
}

// Helper function to get data from either client or admin SDK
async function getCollectionData(collectionName: string) {
  // Try client SDK first
  if (db) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error fetching collection with client SDK:`, collectionName);
    }
  }
  
  // Fallback to admin SDK
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection(collectionName).get();
      return snapshot.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error fetching collection with admin SDK:`, collectionName);
    }
  }
  
  console.error(`Database not initialized for collection:`, collectionName);
  return [];
}
import { Project, Department, Contract, Invoice, Employee, Company, User, CtiTimesheet, Division, Service, Assignment } from '@/types';

export async function getAllInvoices(): Promise<Invoice[]> {
  // Try client SDK first, fallback to admin SDK
  if (db) {
    try {
      const invoicesCollection = collection(db, 'invoices');
      const snapshot = await getDocs(invoicesCollection);
      return snapshot.docs.map(doc => serializeFirestoreData({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
    } catch (error) {
      console.error('Error fetching invoices with client SDK:', error);
    }
  }
  
  // Fallback to admin SDK
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection('invoices').get();
      return snapshot.docs.map(doc => serializeFirestoreData({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
    } catch (error) {
      console.error('Error fetching invoices with admin SDK:', error);
    }
  }
  
  console.error('Database not initialized');
  return [];
}

// Simple helper to convert Firestore data to our types
export async function getProjects(): Promise<Project[]> {
  // Try client SDK first, fallback to admin SDK
  if (db) {
    try {
      const projectsCollection = collection(db, 'projects');
      const snapshot = await getDocs(projectsCollection);
      return snapshot.docs.map(doc => serializeFirestoreData({
        id: doc.id,
        ...doc.data()
      })) as Project[];
    } catch (error) {
      console.error('Error fetching projects with client SDK:', error);
    }
  }
  
  // Fallback to admin SDK
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection('projects').get();
      return snapshot.docs.map(doc => serializeFirestoreData({
        id: doc.id,
        ...doc.data()
      })) as Project[];
    } catch (error) {
      console.error('Error fetching projects with admin SDK:', error);
    }
  }
  
  console.error('Database not initialized');
  return [];
}

export async function getProject(id: string): Promise<Project | null> {
  if (!db) {
    console.error('Database not initialized');
    return null;
  }

  try {
    const projectDoc = doc(db, 'projects', id);
    const snapshot = await getDoc(projectDoc);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      } as Project;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

export async function getDepartments(): Promise<Department[]> {
  return await getCollectionData('departments') as Department[];
}

export async function getDivisions(): Promise<Division[]> {
  return await getCollectionData('divisions') as Division[];
}

export async function getContracts(): Promise<Contract[]> {
  return await getCollectionData('contracts') as Contract[];
}

export async function getInvoices(): Promise<Invoice[]> {
  return await getCollectionData('invoices') as Invoice[];
}

// Additional functions for project detail page
export async function getProjectById(id: string): Promise<Project | null> {
  return getProject(id); // Alias for consistency
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  if (!db) {
    console.error('Database not initialized');
    return null;
  }

  try {
    const departmentDoc = doc(db, 'departments', id);
    const snapshot = await getDoc(departmentDoc);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      } as Department;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching department:', error);
    return null;
  }
}

export async function getInvoicesByProject(projectId: string): Promise<Invoice[]> {
  if (!db) {
    console.error('Database not initialized');
    return [];
  }

  try {
    const invoicesCollection = collection(db, 'invoices');
    const snapshot = await getDocs(invoicesCollection);
    
    // Filter invoices for this project
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as Invoice))
      .filter(invoice => {
        // Handle both string and DocumentReference projectId
        const invoiceProjectId = extractId(invoice.projectId);
        return invoiceProjectId === projectId;
      });
  } catch (error) {
    console.error('Error fetching project invoices:', error);
    return [];
  }
}

export async function getEmployees(): Promise<Employee[]> {
  return await getCollectionData('employees') as Employee[];
}

export async function getCompanies(): Promise<Company[]> {
  return await getCollectionData('companies') as Company[];
}

export async function getUsers(): Promise<User[]> {
  const data = await getCollectionData('users');
  return data.map(doc => ({
    ...doc,
    uid: doc.id
  } as unknown)) as User[];
}

export async function getTimesheetEntries(): Promise<CtiTimesheet[]> {
  return await getCollectionData('cti_timesheet') as CtiTimesheet[];
}

export async function getServices(): Promise<Service[]> {
  return await getCollectionData('services') as Service[];
}

export async function getRates() {
  return await getCollectionData('rates');
}

export async function getAssignments(): Promise<Assignment[]> {
  return await getCollectionData('resource_allocations') as Assignment[];
}
