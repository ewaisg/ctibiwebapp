import { UtilizationClientPage } from "./client-page"
import { ProtectedRoute } from "@/components/protected-route"
import { getEmployees, getProjects, getDepartments, getTimesheetEntries, getAssignments } from "@/lib/firestore"
import { Suspense } from "react"
import { UtilizationSkeleton } from "@/components/skeletons/utilization-skeleton"

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
        <Suspense fallback={<UtilizationSkeleton />}>
          <UtilizationClientPage
            initialData={initialData}
            assignments={serializedData.assignments}
            employees={serializedData.employees}
            projects={serializedData.projects}
            timesheetEntries={serializedData.timesheetEntries}
          />
        </Suspense>
      </ProtectedRoute>
    )
  } catch (error) {
    console.error('Error loading utilization page');
    return (
      <ProtectedRoute requiredPermission="canAccessUtilization">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-2">Unable to load utilization data</h2>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </ProtectedRoute>
    )
  }
}