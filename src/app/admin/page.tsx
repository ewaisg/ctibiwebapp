import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getUsers, getCompanies, getEmployees, getDepartments, getProjects, getContracts, getDivisions, getServices } from "@/lib/firestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";
import type { User, Company, Employee, Department, Project, Contract, Division, Service, InvoiceTemplate, GlobalRate, FinancialReport, PaymentTracking } from "@/types";

export const dynamic = 'force-dynamic';

// Generic serializer to ensure only plain JSON-safe structures go to Client Components
function serializeFirestoreData<T>(data: T): T {
  const serialize = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    // Firestore Timestamp (prototype) OR plain timestamp-like object
    if (
      typeof obj === 'object' && obj !== null && (
        typeof obj.toDate === 'function' ||
        obj.seconds !== undefined || obj._seconds !== undefined ||
        obj.nanoseconds !== undefined || obj._nanoseconds !== undefined
      )
    ) {
      if (typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
      }
      const seconds = obj.seconds ?? obj._seconds;
      const nanos = obj.nanoseconds ?? obj._nanoseconds ?? 0;
      if (typeof seconds === 'number') return new Date(seconds * 1000 + nanos / 1_000_000).toISOString();
    }

    // Firestore DocumentReference (id + path heuristic)
    if (typeof obj === 'object' && obj !== null && 'id' in obj && 'path' in obj) {
      return obj.id;
    }

    if (Array.isArray(obj)) return obj.map(serialize);

    if (typeof obj === 'object' && (obj.constructor === Object || obj.constructor === undefined)) {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) out[k] = serialize(v);
      return out;
    }
    return obj;
  };
  return serialize(data) as T;
}

// Whitelist-based sanitization for Project objects to strictly enforce schema
function sanitizeProjects(projects: any[]): Project[] {
  const allowedKeys: (keyof Project)[] = [
    'isComplete','id','projectName','contractId','departmentId','departmentCode','contractNumber','projectManager','approvingSupervisor','ipmssiStaff','pmisNumber','poNumber','isInactive','files','originalPoAmount','changeOrderAmount','newPoAmount','previouslyInvoicedAmount','remainingPoAmount','budgetedHours','usedHours','remainingHours','assignedCompanies'
  ];
  
  // Explicitly exclude problematic fields that shouldn't be sent to client
  const excludedKeys = ['lastModified', 'createdAt', 'updatedAt'];

  return (projects ?? []).map((raw): Project => {
    const p: any = {};
    for (const k of allowedKeys) {
      if (raw && raw[k] !== undefined && !excludedKeys.includes(k as string)) {
        p[k] = raw[k];
      }
    }
    
    // Apply serialization to handle nested Firestore objects
    const serialized = serializeFirestoreData(p);

    if (Array.isArray(serialized.files)) {
      serialized.files = serialized.files
        .filter((f: any) => f && f.fileName && f.fileUrl)
        .map((f: any) => ({ fileName: f.fileName, fileUrl: f.fileUrl }));
    }

    if (Array.isArray(serialized.assignedCompanies)) {
      serialized.assignedCompanies = serialized.assignedCompanies.map((c: any) => {
        const company: any = {
          companyId: c?.companyId,
          companyName: c?.companyName,
        };
        if (Array.isArray(c?.assignedEmployees)) {
          company.assignedEmployees = c.assignedEmployees
            .filter((e: any) => e && e.employeeId && e.employeeName)
            .map((e: any) => ({ employeeId: e.employeeId, employeeName: e.employeeName }));
        }
        if (Array.isArray(c?.assignedServices)) {
          company.assignedServices = c.assignedServices
            .filter((s: any) => s && s.serviceId && s.serviceName)
            .map((s: any) => ({
              serviceId: s.serviceId,
              serviceName: s.serviceName,
              description: s.description,
              billingRate: s.billingRate,
            }));
        }
        return company;
      });
    }

    return serialized as Project;
  });
}

// Helper function to get financial data
async function getFinancialData() {
  try {
    const [invoiceTemplates, globalRates, financialReports, paymentTrackings] = await Promise.all([
      getDocs(collection(db, "invoice_templates")),
      getDocs(collection(db, "global_rates")),
      getDocs(collection(db, "financial_reports")),
      getDocs(collection(db, "payment_tracking")),
    ]);

    return {
      invoiceTemplates: invoiceTemplates.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InvoiceTemplate[],
      globalRates: globalRates.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GlobalRate[],
      financialReports: financialReports.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FinancialReport[],
      paymentTrackings: paymentTrackings.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentTracking[],
    };
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return {
      invoiceTemplates: [],
      globalRates: [],
      financialReports: [],
      paymentTrackings: [],
    };
  }
}

export default async function AdminPage() {
  try {
    // Load only essential data initially, implement pagination for large datasets
    const [users, companies, departments, divisions, services] = await Promise.all([
      getUsers(),
      getCompanies(),
      getDepartments(),
      getDivisions(),
      getServices(),
    ]);
    
    // Load large datasets with limits
    const [employees, projects, contracts] = await Promise.all([
      getEmployees().then(data => data.slice(0, 100)), // Limit to first 100
      getProjects().then(data => data.slice(0, 50)),   // Limit to first 50
      getContracts().then(data => data.slice(0, 50)),  // Limit to first 50
    ]);
    
    // Load financial data separately
    const financialData = await getFinancialData();

    const { invoiceTemplates, globalRates, financialReports, paymentTrackings } = financialData;

    const sanitizedProjects = sanitizeProjects(projects as any[]);

    // Serialize data efficiently
    const serializedData = {
      users: serializeFirestoreData<User[]>(users),
      companies: serializeFirestoreData<Company[]>(companies),
      employees: serializeFirestoreData<Employee[]>(employees),
      departments: serializeFirestoreData<Department[]>(departments),
      projects: serializeFirestoreData<Project[]>(sanitizedProjects),
      contracts: serializeFirestoreData<Contract[]>(contracts),
      divisions: serializeFirestoreData<Division[]>(divisions),
      services: serializeFirestoreData<Service[]>(services),
      invoiceTemplates: serializeFirestoreData<InvoiceTemplate[]>(invoiceTemplates),
      globalRates: serializeFirestoreData<GlobalRate[]>(globalRates),
      financialReports: serializeFirestoreData<FinancialReport[]>(financialReports),
      paymentTrackings: serializeFirestoreData<PaymentTracking[]>(paymentTrackings)
    };

    return (
      <ProtectedRoute requiredPermission="canAccessAdmin">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              <AdminClientPage
                {...serializedData}
                initialUsers={serializedData.users}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error loading admin page:', error);
    return (
      <ProtectedRoute requiredPermission="canAccessAdmin">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              <AdminClientPage
                initialUsers={[]}
                companies={[]}
                employees={[]}
                departments={[]}
                projects={[]}
                contracts={[]}
                divisions={[]}
                services={[]}
                invoiceTemplates={[]}
                globalRates={[]}
                financialReports={[]}
                paymentTrackings={[]}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    );
  }
}