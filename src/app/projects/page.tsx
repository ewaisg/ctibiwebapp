import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getProjects, getDepartments } from "@/lib/firestore";
import { ProjectsClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";
import type { Project, Department } from "@/types";

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

export default async function ProjectsPage() {
  try {
    const [projects, departments] = await Promise.all([
      getProjects(),
      getDepartments(),
    ]);

    // Serialize the data to avoid client component issues
    const serializedProjects = serializeFirestoreData<Project[]>(projects);
    const serializedDepartments = serializeFirestoreData<Department[]>(departments);

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
              <ProjectsClientPage
                initialProjects={serializedProjects}
                departments={serializedDepartments}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error loading projects page:', error);
    
    // Return empty state if there's an error
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
              <ProjectsClientPage
                initialProjects={[]}
                departments={[]}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    );
  }
}
