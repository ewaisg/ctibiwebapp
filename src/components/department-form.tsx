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
import type { Department, Division } from "@/types";
import { toast } from "react-hot-toast";
import { createDepartment, updateDepartment } from "@/app/(authenticated)/admin/admin-org-actions";

interface DepartmentFormData {
  departmentName: string;
  departmentCode: string;
  divisionId: string;
  isInactive: boolean;
}

interface DepartmentFormProps {
  divisions: Division[];
  department?: Department;
  onDepartmentCreated: (department: Department) => void;
  onCancel: () => void;
}

export function DepartmentForm({ 
  divisions, 
  department, 
  onDepartmentCreated, 
  onCancel 
}: DepartmentFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!department;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    defaultValues: {
      departmentName: department?.departmentName || "",
      departmentCode: department?.departmentCode || "",
      divisionId: (department?.divisionId as string) || "",
      isInactive: department?.isInactive || false,
    },
  });

  const watchedIsInactive = watch("isInactive");

  const onSubmit = (data: DepartmentFormData) => {
    startTransition(async () => {
      try {
        if (isEditing && department) {
          const result = await updateDepartment(department.id, {
            departmentName: data.departmentName,
            divisionId: data.divisionId,
            isInactive: data.isInactive,
          });
          
          if (result.success && result.department) {
            onDepartmentCreated(result.department);
          } else {
            toast.error(result.message);
          }
        } else {
          const result = await createDepartment({
            departmentCode: data.departmentCode,
            departmentName: data.departmentName,
            divisionId: data.divisionId,
            isInactive: data.isInactive,
          });
          
          if (result.success && result.department) {
            onDepartmentCreated(result.department);
          } else {
            toast.error(result.message);
          }
        }
      } catch (error) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="departmentName">Department Name</Label>
          <Input
            id="departmentName"
            {...register("departmentName", { required: "Department name is required" })}
            placeholder="Transportation Department"
          />
          {errors.departmentName && (
            <p className="text-sm text-destructive">{errors.departmentName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="departmentCode">Department Code</Label>
          <Input
            id="departmentCode"
            {...register("departmentCode", { required: "Department code is required" })}
            placeholder="TRANS"
            disabled={isEditing}
          />
          {errors.departmentCode && (
            <p className="text-sm text-destructive">{errors.departmentCode.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="divisionId">Division</Label>
        <Select
          value={watch("divisionId")}
          onValueChange={(value) => setValue("divisionId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.filter(d => !d.isInactive).map((division) => (
              <SelectItem key={division.id} value={division.id}>
                {division.divisionName} ({division.divisionCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.divisionId && (
          <p className="text-sm text-destructive">Division is required</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isInactive"
          checked={watchedIsInactive}
          onCheckedChange={(checked) => setValue("isInactive", checked)}
        />
        <Label htmlFor="isInactive">Inactive Department</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Department" : "Create Department")}
        </Button>
      </div>
    </form>
  );
}