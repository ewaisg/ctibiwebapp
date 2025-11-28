
"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, Department } from "@/types";

const addProjectSchema = z.object({
  departmentId: z.string().min(1, "Please select a department."),
  projectId: z.string().min(1, "Please select a project."),
});

type AddProjectFormValues = z.infer<typeof addProjectSchema>;

interface AddProjectFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: { projectId: string }) => void;
  projects: Project[];
  departments: Department[];
  assignedProjectIds: string[];
}

export function AddProjectForm({ 
    isOpen, 
    onOpenChange, 
    onSave, 
    projects,
    departments,
    assignedProjectIds
}: AddProjectFormProps) {
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  
  const form = useForm<AddProjectFormValues>({
    resolver: zodResolver(addProjectSchema),
  });

  const selectedDepartmentId = form.watch('departmentId');

  // Filter projects by selected department and exclude already assigned projects
  const availableProjects = useMemo(() => {
    let filtered = projects.filter(p => !p.isInactive && !assignedProjectIds.includes(p.id));
    
    if (selectedDepartmentId) {
      filtered = filtered.filter(p => p.departmentId === selectedDepartmentId);
    }
    
    // Sort projects alphabetically
    return filtered.sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [projects, assignedProjectIds, selectedDepartmentId]);

  // Sort departments alphabetically and filter active ones
  const availableDepartments = useMemo(() => {
    return departments
      .filter(d => !d.isInactive)
      .sort((a, b) => a.departmentName.localeCompare(b.departmentName));
  }, [departments]);

  const onSubmit = (data: AddProjectFormValues) => {
    onSave({ projectId: data.projectId });
    onOpenChange(false);
    form.reset();
  };

  // Reset project when department changes
  const handleDepartmentChange = (departmentId: string) => {
    form.setValue('departmentId', departmentId);
    form.setValue('projectId', ''); // Reset project selection
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Project to Employee</DialogTitle>
          <DialogDescription>
            First select a department, then choose a project to create a new assignment row for this employee.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              💡 Tip: After adding a project, hover over time cells to edit, copy, or delete hours.
            </span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Department Selection */}
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Department</FormLabel>
                  <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={departmentOpen}
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? availableDepartments.find(dept => dept.id === field.value)?.departmentName
                            : "Select department..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search departments..." />
                        <CommandEmpty>No department found.</CommandEmpty>
                        <CommandGroup>
                          {availableDepartments.map((department) => (
                            <CommandItem
                              key={department.id}
                              onSelect={() => {
                                handleDepartmentChange(department.id);
                                setDepartmentOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  department.id === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {department.departmentName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Selection */}
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Project</FormLabel>
                  <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={projectOpen}
                          disabled={!selectedDepartmentId}
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? availableProjects.find(proj => proj.id === field.value)?.projectName
                            : selectedDepartmentId ? "Select project..." : "Select department first"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search projects..." />
                        <CommandEmpty>
                          {selectedDepartmentId 
                            ? "No available projects in this department." 
                            : "Select a department first."}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableProjects.map((project) => (
                            <CommandItem
                              key={project.id}
                              onSelect={() => {
                                form.setValue('projectId', project.id);
                                setProjectOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  project.id === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{project.projectName}</span>
                                <span className="text-xs text-muted-foreground">
                                  PO: {project.poNumber || 'N/A'}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={!selectedDepartmentId || availableProjects.length === 0}>
                  Add Project
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
