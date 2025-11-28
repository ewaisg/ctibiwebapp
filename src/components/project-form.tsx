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
import type { Project, Contract, Company, Department, Division, Service } from "@/types";
import { toast } from "react-hot-toast";
import { createProject, updateProject } from "@/app/admin/actions";

interface ProjectFormData {
  projectName: string;
  poNumber: string;
  contractId: string;
  departmentCode?: string;
  projectManager?: string;
  approvingSupervisor?: string;
  ipmssiStaff?: string;
  pmisNumber?: string;
  originalPoAmount?: number;
  changeOrderAmount?: number;
  budgetedHours?: number;
  isInactive: boolean;
  isComplete?: boolean;
}

interface ProjectFormProps {
  contracts: Contract[];
  companies: Company[];
  departments: Department[];
  divisions: Division[];
  services: Service[];
  project?: Project;
  onProjectCreated: (project: Project) => void;
  onCancel: () => void;
}

export function ProjectForm({ 
  contracts, 
  companies, 
  departments,
  divisions,
  services, 
  project, 
  onProjectCreated, 
  onCancel 
}: ProjectFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      projectName: project?.projectName || "",
      poNumber: project?.poNumber || "",
      contractId: (project?.contractId as string) || "",
      departmentCode: project?.departmentCode || undefined,
      projectManager: project?.projectManager || "",
      approvingSupervisor: project?.approvingSupervisor || "",
      ipmssiStaff: project?.ipmssiStaff || "",
      pmisNumber: project?.pmisNumber || "",
      originalPoAmount: project?.originalPoAmount || undefined,
      changeOrderAmount: project?.changeOrderAmount || undefined,
      budgetedHours: project?.budgetedHours || undefined,
      isInactive: project?.isInactive || false,
      isComplete: project?.isComplete || false,
    },
  });

  const watchedIsInactive = watch("isInactive");
  const watchedIsComplete = watch("isComplete");
  const watchedOriginalAmount = watch("originalPoAmount");
  const watchedChangeOrder = watch("changeOrderAmount");

  const onSubmit = (data: ProjectFormData) => {
    startTransition(async () => {
      try {
        const department = data.departmentCode && data.departmentCode !== "none" 
          ? departments.find(d => d.departmentCode === data.departmentCode || d.id === data.departmentCode)
          : undefined;
        
        if (isEditing && project) {
          const result = await updateProject(project.id, {
            projectName: data.projectName,
            contractId: data.contractId,
            departmentId: department?.id,
            projectManager: data.projectManager,
            approvingSupervisor: data.approvingSupervisor,
            ipmssiStaff: data.ipmssiStaff,
            pmisNumber: data.pmisNumber,
            originalPoAmount: data.originalPoAmount,
            changeOrderAmount: data.changeOrderAmount,
            budgetedHours: data.budgetedHours,
            isInactive: data.isInactive,
            isComplete: data.isComplete,
          });
          
          if (result.success && result.project) {
            onProjectCreated(result.project);
          } else {
            toast.error(result.message);
          }
        } else {
          const result = await createProject({
            projectName: data.projectName,
            poNumber: data.poNumber,
            contractId: data.contractId,
            departmentId: department?.id,
            projectManager: data.projectManager,
            approvingSupervisor: data.approvingSupervisor,
            ipmssiStaff: data.ipmssiStaff,
            pmisNumber: data.pmisNumber,
            originalPoAmount: data.originalPoAmount,
            changeOrderAmount: data.changeOrderAmount,
            budgetedHours: data.budgetedHours,
            isInactive: data.isInactive,
            isComplete: data.isComplete,
          });
          
          if (result.success && result.project) {
            onProjectCreated(result.project);
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
          <Label htmlFor="projectName">Project Name</Label>
          <Input
            id="projectName"
            {...register("projectName", { required: "Project name is required" })}
            placeholder="Highway Improvement Project"
          />
          {errors.projectName && (
            <p className="text-sm text-destructive">{errors.projectName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="poNumber">PO Number</Label>
          <Input
            id="poNumber"
            {...register("poNumber", { required: "PO number is required" })}
            placeholder="PO-2024-001"
            disabled={isEditing}
          />
          {errors.poNumber && (
            <p className="text-sm text-destructive">{errors.poNumber.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contractId">Contract</Label>
          <Select
            value={watch("contractId") || ""}
            onValueChange={(value) => setValue("contractId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select contract" />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contract.contractName} ({contract.contractNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.contractId && (
            <p className="text-sm text-destructive">Contract is required</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="departmentCode">Department</Label>
          <Select
            value={watch("departmentCode") || "none"}
            onValueChange={(value) => setValue("departmentCode", value === "none" ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Department</SelectItem>
              {departments.filter(d => !d.isInactive).map((department) => (
                <SelectItem key={department.id} value={department.departmentCode || department.id}>
                  {department.departmentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="projectManager">Project Manager</Label>
          <Input
            id="projectManager"
            {...register("projectManager")}
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="approvingSupervisor">Approving Supervisor</Label>
          <Input
            id="approvingSupervisor"
            {...register("approvingSupervisor")}
            placeholder="Jane Smith"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ipmssiStaff">IPMSSI Staff</Label>
          <Input
            id="ipmssiStaff"
            {...register("ipmssiStaff")}
            placeholder="Bob Johnson"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pmisNumber">PMIS Number</Label>
        <Input
          id="pmisNumber"
          {...register("pmisNumber")}
          placeholder="PMIS-2024-001"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="originalPoAmount">Original PO Amount ($)</Label>
          <Input
            id="originalPoAmount"
            type="number"
            step="0.01"
            {...register("originalPoAmount", { 
              valueAsNumber: true,
              min: { value: 0, message: "Must be a positive amount" }
            })}
            placeholder="100000.00"
          />
          {errors.originalPoAmount && (
            <p className="text-sm text-destructive">{errors.originalPoAmount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="changeOrderAmount">Change Order Amount ($)</Label>
          <Input
            id="changeOrderAmount"
            type="number"
            step="0.01"
            {...register("changeOrderAmount", { 
              valueAsNumber: true 
            })}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budgetedHours">Budgeted Hours</Label>
          <Input
            id="budgetedHours"
            type="number"
            {...register("budgetedHours", { 
              valueAsNumber: true,
              min: { value: 0, message: "Must be a positive number" }
            })}
            placeholder="1000"
          />
          {errors.budgetedHours && (
            <p className="text-sm text-destructive">{errors.budgetedHours.message}</p>
          )}
        </div>
      </div>

      {(watchedOriginalAmount || watchedChangeOrder) && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            New PO Amount: ${((watchedOriginalAmount || 0) + (watchedChangeOrder || 0)).toLocaleString()}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isInactive"
            checked={watchedIsInactive}
            onCheckedChange={(checked) => setValue("isInactive", checked)}
          />
          <Label htmlFor="isInactive">Inactive Project</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isComplete"
            checked={watchedIsComplete}
            onCheckedChange={(checked) => setValue("isComplete", checked)}
          />
          <Label htmlFor="isComplete">Project Complete</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Project" : "Create Project")}
        </Button>
      </div>
    </form>
  );
}