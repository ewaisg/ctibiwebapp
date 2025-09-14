"use client";

import React, { useState } from "react";
import { FolderOpen, FileText, Building } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractManagement } from "@/components/contract-management";
import { ProjectManagement } from "@/components/project-management";
import { DivisionDepartmentManagement } from "@/components/division-department-management";
import type { Project, Contract, Company, Department, Division, Service, Employee } from "@/types";

interface ProjectContractManagementProps {
  projects: Project[];
  contracts: Contract[];
  companies: Company[];
  departments: Department[];
  divisions: Division[];
  services: Service[];
  employees: Employee[];
}

export function ProjectContractManagement({ 
  projects, 
  contracts, 
  companies, 
  departments,
  divisions,
  services,
  employees 
}: ProjectContractManagementProps) {
  const [activeTab, setActiveTab] = useState("contracts");

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Project & Contract Administration</h2>
          <p className="text-muted-foreground">
            Manage contracts, projects, and client relationships
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="divisions">Divisions & Departments</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <ContractManagement 
            contracts={contracts}
            companies={companies}
          />
        </TabsContent>

        <TabsContent value="divisions" className="space-y-4">
          <DivisionDepartmentManagement 
            divisions={divisions}
            departments={departments}
          />
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
    </>
  );
}