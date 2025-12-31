"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import {
  resolveFlexibleReference,
  buildReferenceMap,
  logMissingReference,
} from "@/lib/document-reference-utils";
import { normalizeDateValue } from "@/lib/date-utils";
import { normalizeReferenceId } from "@/lib/reference-utils";
import { useProjectFinancials } from "@/hooks/use-project-financials";
import { useAutofill } from "@/hooks/use-autofill";
import { useInvoiceForm } from "@/hooks/use-invoice-form";
import { useInvoiceWizard } from "@/hooks/use-invoice-wizard";
import { useInvoiceValidation } from "@/hooks/use-invoice-validation";
import { useInvoiceWorkflow } from "@/hooks/use-invoice-workflow";
import { getInvoiceAccess, prepareInvoicePayload, statusColors } from "@/lib/invoice-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { WorkflowStepIndicator } from "@/components/invoicing/WorkflowStepIndicator";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type {
  Project,
  Department,
  Employee,
  Company,
  User,
  Service,
  Rate,
  Invoice,
  CtiTimesheet,
  InvoiceItemForm,
} from "@/types";
import { DocumentReference, Timestamp } from "firebase/firestore";
import SummarySidebar from "@/components/invoicing/SummarySidebar";
import WorkflowActions from "@/components/invoicing/WorkflowActions";
import Header from "@/components/invoicing/Header";
import DepartmentSelectionStep from "@/components/invoicing/DepartmentSelectionStep";
import ProjectSelectionStep from "@/components/invoicing/ProjectSelectionStep";
import dynamic from "next/dynamic";

const InvoiceItemsTable = dynamic(
  () => import("@/components/invoicing/InvoiceItemsTable"),
  { ssr: false }
);
const ReimbursableExpensesTable = dynamic(
  () => import("@/components/invoicing/ReimbursableExpensesTable"),
  { ssr: false }
);
const FileAttachments = dynamic(
  () => import("@/components/invoicing/FileAttachments"),
  { ssr: false }
);

interface InvoicingClientPageProps {
  projects: Project[];
  departments: Department[];
  employees: Employee[];
  companies: Company[];
  users: User[];
  services: Service[];
  rates: Rate[];
  existingInvoice?: Invoice | null;
  isEditing: boolean;
  initialFormData?: {
    action?: "autofill" | "manual";
    projectId?: string;
    fromDate?: Date;
    toDate?: Date;
    departmentId?: string;
    showLoading?: boolean;
  };
}

interface ReimbursableExpenseForm {
  amount: string;
  companyId: string;
  companyName?: string;
  date: Date | null;
  description: string;
}

