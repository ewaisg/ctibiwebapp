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
import type { Project, Department, Contract, Company, User } from "@/types";
import { createHistoricalInvoice } from "@/app/(authenticated)/invoices/actions";

const formSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoicePacketNumber: z.string().optional(),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  departmentId: z.string().min(1, "Department is required"),
  contractId: z.string().min(1, "Contract is required"),
  projectId: z.string().min(1, "Project is required"),
  submitterCompanyId: z.string().min(1, "Submitter company is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)), "Must be a number"),
  approvalStatus: z.string().min(1, "Approval status is required"),
  paymentStatus: z.string().min(1, "Payment status is required"),
  pmisNumber: z.string().optional(),
  termOfWeek: z.string().optional(),
  approvingSupervisor: z.string().optional(),
  description: z.string().optional(),
});

interface HistoricalInvoiceDialogProps {
  projects: Project[];
  departments: Department[];
  contracts: Contract[];
  companies: Company[];
  users: User[];
  currentUser?: User;
  onInvoiceCreated?: () => void;
}

export function HistoricalInvoiceDialog({
  projects,
  departments,
  contracts,
  companies,
  users,
  currentUser,
  onInvoiceCreated
}: HistoricalInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "",
      invoicePacketNumber: "",
      fromDate: new Date().toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0],
      departmentId: "",
      contractId: "",
      projectId: "",
      submitterCompanyId: "",
      amount: "",
      approvalStatus: "approved",
      paymentStatus: "paid",
      pmisNumber: "",
      termOfWeek: "",
      approvingSupervisor: "",
      description: "",
    },
  });

  // Filter projects based on selected department
  const selectedDepartmentId = form.watch("departmentId");
  const filteredProjects = projects.filter(project => {
    if (!selectedDepartmentId) return false;
    const projDeptId = typeof project.departmentId === 'object' && project.departmentId !== null && 'id' in project.departmentId
      ? (project.departmentId as any).id
      : project.departmentId;
    return projDeptId === selectedDepartmentId;
  });

  // Note: Contracts are not filtered by department as they don't have departmentId
  // Contract will be auto-filled when a project is selected
  const filteredContracts = contracts;

  // Auto-fill fields when project is selected
  const selectedProjectId = form.watch("projectId");
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Update related fields when project changes
  if (selectedProject) {
    const contractId = typeof selectedProject.contractId === 'object' && selectedProject.contractId !== null && 'id' in selectedProject.contractId
      ? (selectedProject.contractId as any).id
      : selectedProject.contractId;

    if (contractId && form.getValues("contractId") !== contractId) {
      form.setValue("contractId", contractId as string);
    }

    if (selectedProject.pmisNumber && form.getValues("pmisNumber") !== selectedProject.pmisNumber) {
      form.setValue("pmisNumber", selectedProject.pmisNumber);
    }

    if (selectedProject.approvingSupervisor && form.getValues("approvingSupervisor") !== selectedProject.approvingSupervisor) {
      form.setValue("approvingSupervisor", selectedProject.approvingSupervisor);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const selectedProject = projects.find(p => p.id === values.projectId);
      const selectedDepartment = departments.find(d => d.id === values.departmentId);
      const selectedContract = contracts.find(c => c.id === values.contractId);
      const selectedCompany = companies.find(c => c.id === values.submitterCompanyId);

      if (!selectedProject || !selectedDepartment || !selectedContract || !selectedCompany) {
        throw new Error("Invalid selection");
      }

      const fromDate = new Date(values.fromDate);
      const toDate = new Date(values.toDate);
      const dueDate = new Date(values.dueDate);

      // Use current user or default to first user
      const approver = currentUser || users[0];
      if (!approver) {
        throw new Error("No user found for approval");
      }

      const invoiceData = {
        invoiceNumber: values.invoiceNumber,
        invoicePacketNumber: values.invoicePacketNumber || undefined,
        fromDate: fromDate as any,
        toDate: toDate as any,
        dueDate: dueDate as any,
        // Use document reference path format for Firestore references
        departmentId: `departments/${values.departmentId}`,
        contractId: `contracts/${values.contractId}`,
        projectId: `projects/${values.projectId}`,
        submitterCompanyId: `companies/${values.submitterCompanyId}`,
        approvedBy: `users/${approver.uid}`,
        userId: `users/${approver.uid}`,
        // Denormalized fields
        departmentName: selectedDepartment.departmentName,
        contractNumber: selectedContract.contractNumber,
        poNumber: selectedProject.poNumber,
        pmisNumber: values.pmisNumber || selectedProject.pmisNumber || "",
        termOfWeek: values.termOfWeek || "",
        approvingSupervisor: values.approvingSupervisor || selectedProject.approvingSupervisor || "",
        submitterName: approver.displayName || approver.email,
        submitterCompany: selectedCompany.companyName,
        approvedByName: approver.displayName || approver.email,
        // Financial fields
        invoiceTotal: Number(values.amount),
        invoiceItemsTotal: Number(values.amount),
        reimbursableExpensesTotal: 0,
        // Status
        status: values.approvalStatus,
        // Empty arrays for items/expenses
        invoiceItems: [],
        reimbursableExpenses: [],
        uploadedFiles: [],
        pdfVersions: [],
        history: [],
        // Contract summary (using project financial data since contracts don't store amounts)
        contractSummary: {
          contractNumber: selectedContract.contractNumber,
          contractName: selectedContract.contractName || "",
          originalContractPoAmount: selectedProject.originalPoAmount || 0,
          changeOrderAmount: selectedProject.changeOrderAmount || 0,
          newPoAmount: selectedProject.newPoAmount || 0,
          previouslyInvoiced: selectedProject.previouslyInvoicedAmount || 0,
          remainingPoAmount: selectedProject.remainingPoAmount || 0,
          budgetedHours: selectedProject.budgetedHours || 0,
          usedHours: selectedProject.usedHours || 0,
          remainingHours: selectedProject.remainingHours || 0,
        },
        // Flags
        isHistorical: true,
        autofillSource: 'manual',
        // File names (empty for historical)
        directLaborReportFileName: "",
        directLaborReportUrl: "",
        pdfFileName: "",
        pdfUrl: "",
        description: values.description || "",
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
      error(err instanceof Error ? err.message : "Failed to add invoice");
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Historical Invoice</DialogTitle>
          <DialogDescription>
            Manually enter complete details for a past invoice. All fields use proper document reference format.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Invoice Numbers Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="INV-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoicePacketNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Packet Number</FormLabel>
                    <FormControl>
                      <Input placeholder="PKT-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="fromDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Date (Billing Month) *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Department and Contract Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("projectId", "");
                      form.setValue("contractId", "");
                    }} value={field.value}>
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
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-filled from project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredContracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.contractNumber} - {contract.contractName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project and Company Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.watch("departmentId")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={form.watch("departmentId") ? "Select a project" : "Select department first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
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
                name="submitterCompanyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submitter Company *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project Details Section */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pmisNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PMIS Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-filled from project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="termOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Term of Week</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 4-Weeks/5-Weeks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="approvingSupervisor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approving Supervisor</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-filled from project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Amount Section */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Invoice Amount *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="approvalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approval Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="submitted">Submitted/Pending</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
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
                    <FormLabel>Payment Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description Section */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes about this historical invoice..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Historical Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
