import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getProjects, getDepartments, getInvoices, getEmployees, getCompanies, getUsers, getContracts } from "@/lib/firestore";
import { InvoicesClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";
import { Invoice, Project, Department, Employee, Company, User, Contract } from "@/types";

// Force dynamic rendering to avoid build-time Firestore authentication errors
export const dynamic = 'force-dynamic';

// Helper function to serialize Firestore data for client components
function serializeFirestoreData(data: unknown): unknown {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Convert Firestore Timestamps to ISO strings
    if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
      return new Date(value.seconds * 1000).toISOString();
    }
    // Convert DocumentReferences to just their ID strings
    if (value && typeof value === 'object' && value.id && value.path) {
      return value.id;
    }
    return value;
  }));
}

export default async function InvoicesPage() {
  try {
    const [invoices, projects, departments, employees, companies, users, contracts] = await Promise.all([
      getInvoices(),
      getProjects(),
      getDepartments(),
      getEmployees(),
      getCompanies(),
      getUsers(),
      getContracts(),
    ]);
    // Serialize the data to avoid client component issues
    const serializedInvoices = serializeFirestoreData(invoices) as Invoice[];
    const serializedProjects = serializeFirestoreData(projects) as Project[];
    const serializedDepartments = serializeFirestoreData(departments) as Department[];
    const serializedEmployees = serializeFirestoreData(employees) as Employee[];
    const serializedCompanies = serializeFirestoreData(companies) as Company[];
    const serializedUsers = serializeFirestoreData(users) as User[];
    const serializedContracts = serializeFirestoreData(contracts) as Contract[];

    return (
      <ProtectedRoute requiredPermission="canAccessInvoices">
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
              <InvoicesClientPage
                initialInvoices={serializedInvoices}
                projects={serializedProjects}
                departments={serializedDepartments}
                employees={serializedEmployees}
                companies={serializedCompanies}
                users={serializedUsers}
                contracts={serializedContracts}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error loading invoices page:', error);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Unable to load invoices</h2>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
}