export function InvoicingClientPage({
  projects,
  departments,
  employees,
  companies,
  services,
  rates,
  existingInvoice,
  isEditing,
  initialFormData,
}: InvoicingClientPageProps) {
  const { user } = useAuth();
  const router = useRouter();

  // State Management - Form data
  const { formData, setFormData, totals } = useInvoiceForm();

  // State Management - Wizard navigation
  const { currentStep, setCurrentStep, goToFormStep, goToProjectStep, goToDepartmentStep } =
    useInvoiceWizard({
      isEditing,
      userRole: user?.role,
      initialFormData,
    });

  // State Management - Validation
  const {
    errors,
    fieldErrors,
    itemErrors,
    setErrors,
    validateField,
    validateInvoiceItem,
    validateForm,
  } = useInvoiceValidation();

  // State Management - Local state
  const [isLoadingTimesheet, setIsLoadingTimesheet] = useState(false);
  const [timesheetData, setTimesheetData] = useState<CtiTimesheet[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [existingUploadedFiles, setExistingUploadedFiles] = useState<
    Array<{ fileName: string; fileUrl: string }>
  >([]);

  // Autofill controller
  const autofill = useAutofill();

  // Invoice display (handle subconsultant submitted snapshot)
  const invoiceForDisplay = useMemo(() => {
    if (!existingInvoice) return existingInvoice;
    const role = user?.role;
    const status = String((existingInvoice as any).status || "").toLowerCase();
    const snapshot = (existingInvoice as any).submittedSnapshot;
    if (role === "Subconsultant" && status === "approved" && snapshot) {
      return {
        ...existingInvoice,
        invoiceItems: Array.isArray(snapshot.invoiceItems)
          ? snapshot.invoiceItems
          : (existingInvoice as any).invoiceItems,
        reimbursableExpenses: Array.isArray(snapshot.reimbursableExpenses)
          ? snapshot.reimbursableExpenses
          : (existingInvoice as any).reimbursableExpenses,
        invoiceItemsTotal:
          typeof snapshot.invoiceItemsTotal === "number"
            ? snapshot.invoiceItemsTotal
            : (existingInvoice as any).invoiceItemsTotal,
        reimbursableExpensesTotal:
          typeof snapshot.reimbursableExpensesTotal === "number"
            ? snapshot.reimbursableExpensesTotal
            : (existingInvoice as any).reimbursableExpensesTotal,
        invoiceTotal:
          typeof snapshot.invoiceTotal === "number"
            ? snapshot.invoiceTotal
            : (existingInvoice as any).invoiceTotal,
      };
    }
    return existingInvoice;
  }, [existingInvoice, user?.role]);

  // Permissions - Using extracted utility
  const access = getInvoiceAccess(user, invoiceForDisplay);
  const isAuthor = access.isAuthor;
  const isAdminOrPrime = access.isAdminOrPrime;
  const invStatus = access.status as
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "resubmitted";
  const canSubmit = access.canSubmit;
  const canResubmit = access.canResubmit;
  const canApprove = access.canApprove;
  const canReject = access.canReject;
  const canGeneratePdf = access.canGeneratePdf;
  const canRestorePdf = access.canRestorePdf;
  const isReadOnly = access.isReadOnly;

  // Workflow actions - Using extracted hook
  const workflow = useInvoiceWorkflow({
    user,
    existingInvoice: invoiceForDisplay,
    isAdminOrPrime,
    isAuthor,
    invStatus,
    onClearUnsavedChanges: () => setHasUnsavedChanges(false),
    onClearAttachedFiles: () => setFormData((prev) => ({ ...prev, attachedFiles: [] })),
  });

  // Track unsaved changes
  useEffect(() => {
    if (isReadOnly || currentStep !== "form") {
      setHasUnsavedChanges(false);
      return;
    }

    const hasItems = formData.invoiceItems.length > 0;
    const hasExpenses = formData.reimbursableExpenses.length > 0;
    const hasFiles = formData.attachedFiles.length > 0;
    const hasFormData = !!(formData.projectId || formData.fromDate || formData.toDate);

    setHasUnsavedChanges(hasItems || hasExpenses || hasFiles || hasFormData);
  }, [formData, currentStep, isReadOnly]);

  // Warn before browser navigation/refresh
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle initial form data from dialog workflow
  useEffect(() => {
    if (initialFormData && !isEditing) {
      setFormData((prev) => ({
        ...prev,
        departmentId: initialFormData.departmentId || "",
        projectId: initialFormData.projectId || "",
        fromDate: initialFormData.fromDate,
        toDate: initialFormData.toDate,
      }));

      if (initialFormData.projectId) {
        goToFormStep();
      }

      if (
        initialFormData.action === "autofill" &&
        initialFormData.projectId &&
        initialFormData.fromDate &&
        initialFormData.toDate
      ) {
        setTimeout(() => {
          populateFromTimesheet();
        }, 100);
      }

      if (initialFormData.showLoading) {
        setTimeout(() => {
          localStorage.setItem("autofill-navigation-complete", "true");
          window.dispatchEvent(new Event("storage"));
        }, 500);
      }
    }
  }, [initialFormData, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter departments and projects
  const availableDepartments = useMemo(() => {
    if (user?.role === "Subconsultant") return [];
    return departments.filter((dept) => !dept.isInactive);
  }, [departments, user?.role]);

  const availableProjects = useMemo(() => {
    let filteredProjects = projects;

    if (user?.role === "Subconsultant") {
      const { id: userCompanyId } = resolveFlexibleReference(user?.companyId, {
        collection: "companies",
        context: "availableProjects:userCompany",
      });
      filteredProjects = projects.filter((project) => {
        if (!userCompanyId) {
          logMissingReference("companies", undefined, "availableProjects:userCompany");
          return false;
        }
        const assignedCompanies = project.assignedCompanies ?? [];
        return assignedCompanies.some((ac) => {
          const { id: companyId } = resolveFlexibleReference(ac?.companyId, {
            collection: "companies",
            context: `availableProjects:project:${project.id}:company`,
          });
          if (!companyId) {
            logMissingReference(
              "companies",
              undefined,
              `availableProjects:project:${project.id}:company`
            );
            return false;
          }
          return companyId === userCompanyId;
        });
      });
    }

    if (formData.departmentId && user?.role && user.role !== "Subconsultant") {
      filteredProjects = filteredProjects.filter((project) => {
        const { id: projectDeptId } = resolveFlexibleReference(project.departmentId, {
          collection: "departments",
          context: `availableProjects:project:${project.id}:department`,
        });
        if (!projectDeptId) {
          logMissingReference(
            "departments",
            undefined,
            `availableProjects:project:${project.id}:department`
          );
          return false;
        }
        return projectDeptId === formData.departmentId;
      });
    }

    return filteredProjects.filter((project) => !project.isInactive);
  }, [projects, formData.departmentId, user]);

  const selectedProject = useMemo(() => {
    return availableProjects.find((project) => project.id === formData.projectId);
  }, [availableProjects, formData.projectId]);

  const projectFinancials = useProjectFinancials(selectedProject);

  const employeeMap = useMemo(
    () => buildReferenceMap(employees, (employee) => employee.id),
    [employees]
  );
  const companyMap = useMemo(
    () => buildReferenceMap(companies, (company) => company.id),
    [companies]
  );
  const serviceMap = useMemo(
    () => buildReferenceMap(services, (service) => service.id),
    [services]
  );

  // Available employees for the selected project
  const availableEmployees = useMemo(() => {
    if (!selectedProject || !user) return [];

    if (user.role === "Subconsultant") {
      const { id: userCompanyId } = resolveFlexibleReference(user.companyId, {
        collection: "companies",
        context: "availableEmployees:userCompany",
        warn: false,
      });
      if (!userCompanyId) {
        logMissingReference("companies", undefined, "availableEmployees:userCompany");
        return [];
      }
      return employees.filter((emp) => {
        const { id: empCompanyId } = resolveFlexibleReference(emp.companyId, {
          collection: "companies",
          context: `availableEmployees:employee:${emp.id}:company`,
          warn: false,
        });
        if (!empCompanyId) {
          logMissingReference(
            "companies",
            undefined,
            `availableEmployees:employee:${emp.id}:company`
          );
          return false;
        }
        return empCompanyId === userCompanyId && emp.employmentStatus === "Active";
      });
    }

    const projectEmployees: Employee[] = [];
    const seen = new Set<string>();
    const assignedCompanies = selectedProject.assignedCompanies ?? [];

    assignedCompanies.forEach((ac) => {
      const assignedEmployees = ac?.assignedEmployees ?? [];
      assignedEmployees.forEach((ae) => {
        const { id: empId } = resolveFlexibleReference(ae?.employeeId, {
          collection: "employees",
          context: `availableEmployees:project:${selectedProject.id}:assignment`,
          warn: false,
        });
        if (!empId) {
          logMissingReference(
            "employees",
            undefined,
            `availableEmployees:project:${selectedProject.id}:assignment`
          );
          return;
        }
        if (seen.has(empId)) return;
        const employee = employeeMap.get(empId);
        if (!employee) {
          logMissingReference(
            "employees",
            empId,
            `availableEmployees:project:${selectedProject.id}:assignment`
          );
          return;
        }
        if (employee.employmentStatus === "Active") {
          projectEmployees.push(employee);
          seen.add(empId);
        }
      });
    });

    return projectEmployees;
  }, [selectedProject, user, employees, employeeMap]);

  // Include employees referenced in form items
  const employeesForSelect = useMemo(() => {
    const base = [...availableEmployees];
    const existingIds = new Set(base.map((e) => e.id));
    const neededIds = new Set(
      formData.invoiceItems
        .map((item) =>
          resolveFlexibleReference(item.employeeId, {
            collection: "employees",
            context: "employeesForSelect:invoiceItem",
            warn: false,
          }).id
        )
        .filter((id): id is string => Boolean(id))
    );

    neededIds.forEach((id) => {
      if (existingIds.has(id)) return;
      const found = employeeMap.get(id);
      if (found) {
        base.push(found);
        existingIds.add(id);
        return;
      }

      const fromForm = formData.invoiceItems.find((item) => {
        const { id: refId } = resolveFlexibleReference(item.employeeId, {
          collection: "employees",
          context: "employeesForSelect:formFallback",
          warn: false,
        });
        return refId === id;
      });

      if (!fromForm) {
        logMissingReference("employees", id, "employeesForSelect:formFallback");
      }

      const label = (fromForm?.employeeName || "").trim() || `Unknown Employee (${id})`;
      const { id: placeholderCompanyId } = resolveFlexibleReference(fromForm?.companyId, {
        collection: "companies",
        context: `employeesForSelect:placeholder:${id}`,
        warn: false,
      });

      if (!placeholderCompanyId) {
        logMissingReference("companies", undefined, `employeesForSelect:placeholder:${id}`);
      }

      base.push({
        id,
        formalName: label,
        employeeFirstName: "",
        employeeLastName: "",
        employmentStatus: "Inactive",
        companyId: placeholderCompanyId ?? "",
      } as unknown as Employee);
      existingIds.add(id);
    });

    const dedup = new Map(base.map((e) => [e.id, e]));
    return Array.from(dedup.values());
  }, [availableEmployees, formData.invoiceItems, employeeMap]);

  // Available services
  const availableServices = useMemo(() => {
    if (!selectedProject || !user) return [];

    const projectServices: Service[] = [];
    const userCompanyId =
      typeof user.companyId === "object" && "id" in user.companyId
        ? (user.companyId as DocumentReference).id
        : user.companyId;

    selectedProject.assignedCompanies?.forEach((ac) => {
      const companyId =
        typeof ac.companyId === "object" && "id" in ac.companyId
          ? (ac.companyId as DocumentReference).id
          : ac.companyId;

      if (user.role === "Subconsultant" && companyId !== userCompanyId) return;

      ac.assignedServices?.forEach((as) => {
        const serviceId =
          typeof as.serviceId === "object" && "id" in as.serviceId
            ? (as.serviceId as DocumentReference).id
            : as.serviceId;
        const service = services.find((s) => s.id === serviceId);
        if (!service) {
          logMissingReference("services", serviceId, `availableServices:project:${selectedProject.id}`);
        }
        if (service) {
          projectServices.push(service);
        }
      });
    });

    return projectServices;
  }, [selectedProject, services, user]);

  // Include services referenced in form items
  const servicesForSelect = useMemo(() => {
    const base = [...availableServices];
    const existingIds = new Set(base.map((s) => s.id));
    const neededIds = new Set(
      formData.invoiceItems.map((i) => String(i.serviceId || "").trim()).filter(Boolean)
    );
    neededIds.forEach((id) => {
      if (!existingIds.has(id)) {
        const found = services.find((s) => s.id === id);
        if (found) base.push(found);
        else {
          const fromItem = formData.invoiceItems.find((i) => String(i.serviceId || "") === id);
          const label = (fromItem?.serviceName || "").trim() || `Unknown Service (${id})`;
          base.push({ id, serviceName: label } as unknown as Service);
        }
      }
    });
    const dedup = new Map(base.map((s) => [s.id, s]));
    return Array.from(dedup.values());
  }, [availableServices, formData.invoiceItems, services]);

  // Companies for select
  const companiesForSelect = useMemo(() => {
    const base = [...companies];
    const existingIds = new Set(base.map((c) => c.id));
    const neededIds = new Set([
      ...formData.reimbursableExpenses.map((e) => String(e.companyId || "").trim()).filter(Boolean),
      ...formData.invoiceItems.map((i) => String(i.companyId || "").trim()).filter(Boolean),
    ]);
    neededIds.forEach((id) => {
      if (!existingIds.has(id)) {
        const found = companies.find((c) => c.id === id);
        if (found) base.push(found);
        else {
          const fromItem = formData.invoiceItems.find((i) => String(i.companyId || "") === id);
          const fromExpense = formData.reimbursableExpenses.find(
            (e) => String(e.companyId || "") === id
          );
          const label =
            (fromItem?.companyName || fromExpense?.companyName || "").trim() ||
            `Unknown Company (${id})`;
          base.push({ id, companyName: label } as unknown as Company);
        }
      }
    });
    const dedup = new Map(base.map((c) => [c.id, c]));
    return Array.from(dedup.values());
  }, [companies, formData.reimbursableExpenses, formData.invoiceItems]);

  // Auto-populate invoice items from timesheet data
  const populateFromTimesheet = useCallback(async () => {
    if (!formData.projectId || !formData.fromDate || !formData.toDate) return;

    const key = `${formData.projectId}|${(formData.fromDate as Date).toISOString()}|${(
      formData.toDate as Date
    ).toISOString()}`;

    await autofill.run(key, async () => {
      setIsLoadingTimesheet(true);
      try {
        const { autofillFromTimesheets } = await import("./invoice-autofill-actions");
        const result = await autofillFromTimesheets({
          projectId: formData.projectId,
          fromDate: (formData.fromDate as Date).toISOString(),
          toDate: (formData.toDate as Date).toISOString(),
        });

        if (result.success && result.items.length > 0) {
          const transformedItems: InvoiceItemForm[] = result.items
            .filter((item: unknown) => {
              if (!item || typeof item !== "object") return false;
              const typedItem = item as Record<string, unknown>;
              return typedItem.employeeId && typedItem.hours && Number(typedItem.hours) > 0;
            })
            .map((item: unknown) => {
              const typedItem = item as {
                employeeId: string;
                companyId: string;
                serviceId?: string;
                hours: number;
                billingRate: number;
                markdown: number;
                amount: number;
                notes: string;
              };
              const employeeTimesheetEntries = result.entriesFound || 0;
              return {
                employeeId: typedItem.employeeId || "",
                companyId: typedItem.companyId || "",
                serviceId: typedItem.serviceId || "",
                hours: Number(typedItem.hours) || 0,
                billingRate: Number(typedItem.billingRate) || 0,
                markdown: Number(typedItem.markdown) || 0,
                amount: Number(typedItem.amount) || 0,
                notes: typedItem.notes || "",
                entriesCount: employeeTimesheetEntries,
              } as InvoiceItemForm & { entriesCount: number };
            });

          if (transformedItems.length === 0) {
            console.warn("No valid invoice items could be created from timesheet data");
          } else {
            setFormData((prev) => ({
              ...prev,
              invoiceItems: transformedItems,
              ...(result.projectData && {
                approvingSupervisor:
                  result.projectData.approvingSupervisor || prev.approvingSupervisor,
                contractNumber: result.projectData.contractNumber || prev.contractNumber,
                poNumber: result.projectData.poNumber || prev.poNumber,
                pmisNumber: result.projectData.pmisNumber || prev.pmisNumber,
              }),
            }));
          }

          if (result.dueDate) {
            const dueDate = new Date(result.dueDate);
            setFormData((prev) => ({ ...prev, dueDate }));
          }
          if (result.termOfWeek) {
            setFormData((prev) => ({ ...prev, termOfWeek: result.termOfWeek }));
          }

          const validItems = result.items.filter((item) => {
            if (!item || typeof item !== "object") return false;
            const typedItem = item as Record<string, unknown>;
            return typedItem.employeeId && typedItem.employeeName && typedItem.hours;
          }) as Array<{ employeeId: string; employeeName: string; serviceName: string; hours: number }>;

          setTimesheetData(
            validItems.map((item) => {
              const employeeIdNum = parseInt(item.employeeId, 10);
              const nameParts = (item.employeeName || "").split(" ");
              return {
                id: `generated-${item.employeeId}`,
                employeeId: isNaN(employeeIdNum) ? 0 : employeeIdNum,
                employeeNumber: "",
                employeeFirstName: nameParts[0] || "",
                employeeLastName: nameParts.slice(1).join(" ") || "",
                timecardDate: formData.fromDate
                  ? Timestamp.fromDate(formData.fromDate)
                  : Timestamp.now(),
                totalHoursActual: Number(item.hours) || 0,
                labors: [],
                payItems: [
                  {
                    payItemCode: "HRLY",
                    payItemHours: Number(item.hours) || 0,
                    payItemName: item.serviceName || "General Labor",
                  },
                ],
              };
            })
          );
        } else {
          console.info("No timesheet data found for autofill:", {
            success: result.success,
            itemCount: result.items?.length || 0,
            error: result.error,
          });
        }
      } catch (error) {
        console.error("Error during autofill:", error);
        setErrors((prev) => ({
          ...prev,
          autofill: "Failed to load timesheet data. Please try again or add items manually.",
        }));
      } finally {
        setIsLoadingTimesheet(false);
      }
    });
  }, [formData.projectId, formData.fromDate, formData.toDate, setFormData, autofill, setErrors]);

  // Auto-populate project details when project is selected
  useEffect(() => {
    if (selectedProject) {
      const contractNumber =
        selectedProject.contractNumber != null ? String(selectedProject.contractNumber) : "";
      setFormData((prev) => ({
        ...prev,
        contractNumber,
        poNumber: selectedProject.poNumber || "",
        pmisNumber: selectedProject.pmisNumber || "",
        approvingSupervisor: selectedProject.approvingSupervisor || "",
      }));

      if (!isEditing && !formData.fromDate && !formData.toDate) {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        setFormData((prev) => ({
          ...prev,
          fromDate: weekStart,
          toDate: weekEnd,
          dueDate: addDays(weekEnd, 30),
          termOfWeek: `Week ending ${format(weekEnd, "MM/dd/yyyy")}`,
        }));
      }
    }
  }, [selectedProject, isEditing, formData.fromDate, formData.toDate, setFormData]);

  // Trigger autofill when entering form step
  useEffect(() => {
    if (
      currentStep === "form" &&
      !isEditing &&
      formData.projectId &&
      formData.fromDate &&
      formData.toDate &&
      formData.invoiceItems.length === 0
    ) {
      const timer = setTimeout(() => {
        populateFromTimesheet();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [
    currentStep,
    formData.projectId,
    formData.fromDate,
    formData.toDate,
    isEditing,
    formData.invoiceItems.length,
    populateFromTimesheet,
  ]);

  // Calculate totals via hook
  const invoiceItemsTotal = totals.itemsTotal;
  const reimbursableExpensesTotal = totals.expensesTotal;
  const invoiceTotal = totals.grandTotal;

  // Load existing invoice data
  useEffect(() => {
    if (invoiceForDisplay && isEditing) {
      const projectId =
        typeof (invoiceForDisplay as any).projectId === "object" &&
        "id" in (invoiceForDisplay as any).projectId
          ? ((invoiceForDisplay as any).projectId as any).id
          : (invoiceForDisplay as any).projectId;

      const project = projects.find((p) => p.id === projectId);
      const departmentId =
        project && typeof project.departmentId === "object" && "id" in project.departmentId
          ? (project.departmentId as any).id
          : (project as any)?.departmentId;

      function normalizeDate(raw: any): Date | undefined {
        if (!raw) return undefined;
        try {
          if (raw instanceof Date) return isNaN(raw.getTime()) ? undefined : raw;
          if (typeof raw?.toDate === "function") {
            const d = raw.toDate();
            return isNaN(d.getTime()) ? undefined : d;
          }
          if (typeof raw === "object") {
            const seconds =
              typeof (raw as any).seconds === "number"
                ? (raw as any).seconds
                : typeof (raw as any)._seconds === "number"
                ? (raw as any)._seconds
                : undefined;
            if (typeof seconds === "number") {
              const d = new Date(seconds * 1000);
              return isNaN(d.getTime()) ? undefined : d;
            }
          }
          if (typeof raw === "string" || typeof raw === "number") {
            const d = new Date(raw as any);
            return isNaN(d.getTime()) ? undefined : d;
          }
        } catch {}
        return undefined;
      }

      setFormData({
        departmentId: typeof departmentId === "string" ? departmentId : "",
        projectId: typeof projectId === "string" ? projectId : "",
        contractNumber: (invoiceForDisplay as any).contractNumber?.toString() || "",
        poNumber: (invoiceForDisplay as any).poNumber || "",
        pmisNumber: (invoiceForDisplay as any).pmisNumber || "",
        invoiceNumber: (invoiceForDisplay as any).invoiceNumber || "",
        fromDate: normalizeDateValue((invoiceForDisplay as any).fromDate),
        toDate: normalizeDateValue((invoiceForDisplay as any).toDate),
        dueDate: normalizeDateValue((invoiceForDisplay as any).dueDate),
        termOfWeek: (invoiceForDisplay as any).termOfWeek || "",
        approvingSupervisor: (invoiceForDisplay as any).approvingSupervisor || "",
        invoiceItems:
          (invoiceForDisplay as any).invoiceItems?.map((ii: any, index: number) => {
            const contextBase = `existingInvoice:item:${index}`;

            const companyNameRaw = String((ii as any).companyName ?? "").trim();
            let companyId = normalizeReferenceId(
              (ii as any).companyId ?? ii.companyId,
              "companies",
              `${contextBase}:company`,
              false
            );
            if (!companyId && companyNameRaw) {
              const matchByName = companies.find(
                (c) =>
                  (c.companyName || "").trim().toLowerCase() === companyNameRaw.toLowerCase()
              );
              if (matchByName) {
                companyId = matchByName.id;
              }
            }
            const company = companyId ? companyMap.get(companyId) : undefined;

            const employeeNameRaw = String((ii as any).employeeName ?? "").trim();
            let employeeId = normalizeReferenceId(
              (ii as any).employeeId ?? ii.employeeId,
              "employees",
              `${contextBase}:employee`,
              false
            );
            if (!employeeId && employeeNameRaw) {
              const matchByName = employees.find(
                (e) => (e.formalName || "").trim().toLowerCase() === employeeNameRaw.toLowerCase()
              );
              if (matchByName) {
                employeeId = matchByName.id;
              }
            }
            const employee = employeeId ? employeeMap.get(employeeId) : undefined;

            const serviceNameRaw = String((ii as any).serviceName ?? "").trim();
            let serviceId = normalizeReferenceId(
              (ii as any).serviceId ?? ii.serviceId,
              "services",
              `${contextBase}:service`,
              false
            );
            if (!serviceId && serviceNameRaw) {
              let matchByName = services.find(
                (s) => (s.serviceName || "").trim().toLowerCase() === serviceNameRaw.toLowerCase()
              );
              if (!matchByName && selectedProject) {
                const assignedServiceIds = (selectedProject.assignedCompanies || [])
                  .flatMap((ac) =>
                    (ac.assignedServices || []).map((as) =>
                      normalizeReferenceId(
                        as?.serviceId,
                        "services",
                        `${contextBase}:serviceAssignment`,
                        false
                      )
                    )
                  )
                  .filter(Boolean) as string[];
                matchByName = services.find(
                  (s) =>
                    assignedServiceIds.includes(s.id) &&
                    (s.serviceName || "").trim().toLowerCase() === serviceNameRaw.toLowerCase()
                );
              }
              if (matchByName) {
                serviceId = matchByName.id;
              }
            }
            const service = serviceId ? serviceMap.get(serviceId) : undefined;

            return {
              ...ii,
              companyId,
              companyName: companyNameRaw || company?.companyName || "Unknown Company",
              employeeId,
              employeeName: employeeNameRaw || employee?.formalName || "Unknown Employee",
              serviceId,
              serviceName: serviceNameRaw || service?.serviceName || undefined,
            } as unknown as InvoiceItemForm;
          }) || [],
        reimbursableExpenses:
          (invoiceForDisplay as any).reimbursableExpenses?.map((re: any) => {
            const rawCompanyId =
              typeof re.companyId === "object" && "id" in (re.companyId as any)
                ? (re.companyId as DocumentReference).id
                : ((re as any).companyId as string | undefined);
            let companyId = String(rawCompanyId ?? "").trim();
            let companyName = (re as any).companyName || "";
            if (!companyId || companyId === "undefined" || companyId === "null") {
              const byName = companies.find(
                (c) => c.companyName?.toLowerCase() === String(companyName || "").toLowerCase()
              );
              companyId = byName?.id || "";
              if (!companyName && byName) companyName = byName.companyName;
            }
            if (!companyName) {
              const c = companies.find((c) => c.id === companyId);
              companyName = c?.companyName || "Unknown Company";
            }

            const rawDate = (re as any).date;
            const date = normalizeDateValue(rawDate) ?? null;

            return {
              ...re,
              amount: String((re as any).amount ?? ""),
              companyId,
              companyName,
              date,
              description: (re as any).description || "",
            } as ReimbursableExpenseForm;
          }) || [],
        attachedFiles: [],
        notes: "",
      });

      const uploaded = Array.isArray((invoiceForDisplay as any).uploadedFiles)
        ? ((invoiceForDisplay as any).uploadedFiles as Array<{
            fileName: string;
            fileUrl: string;
          }>)
        : [];
      setExistingUploadedFiles(uploaded.filter((f) => f && f.fileName && f.fileUrl));

      goToFormStep();
    }
  }, [invoiceForDisplay, isEditing, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDepartmentSelect = (departmentId: string) => {
    setFormData((prev) => ({ ...prev, departmentId, projectId: "" }));
    goToProjectStep();
  };

  const handleProjectSelect = (projectId: string) => {
    setFormData((prev) => ({ ...prev, projectId }));
    goToFormStep();
  };

  // Invoice item management
  const addInvoiceItem = useCallback(() => {
    if (!user) return;
    const userCompanyId =
      typeof user.companyId === "object" && "id" in user.companyId
        ? (user.companyId as DocumentReference).id
        : String(user.companyId);
    const userCompany = companiesForSelect.find((c) => c.id === userCompanyId);
    const newItem: InvoiceItemForm = {
      amount: 0,
      billingRate: 0,
      companyId: userCompanyId,
      companyName: userCompany?.companyName || "",
      employeeId: "",
      employeeName: "",
      hours: 0,
      markdown: 0,
      notes: "",
      serviceId: "",
    };

    setFormData((prev) => ({
      ...prev,
      invoiceItems: [...prev.invoiceItems, newItem],
    }));
  }, [user, companiesForSelect, setFormData]);

  const removeInvoiceItem = useCallback(
    (index: number) => {
      setFormData((prev) => ({
        ...prev,
        invoiceItems: prev.invoiceItems.filter((_, i) => i !== index),
      }));
    },
    [setFormData]
  );

  const updateInvoiceItem = useCallback(
    (index: number, field: keyof InvoiceItemForm, value: string | number) => {
      setFormData((prev) => ({
        ...prev,
        invoiceItems: prev.invoiceItems.map((item, i) => {
          if (i === index) {
            const updatedItem: InvoiceItemForm = { ...item, [field]: value } as InvoiceItemForm;

            validateInvoiceItem(index, field, value);

            if (field === "employeeId" || field === "serviceId") {
              const selectedEmployeeId = String(
                field === "employeeId" ? value : item.employeeId || ""
              );
              const selectedServiceId = String(
                field === "serviceId" ? value : item.serviceId || ""
              );

              const employee = availableEmployees.find((emp) => emp.id === selectedEmployeeId);
              const service = availableServices.find((svc) => svc.id === selectedServiceId);

              if (employee) {
                const empCompanyId =
                  typeof employee.companyId === "object" && "id" in employee.companyId
                    ? (employee.companyId as DocumentReference).id
                    : employee.companyId;
                updatedItem.companyId = empCompanyId as unknown as string;
                updatedItem.employeeName = employee.formalName || "";
                const company = companies.find((c) => c.id === String(empCompanyId));
                if (company) updatedItem.companyName = company.companyName || "";
              }

              if (service) {
                updatedItem.serviceName = service.serviceName || "";
              }

              if (employee && service && selectedProject) {
                const empCompanyId =
                  typeof employee.companyId === "object" && "id" in employee.companyId
                    ? (employee.companyId as DocumentReference).id
                    : employee.companyId;

                const assignedCompany = selectedProject.assignedCompanies?.find((ac) => {
                  const acCompanyId =
                    typeof ac.companyId === "object" && "id" in ac.companyId
                      ? (ac.companyId as DocumentReference).id
                      : ac.companyId;
                  return acCompanyId === empCompanyId;
                });

                let resolvedRate: number | undefined;

                const assignedService = assignedCompany?.assignedServices?.find((as) => {
                  const asServiceId =
                    typeof as.serviceId === "object" && "id" in as.serviceId
                      ? (as.serviceId as DocumentReference).id
                      : as.serviceId;
                  return asServiceId === service.id;
                });

                if (assignedService && typeof assignedService.billingRate === "number") {
                  resolvedRate = assignedService.billingRate;
                }

                if (resolvedRate === undefined) {
                  const fallbackRate = rates.find((r) => {
                    const rateCompanyId =
                      typeof r.companyId === "object" && "id" in r.companyId
                        ? (r.companyId as DocumentReference).id
                        : r.companyId;
                    const rateServiceId =
                      typeof r.serviceId === "object" && "id" in r.serviceId
                        ? (r.serviceId as DocumentReference).id
                        : r.serviceId;
                    return rateCompanyId === empCompanyId && rateServiceId === service.id;
                  });
                  if (fallbackRate) {
                    resolvedRate = fallbackRate.rate;
                  }
                }

                if (resolvedRate !== undefined) {
                  updatedItem.billingRate = resolvedRate;
                  const hours = Number(updatedItem.hours || 0);
                  const markdown = Number(updatedItem.markdown) || 0;
                  const adjustedRate = resolvedRate * (1 + markdown / 100);
                  updatedItem.amount = hours * adjustedRate;
                }
              }
            }

            if (field === "hours" || field === "billingRate" || field === "markdown") {
              const hours = Number(field === "hours" ? value : item.hours);
              const rate = Number(field === "billingRate" ? value : updatedItem.billingRate);
              const markdown = Number(field === "markdown" ? value : item.markdown);
              const adjustedRate = rate * (1 + markdown / 100);
              updatedItem.amount = hours * adjustedRate;
            }

            return updatedItem;
          }
          return item;
        }),
      }));
    },
    [
      availableEmployees,
      availableServices,
      selectedProject,
      rates,
      companies,
      validateInvoiceItem,
      setFormData,
    ]
  );

  // Reimbursable expense management
  const addReimbursableExpense = useCallback(() => {
    if (!user) return;
    const userCompanyId =
      typeof user.companyId === "object" && "id" in user.companyId
        ? (user.companyId as DocumentReference).id
        : String(user.companyId);
    const userCompany = companiesForSelect.find((c) => c.id === userCompanyId);
    const newExpense: ReimbursableExpenseForm = {
      amount: "",
      companyId: userCompanyId,
      companyName: userCompany?.companyName || "",
      date: new Date(),
      description: "",
    };

    setFormData((prev) => ({
      ...prev,
      reimbursableExpenses: [...prev.reimbursableExpenses, newExpense],
    }));
  }, [user, companiesForSelect, setFormData]);

  const removeReimbursableExpense = useCallback(
    (index: number) => {
      setFormData((prev) => ({
        ...prev,
        reimbursableExpenses: prev.reimbursableExpenses.filter((_, i) => i !== index),
      }));
    },
    [setFormData]
  );

  const updateReimbursableExpense = useCallback(
    (
      index: number,
      field: keyof ReimbursableExpenseForm,
      value: string | number | Date | null | undefined
    ) => {
      setFormData((prev) => ({
        ...prev,
        reimbursableExpenses: prev.reimbursableExpenses.map((expense, i) => {
          if (i !== index) return expense;
          const updated = { ...expense, [field]: value } as ReimbursableExpenseForm;
          if (field === "companyId") {
            const comp = companiesForSelect.find((c) => c.id === String(value || ""));
            updated.companyName = comp?.companyName || "";
          } else if (field === "date") {
            let nextDate: Date | null = null;
            if (value instanceof Date) {
              nextDate = isNaN(value.getTime()) ? null : value;
            } else if (typeof value === "string" || typeof value === "number") {
              const d = new Date(value as any);
              nextDate = isNaN(d.getTime()) ? null : d;
            } else if (value && typeof (value as any).toDate === "function") {
              const d = (value as any).toDate();
              nextDate = isNaN(d.getTime()) ? null : d;
            } else {
              nextDate = null;
            }
            updated.date = nextDate;
          }
          return updated;
        }),
      }));
    },
    [companiesForSelect, setFormData]
  );

  // File management
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        setFormData((prev) => ({
          ...prev,
          attachedFiles: [...prev.attachedFiles, ...Array.from(files)],
        }));
      }
    },
    [setFormData]
  );

  const removeFile = useCallback(
    (index: number) => {
      setFormData((prev) => ({
        ...prev,
        attachedFiles: prev.attachedFiles.filter((_, i) => i !== index),
      }));
    },
    [setFormData]
  );

  // Prepare and submit forms - Using extracted utility
  const handleCreateInvoice = async (status: "draft" | "submitted" = "submitted") => {
    if (!validateForm(formData) || !user) return;

    const payload = await prepareInvoicePayload(
      formData,
      user,
      initialFormData,
      existingInvoice,
      isEditing
    );
    const result = await workflow.handleCreateInvoice(payload, status);

    if (!result.success && result.error) {
      setErrors({ general: result.error });
    }
  };

  const handleSaveInvoiceChanges = async () => {
    if (!user || !existingInvoice?.id || isReadOnly) return;
    if (!validateForm(formData)) return;

    const payload = await prepareInvoicePayload(
      formData,
      user,
      initialFormData,
      existingInvoice,
      isEditing
    );
    await workflow.handleSaveInvoiceChanges(payload);
  };

  const handleSubmitForReview = async () => {
    if (!user || !existingInvoice?.id) return;

    let payload = null;
    if (!isReadOnly) {
      if (!validateForm(formData)) return;
      payload = await prepareInvoicePayload(
        formData,
        user,
        initialFormData,
        existingInvoice,
        isEditing
      );
    }

    await workflow.handleSubmitForReview(payload, isReadOnly);
  };

  // ACCESS CHECK: Block access when viewing an existing invoice without permission
  if (isEditing && !access.canView) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don't have permission to view this invoice.
          </p>
        </div>
      </div>
    );
  }

  // Render department selection step
  if (currentStep === "department" && user?.role !== "Subconsultant") {
    return (
      <div>
        <Breadcrumbs
          items={[{ label: "Invoices", href: "/invoices" }, { label: "Select Department" }]}
          className="mb-4"
        />
        <WorkflowStepIndicator currentStep={currentStep} userRole={user?.role} />
        <DepartmentSelectionStep
          departments={availableDepartments}
          onSelect={handleDepartmentSelect}
          onBack={() => router.push("/invoices")}
        />
      </div>
    );
  }

  // Render project selection step
  if (currentStep === "project") {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Invoices", href: "/invoices" },
            ...(user?.role !== "Subconsultant" ? [{ label: "Department", href: undefined }] : []),
            { label: "Select Project" },
          ]}
          className="mb-4"
        />
        <WorkflowStepIndicator currentStep={currentStep} userRole={user?.role} />
        <ProjectSelectionStep
          projects={availableProjects}
          onSelect={handleProjectSelect}
          onBack={() => {
            if (user?.role === "Subconsultant") router.push("/invoices");
            else goToDepartmentStep();
          }}
        />
      </div>
    );
  }

  // Main invoice form
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Invoices", href: "/invoices" },
          {
            label: isEditing
              ? `Invoice ${existingInvoice?.invoiceNumber || existingInvoice?.id?.slice(0, 8) || ""}`
              : "Create Invoice",
          },
        ]}
        className="mb-4"
      />

      {!isEditing && <WorkflowStepIndicator currentStep={currentStep} userRole={user?.role} />}

      <Header
        title={isEditing ? "Edit Invoice" : "Create Invoice"}
        subtitle={selectedProject?.projectName}
        status={
          existingInvoice
            ? (String(existingInvoice.status || "draft").toLowerCase() as
                | "draft"
                | "submitted"
                | "approved"
                | "rejected"
                | "resubmitted")
            : undefined
        }
        showBack={false}
        isLoadingTimesheet={isLoadingTimesheet}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Configure invoice settings and date ranges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingTimesheet && (
                <div className="animate-pulse space-y-2">
                  <div className="h-2 bg-muted rounded" />
                  <div className="h-2 bg-muted rounded w-5/6" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractNumber">Contract Number</Label>
                  <Input
                    id="contractNumber"
                    value={formData.contractNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contractNumber: e.target.value }))
                    }
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input
                    id="poNumber"
                    value={formData.poNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, poNumber: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pmisNumber">PMIS Number</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Project Management Information System number for tracking and reporting</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="pmisNumber"
                    value={formData.pmisNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pmisNumber: e.target.value }))
                    }
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="Auto-generated if left blank"
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                    }
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approvingSupervisor">Approving Supervisor</Label>
                  <Input
                    id="approvingSupervisor"
                    value={formData.approvingSupervisor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, approvingSupervisor: e.target.value }))
                    }
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="fromDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fromDate && "text-muted-foreground",
                          fieldErrors.fromDate && "border-destructive"
                        )}
                        disabled={isReadOnly}
                        aria-required="true"
                        aria-invalid={!!fieldErrors.fromDate}
                        aria-describedby={fieldErrors.fromDate ? "fromDate-error" : undefined}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fromDate && !isNaN(formData.fromDate.getTime())
                          ? format(formData.fromDate, "PPP")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          formData.fromDate && !isNaN(formData.fromDate.getTime())
                            ? formData.fromDate
                            : undefined
                        }
                        onSelect={(date) => {
                          if (!isReadOnly) {
                            const d = date && !isNaN(date.getTime()) ? date : undefined;
                            setFormData((prev) => ({ ...prev, fromDate: d }));
                            validateField("fromDate", d, formData);
                          }
                        }}
                        disabled={(date) => {
                          if (isReadOnly) return true;
                          if (!date) return true;
                          return date > new Date() || date < new Date("1900-01-01");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.fromDate && (
                    <p id="fromDate-error" className="text-sm text-destructive mt-1" role="alert">
                      {fieldErrors.fromDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="toDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.toDate && "text-muted-foreground",
                          fieldErrors.toDate && "border-destructive"
                        )}
                        disabled={isReadOnly}
                        aria-required="true"
                        aria-invalid={!!fieldErrors.toDate}
                        aria-describedby={fieldErrors.toDate ? "toDate-error" : undefined}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.toDate && !isNaN(formData.toDate.getTime())
                          ? format(formData.toDate, "PPP")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          formData.toDate && !isNaN(formData.toDate.getTime())
                            ? formData.toDate
                            : undefined
                        }
                        onSelect={(date) => {
                          if (!isReadOnly) {
                            const d = date && !isNaN(date.getTime()) ? date : undefined;
                            setFormData((prev) => ({ ...prev, toDate: d }));
                            validateField("toDate", d, formData);
                          }
                        }}
                        disabled={(date) => isReadOnly || !date || date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.toDate && (
                    <p id="toDate-error" className="text-sm text-destructive mt-1" role="alert">
                      {fieldErrors.toDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="dueDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.dueDate && "text-muted-foreground",
                          fieldErrors.dueDate && "border-destructive"
                        )}
                        disabled={isReadOnly}
                        aria-required="true"
                        aria-invalid={!!fieldErrors.dueDate}
                        aria-describedby={fieldErrors.dueDate ? "dueDate-error" : undefined}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dueDate && !isNaN(formData.dueDate.getTime())
                          ? format(formData.dueDate, "PPP")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          formData.dueDate && !isNaN(formData.dueDate.getTime())
                            ? formData.dueDate
                            : undefined
                        }
                        onSelect={(date) => {
                          if (!isReadOnly) {
                            const d = date && !isNaN(date.getTime()) ? date : undefined;
                            setFormData((prev) => ({ ...prev, dueDate: d }));
                            validateField("dueDate", d, formData);
                          }
                        }}
                        disabled={(date) => isReadOnly || !date || date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.dueDate && (
                    <p id="dueDate-error" className="text-sm text-destructive mt-1" role="alert">
                      {fieldErrors.dueDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="termOfWeek">Term of Week</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            The week ending date for this invoice period (e.g., &quot;Week ending
                            12/31/2023&quot;)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="termOfWeek"
                    placeholder="e.g., Week ending 12/31/2023"
                    value={formData.termOfWeek}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, termOfWeek: e.target.value }))
                    }
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              {timesheetData.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Timesheet entries found and auto-populated
                    </p>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Found {timesheetData.length} timesheet entries for the selected date range
                  </p>
                </div>
              )}

              {errors.autofill && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Autofill Error
                    </p>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errors.autofill}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Original submission snapshot for approved invoices */}
          {isAdminOrPrime &&
            invStatus === "approved" &&
            (existingInvoice as any)?.submittedSnapshot && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Original Submission (Read-only)</CardTitle>
                  <CardDescription>
                    This is the Subconsultant&apos;s submitted version. Editing below won&apos;t
                    change this snapshot.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Captured:{" "}
                    {(() => {
                      const raw = (existingInvoice as any)?.submittedSnapshot?.capturedAt;
                      const d = normalizeDateValue(raw);
                      return d ? d.toLocaleString() : "--";
                    })()}{" "}
                    by{" "}
                    {(existingInvoice as any)?.submittedSnapshot?.capturedByName || "Unknown"}
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Employee</th>
                          <th className="px-3 py-2 text-left font-medium">Company</th>
                          <th className="px-3 py-2 text-left font-medium">Service</th>
                          <th className="px-3 py-2 text-right font-medium">Hours</th>
                          <th className="px-3 py-2 text-right font-medium">Rate</th>
                          <th className="px-3 py-2 text-right font-medium">Amount</th>
                          <th className="px-3 py-2 text-left font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          ((existingInvoice as any)?.submittedSnapshot?.invoiceItems as any[]) ||
                          []
                        ).map((it, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">
                              {it.employeeName || it.employeeId || "--"}
                            </td>
                            <td className="px-3 py-2">{it.companyName || it.companyId || "--"}</td>
                            <td className="px-3 py-2">{it.serviceName || it.serviceId || "--"}</td>
                            <td className="px-3 py-2 text-right">{Number(it.hours || 0)}</td>
                            <td className="px-3 py-2 text-right">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(Number(it.billingRate || 0))}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(Number(it.amount || 0))}
                            </td>
                            <td className="px-3 py-2">{it.notes || ""}</td>
                          </tr>
                        ))}
                        {(
                          ((existingInvoice as any)?.submittedSnapshot?.invoiceItems as any[]) ||
                          []
                        ).length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-muted-foreground" colSpan={7}>
                              No submitted items
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Submitted Items Total</div>
                      <div className="font-semibold">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(
                          Number(
                            (existingInvoice as any)?.submittedSnapshot?.invoiceItemsTotal || 0
                          )
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Submitted Expenses Total</div>
                      <div className="font-semibold">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(
                          Number(
                            (existingInvoice as any)?.submittedSnapshot
                              ?.reimbursableExpensesTotal || 0
                          )
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Submitted Invoice Total</div>
                      <div className="font-semibold">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(
                          Number((existingInvoice as any)?.submittedSnapshot?.invoiceTotal || 0)
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          <InvoiceItemsTable
            items={formData.invoiceItems}
            employees={employeesForSelect}
            services={servicesForSelect}
            isReadOnly={isReadOnly}
            onAdd={addInvoiceItem}
            onRemove={removeInvoiceItem}
            onUpdate={updateInvoiceItem}
            error={errors.invoiceItems}
            timesheetCount={timesheetData.length}
            itemErrors={itemErrors}
          />

          <ReimbursableExpensesTable
            expenses={formData.reimbursableExpenses as any}
            companies={companiesForSelect}
            isReadOnly={isReadOnly}
            onAdd={addReimbursableExpense}
            onRemove={removeReimbursableExpense}
            onUpdate={updateReimbursableExpense}
          />

          <FileAttachments
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            existingFiles={existingUploadedFiles}
            newFiles={formData.attachedFiles}
            onUpload={handleFileUpload}
            onRemoveNew={removeFile}
            onOpenExisting={(file) => {
              const url = (file.fileUrl || "").replace(/[<>"']/g, "");
              if (url) window.open(url, "_blank");
            }}
          />
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <SummarySidebar
            invoiceItemsTotal={invoiceItemsTotal}
            reimbursableExpensesTotal={reimbursableExpensesTotal}
            invoiceTotal={invoiceTotal}
          />

          <WorkflowActions
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            isAdminOrPrime={isAdminOrPrime}
            canSubmit={canSubmit}
            canResubmit={canResubmit}
            canApprove={canApprove}
            canReject={canReject}
            canGeneratePdf={canGeneratePdf}
            canRestorePdf={canRestorePdf}
            invStatus={invStatus}
            actionLoading={workflow.actionLoading}
            existingInvoice={existingInvoice as any}
            onSaveChanges={handleSaveInvoiceChanges}
            onSubmitForReview={handleSubmitForReview}
            onApprove={workflow.handleApprove}
            onOpenReject={workflow.openRejectDialog}
            onGeneratePdf={workflow.handleGenerateApprovedPdf}
            onOpenRestore={workflow.openRestoreDialog}
            onCreateSubmitted={() => handleCreateInvoice("submitted")}
            onCreateDraft={() => handleCreateInvoice("draft")}
          />
        </div>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={workflow.rejectDialogOpen} onOpenChange={workflow.setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Invoice
            </AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejection. Author will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason</Label>
            <Textarea
              value={workflow.rejectReason}
              onChange={(e) => workflow.setRejectReason(e.target.value)}
              placeholder="Explain why this invoice is rejected"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={workflow.handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={workflow.actionLoading}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore PDF Version Dialog */}
      <Dialog open={workflow.restoreDialogOpen} onOpenChange={workflow.setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Restore PDF Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {Array.isArray(existingInvoice?.pdfVersions) &&
            (existingInvoice!.pdfVersions as any[]).length ? (
              <div className="space-y-2">
                {(existingInvoice!.pdfVersions as any[]).map((v: any) => (
                  <div key={v.version} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <div className="font-medium">
                        Version v{v.version}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({v.type || "generated"})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {v.createdAt?.seconds
                          ? new Date(v.createdAt.seconds * 1000).toLocaleString()
                          : typeof v.createdAt === "string"
                          ? new Date(v.createdAt).toLocaleString()
                          : ""}
                      </div>
                      <div className="text-xs truncate max-w-[320px]">{v.fileName}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => workflow.handleRestoreVersion(v.version)}
                      disabled={workflow.actionLoading}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No versions available.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you leave this page. Are you sure you
              want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUnsavedDialog(false);
                setPendingNavigation(null);
              }}
            >
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setHasUnsavedChanges(false);
                setShowUnsavedDialog(false);
                if (pendingNavigation) {
                  router.push(pendingNavigation);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
