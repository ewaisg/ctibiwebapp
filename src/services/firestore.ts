import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp, getApp } from 'firebase/app';
import type { 
  User, 
  Employee, 
  Project, 
  Department, 
  Company, 
  Client, 
  Contract, 
  Service,
  Assignment,
  CtiTimesheet} from '@/types';

// Server-side Firebase initialization
function getServerFirestore() {
  try {
    const app = getApp();
    return getFirestore(app);
  } catch {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    const app = initializeApp(firebaseConfig);
    return getFirestore(app);
  }
}

const db = getServerFirestore();

// Generic collection functions
export async function getCollection<T>(collectionName: string): Promise<T[]> {
  const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
}

// Users
export async function getUsers(): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as User[];
}

export async function addUser(userData: Omit<User, 'uid'>): Promise<void> {
  const userRef = doc(db, 'users', userData.email); // Use email as document ID
  await setDoc(userRef, {
    ...userData,
    createdAt: Timestamp.now(),
    lastLoginAt: null
  });
}

export async function updateUser(uid: string, userData: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...userData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteUser(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
}

// Employees
export async function getEmployees(): Promise<Employee[]> {
  return getCollection<Employee>('employees');
}

export async function addEmployee(employeeData: Omit<Employee, 'id'>): Promise<void> {
  const employeeRef = doc(db, 'employees', employeeData.employeeId.toString());
  await setDoc(employeeRef, {
    ...employeeData,
    createdAt: Timestamp.now()
  });
}

export async function updateEmployee(id: string, employeeData: Partial<Employee>): Promise<void> {
  const employeeRef = doc(db, 'employees', id);
  await updateDoc(employeeRef, {
    ...employeeData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteEmployee(id: string): Promise<void> {
  const employeeRef = doc(db, 'employees', id);
  await deleteDoc(employeeRef);
}

// Projects
export async function getProjects(): Promise<Project[]> {
  return getCollection<Project>('projects');
}

export async function addProject(projectData: Omit<Project, 'id'>): Promise<void> {
  const projectRef = doc(db, 'projects', projectData.poNumber);
  await setDoc(projectRef, {
    ...projectData,
    createdAt: Timestamp.now()
  });
}

export async function updateProject(id: string, projectData: Partial<Project>): Promise<void> {
  const projectRef = doc(db, 'projects', id);
  await updateDoc(projectRef, {
    ...projectData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteProject(id: string): Promise<void> {
  const projectRef = doc(db, 'projects', id);
  await deleteDoc(projectRef);
}

// Departments
export async function getDepartments(): Promise<Department[]> {
  return getCollection<Department>('departments');
}

export async function addDepartment(departmentData: Omit<Department, 'id'>): Promise<void> {
  const departmentRef = doc(db, 'departments', departmentData.departmentCode);
  await setDoc(departmentRef, {
    ...departmentData,
    createdAt: Timestamp.now()
  });
}

export async function updateDepartment(id: string, departmentData: Partial<Department>): Promise<void> {
  const departmentRef = doc(db, 'departments', id);
  await updateDoc(departmentRef, {
    ...departmentData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  const departmentRef = doc(db, 'departments', id);
  await deleteDoc(departmentRef);
}

// Companies
export async function getCompanies(): Promise<Company[]> {
  return getCollection<Company>('companies');
}

export async function addCompany(companyData: Omit<Company, 'id'>): Promise<void> {
  const companyRef = doc(db, 'companies', companyData.companyCode);
  await setDoc(companyRef, {
    ...companyData,
    createdAt: Timestamp.now()
  });
}

export async function updateCompany(id: string, companyData: Partial<Company>): Promise<void> {
  const companyRef = doc(db, 'companies', id);
  await updateDoc(companyRef, {
    ...companyData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteCompany(id: string): Promise<void> {
  const companyRef = doc(db, 'companies', id);
  await deleteDoc(companyRef);
}

// Clients
export async function getClients(): Promise<Client[]> {
  return getCollection<Client>('clients');
}

export async function addClient(clientData: Omit<Client, 'id'>): Promise<void> {
  const clientRef = doc(collection(db, 'clients'));
  await setDoc(clientRef, {
    ...clientData,
    createdAt: Timestamp.now()
  });
}

export async function updateClient(id: string, clientData: Partial<Client>): Promise<void> {
  const clientRef = doc(db, 'clients', id);
  await updateDoc(clientRef, {
    ...clientData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteClient(id: string): Promise<void> {
  const clientRef = doc(db, 'clients', id);
  await deleteDoc(clientRef);
}

// Contracts
export async function getContracts(): Promise<Contract[]> {
  return getCollection<Contract>('contracts');
}

export async function addContract(contractData: Omit<Contract, 'id'>): Promise<void> {
  const contractRef = doc(collection(db, 'contracts'));
  await setDoc(contractRef, {
    ...contractData,
    createdAt: Timestamp.now()
  });
}

export async function updateContract(id: string, contractData: Partial<Contract>): Promise<void> {
  const contractRef = doc(db, 'contracts', id);
  await updateDoc(contractRef, {
    ...contractData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteContract(id: string): Promise<void> {
  const contractRef = doc(db, 'contracts', id);
  await deleteDoc(contractRef);
}

// Services
export async function getServices(): Promise<Service[]> {
  return getCollection<Service>('services');
}

export async function addService(serviceData: Omit<Service, 'id'>): Promise<void> {
  const serviceRef = doc(collection(db, 'services'));
  await setDoc(serviceRef, {
    ...serviceData,
    createdAt: Timestamp.now()
  });
}

export async function updateService(id: string, serviceData: Partial<Service>): Promise<void> {
  const serviceRef = doc(db, 'services', id);
  await updateDoc(serviceRef, {
    ...serviceData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteService(id: string): Promise<void> {
  const serviceRef = doc(db, 'services', id);
  await deleteDoc(serviceRef);
}

// Assignments
export async function getAssignments(): Promise<Assignment[]> {
  return getCollection<Assignment>('resource_allocations');
}

export async function addAssignment(assignmentData: Omit<Assignment, 'id'>): Promise<void> {
  const assignmentRef = doc(collection(db, 'resource_allocations'));
  await setDoc(assignmentRef, {
    ...assignmentData,
    createdAt: Timestamp.now()
  });
}

export async function updateAssignment(id: string, assignmentData: Partial<Assignment>): Promise<void> {
  const assignmentRef = doc(db, 'resource_allocations', id);
  await updateDoc(assignmentRef, {
    ...assignmentData,
    updatedAt: Timestamp.now()
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  const assignmentRef = doc(db, 'resource_allocations', id);
  await deleteDoc(assignmentRef);
}

// CTI Timesheet Entries
export async function getCtiTimesheetEntries(): Promise<CtiTimesheet[]> {
  return getCollection<CtiTimesheet>('cti_timesheets');
}

// Company Rate Templates
export async function getCompanyRateTemplates(): Promise<any[]> {
  return getCollection<any>('companyRateTemplates');
}
