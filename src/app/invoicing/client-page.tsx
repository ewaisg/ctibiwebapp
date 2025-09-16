"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Plus, 
  Trash2, 
  Upload,
  Download,
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  Users,
  Building2,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  XCircle,
  RefreshCw,
  History
} from "lucide-react";
import { extractId, filterByReference } from "@/lib/document-reference-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
// NEW: dialogs, switch, toast
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DocumentReference, Timestamp } from "firebase/firestore";
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
  InvoiceItemForm
} from "@/types";

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

// NEW: Helper functions for currency and percentage formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercentage = (value: number, total: number) => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(0)}%`;
};

// NEW: Status colors mapping
const statusColors: Record<'draft'|'submitted'|'approved'|'rejected'|'resubmitted', string> = {
  draft: "bg-yellow-500 text-white",
  submitted: "bg-blue-500 text-white",
  approved: "bg-green-500 text-white",
  rejected: "bg-red-500 text-white",
  resubmitted: "bg-blue-500 text-white",
};

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
  const [projectFinancials, setProjectFinancials] = useState<ProjectFinancialSummary | null>(null);
  
  // Initialize form data
  const [formData, setFormData] = useState<InvoiceFormData>({
    departmentId: "",
    projectId: "",
    contractNumber: "",
    poNumber: "",
    pmisNumber: "",
    invoiceNumber: "",
    fromDate: undefined,
    toDate: undefined,
    dueDate: undefined,
    termOfWeek: "",
    approvingSupervisor: "",
    invoiceItems: [],
    reimbursableExpenses: [],
    attachedFiles: [],
    notes: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // NEW: workflow action state
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reverseApproval, setReverseApproval] = useState(false);

  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // Helpers for permissions on existing invoice
  const isAuthor = useMemo(() => {
    if (!user || !existingInvoice) return false;
    const invUserId = typeof (existingInvoice as any).userId === 'object' && (existingInvoice as any).userId?.id ? (existingInvoice as any).userId.id : (existingInvoice as any).userId;
    return invUserId === user.uid;
  }, [user, existingInvoice]);

  const isAdminOrPrime = user?.role === 'Admin' || user?.role === 'Prime';
  const invStatus = (existingInvoice?.status || 'draft').toLowerCase();
  const canSubmit = isAuthor && (invStatus === 'draft' || invStatus === 'rejected');
  const canApprove = isAdminOrPrime && (invStatus === 'submitted' || invStatus === 'resubmitted' || invStatus === 'draft');
  const canReject = isAdminOrPrime && (['submitted','resubmitted','approved'].includes(invStatus));
  const canGeneratePdf = isAdminOrPrime && invStatus === 'approved';
  const canRestorePdf = isAdminOrPrime && invStatus === 'approved' && Array.isArray(existingInvoice?.pdfVersions) && (existingInvoice!.pdfVersions as any[]).length > 0;

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

    // Filter by user role
    if (user?.role === 'Subconsultant') {
      const userCompanyId = typeof user.companyId === 'object' && 'id' in user.companyId ? (user.companyId as DocumentReference).id : user.companyId;
      filteredProjects = projects.filter(project => {
        return project.assignedCompanies?.some(ac => {
          const companyId = typeof ac.companyId === 'object' && 'id' in ac.companyId ? (ac.companyId as DocumentReference).id : ac.companyId;
          return companyId === userCompanyId;
        });
      });
    }

    // Filter by selected department (for Admin/Prime)
    if (formData.departmentId && user?.role && user.role !== 'Subconsultant') {
      filteredProjects = filteredProjects.filter(project => {
        const projectDeptId = project.departmentId && typeof project.departmentId === 'object' && 'id' in project.departmentId 
          ? (project.departmentId as DocumentReference).id 
          : project.departmentId;
        return projectDeptId === formData.departmentId;
      });
    }

    return filteredProjects.filter(project => !project.isInactive);
  }, [projects, formData.departmentId, user]);

  // Get selected project details
  const selectedProject = useMemo(() => {
    return availableProjects.find(p => p.id === formData.projectId);
  }, [availableProjects, formData.projectId]);

  // Get available employees for the selected project and user's company
  const availableEmployees = useMemo(() => {
    if (!selectedProject || !user) return [];

    if (user.role === 'Subconsultant') {
      const userCompanyId = typeof user.companyId === 'object' && 'id' in user.companyId ? (user.companyId as DocumentReference).id : user.companyId;
      return employees.filter(emp => {
        const empCompanyId = typeof emp.companyId === 'object' && 'id' in emp.companyId ? (emp.companyId as DocumentReference).id : emp.companyId;
        return empCompanyId === userCompanyId && emp.employmentStatus === 'Active';
      });
    }

    // For Admin/Prime, show all employees assigned to the project
    const projectEmployees: Employee[] = [];
    selectedProject.assignedCompanies?.forEach(ac => {
      ac.assignedEmployees?.forEach(ae => {
        const empId = typeof ae.employeeId === 'object' && 'id' in ae.employeeId ? (ae.employeeId as DocumentReference).id : ae.employeeId;
        const employee = employees.find(emp => emp.id === empId);
        if (employee && employee.employmentStatus === 'Active') {
          projectEmployees.push(employee);
        }
      });
    });

    return projectEmployees;
  }, [selectedProject, employees, user]);

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
        if (service) {
          projectServices.push(service);
        }
      });
    });

    return projectServices;
  }, [selectedProject, services, user]);

  // Fetch timesheet data for the selected project and date range

  // Auto-populate invoice items from timesheet data using server action
  const populateFromTimesheet = useCallback(async () => {
    if (!formData.projectId || !formData.fromDate || !formData.toDate) return;

    setIsLoadingTimesheet(true);
    try {
      const { autofillFromTimesheets } = await import('./actions');
      
      const result = await autofillFromTimesheets({
        projectId: formData.projectId,
        fromDate: formData.fromDate.toISOString(),
        toDate: formData.toDate.toISOString(),
      });

      if (result.success && result.items.length > 0) {
        
        // Convert server response to form format - match old app structure
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
            
            // Find matching timesheet entries for this employee
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
          return;
        }
        
        // Use direct setValue like old app
        const newFormData = {
          ...formData,
          invoiceItems: transformedItems,
          // Auto-populate project fields if available
          ...(result.projectData && {
            approvingSupervisor: result.projectData.approvingSupervisor || formData.approvingSupervisor,
            contractNumber: result.projectData.contractNumber || formData.contractNumber,
            poNumber: result.projectData.poNumber || formData.poNumber,
            pmisNumber: result.projectData.pmisNumber || formData.pmisNumber,
          })
        };
        
        setFormData(newFormData);

        // Auto-populate additional fields from autofill result
        if (result.dueDate) {
          const dueDate = new Date(result.dueDate);
          setFormData(prev => ({ ...prev, dueDate }));
        }
        
        if (result.termOfWeek) {
          setFormData(prev => ({ ...prev, termOfWeek: result.termOfWeek }));
        }

        // Update timesheet data for display
        const validItems = result.items.filter(item => {
          if (!item || typeof item !== 'object') return false;
          const typedItem = item as Record<string, unknown>;
          return typedItem.employeeId && typedItem.employeeName && typedItem.hours;
        }) as Array<{
          employeeId: string;
          employeeName: string;
          serviceName: string;
          hours: number;
        }>;
        
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
        // No timesheet data found - this is normal, not an error
        console.info('No timesheet data found for autofill:', { 
          success: result.success, 
          itemCount: result.items?.length || 0,
          error: result.error 
        });
      }
    } catch (error) {
      console.error('Error during autofill:', error);
      // Show user-friendly error message
      setErrors(prev => ({
        ...prev,
        autofill: 'Failed to load timesheet data. Please try again or add items manually.'
      }));
    } finally {
      setIsLoadingTimesheet(false);
    }
  }, [formData.projectId, formData.fromDate, formData.toDate]);

  // Load project financial summary
  const loadProjectFinancials = useCallback(async (projectId: string) => {
    if (!projectId) return;

    try {
      // This would typically come from aggregated invoice data
      // For now, use project data if available
      const project = selectedProject;
      if (project) {
        setProjectFinancials({
          originalPoAmount: project.originalPoAmount || 0,
          changeOrderAmount: project.changeOrderAmount || 0,
          newPoAmount: project.newPoAmount || 0,
          previouslyInvoicedAmount: project.previouslyInvoicedAmount || 0,
          remainingPoAmount: project.remainingPoAmount || 0,
          budgetedHours: project.budgetedHours || 0,
          usedHours: project.usedHours || 0,
          remainingHours: project.remainingHours || 0,
        });
      }
    } catch (error) {
      console.error('Error loading project financials:', error);
    }
  }, [selectedProject]);

  // Auto-populate project details when project is selected
  useEffect(() => {
    if (selectedProject) {
      const contractNumber = typeof selectedProject.contractId === 'object' && selectedProject.contractNumber
        ? selectedProject.contractNumber.toString()
        : '';
      
      setFormData(prev => ({
        ...prev,
        contractNumber,
        poNumber: selectedProject.poNumber || "",
        pmisNumber: selectedProject.pmisNumber || "",
        approvingSupervisor: selectedProject.approvingSupervisor || "",
      }));

      // Load financial summary
      loadProjectFinancials(selectedProject.id);
      
      // Auto-set date ranges to current week if not editing
      if (!isEditing && !formData.fromDate && !formData.toDate) {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
        
        setFormData(prev => ({
          ...prev,
          fromDate: weekStart,
          toDate: weekEnd,
          dueDate: addDays(weekEnd, 30), // 30 days from week end
          termOfWeek: `Week ending ${format(weekEnd, 'MM/dd/yyyy')}`
        }));
      }
    }
  }, [selectedProject, isEditing, loadProjectFinancials, formData.fromDate, formData.toDate]);

  // Auto-populate from timesheet when dates change - match old app behavior
  useEffect(() => {
    if (formData.projectId && formData.fromDate && formData.toDate && !isEditing) {
      // Add small delay to ensure both dates are set
      const timeoutId = setTimeout(() => {
        populateFromTimesheet();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.projectId, formData.fromDate, formData.toDate, isEditing, populateFromTimesheet]);

  // Calculate totals
  const invoiceItemsTotal = formData.invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const reimbursableExpensesTotal = formData.reimbursableExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0);
  const invoiceTotal = invoiceItemsTotal + reimbursableExpensesTotal;

  // Load existing invoice data
  useEffect(() => {
    if (existingInvoice && isEditing) {
      const projectId = typeof existingInvoice.projectId === 'object' && 'id' in existingInvoice.projectId 
        ? existingInvoice.projectId.id 
        : existingInvoice.projectId;

      const project = projects.find(p => p.id === projectId);
      const departmentId = project && typeof project.departmentId === 'object' && 'id' in project.departmentId
        ? project.departmentId.id
        : project?.departmentId;

      setFormData({
        departmentId: typeof departmentId === 'string' ? departmentId : "",
        projectId: typeof projectId === 'string' ? projectId : "",
        contractNumber: existingInvoice.contractNumber?.toString() || "",
        poNumber: existingInvoice.poNumber || "",
        pmisNumber: existingInvoice.pmisNumber || "",
        invoiceNumber: existingInvoice.invoiceNumber || "",
        fromDate: existingInvoice.fromDate ? new Date(existingInvoice.fromDate.seconds * 1000) : undefined,
        toDate: existingInvoice.toDate ? new Date(existingInvoice.toDate.seconds * 1000) : undefined,
        dueDate: existingInvoice.dueDate ? new Date(existingInvoice.dueDate.seconds * 1000) : undefined,
        termOfWeek: existingInvoice.termOfWeek || "",
        approvingSupervisor: existingInvoice.approvingSupervisor || "",
        invoiceItems: existingInvoice.invoiceItems?.map(ii => ({
          amount: ii.amount,
          billingRate: ii.billingRate,
          companyId: typeof ii.companyId === 'object' && 'id' in ii.companyId ? (ii.companyId as DocumentReference).id : String(ii.companyId),
          employeeId: typeof ii.employeeId === 'object' && 'id' in ii.employeeId ? (ii.employeeId as DocumentReference).id : String(ii.employeeId),
          hours: ii.hours,
          markdown: ii.markdown,
          notes: ii.notes,
          serviceId: typeof ii.serviceId === 'object' && 'id' in ii.serviceId ? (ii.serviceId as DocumentReference).id : String(ii.serviceId),
        })) || [],
        reimbursableExpenses: existingInvoice.reimbursableExpenses?.map(re => ({
          amount: String(re.amount),
          companyId: typeof re.companyId === 'object' && 'id' in re.companyId ? (re.companyId as DocumentReference).id : String(re.companyId),
          date: re.date ? new Date(re.date.seconds * 1000) : null,
          description: re.description,
        })) || [],
        attachedFiles: [], // Files would need to be loaded separately
        notes: "",
      });

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

  const addInvoiceItem = () => {
    if (!user) return;
    const userCompanyId = typeof user.companyId === 'object' && 'id' in user.companyId ? (user.companyId as DocumentReference).id : String(user.companyId);
    const newItem: InvoiceItemForm = {
      amount: 0,
      billingRate: 0,
      companyId: userCompanyId,
      employeeId: "",
      hours: 0,
      markdown: 0,
      notes: "",
      serviceId: "",
    };

    setFormData(prev => ({
      ...prev,
      invoiceItems: [...prev.invoiceItems, newItem],
    }));
  };

  const removeInvoiceItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.filter((_, i) => i !== index),
    }));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItemForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.map((item, i) => {
        if (i === index) {
          const updatedItem: InvoiceItemForm = { ...item, [field]: value } as InvoiceItemForm;

          // Auto-populate billing rate when employee or service changes
          if (field === 'employeeId' || field === 'serviceId') {
            // Resolve current employee and service based on the updated field
            const selectedEmployeeId = String(field === 'employeeId' ? value : item.employeeId || '');
            const selectedServiceId = String(field === 'serviceId' ? value : item.serviceId || '');

            const employee = availableEmployees.find(emp => emp.id === selectedEmployeeId);
            const service = availableServices.find(svc => svc.id === selectedServiceId);

            if (employee) {
              // Keep companyId aligned with the selected employee
              const empCompanyId = typeof employee.companyId === 'object' && 'id' in employee.companyId
                ? (employee.companyId as DocumentReference).id
                : employee.companyId;
              updatedItem.companyId = empCompanyId as unknown as string;
            }

            if (employee && service && selectedProject) {
              // 1) Try to resolve rate from the project's assignedCompanies -> assignedServices for the employee's company
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

              // 2) Fallback to global rates collection if not found on project
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
                // Recalculate amount immediately when rate changes
                const hours = Number(updatedItem.hours || 0);
                const markdown = Number(updatedItem.markdown) || 0;
                const adjustedRate = resolvedRate * (1 + markdown / 100);
                updatedItem.amount = hours * adjustedRate;
              }
            }
          }

          // Recalculate amount when hours, billing rate, or markdown changes
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
  };

  const addReimbursableExpense = () => {
    if (!user) return;
    const userCompanyId = typeof user.companyId === 'object' && 'id' in user.companyId ? (user.companyId as DocumentReference).id : String(user.companyId);
    const newExpense: ReimbursableExpenseForm = {
      amount: "",
      companyId: userCompanyId,
      date: new Date(),
      description: "",
    };

    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: [...prev.reimbursableExpenses, newExpense],
    }));
  };

  const removeReimbursableExpense = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: prev.reimbursableExpenses.filter((_, i) => i !== index),
    }));
  };

  const updateReimbursableExpense = (index: number, field: keyof ReimbursableExpenseForm, value: string | number | Date | null | undefined) => {
    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: prev.reimbursableExpenses.map((expense, i) => 
        i === index ? { ...expense, [field]: value } : expense
      ),
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setFormData(prev => ({
        ...prev,
        attachedFiles: [...prev.attachedFiles, ...Array.from(files)]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = "Project is required";
    if (!formData.fromDate) newErrors.fromDate = "From date is required";
    if (!formData.toDate) newErrors.toDate = "To date is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";
    if (formData.invoiceItems.length === 0) newErrors.invoiceItems = "At least one invoice item is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateInvoice = async (status: 'draft' | 'submitted' = 'submitted') => {
    if (!validateForm() || !user) return;

    setIsLoading(true);
    try {
      const { createInvoice } = await import('./actions');
      
      // Auto-approve for Admin/Prime users
      const finalStatus = (user.role === 'Admin' || user.role === 'Prime') && status === 'submitted' 
        ? 'approved' 
        : status;
      
      // Convert files to base64
      const attachedFiles = await Promise.all(
        formData.attachedFiles.map(async (file) => {
          return new Promise<{fileName: string, fileData: string, fileType: string}>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({
                fileName: file.name,
                fileData: base64,
                fileType: file.type
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );
      
      const invoiceInput = {
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
        invoiceItems: formData.invoiceItems.map(item => ({
          employeeId: typeof item.employeeId === 'string' ? item.employeeId : String(item.employeeId),
          companyId: typeof item.companyId === 'string' ? item.companyId : String(item.companyId),
          serviceId: typeof item.serviceId === 'string' ? item.serviceId : String(item.serviceId),
          hours: item.hours,
          billingRate: item.billingRate,
          markdown: item.markdown,
          amount: item.amount,
          notes: item.notes,
        })),
        reimbursableExpenses: formData.reimbursableExpenses.map(expense => ({
          amount: parseFloat(expense.amount) || 0,
          companyId: expense.companyId,
          date: expense.date?.toISOString() || new Date().toISOString(),
          description: expense.description,
        })),
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
        autofillSource: initialFormData?.action === 'autofill' ? 'timesheet' : 'manual',
        notes: formData.notes,
        userId: user.uid,
        userRole: user.role,
        status: finalStatus as 'draft' | 'submitted' | 'approved',
      };
      
      const result = await createInvoice(invoiceInput);
      
      if (result.success) {
        const statusMessage = finalStatus === 'approved' 
          ? 'created and approved automatically'
          : status === 'draft' ? 'saved as draft' : 'created';
        console.log(`Invoice ${statusMessage} successfully:`, result);
        router.push('/invoices');
      } else {
        console.error('Failed to create invoice:', result.error);
        setErrors({ general: result.error || 'Failed to create invoice' });
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for workflow actions (detail page)
  const handleSubmitForReview = async () => {
    if (!user || !existingInvoice?.id) return;
    setActionLoading(true);
    try {
      const { submitInvoiceForReview } = await import('./actions');
      const res = await submitInvoiceForReview(existingInvoice.id, user.uid);
      if (res?.success) {
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
    setReverseApproval(invStatus === 'approved');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !existingInvoice?.id) return;
    setActionLoading(true);
    try {
      const { rejectInvoice } = await import('./actions');
      const res = await rejectInvoice(existingInvoice.id, user.uid, rejectReason || 'Rejected', { reversePriorApproval: reverseApproval });
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

  // Render department selection step
  if (currentStep === 'department' && user?.role !== 'Subconsultant') {
    return (
      <>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/invoices')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Select Department</h2>
              <p className="text-muted-foreground">Choose the department for this invoice</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableDepartments.map((department) => (
            <Card 
              key={department.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleDepartmentSelect(department.id)}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{department.departmentName}</CardTitle>
                    <CardDescription>{department.departmentCode}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to view projects in this department
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  // Render project selection step
  if (currentStep === 'project') {
    return (
      <>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (user?.role === 'Subconsultant') {
                  router.push('/invoices');
                } else {
                  setCurrentStep('department');
                }
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {user?.role === 'Subconsultant' ? 'Back to Invoices' : 'Back to Departments'}
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Select Project</h2>
              <p className="text-muted-foreground">
                {user?.role === 'Subconsultant' 
                  ? 'Choose a project from your assigned projects' 
                  : 'Choose a project to create an invoice for'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {availableProjects.map((project) => (
            <Card 
              key={project.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleProjectSelect(project.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{project.projectName}</CardTitle>
                      <CardDescription>PO: {project.poNumber}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{project.pmisNumber}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Project Manager:</span>
                    <span className="font-medium">{project.projectManager || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining PO:</span>
                    <span className="font-medium">{formatCurrency(project.remainingPoAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining Hours:</span>
                    <span className="font-medium">{project.remainingHours || 0} hrs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {availableProjects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Projects Available</h3>
              <p className="text-muted-foreground text-center">
                {user?.role === 'Subconsultant' 
                  ? 'You are not assigned to any active projects.'
                  : 'No active projects found in the selected department.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  // Main invoice form
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentStep('project')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <p className="text-muted-foreground">
              {selectedProject?.projectName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {existingInvoice && (
            (() => {
              const st = String(existingInvoice.status || 'draft').toLowerCase() as 'draft'|'submitted'|'approved'|'rejected'|'resubmitted';
              const safeStatus: 'draft'|'submitted'|'approved'|'rejected'|'resubmitted' = (['draft','submitted','approved','rejected','resubmitted'] as const).includes(st as any) ? st : 'draft';
              return (
                <Badge className={statusColors[safeStatus]}>
                  {existingInvoice.status}
                </Badge>
              );
            })()
          )}
          {isLoadingTimesheet && (
            <Badge variant="outline">
              <Clock className="mr-1 h-3 w-3" />
              Loading timesheet...
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Financial Summary */}
          {projectFinancials && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Project Financial Summary
                </CardTitle>
                <CardDescription>
                  Current project financial status and remaining budgets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Original PO</p>
                    <p className="text-lg font-semibold">{formatCurrency(projectFinancials.originalPoAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Change Orders</p>
                    <p className="text-lg font-semibold">{formatCurrency(projectFinancials.changeOrderAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">New PO Amount</p>
                    <p className="text-lg font-semibold">{formatCurrency(projectFinancials.newPoAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Previously Invoiced</p>
                    <p className="text-lg font-semibold">{formatCurrency(projectFinancials.previouslyInvoicedAmount)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Remaining PO Amount</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(projectFinancials.remainingPoAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercentage(projectFinancials.remainingPoAmount, projectFinancials.newPoAmount)} remaining
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Remaining Hours</p>
                      <p className="text-2xl font-bold text-blue-600">{projectFinancials.remainingHours}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercentage(projectFinancials.remainingHours, projectFinancials.budgetedHours)} remaining
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>
                Configure invoice settings and date ranges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractNumber">Contract Number</Label>
                  <Input
                    id="contractNumber"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input
                    id="poNumber"
                    value={formData.poNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pmisNumber">PMIS Number</Label>
                  <Input
                    id="pmisNumber"
                    value={formData.pmisNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, pmisNumber: e.target.value }))}
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approvingSupervisor">Approving Supervisor</Label>
                  <Input
                    id="approvingSupervisor"
                    value={formData.approvingSupervisor}
                    onChange={(e) => setFormData(prev => ({ ...prev, approvingSupervisor: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>From Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fromDate ? format(formData.fromDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fromDate}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, fromDate: date }));
                        }}
                        disabled={(date) => {
                          if (!date) return true;
                          return date > new Date() || date < new Date("1900-01-01");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.fromDate && <p className="text-sm text-destructive">{errors.fromDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label>To Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.toDate ? format(formData.toDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.toDate}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, toDate: date }));
                        }}
                        disabled={(date) => {
                          if (!date) return true;
                          return date > new Date() || 
                            date < new Date("1900-01-01") ||
                            Boolean(formData.fromDate && date < formData.fromDate);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.toDate && <p className="text-sm text-destructive">{errors.toDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dueDate ? format(formData.dueDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, dueDate: date }));
                        }}
                        disabled={(date) => {
                          if (!date) return true;
                          return date < new Date();
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="termOfWeek">Term of Week</Label>
                  <Input
                    id="termOfWeek"
                    placeholder="e.g., Week ending 12/31/2023"
                    value={formData.termOfWeek}
                    onChange={(e) => setFormData(prev => ({ ...prev, termOfWeek: e.target.value }))}
                  />
                </div>
              </div>

              {timesheetData.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Timesheet data found and auto-populated
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
              )}
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoice Items</CardTitle>
                  <CardDescription>
                    Labor hours and services provided
                  </CardDescription>
                </div>
                <Button onClick={addInvoiceItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.invoiceItems.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee/Company</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Markdown %</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.invoiceItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={typeof item.employeeId === 'string' ? item.employeeId : String(item.employeeId)}
                              onValueChange={(value) => updateInvoiceItem(index, 'employeeId', value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableEmployees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.formalName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={typeof item.serviceId === 'string' ? item.serviceId : String(item.serviceId)}
                              onValueChange={(value) => updateInvoiceItem(index, 'serviceId', value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableServices.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.serviceName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              className="w-20"
                              value={item.hours}
                              onChange={(e) => updateInvoiceItem(index, 'hours', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24"
                              value={item.billingRate}
                              onChange={(e) => updateInvoiceItem(index, 'billingRate', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              className="w-20"
                              value={item.markdown}
                              onChange={(e) => updateInvoiceItem(index, 'markdown', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Notes"
                              className="w-32"
                              value={item.notes}
                              onChange={(e) => updateInvoiceItem(index, 'notes', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInvoiceItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No invoice items added</h3>
                  <p className="text-sm mb-4">
                    {timesheetData.length > 0 
                      ? "Timesheet data was found but couldn\u2019t be automatically processed. Add items manually."
                      : "Add labor hours and services to create your invoice"
                    }
                  </p>
                  <Button onClick={addInvoiceItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Item
                  </Button>
                </div>
              )}
              {errors.invoiceItems && <p className="text-sm text-destructive mt-2">{errors.invoiceItems}</p>}
            </CardContent>
          </Card>

          {/* Reimbursable Expenses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reimbursable Expenses</CardTitle>
                  <CardDescription>
                    Add expenses to be reimbursed
                  </CardDescription>
                </div>
                <Button onClick={addReimbursableExpense} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.reimbursableExpenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.reimbursableExpenses.map((expense, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={expense.companyId}
                            onValueChange={(value) => updateReimbursableExpense(index, 'companyId', value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-40 justify-start text-left font-normal",
                                  !expense.date && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expense.date ? format(expense.date, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-3">
                              <Calendar
                                mode="single"
                                selected={expense.date || undefined}
                                onSelect={(date) => updateReimbursableExpense(index, 'date', date)}
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Expense description"
                            value={expense.description}
                            onChange={(e) => updateReimbursableExpense(index, 'description', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-24"
                            value={expense.amount}
                            onChange={(e) => updateReimbursableExpense(index, 'amount', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReimbursableExpense(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No reimbursable expenses added</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                File Attachments
              </CardTitle>
              <CardDescription>
                Upload supporting documents for this invoice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
                </p>
              </div>

              {formData.attachedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Attached Files:</h4>
                  {formData.attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Invoice Items Total:</span>
                <span className="font-semibold">{formatCurrency(invoiceItemsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Reimbursable Expenses:</span>
                <span className="font-semibold">{formatCurrency(reimbursableExpensesTotal)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(invoiceTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isEditing && existingInvoice?.id ? (
                <>
                  {/* Submit/Resubmit for author */}
                  {canSubmit && (
                    <Button onClick={handleSubmitForReview} className="w-full" disabled={actionLoading}>
                      <FileText className="mr-2 h-4 w-4" />
                      {invStatus === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
                    </Button>
                  )}

                  {/* Approve/Reject for Admin/Prime */}
                  {canApprove && (
                    <Button onClick={handleApprove} className="w-full" disabled={actionLoading}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  )}
                  {canReject && (
                    <Button onClick={openRejectDialog} variant="outline" className="w-full" disabled={actionLoading}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject...
                    </Button>
                  )}

                  {/* PDF actions for approved */}
                  {canGeneratePdf && (
                    <Button onClick={handleGenerateApprovedPdf} variant="secondary" className="w-full" disabled={actionLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate/Refresh PDF
                    </Button>
                  )}
                  {existingInvoice?.pdfUrl && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        const sanitizedUrl = (existingInvoice.pdfUrl || '').replace(/[<>"']/g, '');
                        if (sanitizedUrl) window.open(sanitizedUrl, '_blank');
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                  {canRestorePdf && (
                    <Button onClick={openRestoreDialog} variant="outline" className="w-full" disabled={actionLoading}>
                      <History className="mr-2 h-4 w-4" />
                      Restore PDF Version...
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => handleCreateInvoice('submitted')} 
                    className="w-full"
                    disabled={isLoading}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Invoice' : 'Create Invoice'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => handleCreateInvoice('draft')}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any additional notes or comments..."
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Project Quick Stats */}
          {selectedProject && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Project Manager</p>
                  <p className="font-medium">{selectedProject.projectManager || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">IPMSSI Staff</p>
                  <p className="font-medium">{selectedProject.ipmssiStaff || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Assigned Companies</p>
                  <p className="font-medium">{selectedProject.assignedCompanies?.length || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Available Employees</p>
                  <p className="font-medium">{availableEmployees.length}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* NEW: Reject Dialog */}
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
            {invStatus === 'approved' && (
              <div className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium text-sm">Reverse prior approval rollups</div>
                  <div className="text-xs text-muted-foreground">Adjust project totals back using snapshot</div>
                </div>
                <Switch checked={reverseApproval} onCheckedChange={setReverseApproval} />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoading}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NEW: Restore PDF Version Dialog */}
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
    </>
  );
}
