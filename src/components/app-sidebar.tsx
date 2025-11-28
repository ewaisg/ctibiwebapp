"use client"

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  GalleryVerticalEnd,
  ShieldUser,
  LayoutDashboard,
  PieChart,
  Files,
  TableProperties,
  CalendarClock,
  FileType,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth"
import { RolePermissions } from "@/types"

import { NavMain } from "@/components/nav-main"
import { NavMiscellaneous } from "@/components/nav-miscellaneous"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

// Navigation items for different user roles
const getNavigationItems = (userRole: string | undefined, hasPermission: (permission: keyof RolePermissions) => boolean) => {
  const navMain = [];
  const miscellaneous = [];

  // Dashboard access (not for subconsultants)
  if (hasPermission('canAccessDashboard')) {
    navMain.push({
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    });
  }

  // Projects
  if (hasPermission('canAccessProjects')) {
    navMain.push({
      title: "Projects",
      url: "/projects",
      icon: GalleryVerticalEnd,
    });
  }

  // Invoices
  if (hasPermission('canAccessInvoices')) {
    navMain.push({
      title: "Invoices",
      url: "/invoices",
      icon: Files,
    });
  }

  // Timesheet
  if (hasPermission('canAccessTimesheet')) {
    navMain.push({
      title: "Timesheet",
      url: "/timesheets",
      icon: CalendarClock,
    });
  }

  // Manpower
  if (hasPermission('canAccessManpower')) {
    navMain.push({
      title: "Manpower",
      url: "/manpower",
      icon: TableProperties,
    });
  }

  // Utilization
  if (hasPermission('canAccessUtilization')) {
    navMain.push({
      title: "Utilization",
      url: "/utilization",
      icon: PieChart,
    });
  }



  // Admin
  if (hasPermission('canAccessAdmin')) {
    miscellaneous.push({
      name: "Admin",
      url: "/admin",
      icon: ShieldUser,
    })
  }

  return { navMain, miscellaneous };
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasPermission } = useAuth();
  
  // Get navigation items based on user permissions
  const { navMain, miscellaneous } = React.useMemo(() => 
    getNavigationItems(user?.role, hasPermission), 
    [user?.role, hasPermission]
  );

  // Default user data
  const userData = user ? {
    name: user.displayName,
    email: user.email,
    avatar: user.profileImageUrl || "/CTI_Icon_white.jpg",
  } : {
    name: "Guest User",
    email: "guest@ctidigitech.com",
    avatar: "/CTI_Icon_white.jpg",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
          <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton
                      asChild
                      className="data-[slot=sidebar-menu-button]:!p-1.5"
                  >
                      <Link href={user?.role === 'Subconsultant' ? '/invoices' : '/dashboard'} prefetch>
                            <Image
                                src="/CTI_Icon_white.jpg"
                                alt="Company Logo"
                                width={20}
                                height={20}
                                className="rounded-sm"
                            />
                          <span className="text-base font-semibold">CTI BI</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {miscellaneous.length > 0 && <NavMiscellaneous miscellaneous={miscellaneous} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
