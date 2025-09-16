import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import MyInvoiceKpis from "@/components/subconsultant-dashboard/MyInvoiceKpis"
import { Suspense } from "react"
import SubconsultantDashboardClient from "./client-page"

export default function SubconsultantDashboard() {
  return (
    <ProtectedRoute requiredPermission="canAccessSubconsultantDashboard">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <h1 className="text-lg font-semibold">Subconsultant Dashboard</h1>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Suspense fallback={<MyInvoiceKpis data={null} loading />}>
              <SubconsultantDashboardClient />
            </Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
