import {
  getEmployees, 
  getProjects, 
  getDepartments, 
  getAssignments, 
  getTimesheetEntries,
  getServices 
} from "@/lib/firestore";
import { ManPowerClientPage } from "./client-page";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";

// Force dynamic rendering to avoid build-time Firestore authentication errors
export const dynamic = 'force-dynamic';

export default async function ManpowerPage() {
  const [
    allEmployees,
    projects,
    departments, 
    assignments, 
    timesheetEntries, 
    services
  ] = await Promise.all([
    getEmployees(),
    getProjects(),
    getDepartments(),
    getAssignments(),
    getTimesheetEntries(),
    getServices()
  ]);

  // Filter employees to exclude subconsultants and managers, and only show active employees
  const employees = allEmployees.filter((employee: any) =>
    employee.isSubconsultant === false &&
    employee.isManager === false &&
    employee.employmentStatus === 'Active'
  );

  return (
    <ProtectedRoute requiredPermission="canAccessManpower">
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
            <ManPowerClientPage 
              initialEmployees={JSON.parse(JSON.stringify(employees))}
              initialProjects={JSON.parse(JSON.stringify(projects))}
              initialDepartments={JSON.parse(JSON.stringify(departments))}
              initialAssignments={JSON.parse(JSON.stringify(assignments))}
              initialTimesheetEntries={JSON.parse(JSON.stringify(timesheetEntries))}
              initialServices={JSON.parse(JSON.stringify(services))}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
