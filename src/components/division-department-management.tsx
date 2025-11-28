"use client";

import React, { useState } from "react";
import { Building, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DivisionManagement } from "@/components/division-management";
import { DepartmentManagement } from "@/components/department-management";
import type { Division, Department } from "@/types";

interface DivisionDepartmentManagementProps {
  divisions: Division[];
  departments: Department[];
}

export function DivisionDepartmentManagement({ 
  divisions, 
  departments 
}: DivisionDepartmentManagementProps) {
  const [activeTab, setActiveTab] = useState("divisions");

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Divisions & Departments</h3>
          <p className="text-muted-foreground">
            Manage organizational structure: Divisions → Departments → Projects
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="divisions" className="space-y-4">
          <DivisionManagement 
            divisions={divisions}
          />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <DepartmentManagement 
            departments={departments}
            divisions={divisions}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}