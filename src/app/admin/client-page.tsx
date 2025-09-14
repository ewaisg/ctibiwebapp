"use client";

import React, { useState } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/user-management";
import { CompanyEmployeeManagement } from "@/components/company-employee-management";
import { ProjectContractManagement } from "@/components/project-contract-management";
import { FinancialAdministration } from "@/components/financial-administration";
import { PdfTemplatesClientPage } from "./pdf-templates/client-page";
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
      <div className="flex items-center justify-between">
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
          <TabsTrigger value="companies">Company & Employee Management</TabsTrigger>
          <TabsTrigger value="projects">Project & Contract Admin</TabsTrigger>
          <TabsTrigger value="financial">Financial Administration</TabsTrigger>
          <TabsTrigger value="templates">PDF Templates</TabsTrigger>
          <TabsTrigger value="system" className="opacity-50 cursor-not-allowed">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserManagement 
            initialUsers={initialUsers} 
            companies={companies} 
          />
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <CompanyEmployeeManagement 
            companies={companies}
            employees={employees}
            departments={departments}
            divisions={divisions}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <ProjectContractManagement 
            projects={projects}
            contracts={contracts}
            companies={companies}
            departments={departments}
            divisions={divisions}
            services={services}
            employees={employees}
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <FinancialAdministration 
            invoiceTemplates={invoiceTemplates}
            globalRates={globalRates}
            financialReports={financialReports}
            paymentTrackings={paymentTrackings}
            services={services}
            users={initialUsers}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">PDF Templates</h2>
              <p className="text-muted-foreground">
                Upload templates, assign them to departments/projects/contracts, and preview them
              </p>
            </div>
            <PdfTemplatesClientPage showTitle={false} />
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Coming soon...</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}