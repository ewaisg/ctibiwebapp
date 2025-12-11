"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { History } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Project, Invoice, Department } from "@/types";
import { createHistoricalInvoice } from "@/app/(authenticated)/invoices/actions";

const formSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  date: z.string().min(1, "Date is required"),
  departmentId: z.string().min(1, "Department is required"),
  projectId: z.string().min(1, "Project is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)), "Must be a number"),
  approvalStatus: z.string().min(1, "Approval status is required"),
  paymentStatus: z.string().min(1, "Payment status is required"),
  description: z.string().optional(),
});

interface HistoricalInvoiceDialogProps {
  projects: Project[];
  departments: Department[];
  onInvoiceCreated?: () => void;
}

export function HistoricalInvoiceDialog({ projects, departments, onInvoiceCreated }: HistoricalInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      departmentId: "",
      projectId: "",
      amount: "",
      approvalStatus: "Approved",
      paymentStatus: "Paid",
      description: "",
    },
  });

  // Filter projects based on selected department
  const selectedDepartmentId = form.watch("departmentId");
  const filteredProjects = projects.filter(project => {
    if (!selectedDepartmentId) return false;
    // Handle both string and object reference for departmentId
    const projDeptId = typeof project.departmentId === 'object' && project.departmentId !== null && 'id' in project.departmentId 
      ? (project.departmentId as any).id 
      : project.departmentId;
    return projDeptId === selectedDepartmentId;
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const selectedProject = projects.find(p => p.id === values.projectId);
      const selectedDepartment = departments.find(d => d.id === values.departmentId);

      if (!selectedProject || !selectedDepartment) {
        throw new Error("Invalid project or department selection");
      }

      const invoiceDate = new Date(values.date);
      const dateStr = invoiceDate.toISOString();

      const invoiceData = {
        invoiceNumber: values.invoiceNumber,
        date: invoiceDate,
        fromDate: dateStr,
        toDate: dateStr,
        dueDate: dateStr,
        departmentId: values.departmentId,
        departmentName: selectedDepartment.departmentName,
        projectId: values.projectId,
        amount: Number(values.amount),
        invoiceTotal: Number(values.amount), // Ensure invoiceTotal is set as it's used in charts
        status: values.approvalStatus, // Map approvalStatus to status for the invoice
        description: values.description || "",
        type: 'historical' as const
      };

      const result = await createHistoricalInvoice(
        invoiceData as any, 
        values.paymentStatus,
        selectedProject.projectName
      );
      
      if (result.success) {
        success("Historical invoice added successfully");
        setOpen(false);
        form.reset();
        if (onInvoiceCreated) {
          onInvoiceCreated();
        }
      } else {
        error(result.error || "Failed to add invoice");
      }
    } catch (err) {
      console.error("Error adding invoice:", err);
      error("Failed to add invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Add Historical
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Historical Invoice</DialogTitle>
          <DialogDescription>
            Manually enter details for a past invoice.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("projectId", ""); // Reset project when department changes
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.departmentName} {dept.isInactive ? "(Inactive)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!form.watch("departmentId")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={form.watch("departmentId") ? "Select a project" : "Select department first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id || "unknown"}>
                          {project.poNumber} - {project.projectName}
                          {project.isInactive ? " (Inactive)" : ""}
                          {project.isComplete ? " (Complete)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="approvalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approval Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes about this invoice..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
