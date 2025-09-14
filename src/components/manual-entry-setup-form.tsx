"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Edit, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { Project, Department } from "@/types";
import { extractId } from "@/lib/document-reference-utils";

interface ManualEntrySetupFormProps {
  projects: Project[];
  departments?: Department[];
  onSetupComplete: (data: ManualSetupFormValues & { source: string }) => void;
  onCancel: () => void;
}

const manualSetupSchema = z.object({
  departmentId: z.string().optional(),
  projectId: z.string().min(1, "Please select a project."),
  fromDate: z.date().refine((date) => date !== undefined, {
    message: "Please select a start date.",
  }),
  toDate: z.date().refine((date) => date !== undefined, {
    message: "Please select an end date.",
  }),
});

type ManualSetupFormValues = z.infer<typeof manualSetupSchema>;

export function ManualEntrySetupForm({ projects, departments = [], onSetupComplete, onCancel }: ManualEntrySetupFormProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<ManualSetupFormValues>({
    resolver: zodResolver(manualSetupSchema),
    defaultValues: {
      departmentId: "",
      projectId: "",
    },
  });

  const watchedDepartmentId = form.watch("departmentId");
  const watchedFromDate = form.watch("fromDate");
  const watchedProjectId = form.watch("projectId");

  // Filter projects based on user role and selected department
  const availableProjects = useMemo(() => {
    let filteredProjects = projects;

    // Role-based filtering
    if (user?.role === 'Subconsultant') {
      const userCompanyId = extractId(user.companyId);
      filteredProjects = projects.filter(project => {
        return project.assignedCompanies?.some(ac => {
          const companyId = extractId(ac.companyId);
          return companyId === userCompanyId;
        });
      });
    }

    // Department filtering for Admin/Prime
    if (watchedDepartmentId && (user?.role === 'Admin' || user?.role === 'Prime')) {
      filteredProjects = filteredProjects.filter(project => {
        const projectDeptId = extractId(project.departmentId);
        return projectDeptId === watchedDepartmentId;
      });
    }

    return filteredProjects.filter(project => !project.isInactive);
  }, [projects, user, watchedDepartmentId]);

  // Available departments for Admin/Prime users
  const availableDepartments = useMemo(() => {
    if (user?.role === 'Subconsultant') return [];
    return departments.filter(dept => !dept.isInactive);
  }, [departments, user]);

  const onSubmit = async (data: ManualSetupFormValues) => {
    setIsProcessing(true);
    
    try {
      const completeData = {
        ...data,
        source: 'manual'
      };
      
      onSetupComplete(completeData);
    } catch (error) {
      console.error('Error processing manual setup:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedProject = availableProjects.find(p => p.id === watchedProjectId);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Manual Entry Setup
        </DialogTitle>
        <DialogDescription>
          Select project and date range for manual invoice entry.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Department Selection (Admin/Prime only) */}
          {(user?.role === 'Admin' || user?.role === 'Prime') && availableDepartments.length > 0 && (
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.departmentName} ({department.departmentCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Project Selection */}
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectName}
                        {project.poNumber && ` (PO: ${project.poNumber})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fromDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>From Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>To Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || 
                          date < new Date("1900-01-01") ||
                          (watchedFromDate && date < watchedFromDate)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Project Info Display */}
          {selectedProject && (
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium">Project Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>PO Number: {selectedProject.poNumber || 'N/A'}</div>
                <div>PMIS: {selectedProject.pmisNumber || 'N/A'}</div>
                <div>Manager: {selectedProject.projectManager || 'N/A'}</div>
                <div>Supervisor: {selectedProject.approvingSupervisor || 'N/A'}</div>
              </div>
              {selectedProject.originalPoAmount && (
                <div className="pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Original PO: ${selectedProject.originalPoAmount.toLocaleString()}</div>
                    <div>Remaining: ${(selectedProject.remainingPoAmount || 0).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!form.formState.isValid || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue to Invoice Form'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
