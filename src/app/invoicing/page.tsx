import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InvoicingClientPage } from "./client-page";
import type { 
  Project, 
  Department, 
  Employee, 
  Company, 
  User, 
  Service,
  Rate,
  Invoice 
} from "@/types";

async function getInvoicingData() {
  try {
    const [
      projectsSnapshot,
      departmentsSnapshot,
      employeesSnapshot,
      companiesSnapshot,
      usersSnapshot,
      servicesSnapshot,
      ratesSnapshot,
    ] = await Promise.all([
      getDocs(collection(db, "projects")),
      getDocs(collection(db, "departments")),
      getDocs(collection(db, "employees")),
      getDocs(collection(db, "companies")),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "services")),
      getDocs(collection(db, "rates")),
    ]);

    const projects: Project[] = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];

    const departments: Department[] = departmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Department[];

    const employees: Employee[] = employeesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Employee[];

    const companies: Company[] = companiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Company[];

    const users: User[] = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    })) as User[];

    const services: Service[] = servicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Service[];

    const rates: Rate[] = ratesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Rate[];

    return {
      projects: JSON.parse(JSON.stringify(projects)),
      departments: JSON.parse(JSON.stringify(departments)),
      employees: JSON.parse(JSON.stringify(employees)),
      companies: JSON.parse(JSON.stringify(companies)),
      users: JSON.parse(JSON.stringify(users)),
      services: JSON.parse(JSON.stringify(services)),
      rates: JSON.parse(JSON.stringify(rates)),
    };
  } catch (error) {
    console.error("Error fetching invoicing data:", error);
    return {
      projects: [],
      departments: [],
      employees: [],
      companies: [],
      users: [],
      services: [],
      rates: [],
    };
  }
}

async function getInvoiceData(invoiceId?: string) {
  if (!invoiceId) return null;

  try {
    // Try to find invoice by ID or invoice number
    const invoicesRef = collection(db, "invoices");
    const q = query(
      invoicesRef,
      where("invoiceNumber", "==", invoiceId)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return JSON.parse(JSON.stringify({
        id: doc.id,
        ...doc.data(),
      })) as Invoice;
    }

    return null;
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    return null;
  }
}

interface InvoicingPageProps {
  searchParams: Promise<{ 
    id?: string;
    action?: 'autofill' | 'manual';
    projectId?: string;
    fromDate?: string;
    toDate?: string;
    departmentId?: string;
    showLoading?: string;
  }>;
}

export default async function InvoicingPage({ searchParams }: InvoicingPageProps) {
  const data = await getInvoicingData();
  const resolvedSearchParams = await searchParams;
  
  // Handle both edit mode (by ID) and new invoice creation
  const existingInvoice = resolvedSearchParams.id ? await getInvoiceData(resolvedSearchParams.id) : null;
  
  // Prepare initial form data from URL parameters for new invoices
  const initialFormData = {
    action: resolvedSearchParams.action,
    projectId: resolvedSearchParams.projectId,
    fromDate: resolvedSearchParams.fromDate ? new Date(resolvedSearchParams.fromDate) : undefined,
    toDate: resolvedSearchParams.toDate ? new Date(resolvedSearchParams.toDate) : undefined,
    departmentId: resolvedSearchParams.departmentId,
    showLoading: resolvedSearchParams.showLoading === 'true',
  };

  return (
    <ProtectedRoute requiredPermission="canAccessInvoices">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 space-y-6 p-8 pt-6">
          <Suspense fallback={<div>Loading...</div>}>
            <InvoicingClientPage 
              {...data}
              existingInvoice={existingInvoice}
              isEditing={!!resolvedSearchParams.id}
              initialFormData={initialFormData}
            />
          </Suspense>
        </main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
