import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getProjects, getDepartments, getInvoices, getCompanies, getEmployees, getServices } from "@/lib/firestore";
import { ProjectDetailClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";
import { notFound } from "next/navigation";
import type { Project, Department, Invoice, Company, Employee, Service } from "@/types";

// Force dynamic rendering to avoid build-time Firestore authentication errors
export const dynamic = 'force-dynamic';

// Helper function to serialize Firestore data for client components
function serializeFirestoreData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Convert Firestore Timestamps to ISO strings
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      const v = value as { seconds: number; nanoseconds: number };
      return new Date(v.seconds * 1000).toISOString();
    }
    // Convert DocumentReferences to just their ID strings
    if (value && typeof value === 'object' && 'id' in value && 'path' in value) {
      const v = value as { id: string; path: string };
      return v.id;
    }
    return value;
  })) as T;
}

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  
  try {
    const [projects, departments, allInvoices, companies, employees, services] = await Promise.all([
      getProjects(),
      getDepartments(),
      getInvoices(),
      getCompanies(),
      getEmployees(),
      getServices(),
    ]);

    // Find the specific project
    const project = projects.find(p => p.id === id);
    
    if (!project) {
      notFound();
    }

    // Get project-related invoices
    const projectInvoices = allInvoices.filter(invoice => {
      const invoiceProjectId = typeof invoice.projectId === 'string' 
        ? invoice.projectId 
        : invoice.projectId?.id;
      return invoiceProjectId === id;
    });

    // Serialize the data to avoid client component issues
    const serializedProject = serializeFirestoreData<Project>(project);
    const serializedDepartments = serializeFirestoreData<Department[]>(departments);
    const serializedInvoices = serializeFirestoreData<Invoice[]>(projectInvoices);
    const serializedCompanies = serializeFirestoreData<Company[]>(companies);
    const serializedEmployees = serializeFirestoreData<Employee[]>(employees);
    const serializedServices = serializeFirestoreData<Service[]>(services);

    return (
      <ProtectedRoute requiredPermission="canAccessProjects">
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
              <ProjectDetailClientPage
                project={serializedProject}
                departments={serializedDepartments}
                invoices={serializedInvoices}
                companies={serializedCompanies}
                employees={serializedEmployees}
                services={serializedServices}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error loading project detail page:', error);
    notFound();
  }
}
