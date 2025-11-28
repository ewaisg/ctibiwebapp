"use client";

import React, { useState } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { UserManagement } from "@/components/user-management";
import { CompanyManagement } from "@/components/company-management";
import { EmployeeManagement } from "@/components/employee-management";
import { ContractManagement } from "@/components/contract-management";
import { DivisionManagement } from "@/components/division-management";
import { DepartmentManagement } from "@/components/department-management";
import { ProjectManagement } from "@/components/project-management";
import { PdfTemplatesClientPage } from "./pdf-templates/client-page";
import { DataExportSettings } from "@/components/system-settings/data-export";
import { DataDeletionSettings } from "@/components/system-settings/data-deletion";
import type { User, Company, Employee, Department, Project, Contract, Division, Service, InvoiceTemplate, GlobalRate, FinancialReport, PaymentTracking } from "@/types";

interface AdminClientPageProps {
  initialUsers: User[];
  companies: Company[];
  employees: Employee[];
  departments: Department[];
  projects: Project[];
  contracts: Contract[];
  divisions: Division[];
  services: Service[];
  invoiceTemplates: InvoiceTemplate[];
  globalRates: GlobalRate[];
  financialReports: FinancialReport[];
  paymentTrackings: PaymentTracking[];
}

export function AdminClientPage({ initialUsers, companies, employees, departments, projects, contracts, divisions, services, invoiceTemplates, globalRates, financialReports, paymentTrackings }: AdminClientPageProps) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: "Admin Panel" }]}
        className="mb-4"
      />

      <div id="main-content" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, companies, and system settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="clients">Clients, Contracts & Companies</TabsTrigger>
          <TabsTrigger value="org">Divisions, Departments & Projects</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="templates">PDF Templates</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserManagement 
            initialUsers={initialUsers} 
            companies={companies} 
          />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Clients, Contracts & Companies</h2>
              <p className="text-muted-foreground">Manage client companies and their contracts</p>
            </div>
            <Tabs defaultValue="companies" className="space-y-4">
              <TabsList>
                <TabsTrigger value="companies">Companies</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
              </TabsList>
              <TabsContent value="companies" className="space-y-4">
                <CompanyManagement 
                  companies={companies} 
                  departments={departments} 
                />
              </TabsContent>
              <TabsContent value="contracts" className="space-y-4">
                <ContractManagement 
                  contracts={contracts} 
                  companies={companies} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* 3. Divisions, Departments, and Projects (single-level tabs) */}
        <TabsContent value="org" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Divisions, Departments & Projects</h2>
              <p className="text-muted-foreground">Organize internal structure and projects</p>
            </div>
            <Tabs defaultValue="divisions" className="space-y-4">
              <TabsList>
                <TabsTrigger value="divisions">Divisions</TabsTrigger>
                <TabsTrigger value="departments">Departments</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="divisions" className="space-y-4">
                <DivisionManagement divisions={divisions} />
              </TabsContent>

              <TabsContent value="departments" className="space-y-4">
                <DepartmentManagement divisions={divisions} departments={departments} />
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <ProjectManagement 
                  projects={projects}
                  contracts={contracts}
                  companies={companies}
                  departments={departments}
                  divisions={divisions}
                  services={services}
                  employees={employees}
                />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
              <p className="text-muted-foreground">Manage employees and assignments</p>
            </div>
            <EmployeeManagement 
              employees={employees}
              companies={companies}
              departments={departments}
              divisions={divisions}
            />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">PDF Templates</h2>
              <p className="text-muted-foreground">
                Upload templates, assign them, and preview
              </p>
            </div>
            <PdfTemplatesClientPage showTitle={false} />
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Tabs defaultValue="export" className="space-y-4">
            <TabsList>
              <TabsTrigger value="export">Data Export</TabsTrigger>
              <TabsTrigger value="deletion">Data Deletion</TabsTrigger>
              <TabsTrigger value="backups">Backups & Restore</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-4">
              <DataExportSettings />
            </TabsContent>

            <TabsContent value="deletion" className="space-y-4">
              <DataDeletionSettings />
            </TabsContent>

            <TabsContent value="backups" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Backups & Restore</CardTitle>
                  <CardDescription>Configure encrypted backups, schedules, and restore workflows</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance</CardTitle>
                  <CardDescription>Data subject export/delete, PII maps, anonymization</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance</CardTitle>
                  <CardDescription>Reindex, recompute, cache clear, integrity checks</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Re-auth, approvals for bulk actions, audit logs</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </>
  );
}