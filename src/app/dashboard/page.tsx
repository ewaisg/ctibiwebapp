import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import DashboardClient from "./dashboard-client"

export default function Dashboard() {
  return (
    <ProtectedRoute requiredPermission="canAccessDashboard">
      <DashboardClient />
    </ProtectedRoute>
  );
}
