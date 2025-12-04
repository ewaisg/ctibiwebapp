"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  UserRole,
} from "@/types";
import { DocumentReference, Timestamp } from "firebase/firestore";
import SummarySidebar from '@/components/invoicing/SummarySidebar';
import WorkflowActions from '@/components/invoicing/WorkflowActions';
import Header from '@/components/invoicing/Header';
import DepartmentSelectionStep from '@/components/invoicing/DepartmentSelectionStep';
import ProjectSelectionStep from '@/components/invoicing/ProjectSelectionStep';
import dynamic from 'next/dynamic';
const InvoiceItemsTable = dynamic(() => import('@/components/invoicing/InvoiceItemsTable'), { ssr: false });
const ReimbursableExpensesTable = dynamic(() => import('@/components/invoicing/ReimbursableExpensesTable'), { ssr: false });
const FileAttachments = dynamic(() => import('@/components/invoicing/FileAttachments'), { ssr: false });

// Constants for billable pay item codes - match actual timesheet data

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
    action?: 'autofill' | 'manual';
    projectId?: string;
    fromDate?: Date;
    toDate?: Date;
    departmentId?: string;
    showLoading?: boolean;
  };
}

// InvoiceItemForm is now imported from types

interface ReimbursableExpenseForm {
  amount: string;
  companyId: string; // String ID for form input, converted to DocumentReference when saving
  companyName?: string; // Optional denormalized for display fallback
  date: Date | null;
  description: string;
}

interface InvoiceFormData {
  departmentId: string;
  projectId: string;
  contractNumber: string;
  poNumber: string;
  pmisNumber: string;
  invoiceNumber: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
  dueDate: Date | undefined;
  termOfWeek: string;
  approvingSupervisor: string;
  invoiceItems: InvoiceItemForm[];
  reimbursableExpenses: ReimbursableExpenseForm[];
  attachedFiles: File[];
  notes: string;
}

interface ProjectFinancialSummary {
  originalPoAmount: number;
  changeOrderAmount: number;
  newPoAmount: number;
  previouslyInvoicedAmount: number;
  remainingPoAmount: number;
  budgetedHours: number;
  usedHours: number;
  remainingHours: number;
}

// NEW: Status colors mapping
const statusColors: Record<'draft'|'submitted'|'approved'|'rejected'|'resubmitted', string> = {
  draft: "bg-yellow-500 text-white",
  submitted: "bg-blue-500 text-white",
  approved: "bg-green-500 text-white",
  rejected: "bg-red-500 text-white",
  resubmitted: "bg-blue-500 text-white",
};

// Helper: determine access and actions by status + role + author
function getInvoiceAccess(user: User | null | undefined, invoice: any | undefined) {
  // New invoices: allow creation for the signed-in user
  if (!invoice) {
    const role = (user?.role ?? undefined) as UserRole | undefined;
    const isAdminOrPrime = role === 'Admin' || role === 'Prime';
    return {
      canView: !!user,
      isReadOnly: false,
      canSubmit: !!user,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor: !!user,
      isAdminOrPrime,
      status: 'draft',
    };
  }

  const role = (user?.role ?? undefined) as UserRole | undefined;
  const status = String(invoice?.status || 'draft').toLowerCase();
  const authorId = (typeof invoice?.userId === 'object' && (invoice?.userId as any)?.id) ? (invoice?.userId as any).id : invoice?.userId;
  const isAuthor = !!user && !!authorId && user.uid === authorId;
  const isAdminOrPrime = role === 'Admin' || role === 'Prime';

  // Draft: If author: editable, If not author: not viewable
  if (status === 'draft') {
    return {
      canView: isAuthor,
      isReadOnly: !isAuthor,
      canSubmit: isAuthor,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status
    };
  }

  // Submitted: Everyone read-only, Admin/Prime can Approve or Reject
  if (status === 'submitted') {
    return {
      canView: true,
      isReadOnly: true,
      canSubmit: false,
      canResubmit: false,
      canApprove: isAdminOrPrime,
      canReject: isAdminOrPrime,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status
    };
  }

  // Resubmitted: Everyone read-only, Admin/Prime can Approve or Reject
  if (status === 'resubmitted') {
    return {
      canView: true,
      isReadOnly: true,
      canSubmit: false,
      canResubmit: false,
      canApprove: isAdminOrPrime,
      canReject: isAdminOrPrime,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status
    };
  }

  // Rejected: If author: editable and can Resubmit, Others: read-only
  if (status === 'rejected') {
    return {
      canView: true,
      isReadOnly: !isAuthor,
      canSubmit: false,
      canResubmit: isAuthor,
      canApprove: false,
      canReject: false,
      canGeneratePdf: false,
      canRestorePdf: false,
      isAuthor,
      isAdminOrPrime,
      status
    };
  }

  // Approved: Everyone read-only, Admin/Prime can Generate/Refresh PDF and Restore PDF
  if (status === 'approved') {
    return {
      canView: true,
      isReadOnly: true,
      canSubmit: false,
      canResubmit: false,
      canApprove: false,
      canReject: false,
      canGeneratePdf: isAdminOrPrime,
      canRestorePdf: isAdminOrPrime && Array.isArray(invoice?.pdfVersions) && (invoice!.pdfVersions as any[]).length > 0,
      isAuthor,
      isAdminOrPrime,
      status
    };
  }

  // Default fallback - treat as draft if status is unknown
  return {
    canView: !invoice || isAuthor, // for new invoices or if author
    isReadOnly: !!invoice && !isAuthor,
    canSubmit: !invoice || (isAuthor && status === 'draft'),
    canResubmit: false,
    canApprove: false,
    canReject: false,
    canGeneratePdf: false,
    canRestorePdf: false,
    isAuthor,
    isAdminOrPrime,
    status
  };
}

