"use client";

import { useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignment, Project } from "@/types";
import { Trash2 } from "lucide-react";
import { extractId } from "@/lib/document-reference-utils";

// Allow projectId to be optional in the schema, as we handle it from context
const assignmentSchema = z.object({
  projectId: z.string().optional(),
  hours: z.number().min(0, "Hours must be a positive number."),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignmentFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: { projectId?: string; hours: number }) => void;
  onDelete?: () => void;
  assignment: Assignment | null;
  projects: Project[];
  preselectedProjectId?: string;
}

export function AssignmentForm({ 
    isOpen, 
    onOpenChange, 
    onSave, 
    onDelete, 
    assignment, 
    projects, 
    preselectedProjectId 
}: AssignmentFormProps) {
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      projectId: undefined,
      hours: 8,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (assignment) {
        form.reset({
          projectId: extractId(assignment.projectId),
          hours: assignment.scheduledHours,
        });
      } else {
        form.reset({
          projectId: preselectedProjectId || undefined,
          hours: 8,
        });
      }
    }
  }, [assignment, isOpen, form, preselectedProjectId]);

  const onSubmit = (data: AssignmentFormValues) => {
    onSave(data);
  };

  const projectIsLocked = !!preselectedProjectId;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
          <DialogDescription>
            {assignment ? "Update the hours for this assignment." : "Assign a project to this employee for the selected week."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={projectIsLocked}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.filter(p => !p.isInactive).map(p => <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="8.0" 
                      {...field} 
                      step="0.1"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between pt-4">
              <div>
                {onDelete && (
                  <Button type="button" variant="destructive" onClick={onDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
