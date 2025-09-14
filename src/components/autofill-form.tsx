"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, BrainCircuit } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { Project, Department } from "@/types";

interface AutofillFormProps {
  projects: Project[];
  departments?: Department[];
  onAutofillComplete: (data: AutofillFormValues & { timesheetPreview?: TimesheetPreview | null; source: string }) => void;
  onCancel: () => void;
}

interface TimesheetPreview {
  hasData: boolean;
  totalHours?: number;
  employeeCount?: number;
  totalAmount?: number;
}

const autofillSchema = z.object({
  departmentId: z.string().optional(),
  projectId: z.string().min(1, "Please select a project."),
  fromDate: z.date().refine((date) => date !== undefined, {
    message: "Please select a start date.",
  }),
  toDate: z.date().refine((date) => date !== undefined, {
    message: "Please select an end date.",
  }),
});

type AutofillFormValues = z.infer<typeof autofillSchema>;

export function AutofillForm({ projects, departments = [], onAutofillComplete, onCancel }: AutofillFormProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [timesheetPreview, setTimesheetPreview] = useState<TimesheetPreview | null>(null);
  
  const form = useForm<AutofillFormValues>({
    resolver: zodResolver(autofillSchema),
    defaultValues: {
      departmentId: "",
      projectId: "",
    },
  });

  const watchedDepartmentId = form.watch("departmentId");
  const watchedProjectId = form.watch("projectId");
  const watchedFromDate = form.watch("fromDate");
  const watchedToDate = form.watch("toDate");

  // Filter projects based on user role and selected department
  const availableProjects = useMemo(() => {
    let filteredProjects = projects;

    // Role-based filtering
    if (user?.role === 'Subconsultant') {
      const userCompanyId = typeof user.companyId === 'object' && user.companyId.id ? user.companyId.id : user.companyId;
      filteredProjects = projects.filter(project => {
        return project.assignedCompanies?.some(ac => {
          const companyId = typeof ac.companyId === 'object' && ac.companyId.id ? ac.companyId.id : ac.companyId;
          return companyId === userCompanyId;
        });
      });
    }

    // Department filtering for Admin/Prime
    if (watchedDepartmentId && (user?.role === 'Admin' || user?.role === 'Prime')) {
      filteredProjects = filteredProjects.filter(project => {
        if (!project.departmentId) return false;
        const projectDeptId = typeof project.departmentId === 'object' && project.departmentId?.id ? project.departmentId.id : project.departmentId;
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

  // Define checkTimesheetData with useCallback to avoid hoisting issues
  const checkTimesheetData = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // Import the autofill action to check real timesheet data
      const { autofillFromTimesheets } = await import('@/app/invoicing/actions');
      
      const result = await autofillFromTimesheets({
        projectId: watchedProjectId,
        fromDate: watchedFromDate.toISOString(),
        toDate: watchedToDate.toISOString(),
      });

      if (result.success && result.items.length > 0) {
        setTimesheetPreview({
          hasData: true,
          totalHours: result.totalHours,
          employeeCount: result.items.length,
          totalAmount: result.items.reduce((sum, item) => sum + (item?.amount || 0), 0),
        });
      } else {
        setTimesheetPreview({ hasData: false });
      }
    } catch (error) {
      console.error('Error checking timesheet data:', error);
      setTimesheetPreview({ hasData: false });
    } finally {
      setIsProcessing(false);
    }
  }, [watchedProjectId, watchedFromDate, watchedToDate]);

  // Check timesheet data when parameters change
  useEffect(() => {
    if (watchedProjectId && watchedFromDate && watchedToDate) {
      checkTimesheetData();
    } else {
      setTimesheetPreview(null);
    }
  }, [watchedProjectId, watchedFromDate, watchedToDate, checkTimesheetData]);

  const onSubmit = async (data: AutofillFormValues) => {
    setIsProcessing(true);
    
    try {
      // Add timesheet data to the form data
      const completeData = {
        ...data,
        timesheetPreview,
        source: 'autofill'
      };
      
      onAutofillComplete(completeData);
    } catch (error) {
      console.error('Error processing autofill:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedProject = availableProjects.find(p => p.id === watchedProjectId);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5" />
          Autofill from Timesheet
        </DialogTitle>
        <DialogDescription>
          Select project and date range to automatically populate invoice data from timesheets.
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
            <div className="space-y-2">
              <FormLabel htmlFor="fromDate" className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                Start Date *
              </FormLabel>
              <FormField
                control={form.control}
                name="fromDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        id="fromDate"
                        type="date"
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            field.onChange(new Date(year, month - 1, day));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormLabel htmlFor="toDate" className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                End Date *
              </FormLabel>
              <FormField
                control={form.control}
                name="toDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        id="toDate"
                        type="date"
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            field.onChange(new Date(year, month - 1, day));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            </div>
          )}

          {/* Timesheet Preview */}
          {isProcessing && (
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking timesheet data...</span>
            </div>
          )}

          {timesheetPreview && !isProcessing && (
            <div className={cn(
              "rounded-lg border p-4 space-y-2",
              timesheetPreview.hasData ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
            )}>
              <h4 className="font-medium flex items-center gap-2">
                {timesheetPreview.hasData ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Timesheet Data Found
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    No Timesheet Data
                  </>
                )}
              </h4>
              {timesheetPreview.hasData ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Hours: {timesheetPreview.totalHours}</div>
                  <div>Employees: {timesheetPreview.employeeCount}</div>
                  <div className="col-span-2">
                    Est. Amount: ${timesheetPreview.totalAmount?.toLocaleString() || '0'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No timesheet entries found for the selected project and date range. 
                  You can still proceed to create a manual invoice.
                </p>
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
                  Processing...
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
