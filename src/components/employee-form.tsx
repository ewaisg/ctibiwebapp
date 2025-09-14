"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Employee, Company, Department, Division } from "@/types";
import { toast } from "react-hot-toast";

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  middleInitial?: string;
  formalName: string;
  employeeNumber: string;
  employeeId: number;
  companyId: string;
  departmentCode?: string;
  role?: string;
  employmentStatus: 'Active' | 'Terminated';
  weeklyCapacityHours: number;
  isAdmin: boolean;
  isInternal: boolean;
  isSubconsultant: boolean;
  selfServiceEmail?: string;
}

interface EmployeeFormProps {
  companies: Company[];
  departments: Department[];
  divisions: Division[];
  employee?: Employee;
  onEmployeeCreated: (employee: Employee) => void;
  onCancel: () => void;
}

export function EmployeeForm({ 
  companies, 
  departments,
  divisions, 
  employee, 
  onEmployeeCreated, 
  onCancel 
}: EmployeeFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!employee;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    defaultValues: {
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      middleInitial: employee?.middleInitial || "",
      formalName: employee?.formalName || "",
      employeeNumber: employee?.employeeNumber || "",
      employeeId: employee?.employeeId || 0,
      companyId: (employee?.companyId as string) || "",
      departmentCode: employee?.departmentCode || "",
      role: employee?.role || "",
      employmentStatus: employee?.employmentStatus || 'Active',
      weeklyCapacityHours: employee?.weeklyCapacityHours || 40,
      isAdmin: employee?.isAdmin || false,
      isInternal: employee?.isInternal || false,
      isSubconsultant: employee?.isSubconsultant || false,
      selfServiceEmail: employee?.selfServiceEmail || "",
    },
  });

  const watchedFirstName = watch("firstName");
  const watchedLastName = watch("lastName");
  const watchedEmploymentStatus = watch("employmentStatus");
  const watchedIsAdmin = watch("isAdmin");
  const watchedIsInternal = watch("isInternal");
  const watchedIsSubconsultant = watch("isSubconsultant");

  // Auto-generate formal name
  React.useEffect(() => {
    if (watchedFirstName && watchedLastName) {
      setValue("formalName", `${watchedFirstName} ${watchedLastName}`);
    }
  }, [watchedFirstName, watchedLastName, setValue]);

  const onSubmit = (data: EmployeeFormData) => {
    startTransition(async () => {
      try {
        // Mock employee creation - replace with actual API call
        const newEmployee: Employee = {
          id: employee?.id || `emp_${Date.now()}`,
          firstName: data.firstName,
          lastName: data.lastName,
          middleInitial: data.middleInitial,
          formalName: data.formalName,
          employeeNumber: data.employeeNumber,
          employeeId: data.employeeId,
          companyId: data.companyId as any, // Will be converted to DocumentReference
          companyName: companies.find(c => c.id === data.companyId)?.companyName || "",
          departmentCode: data.departmentCode,
          role: data.role,
          employmentStatus: data.employmentStatus,
          weeklyCapacityHours: data.weeklyCapacityHours,
          isAdmin: data.isAdmin,
          isInternal: data.isInternal,
          isSubconsultant: data.isSubconsultant,
          selfServiceEmail: data.selfServiceEmail,
        };

        onEmployeeCreated(newEmployee);
      } catch (error) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register("firstName", { required: "First name is required" })}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register("lastName", { required: "Last name is required" })}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="middleInitial">Middle Initial</Label>
          <Input
            id="middleInitial"
            {...register("middleInitial")}
            placeholder="M"
            maxLength={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employeeNumber">Employee Number</Label>
          <Input
            id="employeeNumber"
            {...register("employeeNumber", { required: "Employee number is required" })}
            placeholder="EMP001"
            disabled={isEditing}
          />
          {errors.employeeNumber && (
            <p className="text-sm text-destructive">{errors.employeeNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeeId">Employee ID</Label>
          <Input
            id="employeeId"
            type="number"
            {...register("employeeId", { 
              required: "Employee ID is required",
              valueAsNumber: true 
            })}
            placeholder="12345"
          />
          {errors.employeeId && (
            <p className="text-sm text-destructive">{errors.employeeId.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyId">Company</Label>
          <Select
            value={watch("companyId")}
            onValueChange={(value) => setValue("companyId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="departmentCode">Department</Label>
          <Select
            value={watch("departmentCode")}
            onValueChange={(value) => setValue("departmentCode", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Department</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.departmentCode}>
                  {department.departmentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            {...register("role")}
            placeholder="Software Engineer"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weeklyCapacityHours">Weekly Capacity Hours</Label>
          <Input
            id="weeklyCapacityHours"
            type="number"
            {...register("weeklyCapacityHours", { 
              required: "Weekly capacity hours is required",
              valueAsNumber: true,
              min: { value: 1, message: "Must be at least 1 hour" }
            })}
            placeholder="40"
          />
          {errors.weeklyCapacityHours && (
            <p className="text-sm text-destructive">{errors.weeklyCapacityHours.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="selfServiceEmail">Self Service Email</Label>
        <Input
          id="selfServiceEmail"
          type="email"
          {...register("selfServiceEmail")}
          placeholder="john.doe@company.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="employmentStatus">Employment Status</Label>
        <Select
          value={watchedEmploymentStatus}
          onValueChange={(value: 'Active' | 'Terminated') => setValue("employmentStatus", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isAdmin"
            checked={watchedIsAdmin}
            onCheckedChange={(checked) => setValue("isAdmin", checked)}
          />
          <Label htmlFor="isAdmin">Admin User</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isInternal"
            checked={watchedIsInternal}
            onCheckedChange={(checked) => setValue("isInternal", checked)}
          />
          <Label htmlFor="isInternal">Internal Employee</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isSubconsultant"
            checked={watchedIsSubconsultant}
            onCheckedChange={(checked) => setValue("isSubconsultant", checked)}
          />
          <Label htmlFor="isSubconsultant">Subconsultant</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Employee" : "Create Employee")}
        </Button>
      </div>
    </form>
  );
}