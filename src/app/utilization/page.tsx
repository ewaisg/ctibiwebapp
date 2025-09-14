import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UtilizationClientPage } from "./client-page"
import { ProtectedRoute } from "@/components/protected-route"
import { getEmployees, getProjects, getDepartments, getTimesheetEntries, getAssignments } from "@/lib/firestore"

export const dynamic = 'force-dynamic';

export default async function UtilizationPage() {
  try {
    const [employees, projects, departments, timesheetEntries, assignments] = await Promise.all([
      getEmployees(),
      getProjects(), 
      getDepartments(),
      getTimesheetEntries(),
      getAssignments()
    ]);

    const serializedData = {
      employees: JSON.parse(JSON.stringify(employees)),
      projects: JSON.parse(JSON.stringify(projects)),
      departments: JSON.parse(JSON.stringify(departments)),
      timesheetEntries: JSON.parse(JSON.stringify(timesheetEntries)),
      assignments: JSON.parse(JSON.stringify(assignments))
    } as const;

    const initialData = { weekly: [], annual: [] };

    return (
      <ProtectedRoute requiredPermission="canAccessUtilization">
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
              <UtilizationClientPage initialData={initialData} assignments={serializedData.assignments} employees={serializedData.employees} projects={serializedData.projects} timesheetEntries={serializedData.timesheetEntries} />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    )
  } catch (error) {
    console.error('Error loading utilization page');
    return (
      <ProtectedRoute requiredPermission="canAccessUtilization">
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
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold mb-2">Unable to load utilization data</h2>
                <p className="text-muted-foreground">Please try refreshing the page</p>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    )
  }
}