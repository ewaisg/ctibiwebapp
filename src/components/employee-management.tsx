"use client";

import React, { useState } from "react";
import { Plus, Upload, MoreVertical, Edit, Trash2, Users } from "lucide-react";
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
import { EmployeeForm } from "@/components/employee-form";
import { EmployeeImport } from "@/components/employee-import";
import type { Employee, Company, Department, Division } from "@/types";
import { toast } from "react-hot-toast";

interface EmployeeManagementProps {
  employees: Employee[];
  companies: Company[];
  departments: Department[];
  divisions: Division[];
}

export function EmployeeManagement({ 
  employees: initialEmployees, 
  companies, 
  departments,
  divisions 
}: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showEmployeeImport, setShowEmployeeImport] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleEmployeeCreated = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    setShowEmployeeForm(false);
    toast.success("Employee created successfully");
  };

  const handleEmployeeUpdated = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
    setEditingEmployee(null);
    toast.success("Employee updated successfully");
  };

  const handleEmployeesImported = (importedEmployees: Employee[]) => {
    setEmployees(prev => [...prev, ...importedEmployees]);
    setShowEmployeeImport(false);
    toast.success(`${importedEmployees.length} employees imported successfully`);
  };

  const getStatusBadge = (employee: Employee) => {
    if (employee.employmentStatus === 'Terminated') {
      return <Badge variant="destructive">Terminated</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getTypeBadge = (employee: Employee) => {
    if (employee.isAdmin) return <Badge variant="destructive">Admin</Badge>;
    if (employee.isSubconsultant) return <Badge variant="outline">Subconsultant</Badge>;
    if (employee.isInternal) return <Badge variant="default">Internal</Badge>;
    return <Badge variant="secondary">CTI</Badge>;
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.companyName || 'Unknown Company';
  };

  const getDepartmentName = (departmentCode?: string) => {
    if (!departmentCode) return 'N/A';
    const department = departments.find(d => d.departmentCode === departmentCode);
    return department?.departmentName || departmentCode;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Employee Management</h3>
          <p className="text-muted-foreground">
            Manage employee records and organizational assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowEmployeeImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Employees
          </Button>
          <Button onClick={() => setShowEmployeeForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.employmentStatus === 'Active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Internal Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {employees.filter(e => e.isInternal).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subconsultants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {employees.filter(e => e.isSubconsultant).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            {employees.length === 0 
              ? "No employees found. Add employees manually or import from a file."
              : `Showing ${employees.length} employees`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.formalName}</TableCell>
                    <TableCell>{employee.employeeNumber}</TableCell>
                    <TableCell>{getCompanyName(employee.companyId as string)}</TableCell>
                    <TableCell>{getDepartmentName(employee.departmentCode)}</TableCell>
                    <TableCell>
                      {getTypeBadge(employee)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(employee)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingEmployee(employee)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Employee
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first employee or importing from a file.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowEmployeeImport(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Employees
                </Button>
                <Button onClick={() => setShowEmployeeForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEmployeeForm} onOpenChange={setShowEmployeeForm}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm 
            companies={companies}
            departments={departments}
            divisions={divisions}
            onEmployeeCreated={handleEmployeeCreated}
            onCancel={() => setShowEmployeeForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <EmployeeForm 
              companies={companies}
              departments={departments}
              divisions={divisions}
              employee={editingEmployee}
              onEmployeeCreated={handleEmployeeUpdated}
              onCancel={() => setEditingEmployee(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEmployeeImport} onOpenChange={setShowEmployeeImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Employees</DialogTitle>
          </DialogHeader>
          <EmployeeImport 
            companies={companies}
            departments={departments}
            divisions={divisions}
            onEmployeesImported={handleEmployeesImported}
            onCancel={() => setShowEmployeeImport(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}