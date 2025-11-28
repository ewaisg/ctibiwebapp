import {
  getEmployees,
  getProjects,
  getDepartments,
  getAssignments,
  getTimesheetEntries,
  getServices
} from "@/lib/firestore";
import { ManPowerClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";
import { Suspense } from "react";
import { ManpowerSkeleton } from "@/components/skeletons/manpower-skeleton";

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
      <Suspense fallback={<ManpowerSkeleton />}>
        <ManPowerClientPage
          initialEmployees={JSON.parse(JSON.stringify(employees))}
          initialProjects={JSON.parse(JSON.stringify(projects))}
          initialDepartments={JSON.parse(JSON.stringify(departments))}
          initialAssignments={JSON.parse(JSON.stringify(assignments))}
          initialTimesheetEntries={JSON.parse(JSON.stringify(timesheetEntries))}
          initialServices={JSON.parse(JSON.stringify(services))}
        />
      </Suspense>
    </ProtectedRoute>
  );
}
