"use client";

import React, { useState } from "react";
import { Building2, Users, Plus, Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyManagement } from "@/components/company-management";
import { EmployeeManagement } from "@/components/employee-management";
import type { Company, Employee, Department, Division } from "@/types";

interface CompanyEmployeeManagementProps {
  companies: Company[];
  employees: Employee[];
  departments: Department[];
  divisions: Division[];
}

export function CompanyEmployeeManagement({ 
  companies, 
  employees, 
  departments,
  divisions 
}: CompanyEmployeeManagementProps) {
  const [activeTab, setActiveTab] = useState("companies");

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Company & Employee Management</h2>
          <p className="text-muted-foreground">
            Manage companies, employees, and organizational structure
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          <CompanyManagement 
            companies={companies}
            departments={departments}
          />
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <EmployeeManagement 
            employees={employees}
            companies={companies}
            departments={departments}
            divisions={divisions}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}