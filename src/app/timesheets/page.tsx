import {getProjects, getTimesheetEntries, getEmployees, getDepartments} from "@/lib/firestore";
import {TimesheetClientPage} from "./client-page";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {AlertTriangle} from "lucide-react";
import {subDays, startOfDay} from "date-fns";
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { Suspense } from "react"
import { TimesheetSkeleton } from "@/components/skeletons/timesheet-skeleton"

// Force dynamic rendering to avoid build-time Firestore authentication errors
export const dynamic = 'force-dynamic';

export default async function TimesheetsPage() {
    try {
        const [
            projectsData,
            employeesData,
            timesheetEntriesData,
            departmentsData,
        ] = await Promise.all([
            getProjects(),
            getEmployees(),
            getTimesheetEntries(),
            getDepartments(),
        ]);

        const defaultCutoffDate = subDays(new Date(), 30);
        const initialFilteredEntries = timesheetEntriesData.filter(t => {
            const dateValue = t.timecardDate;
            const date = dateValue && typeof dateValue === 'object' && 'toDate' in dateValue
                ? dateValue.toDate()
                : new Date(dateValue as string);
            return date >= startOfDay(defaultCutoffDate);
        });

        const projects = JSON.parse(JSON.stringify(projectsData));
        const employees = JSON.parse(JSON.stringify(employeesData));
        const allTimesheetEntries = JSON.parse(JSON.stringify(timesheetEntriesData));
        const departments = JSON.parse(JSON.stringify(departmentsData));
        const initialEntries = JSON.parse(JSON.stringify(initialFilteredEntries));

        return (
            <ProtectedRoute requiredPermission="canAccessTimesheet">
                <Suspense fallback={<TimesheetSkeleton />}>
                    <TimesheetClientPage
                        projects={projects}
                        employees={employees}
                        departments={departments}
                        initialEntries={initialEntries}
                        allEntries={allTimesheetEntries}
                    />
                </Suspense>
            </ProtectedRoute>
        );
    } catch (error) {
        console.error("Failed to load timesheet data:", error);
        return (
            <ProtectedRoute requiredPermission="canAccessTimesheet">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>
                        There was a problem fetching the required data from the server. Please try refreshing the page.
                        If the problem persists, contact support.
                    </AlertDescription>
                </Alert>
            </ProtectedRoute>
        );
    }
}
