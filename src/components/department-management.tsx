"use client";

import React, { useState } from "react";
import { Plus, Upload, MoreVertical, Edit, Trash2, Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DepartmentForm } from "@/components/department-form";
import type { Department, Division } from "@/types";
import { toast } from "react-hot-toast";
import { L10n } from '@syncfusion/ej2-base';
import { 
  GridComponent, 
  ColumnsDirective, 
  ColumnDirective, 
  Page, 
  Inject, 
  Sort, 
  Toolbar, 
  Filter, 
  Edit as GridEdit, 
  FilterSettingsModel, 
  EditSettingsModel, 
  ToolbarItems 
} from '@syncfusion/ej2-react-grids';

interface DepartmentManagementProps {
  departments: Department[];
  divisions: Division[];
}

export function DepartmentManagement({ 
  departments: initialDepartments, 
  divisions 
}: DepartmentManagementProps) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const handleDepartmentCreated = (newDepartment: Department) => {
    setDepartments(prev => [...prev, newDepartment]);
    setShowDepartmentForm(false);
    toast.success("Department created successfully");
  };

  const handleDepartmentUpdated = (updatedDepartment: Department) => {
    setDepartments(prev => prev.map(d => d.id === updatedDepartment.id ? updatedDepartment : d));
    setEditingDepartment(null);
    toast.success("Department updated successfully");
  };

  const getStatusBadge = (department: Department) => {
    return department.isInactive ? 
      <Badge variant="secondary">Inactive</Badge> : 
      <Badge variant="default">Active</Badge>;
  };

  const getDivisionName = (divisionId: string) => {
    const division = divisions.find(d => d.id === divisionId);
    return division?.divisionName || 'Unknown Division';
  };

  const filterSettings: FilterSettingsModel = { type: 'Excel' };
  const toolbar: ToolbarItems[] = ['Search'];
  const editSettings: EditSettingsModel = { allowEditing: false, allowAdding: false, allowDeleting: false };

  const divisionTemplate = (props: any) => {
    return getDivisionName(props.divisionId as string);
  };

  const statusTemplate = (props: any) => {
    return getStatusBadge(props);
  };

  const actionsTemplate = (props: any) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditingDepartment(props)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Department
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Department
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Department Management</h4>
          <p className="text-muted-foreground">
            Manage departments within divisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowDepartmentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {departments.filter(d => !d.isInactive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {departments.filter(d => d.isInactive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            {departments.length === 0 
              ? "No departments found. Add departments to organize your projects."
              : `Showing ${departments.length} departments`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {departments.length > 0 ? (
            <GridComponent dataSource={departments} locale='en-US' allowPaging={true} allowSorting={true} allowFiltering={true} filterSettings={filterSettings} toolbar={toolbar} editSettings={editSettings} height={365} pageSettings={{ pageCount: 4, pageSizes: true }}>
              <ColumnsDirective>
                <ColumnDirective field='departmentName' headerText='Department Name' width='200'></ColumnDirective>
                <ColumnDirective field='departmentCode' headerText='Department Code' width='150'></ColumnDirective>
                <ColumnDirective field='divisionId' headerText='Division' width='200' template={divisionTemplate}></ColumnDirective>
                <ColumnDirective field='isInactive' headerText='Status' width='120' template={statusTemplate}></ColumnDirective>
                <ColumnDirective headerText='Actions' width='100' template={actionsTemplate} textAlign='Center'></ColumnDirective>
              </ColumnsDirective>
              <Inject services={[Page, Sort, Toolbar, Filter, GridEdit]} />
            </GridComponent>
          ) : (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No departments found</h3>
              <p className="text-muted-foreground mb-4">
                Create departments within divisions to organize your projects.
              </p>
              <Button onClick={() => setShowDepartmentForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDepartmentForm} onOpenChange={setShowDepartmentForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
          </DialogHeader>
          <DepartmentForm 
            divisions={divisions}
            onDepartmentCreated={handleDepartmentCreated}
            onCancel={() => setShowDepartmentForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          {editingDepartment && (
            <DepartmentForm 
              divisions={divisions}
              department={editingDepartment}
              onDepartmentCreated={handleDepartmentUpdated}
              onCancel={() => setEditingDepartment(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}