export function InvoicingClientPage({ 
  projects, 
  departments, 
  employees, 
  companies,
  // users, // Currently unused
  services, 
  rates, 
  existingInvoice,
  isEditing,
  initialFormData 
}: InvoicingClientPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // State Management
  const [currentStep, setCurrentStep] = useState<'department' | 'project' | 'form'>('department');
  const [isLoadingTimesheet, setIsLoadingTimesheet] = useState(false);
  const [timesheetData, setTimesheetData] = useState<CtiTimesheet[]>([]);
  
  // Replace local form state with shared hook
  const { formData, setFormData, totals } = useInvoiceForm();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, Record<string, string>>>({});
  // NEW: workflow action state
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Use single-flight autofill controller instead of local refs
  const autofill = useAutofill();

  // New: Track previously uploaded files for existing invoices - MUST be before any conditional returns
  const [existingUploadedFiles, setExistingUploadedFiles] = useState<Array<{ fileName: string; fileUrl: string }>>([]);

  // Helpers for permissions on existing invoice
  const access = getInvoiceAccess(user, existingInvoice);
  // Remove previous local isAuthor/isAdminOrPrime/canSubmit/etc and use access
  const isAuthor = access.isAuthor;
  const isAdminOrPrime = access.isAdminOrPrime;
  const invStatus = access.status as 'draft'|'submitted'|'approved'|'rejected'|'resubmitted';
  const canSubmit = access.canSubmit;
  const canResubmit = access.canResubmit;
  const canApprove = access.canApprove;
  const canReject = access.canReject;
  const canGeneratePdf = access.canGeneratePdf;
  const canRestorePdf = access.canRestorePdf;
  const isReadOnly = access.isReadOnly;

  // NOTE: DO NOT RETURN EARLY HERE - ALL HOOKS MUST BE DECLARED BEFORE ANY RETURNS
  // Access check moved to end of component

  // Track unsaved changes - mark as unsaved when form data changes
  useEffect(() => {
    // Don't track changes during initial load or for read-only invoices
    if (isReadOnly || currentStep !== 'form') {
      setHasUnsavedChanges(false);
      return;
    }

    // Check if there are any meaningful changes
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
      e.returnValue = ''; // Chrome requires returnValue to be set
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle initial form data from dialog workflow
  useEffect(() => {
    if (initialFormData && !isEditing) {
      setFormData(prev => ({
        ...prev,
        departmentId: initialFormData.departmentId || "",
        projectId: initialFormData.projectId || "",
        fromDate: initialFormData.fromDate,
        toDate: initialFormData.toDate,
      }));

      // If we have project data from the dialog, skip selection steps and go to form
      if (initialFormData.projectId) {
        setCurrentStep('form');
      }

      // If this is an autofill action, trigger timesheet population
      if (initialFormData.action === 'autofill' && initialFormData.projectId && initialFormData.fromDate && initialFormData.toDate) {
        // Trigger timesheet autofill after form is set
        setTimeout(() => {
          populateFromTimesheet();
        }, 100);
      }

      // Signal that navigation is complete
      if (initialFormData.showLoading) {
        setTimeout(() => {
          localStorage.setItem('autofill-navigation-complete', 'true');
          window.dispatchEvent(new Event('storage'));
        }, 500);
      }
    }
  }, [initialFormData, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine initial step based on user role and editing mode
  useEffect(() => {
    // If editing existing invoice, go directly to form
    if (isEditing) {
      setCurrentStep('form');
      return;
    }
    
    // For new invoices without initial form data
    if (!initialFormData) {
      if (user?.role === 'Subconsultant') {
        setCurrentStep('project'); // Skip department selection
      } else {
        setCurrentStep('department'); // Admin/Prime start with department
      }
    }
  }, [user?.role, initialFormData, isEditing]);

  // Filter departments based on user role
  const availableDepartments = useMemo(() => {
    if (user?.role === 'Subconsultant') {
      return []; // Subconsultants don't select departments
    }
    return departments.filter(dept => !dept.isInactive);
  }, [departments, user?.role]);

  // Filter projects based on selected department and user role
  const availableProjects = useMemo(() => {
    let filteredProjects = projects;

    if (user?.role === 'Subconsultant') {
      const { id: userCompanyId } = resolveFlexibleReference(user?.companyId, {
        collection: 'companies',
        context: 'availableProjects:userCompany',
      });
      filteredProjects = projects.filter(project => {
        if (!userCompanyId) {
          logMissingReference('companies', undefined, 'availableProjects:userCompany');
          return false;
        }
        const assignedCompanies = project.assignedCompanies ?? [];
        return assignedCompanies.some(ac => {
          const { id: companyId } = resolveFlexibleReference(ac?.companyId, {
            collection: 'companies',
            context: `availableProjects:project:${project.id}:company`,
          });
          if (!companyId) {
            logMissingReference('companies', undefined, `availableProjects:project:${project.id}:company`);
            return false;
          }
          return companyId === userCompanyId;
        });
      });
    }

    if (formData.departmentId && user?.role && user.role !== 'Subconsultant') {
      filteredProjects = filteredProjects.filter(project => {
        const { id: projectDeptId } = resolveFlexibleReference(project.departmentId, {
          collection: 'departments',
          context: `availableProjects:project:${project.id}:department`,
        });
        if (!projectDeptId) {
          logMissingReference('departments', undefined, `availableProjects:project:${project.id}:department`);
          return false;
        }
        return projectDeptId === formData.departmentId;
      });
    }

    return filteredProjects.filter(project => !project.isInactive);
  }, [projects, formData.departmentId, user]);

  const selectedProject = useMemo(() => {
    return availableProjects.find(project => project.id === formData.projectId);
  }, [availableProjects, formData.projectId]);

  // Derive project financials via hook
  const projectFinancials = useProjectFinancials(selectedProject);

  const employeeMap = useMemo(() => buildReferenceMap(employees, employee => employee.id), [employees]);
  const companyMap = useMemo(() => buildReferenceMap(companies, company => company.id), [companies]);
  const serviceMap = useMemo(() => buildReferenceMap(services, service => service.id), [services]);

  const availableEmployees = useMemo(() => {
    if (!selectedProject || !user) return [];

    if (user.role === 'Subconsultant') {
      const { id: userCompanyId } = resolveFlexibleReference(user.companyId, {
        collection: 'companies',
        context: 'availableEmployees:userCompany',
        warn: false,
      });
      if (!userCompanyId) {
        logMissingReference('companies', undefined, 'availableEmployees:userCompany');
        return [];
      }
      return employees.filter(emp => {
        const { id: empCompanyId } = resolveFlexibleReference(emp.companyId, {
          collection: 'companies',
          context: `availableEmployees:employee:${emp.id}:company`,
          warn: false,
        });
        if (!empCompanyId) {
          logMissingReference('companies', undefined, `availableEmployees:employee:${emp.id}:company`);
          return false;
        }
        return empCompanyId === userCompanyId && emp.employmentStatus === 'Active';
      });
    }

    const projectEmployees: Employee[] = [];
    const seen = new Set<string>();
    const assignedCompanies = selectedProject.assignedCompanies ?? [];

    assignedCompanies.forEach(ac => {
      const assignedEmployees = ac?.assignedEmployees ?? [];
      assignedEmployees.forEach(ae => {
        const { id: empId } = resolveFlexibleReference(ae?.employeeId, {
          collection: 'employees',
          context: `availableEmployees:project:${selectedProject.id}:assignment`,
          warn: false,
        });
        if (!empId) {
          logMissingReference('employees', undefined, `availableEmployees:project:${selectedProject.id}:assignment`);
          return;
        }
        if (seen.has(empId)) {
          return;
        }
        const employee = employeeMap.get(empId);
        if (!employee) {
          logMissingReference('employees', empId, `availableEmployees:project:${selectedProject.id}:assignment`);
          return;
        }
        if (employee.employmentStatus === 'Active') {
          projectEmployees.push(employee);
          seen.add(empId);
        }
      });
    });

    return projectEmployees;
  }, [selectedProject, user, employees, employeeMap]);
  
  // Include any employees referenced in current form items even if filtered out
  const employeesForSelect = useMemo(() => {
    const base = [...availableEmployees];
    const existingIds = new Set(base.map(e => e.id));
    const neededIds = new Set(
      formData.invoiceItems
        .map(item => resolveFlexibleReference(item.employeeId, {
          collection: 'employees',
          context: 'employeesForSelect:invoiceItem',
          warn: false,
        }).id)
        .filter((id): id is string => Boolean(id))
    );

    neededIds.forEach(id => {
      if (existingIds.has(id)) {
        return;
      }
      const found = employeeMap.get(id);
      if (found) {
        base.push(found);
        existingIds.add(id);
        return;
      }

      const fromForm = formData.invoiceItems.find(item => {
        const { id: refId } = resolveFlexibleReference(item.employeeId, {
          collection: 'employees',
          context: 'employeesForSelect:formFallback',
          warn: false,
        });
        return refId === id;
      });

      if (!fromForm) {
        logMissingReference('employees', id, 'employeesForSelect:formFallback');
      }

      const label = (fromForm?.employeeName || '').trim() || `Unknown Employee (${id})`;
      const { id: placeholderCompanyId } = resolveFlexibleReference(fromForm?.companyId, {
        collection: 'companies',
        context: `employeesForSelect:placeholder:${id}`,
        warn: false,
      });

      if (!placeholderCompanyId) {
        logMissingReference('companies', undefined, `employeesForSelect:placeholder:${id}`);
      }

      base.push({
        id,
        formalName: label,
        employeeFirstName: '',
        employeeLastName: '',
        employmentStatus: 'Inactive',
        companyId: placeholderCompanyId ?? '',
      } as unknown as Employee);
      existingIds.add(id);
    });

    const dedup = new Map(base.map(e => [e.id, e]));
    return Array.from(dedup.values());
  }, [availableEmployees, formData.invoiceItems, employeeMap]);
  
  // Get available services for the selected project and user's company
  const availableServices = useMemo(() => {
    if (!selectedProject || !user) return [];

    const projectServices: Service[] = [];
    const userCompanyId = typeof user.companyId === 'object' && 'id' in user.companyId ? (user.companyId as DocumentReference).id : user.companyId;
    
    selectedProject.assignedCompanies?.forEach(ac => {
      const companyId = typeof ac.companyId === 'object' && 'id' in ac.companyId ? (ac.companyId as DocumentReference).id : ac.companyId;
      
      // For subconsultants, only show services for their company
      if (user.role === 'Subconsultant' && companyId !== userCompanyId) {
        return;
      }

      ac.assignedServices?.forEach(as => {
        const serviceId = typeof as.serviceId === 'object' && 'id' in as.serviceId ? (as.serviceId as DocumentReference).id : as.serviceId;
        const service = services.find(s => s.id === serviceId);
        if (!service) {
          logMissingReference('services', serviceId, `availableServices:project:${selectedProject.id}`);
        }
        if (service) {
          projectServices.push(service);
        }
      });
    });

    return projectServices;
  }, [selectedProject, services, user]);
  
  // Include any services referenced in current form items even if filtered out
  const servicesForSelect = useMemo(() => {
    const base = [...availableServices];
    const existingIds = new Set(base.map(s => s.id));
    const neededIds = new Set(
      formData.invoiceItems
        .map(i => String(i.serviceId || '').trim())
        .filter(Boolean)
    );
    neededIds.forEach(id => {
      if (!existingIds.has(id)) {
        const found = services.find(s => s.id === id);
        if (found) base.push(found);
        else {
          // Prefer denormalized serviceName from form data if available
          const fromItem = formData.invoiceItems.find(i => String(i.serviceId || '') === id);
          const label = (fromItem?.serviceName || '').trim() || `Unknown Service (${id})`;
          base.push({ id, serviceName: label } as unknown as Service);
        }
      }
    });
    const dedup = new Map(base.map(s => [s.id, s]));
    return Array.from(dedup.values());
  }, [availableServices, formData.invoiceItems, services]);
  
  // Companies for reimbursable expenses: include any referenced company IDs
  const companiesForSelect = useMemo(() => {
    const base = [...companies];
    const existingIds = new Set(base.map(c => c.id));
    const neededIds = new Set([
      ...formData.reimbursableExpenses.map(e => String(e.companyId || '').trim()).filter(Boolean),
      ...formData.invoiceItems.map(i => String(i.companyId || '').trim()).filter(Boolean),
    ]);
    neededIds.forEach(id => {
      if (!existingIds.has(id)) {
        const found = companies.find(c => c.id === id);
        if (found) base.push(found);
        else {
          // Prefer denormalized names from form data if available
          const fromItem = formData.invoiceItems.find(i => String(i.companyId || '') === id);
          const fromExpense = formData.reimbursableExpenses.find(e => String(e.companyId || '') === id);
          const label = (fromItem?.companyName || fromExpense?.companyName || '').trim() || `Unknown Company (${id})`;
          base.push({ id, companyName: label } as unknown as Company);
        }
      }
    });
    const dedup = new Map(base.map(c => [c.id, c]));
    return Array.from(dedup.values());
  }, [companies, formData.reimbursableExpenses, formData.invoiceItems]);

  // Fetch timesheet data for the selected project and date range

  // Auto-populate invoice items from timesheet data using server action
  const populateFromTimesheet = useCallback(async () => {
    if (!formData.projectId || !formData.fromDate || !formData.toDate) return;

    const key = `${formData.projectId}|${(formData.fromDate as Date).toISOString()}|${(formData.toDate as Date).toISOString()}`;

    await autofill.run(key, async () => {
      setIsLoadingTimesheet(true);
      try {
        const { autofillFromTimesheets } = await import('./actions');
        const result = await autofillFromTimesheets({
          projectId: formData.projectId,
          fromDate: (formData.fromDate as Date).toISOString(),
          toDate: (formData.toDate as Date).toISOString(),
        });

        if (result.success && result.items.length > 0) {
          const transformedItems: InvoiceItemForm[] = result.items
            .filter((item: unknown) => {
              if (!item || typeof item !== 'object') return false;
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
                employeeId: typedItem.employeeId || '',
                companyId: typedItem.companyId || '',
                serviceId: typedItem.serviceId || '',
                hours: Number(typedItem.hours) || 0,
                billingRate: Number(typedItem.billingRate) || 0,
                markdown: Number(typedItem.markdown) || 0,
                amount: Number(typedItem.amount) || 0,
                notes: typedItem.notes || '',
                entriesCount: employeeTimesheetEntries,
              } as InvoiceItemForm & { entriesCount: number };
            });

          if (transformedItems.length === 0) {
            console.warn('No valid invoice items could be created from timesheet data');
          } else {
            setFormData(prev => ({
              ...prev,
              invoiceItems: transformedItems,
              ...(result.projectData && {
                approvingSupervisor: result.projectData.approvingSupervisor || prev.approvingSupervisor,
                contractNumber: result.projectData.contractNumber || prev.contractNumber,
                poNumber: result.projectData.poNumber || prev.poNumber,
                pmisNumber: result.projectData.pmisNumber || prev.pmisNumber,
              })
            }));
          }

          if (result.dueDate) {
            const dueDate = new Date(result.dueDate);
            setFormData(prev => ({ ...prev, dueDate }));
          }
          if (result.termOfWeek) {
            setFormData(prev => ({ ...prev, termOfWeek: result.termOfWeek }));
          }

          const validItems = result.items.filter(item => {
            if (!item || typeof item !== 'object') return false;
            const typedItem = item as Record<string, unknown>;
            return typedItem.employeeId && typedItem.employeeName && typedItem.hours;
          }) as Array<{ employeeId: string; employeeName: string; serviceName: string; hours: number; }>;

          setTimesheetData(validItems.map(item => {
            const employeeIdNum = parseInt(item.employeeId, 10);
            const nameParts = (item.employeeName || '').split(' ');
            return {
              id: `generated-${item.employeeId}`,
              employeeId: isNaN(employeeIdNum) ? 0 : employeeIdNum,
              employeeNumber: '',
              employeeFirstName: nameParts[0] || '',
              employeeLastName: nameParts.slice(1).join(' ') || '',
              timecardDate: formData.fromDate ? Timestamp.fromDate(formData.fromDate) : Timestamp.now(),
              totalHoursActual: Number(item.hours) || 0,
              labors: [],
              payItems: [{
                payItemCode: 'HRLY',
                payItemHours: Number(item.hours) || 0,
                payItemName: item.serviceName || 'General Labor'
              }]
            };
          }));
        } else {
          console.info('No timesheet data found for autofill:', { 
            success: result.success, 
            itemCount: result.items?.length || 0,
            error: result.error 
          });
        }
      } catch (error) {
        console.error('Error during autofill:', error);
        setErrors(prev => ({
          ...prev,
          autofill: 'Failed to load timesheet data. Please try again or add items manually.'
        }));
      } finally {
        setIsLoadingTimesheet(false);
      }
    });
  }, [formData.projectId, formData.fromDate, formData.toDate, setFormData, autofill]);

  // Auto-populate project details when project is selected
  useEffect(() => {
    if (selectedProject) {
      const contractNumber = selectedProject.contractNumber != null
        ? String(selectedProject.contractNumber)
        : '';
      setFormData(prev => ({
        ...prev,
        contractNumber,
        poNumber: selectedProject.poNumber || "",
        pmisNumber: selectedProject.pmisNumber || "",
        approvingSupervisor: selectedProject.approvingSupervisor || "",
      }));

      // Auto-set date ranges to current week if not editing
      if (!isEditing && !formData.fromDate && !formData.toDate) {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
        setFormData(prev => ({
          ...prev,
          fromDate: weekStart,
          toDate: weekEnd,
          dueDate: addDays(weekEnd, 30),
          termOfWeek: `Week ending ${format(weekEnd, 'MM/dd/yyyy')}`
        }));
      }
    }
  }, [selectedProject, isEditing, formData.fromDate, formData.toDate, setFormData]);

  // NEW: Trigger autofill when entering form step with valid project/dates (UI workflow)
  useEffect(() => {
    if (currentStep === 'form' &&
        !isEditing &&
        formData.projectId &&
        formData.fromDate &&
        formData.toDate &&
        formData.invoiceItems.length === 0) {  // Only if not already populated

      // Small delay to ensure dates are fully set
      const timer = setTimeout(() => {
        populateFromTimesheet();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentStep, formData.projectId, formData.fromDate, formData.toDate, isEditing, formData.invoiceItems.length, populateFromTimesheet]);

  // Calculate totals via hook
  const invoiceItemsTotal = totals.itemsTotal;
  const reimbursableExpensesTotal = totals.expensesTotal;
  const invoiceTotal = totals.grandTotal;

  // Load existing invoice data to
  useEffect(() => {
    if (existingInvoice && isEditing) {
      const projectId = typeof existingInvoice.projectId === 'object' && 'id' in existingInvoice.projectId 
        ? (existingInvoice.projectId as any).id 
        : (existingInvoice as any).projectId;

      const project = projects.find(p => p.id === projectId);
      const departmentId = project && typeof project.departmentId === 'object' && 'id' in project.departmentId
        ? (project.departmentId as any).id
        : (project as any)?.departmentId;

      setFormData({
        departmentId: typeof departmentId === 'string' ? departmentId : "",
        projectId: typeof projectId === 'string' ? projectId : "",
        contractNumber: existingInvoice.contractNumber?.toString() || "",
        poNumber: existingInvoice.poNumber || "",
        pmisNumber: existingInvoice.pmisNumber || "",
        invoiceNumber: existingInvoice.invoiceNumber || "",
        fromDate: normalizeDateValue((existingInvoice as any).fromDate),
        toDate: normalizeDateValue((existingInvoice as any).toDate),
        dueDate: normalizeDateValue((existingInvoice as any).dueDate),
        termOfWeek: existingInvoice.termOfWeek || "",
        approvingSupervisor: existingInvoice.approvingSupervisor || "",
        invoiceItems: existingInvoice.invoiceItems?.map((ii, index) => {
          // Helper to normalize diverse date shapes (Date, Firestore Timestamp, seconds objects, ISO/string)
function normalizeDate(raw: any): Date | undefined {
  if (!raw) return undefined;
  try {
    if (raw instanceof Date) return isNaN(raw.getTime()) ? undefined : raw;
    if (typeof raw?.toDate === 'function') {
      const d = raw.toDate();
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof raw === 'object') {
      const seconds = typeof (raw as any).seconds === 'number' ? (raw as any).seconds : (typeof (raw as any)._seconds === 'number' ? (raw as any)._seconds : undefined);
      if (typeof seconds === 'number') {
        const d = new Date(seconds * 1000);
        return isNaN(d.getTime()) ? undefined : d;
      }
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
      const d = new Date(raw as any);
      return isNaN(d.getTime()) ? undefined : d;
    }
  } catch {}
  return undefined;
}

          const contextBase = `existingInvoice:item:${index}`;

          const companyNameRaw = String((ii as any).companyName ?? '').trim();
          let companyId = normalizeReferenceId((ii as any).companyId ?? ii.companyId, 'companies', `${contextBase}:company`, false);
          if (!companyId && companyNameRaw) {
            const matchByName = companies.find(c => (c.companyName || '').trim().toLowerCase() === companyNameRaw.toLowerCase());
            if (matchByName) {
              companyId = matchByName.id;
            }
          }
          const company = companyId ? companyMap.get(companyId) : undefined;

          const employeeNameRaw = String((ii as any).employeeName ?? '').trim();
          let employeeId = normalizeReferenceId((ii as any).employeeId ?? ii.employeeId, 'employees', `${contextBase}:employee`, false);
          if (!employeeId && employeeNameRaw) {
            const matchByName = employees.find(e => (e.formalName || '').trim().toLowerCase() === employeeNameRaw.toLowerCase());
            if (matchByName) {
              employeeId = matchByName.id;
            }
          }
          const employee = employeeId ? employeeMap.get(employeeId) : undefined;

          const serviceNameRaw = String((ii as any).serviceName ?? '').trim();
          let serviceId = normalizeReferenceId((ii as any).serviceId ?? ii.serviceId, 'services', `${contextBase}:service`, false);
          if (!serviceId && serviceNameRaw) {
            let matchByName = services.find(s => (s.serviceName || '').trim().toLowerCase() === serviceNameRaw.toLowerCase());
            if (!matchByName && selectedProject) {
              const assignedServiceIds = (selectedProject.assignedCompanies || [])
                .flatMap(ac => (ac.assignedServices || [])
                  .map(as => normalizeReferenceId(as?.serviceId, 'services', `${contextBase}:serviceAssignment`, false))
                )
                .filter(Boolean) as string[];
              matchByName = services.find(s => assignedServiceIds.includes(s.id) && (s.serviceName || '').trim().toLowerCase() === serviceNameRaw.toLowerCase());
            }
            if (matchByName) {
              serviceId = matchByName.id;
            }
          }
          const service = serviceId ? serviceMap.get(serviceId) : undefined;

          return {
            ...ii,
            companyId,
            companyName: companyNameRaw || company?.companyName || 'Unknown Company',
            employeeId,
            employeeName: employeeNameRaw || employee?.formalName || 'Unknown Employee',
            serviceId,
            serviceName: serviceNameRaw || service?.serviceName || undefined,
          } as unknown as InvoiceItemForm;
        }) || [],
        reimbursableExpenses: existingInvoice.reimbursableExpenses?.map(re => {
          // Resolve companyId with fallback to denormalized companyName
          const rawCompanyId = (typeof re.companyId === 'object' && 'id' in (re.companyId as any))
            ? (re.companyId as DocumentReference).id
            : (re as any).companyId as string | undefined;
          let companyId = String(rawCompanyId ?? '').trim();
          let companyName = (re as any).companyName || '';
          if (!companyId || companyId === 'undefined' || companyId === 'null') {
            const byName = companies.find(c => c.companyName?.toLowerCase() === String(companyName || '').toLowerCase());
            companyId = byName?.id || '';
            if (!companyName && byName) companyName = byName.companyName;
          }
          if (!companyName) {
            const c = companies.find(c => c.id === companyId);
            companyName = c?.companyName || 'Unknown Company';
          }

          // Robust date conversion: use normalizeDateValue to support Date, Timestamp, seconds/_seconds, ISO
          const rawDate = (re as any).date;
          const date = normalizeDateValue(rawDate) ?? null;

          return {
            ...re,
            amount: String((re as any).amount ?? ''),
            companyId,
            companyName,
            date,
            description: (re as any).description || '',
          } as ReimbursableExpenseForm;
        }) || [],
        attachedFiles: [], // Files would need to be loaded separately
        notes: "",
      });

      // NEW: preload previously uploaded files to display in attachments section
      const uploaded = Array.isArray((existingInvoice as any).uploadedFiles)
        ? ((existingInvoice as any).uploadedFiles as Array<{ fileName: string; fileUrl: string }>)
        : [];
      setExistingUploadedFiles(uploaded.filter(f => f && f.fileName && f.fileUrl));

      setCurrentStep('form');
    }
  }, [existingInvoice, isEditing, projects]);

  const handleDepartmentSelect = (departmentId: string) => {
    setFormData(prev => ({ ...prev, departmentId, projectId: "" }));
    setCurrentStep('project');
  };

  const handleProjectSelect = (projectId: string) => {
    setFormData(prev => ({ ...prev, projectId }));
    setCurrentStep('form');
  };

  const addInvoiceItem = useCallback(() => {
    if (!user) return;
    const userCompanyId = typeof user.companyId === 'object' && 'id' in user.companyId ? (user.companyId as DocumentReference).id : String(user.companyId);
    const userCompany = companiesForSelect.find(c => c.id === userCompanyId);
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

    setFormData(prev => ({
      ...prev,
      invoiceItems: [...prev.invoiceItems, newItem],
    }));
  }, [user, companiesForSelect]);

  const removeInvoiceItem = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.filter((_, i) => i !== index),
    }));
  }, []);

  const validateInvoiceItem = useCallback((index: number, field: keyof InvoiceItemForm, value: string | number, currentItem: InvoiceItemForm) => {
    const newItemErrors = { ...itemErrors };
    if (!newItemErrors[index]) {
      newItemErrors[index] = {};
    }

    switch (field) {
      case 'employeeId':
        if (!value || String(value).trim() === '') {
          newItemErrors[index].employeeId = "Employee required";
        } else {
          delete newItemErrors[index].employeeId;
        }
        break;

      case 'serviceId':
        if (!value || String(value).trim() === '') {
          newItemErrors[index].serviceId = "Service required";
        } else {
          delete newItemErrors[index].serviceId;
        }
        break;

      case 'hours':
        if (!value || Number(value) <= 0) {
          newItemErrors[index].hours = "Hours must be > 0";
        } else {
          delete newItemErrors[index].hours;
        }
        break;

      case 'billingRate':
        if (!value || Number(value) <= 0) {
          newItemErrors[index].billingRate = "Rate must be > 0";
        } else {
          delete newItemErrors[index].billingRate;
        }
        break;

      default:
        break;
    }

    // Clean up empty error objects
    if (Object.keys(newItemErrors[index]).length === 0) {
      delete newItemErrors[index];
    }

    setItemErrors(newItemErrors);
  }, [itemErrors]);

  const updateInvoiceItem = useCallback((index: number, field: keyof InvoiceItemForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.map((item, i) => {
        if (i === index) {
          const updatedItem: InvoiceItemForm = { ...item, [field]: value } as InvoiceItemForm;

          // Validate the field
          validateInvoiceItem(index, field, value, updatedItem);

          // Auto-populate billing rate when employee or service changes
          if (field === 'employeeId' || field === 'serviceId') {
            const selectedEmployeeId = String(field === 'employeeId' ? value : item.employeeId || '');
            const selectedServiceId = String(field === 'serviceId' ? value : item.serviceId || '');

            const employee = availableEmployees.find(emp => emp.id === selectedEmployeeId);
            const service = availableServices.find(svc => svc.id === selectedServiceId);

            if (employee) {
              const empCompanyId = typeof employee.companyId === 'object' && 'id' in employee.companyId
                ? (employee.companyId as DocumentReference).id
                : employee.companyId;
              updatedItem.companyId = empCompanyId as unknown as string;
              updatedItem.employeeName = employee.formalName || '';
              const company = companies.find(c => c.id === String(empCompanyId));
              if (company) updatedItem.companyName = company.companyName || '';
            }
            
            if (service) {
              updatedItem.serviceName = service.serviceName || '';
            }

            if (employee && service && selectedProject) {
              const empCompanyId = typeof employee.companyId === 'object' && 'id' in employee.companyId
                ? (employee.companyId as DocumentReference).id
                : employee.companyId;

              const assignedCompany = selectedProject.assignedCompanies?.find(ac => {
                const acCompanyId = typeof ac.companyId === 'object' && 'id' in ac.companyId
                  ? (ac.companyId as DocumentReference).id
                  : ac.companyId;
                return acCompanyId === empCompanyId;
              });

              let resolvedRate: number | undefined;

              const assignedService = assignedCompany?.assignedServices?.find(as => {
                const asServiceId = typeof as.serviceId === 'object' && 'id' in as.serviceId
                  ? (as.serviceId as DocumentReference).id
                  : as.serviceId;
                return asServiceId === service.id;
              });

              if (assignedService && typeof assignedService.billingRate === 'number') {
                resolvedRate = assignedService.billingRate;
              }

              if (resolvedRate === undefined) {
                const fallbackRate = rates.find(r => {
                  const rateCompanyId = typeof r.companyId === 'object' && 'id' in r.companyId
                    ? (r.companyId as DocumentReference).id
                    : r.companyId;
                  const rateServiceId = typeof r.serviceId === 'object' && 'id' in r.serviceId
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

          if (field === 'hours' || field === 'billingRate' || field === 'markdown') {
            const hours = Number(field === 'hours' ? value : item.hours);
            const rate = Number(field === 'billingRate' ? value : updatedItem.billingRate);
            const markdown = Number(field === 'markdown' ? value : item.markdown);
            const adjustedRate = rate * (1 + markdown / 100);
            updatedItem.amount = hours * adjustedRate;
          }

          return updatedItem;
        }
        return item;
      }),
    }));
  }, [availableEmployees, availableServices, selectedProject, rates, companies]);

  const addReimbursableExpense = useCallback(() => {
    if (!user) return;
    const userCompanyId = typeof user.companyId === 'object' && 'id' in user.companyId ? (user.companyId as DocumentReference).id : String(user.companyId);
    const userCompany = companiesForSelect.find(c => c.id === userCompanyId);
    const newExpense: ReimbursableExpenseForm = {
      amount: "",
      companyId: userCompanyId,
      companyName: userCompany?.companyName || '',
      date: new Date(),
      description: "",
    };

    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: [...prev.reimbursableExpenses, newExpense],
    }));
  }, [user, companiesForSelect]);

  const removeReimbursableExpense = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: prev.reimbursableExpenses.filter((_, i) => i !== index),
    }));
  }, []);

  const updateReimbursableExpense = useCallback((index: number, field: keyof ReimbursableExpenseForm, value: string | number | Date | null | undefined) => {
    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: prev.reimbursableExpenses.map((expense, i) => {
        if (i !== index) return expense;
        const updated = { ...expense, [field]: value } as ReimbursableExpenseForm;
        if (field === 'companyId') {
          const comp = companiesForSelect.find(c => c.id === String(value || ''));
          updated.companyName = comp?.companyName || '';
        } else if (field === 'date') {
          let nextDate: Date | null = null;
          if (value instanceof Date) {
            nextDate = isNaN(value.getTime()) ? null : value;
          } else if (typeof value === 'string' || typeof value === 'number') {
            const d = new Date(value as any);
            nextDate = isNaN(d.getTime()) ? null : d;
          } else if (value && typeof (value as any).toDate === 'function') {
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
  }, [companiesForSelect]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setFormData(prev => ({
        ...prev,
        attachedFiles: [...prev.attachedFiles, ...Array.from(files)]
      }));
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter((_, i) => i !== index)
    }));
  }, []);

  // Inline validation helpers
  const validateField = useCallback((fieldName: string, value: any) => {
    const newFieldErrors = { ...fieldErrors };

    switch (fieldName) {
      case 'fromDate':
        if (!value) {
          newFieldErrors.fromDate = "From date is required";
        } else if (formData.toDate && value > formData.toDate) {
          newFieldErrors.fromDate = "From date must be before To date";
        } else {
          delete newFieldErrors.fromDate;
        }
        break;

      case 'toDate':
        if (!value) {
          newFieldErrors.toDate = "To date is required";
        } else if (formData.fromDate && value < formData.fromDate) {
          newFieldErrors.toDate = "To date must be after From date";
        } else {
          delete newFieldErrors.toDate;
          // Clear fromDate error if it was about date range
          if (fieldErrors.fromDate?.includes("before To date")) {
            delete newFieldErrors.fromDate;
          }
        }
        break;

      case 'dueDate':
        if (!value) {
          newFieldErrors.dueDate = "Due date is required";
        } else if (formData.toDate && value < formData.toDate) {
          newFieldErrors.dueDate = "Due date should be after To date";
        } else {
          delete newFieldErrors.dueDate;
        }
        break;

      case 'invoiceNumber':
        // Optional field, but if provided should not be empty string
        if (value && String(value).trim() === '') {
          newFieldErrors.invoiceNumber = "Invoice number cannot be empty";
        } else {
          delete newFieldErrors.invoiceNumber;
        }
        break;

      default:
        break;
    }

    setFieldErrors(newFieldErrors);
    return Object.keys(newFieldErrors).length === 0;
  }, [fieldErrors, formData.fromDate, formData.toDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newItemErrors: Record<number, Record<string, string>> = {};

    if (!formData.projectId) newErrors.projectId = "Project is required";
    if (!formData.fromDate) newErrors.fromDate = "From date is required";
    if (!formData.toDate) newErrors.toDate = "To date is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";
    if (formData.invoiceItems.length === 0) newErrors.invoiceItems = "At least one invoice item is required";

    // Validate date ranges
    if (formData.fromDate && formData.toDate && formData.fromDate > formData.toDate) {
      newErrors.fromDate = "From date must be before To date";
    }
    if (formData.toDate && formData.dueDate && formData.dueDate < formData.toDate) {
      newErrors.dueDate = "Due date should be after To date";
    }

    // Validate each invoice item
    formData.invoiceItems.forEach((item, index) => {
      const rowErrors: Record<string, string> = {};

      if (!item.employeeId || String(item.employeeId).trim() === '') {
        rowErrors.employeeId = "Employee required";
      }
      if (!item.serviceId || String(item.serviceId).trim() === '') {
        rowErrors.serviceId = "Service required";
      }
      if (!item.hours || Number(item.hours) <= 0) {
        rowErrors.hours = "Hours must be > 0";
      }
      if (!item.billingRate || Number(item.billingRate) <= 0) {
        rowErrors.billingRate = "Rate must be > 0";
      }

      if (Object.keys(rowErrors).length > 0) {
        newItemErrors[index] = rowErrors;
      }
    });

    setErrors(newErrors);
    setFieldErrors(newErrors);
    setItemErrors(newItemErrors);

    return Object.keys(newErrors).length === 0 && Object.keys(newItemErrors).length === 0;
  };

  const prepareInvoicePayload = async () => {
    if (!user) throw new Error('User must be authenticated');

    // Build attachments in a simple loop to avoid complex nested parentheses
    const attachments: Array<{ fileName: string; fileData: string; fileType: string }> = [];
    for (const file of formData.attachedFiles) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      attachments.push({ fileName: file.name, fileData: base64, fileType: file.type });
    }

    return {
      projectId: formData.projectId,
      contractNumber: formData.contractNumber,
      poNumber: formData.poNumber,
      pmisNumber: formData.pmisNumber,
      invoiceNumber: formData.invoiceNumber,
      fromDate: formData.fromDate!.toISOString(),
      toDate: formData.toDate!.toISOString(),
      dueDate: formData.dueDate!.toISOString(),
      termOfWeek: formData.termOfWeek,
      approvingSupervisor: formData.approvingSupervisor,
      invoiceItems: formData.invoiceItems.map((item) => ({
        employeeId: typeof item.employeeId === 'string' ? item.employeeId : String(item.employeeId),
        companyId: typeof item.companyId === 'string' ? item.companyId : String(item.companyId),
        serviceId: typeof item.serviceId === 'string' ? item.serviceId : String(item.serviceId),
        hours: item.hours,
        billingRate: item.billingRate,
        markdown: item.markdown,
        amount: item.amount,
        notes: item.notes,
      })),
      reimbursableExpenses: formData.reimbursableExpenses.map((expense) => ({
        amount: parseFloat(expense.amount) || 0,
        companyId: String(expense.companyId || ''),
        date: expense.date?.toISOString() || new Date().toISOString(),
        description: expense.description,
      })),
      attachedFiles: attachments.length > 0 ? attachments : undefined,
      // Preserve autofillSource when editing existing invoice, otherwise set based on initialFormData
      autofillSource: isEditing && existingInvoice?.autofillSource
        ? existingInvoice.autofillSource
        : (initialFormData?.action === 'autofill' ? 'timesheet' : 'manual'),
      notes: formData.notes,
      userId: user.uid,
      userRole: user.role,
    };
  };

  const handleCreateInvoice = async (status: 'draft' | 'submitted' = 'submitted') => {
    if (!validateForm() || !user) return;

    // use actionLoading for create flow as well
    setActionLoading(true);
    try {
      const { createInvoice } = await import('./actions');
      const payload = await prepareInvoicePayload();

      // Auto-approve for Admin/Prime users
      const finalStatus = (user.role === 'Admin' || user.role === 'Prime') && status === 'submitted'
        ? 'approved'
        : status;

      const result = await createInvoice({ ...payload, status: finalStatus as 'draft' | 'submitted' | 'approved' });
      if (result?.success) {
        setHasUnsavedChanges(false); // Clear unsaved changes flag
        const statusMessage = finalStatus === 'approved'
          ? 'created and approved automatically'
          : status === 'draft' ? 'saved as draft' : 'created';
        console.log(`Invoice ${statusMessage} successfully:`, result);
        toast({ title: `Invoice ${statusMessage}`, description: `Invoice has been ${statusMessage} successfully.` });
        router.push('/invoices');
      } else {
        console.error('Failed to create invoice:', result?.error);
        setErrors({ general: result?.error || 'Failed to create invoice' });
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveInvoiceChanges = async () => {
  if (!user || !existingInvoice?.id || isReadOnly) return;
  if (!validateForm()) return;

    setActionLoading(true);
    try {
      const { updateInvoiceDetails } = await import('./actions');
      const payload = await prepareInvoicePayload();
      const res = await updateInvoiceDetails(existingInvoice.id, payload);
      if (res?.success) {
        setHasUnsavedChanges(false); // Clear unsaved changes flag
        toast({ title: 'Invoice saved', description: 'Changes have been saved.' });
        setFormData(prev => ({ ...prev, attachedFiles: [] }));
        router.refresh();
      } else {
        toast({ title: 'Save failed', description: res?.error || 'Unable to save invoice changes.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for workflow actions (detail page)
  const handleSubmitForReview = async () => {
    if (!user || !existingInvoice?.id) return;
    if (!isReadOnly && !validateForm()) return;
    setActionLoading(true);
    try {
      const { submitInvoiceForReview, approveInvoice, updateInvoiceDetails } = await import('./actions');

      if (!isReadOnly) {
        const payload = await prepareInvoicePayload();
        const saveRes = await updateInvoiceDetails(existingInvoice.id, payload);
        if (!saveRes?.success) {
          toast({ title: 'Submit failed', description: saveRes?.error || 'Unable to save changes before submission.', variant: 'destructive' });
          setActionLoading(false);
          return;
        }
        setFormData(prev => ({ ...prev, attachedFiles: [] }));
      }

      const res = await submitInvoiceForReview(existingInvoice.id, user.uid);
      if (res?.success) {
        setHasUnsavedChanges(false); // Clear unsaved changes flag
        // Auto-approve for Admin/Prime authors per rules
        if (isAdminOrPrime && isAuthor) {
          try {
            const runId = `${existingInvoice.id}-${Date.now()}`;
            await approveInvoice(existingInvoice.id, user.uid, runId);
          } catch (e) {
            // Ignore auto-approve failure, still submitted
          }
        }
        toast({ title: invStatus === 'rejected' ? 'Resubmitted' : 'Submitted for review' });
        router.refresh();
      } else {
        toast({ title: 'Submit failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Submit failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !existingInvoice?.id) return;
    setActionLoading(true);
    try {
      const { approveInvoice } = await import('./actions');
      const runId = `${existingInvoice.id}-${Date.now()}`;
      const res = await approveInvoice(existingInvoice.id, user.uid, runId);
      if (res?.success) {
        toast({ title: 'Invoice approved' });
        router.refresh();
      } else {
        toast({ title: 'Approval failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Approval failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = () => {
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !existingInvoice?.id) return;
    setActionLoading(true);
    try {
      const { rejectInvoice } = await import('./actions');
      const res = await rejectInvoice(existingInvoice.id, user.uid, rejectReason || 'Rejected');
      if (res?.success) {
        toast({ title: 'Invoice rejected' });
        setRejectDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: 'Rejection failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Rejection failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateApprovedPdf = async () => {
    if (!user || !existingInvoice?.id) return;
    setActionLoading(true);
    try {
      const { generateInvoicePdf } = await import('./actions');
      const res = await generateInvoicePdf(existingInvoice.id, user.uid);
      if (res?.success) {
        toast({ title: 'PDF generated' });
        router.refresh();
      } else {
        toast({ title: 'PDF generation failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'PDF generation failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const openRestoreDialog = () => {
    if (!existingInvoice?.id) return;
    setRestoreDialogOpen(true);
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!user || !existingInvoice?.id) return;
    setActionLoading(true);
    try {
      const { restoreInvoicePdfVersion } = await import('./actions');
      const res = await restoreInvoicePdfVersion(existingInvoice.id, user.uid, versionNumber, `Restore v${versionNumber}`);
      if (res?.success) {
        toast({ title: `Restored to v${versionNumber}` });
        setRestoreDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: 'Restore failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Restore failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // ACCESS CHECK: Block access when viewing an existing invoice without permission
  // This is done AFTER all hooks to comply with React's Rules of Hooks
  if (isEditing && !access.canView) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-muted-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">You don't have permission to view this invoice.</p>
        </div>
      </div>
    );
  }

  // Render department selection step
  if (currentStep === 'department' && user?.role !== 'Subconsultant') {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Invoices", href: "/invoices" },
            { label: "Select Department" },
          ]}
          className="mb-4"
        />
        <WorkflowStepIndicator
          currentStep={currentStep}
          userRole={user?.role}
        />
        <DepartmentSelectionStep
          departments={availableDepartments}
          onSelect={handleDepartmentSelect}
          onBack={() => router.push('/invoices')}
        />
      </div>
    );
  }

  // Render project selection step
  if (currentStep === 'project') {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Invoices", href: "/invoices" },
            ...(user?.role !== 'Subconsultant' ? [{ label: "Department", href: undefined }] : []),
            { label: "Select Project" },
          ]}
          className="mb-4"
        />
        <WorkflowStepIndicator
          currentStep={currentStep}
          userRole={user?.role}
        />
        <ProjectSelectionStep
          projects={availableProjects}
          onSelect={handleProjectSelect}
          onBack={() => {
            if (user?.role === 'Subconsultant') router.push('/invoices');
            else setCurrentStep('department');
          }}
        />
      </div>
    );
  }

  // Main invoice form
  return (
    <div>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: "Invoices", href: "/invoices" },
          {
            label: isEditing
              ? `Invoice ${existingInvoice?.invoiceNumber || existingInvoice?.id?.slice(0, 8) || ''}`
              : "Create Invoice",
          },
        ]}
        className="mb-4"
      />

      {/* Workflow Progress Indicator - Only show when creating new invoices */}
      {!isEditing && (
        <WorkflowStepIndicator
          currentStep={currentStep}
          userRole={user?.role}
        />
      )}

      {/* Header */}
      <Header
        title={isEditing ? 'Edit Invoice' : 'Create Invoice'}
        subtitle={selectedProject?.projectName}
        status={existingInvoice ? (String(existingInvoice.status || 'draft').toLowerCase() as 'draft'|'submitted'|'approved'|'rejected'|'resubmitted') : undefined}
        showBack={false}
        isLoadingTimesheet={isLoadingTimesheet}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>
                Configure invoice settings and date ranges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lightweight loading indicator while timesheet fetch is in progress */}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input
                    id="poNumber"
                    value={formData.poNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, pmisNumber: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approvingSupervisor">Approving Supervisor</Label>
                  <Input
                    id="approvingSupervisor"
                    value={formData.approvingSupervisor}
                    onChange={(e) => setFormData(prev => ({ ...prev, approvingSupervisor: e.target.value }))}
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
                        {formData.fromDate && !isNaN(formData.fromDate.getTime()) ? format(formData.fromDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fromDate && !isNaN(formData.fromDate.getTime()) ? formData.fromDate : undefined}
                        onSelect={(date) => {
                          if (!isReadOnly) {
                            const d = date && !isNaN(date.getTime()) ? date : undefined;
                            setFormData(prev => ({ ...prev, fromDate: d }));
                            validateField('fromDate', d);
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
                  {fieldErrors.fromDate && <p id="fromDate-error" className="text-sm text-destructive mt-1" role="alert">{fieldErrors.fromDate}</p>}
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
                        {formData.toDate && !isNaN(formData.toDate.getTime()) ? format(formData.toDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.toDate && !isNaN(formData.toDate.getTime()) ? formData.toDate : undefined}
                        onSelect={(date) => {
                          if (!isReadOnly) {
                            const d = date && !isNaN(date.getTime()) ? date : undefined;
                            setFormData(prev => ({ ...prev, toDate: d }));
                            validateField('toDate', d);
                          }
                        }}
                        disabled={(date) => (isReadOnly || !date || date < new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.toDate && <p id="toDate-error" className="text-sm text-destructive mt-1" role="alert">{fieldErrors.toDate}</p>}
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
                        {formData.dueDate && !isNaN(formData.dueDate.getTime()) ? format(formData.dueDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate && !isNaN(formData.dueDate.getTime()) ? formData.dueDate : undefined}
                        onSelect={(date) => {
                          if (!isReadOnly) {
                            const d = date && !isNaN(date.getTime()) ? date : undefined;
                            setFormData(prev => ({ ...prev, dueDate: d }));
                            validateField('dueDate', d);
                          }
                        }}
                        disabled={(date) => (isReadOnly || !date || date < new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.dueDate && <p id="dueDate-error" className="text-sm text-destructive mt-1" role="alert">{fieldErrors.dueDate}</p>}
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
                          <p>The week ending date for this invoice period (e.g., "Week ending 12/31/2023")</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="termOfWeek"
                    placeholder="e.g., Week ending 12/31/2023"
                    value={formData.termOfWeek}
                    onChange={(e) => setFormData(prev => ({ ...prev, termOfWeek: e.target.value }))}
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
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {errors.autofill}
                  </p>
                </div>
              ) }
            </CardContent>
          </Card>

          {/* Invoice Items */}
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

          {/* Reimbursable Expenses */}
          <ReimbursableExpensesTable
            expenses={formData.reimbursableExpenses as any}
            companies={companiesForSelect}
            isReadOnly={isReadOnly}
            onAdd={addReimbursableExpense}
            onRemove={removeReimbursableExpense}
            onUpdate={updateReimbursableExpense}
          />

          {/* File Attachments */}
          <FileAttachments
            isEditing={isEditing}
            isReadOnly={isReadOnly}
            existingFiles={existingUploadedFiles}
            newFiles={formData.attachedFiles}
            onUpload={handleFileUpload}
            onRemoveNew={removeFile}
            onOpenExisting={(file) => {
              const url = (file.fileUrl || '').replace(/[<>"']/g, '');
              if (url) window.open(url, '_blank');
            }}
          />
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <SummarySidebar
            invoiceItemsTotal={invoiceItemsTotal}
            reimbursableExpensesTotal={reimbursableExpensesTotal}
            invoiceTotal={invoiceTotal}
          />

          {/* Actions */}
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
            actionLoading={actionLoading}
            existingInvoice={existingInvoice as any}
            onSaveChanges={handleSaveInvoiceChanges}
            onSubmitForReview={handleSubmitForReview}
            onApprove={handleApprove}
            onOpenReject={openRejectDialog}
            onGeneratePdf={handleGenerateApprovedPdf}
            onOpenRestore={openRestoreDialog}
            onCreateSubmitted={() => handleCreateInvoice('submitted')}
            onCreateDraft={() => handleCreateInvoice('draft')}
          />
        </div>
      </div>
 
       {/* Reject Dialog */}
       <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
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
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this invoice is rejected" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoading}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore PDF Version Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Restore PDF Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {Array.isArray(existingInvoice?.pdfVersions) && (existingInvoice!.pdfVersions as any[]).length ? (
              <div className="space-y-2">
                {(existingInvoice!.pdfVersions as any[]).map((v: any) => (
                  <div key={v.version} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <div className="font-medium">Version v{v.version} <span className="text-xs text-muted-foreground">({v.type || 'generated'})</span></div>
                      <div className="text-xs text-muted-foreground">{v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleString() : (typeof v.createdAt === 'string' ? new Date(v.createdAt).toLocaleString() : '')}</div>
                      <div className="text-xs truncate max-w-[320px]">{v.fileName}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleRestoreVersion(v.version)} disabled={actionLoading}>
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
              You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedDialog(false);
              setPendingNavigation(null);
            }}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setHasUnsavedChanges(false);
              setShowUnsavedDialog(false);
              if (pendingNavigation) {
                router.push(pendingNavigation);
              }
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
