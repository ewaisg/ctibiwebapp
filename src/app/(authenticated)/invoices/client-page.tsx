"use client";

// Fix imports to include useRef for SignaturePad
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { getInvoiceAccess } from "@/hooks/use-invoice-access";
import { FileText, Clock, CheckCircle, DollarSign, Eye, MoreHorizontal, Download, Archive, Trash2, AlertTriangle, Send, RefreshCw, History, XCircle } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewInvoiceDialog } from "@/components/new-invoice-dialog";
import { DepartmentalCompilationDialog } from "@/components/departmental-compilation-dialog";
import { OverallProjectsSummaryDialog } from "@/components/overall-projects-summary-dialog";
import type { Invoice, Project, Department, Employee, Company, User, Contract, TemplateFieldMapping } from "@/types";
import { Layers, ClipboardList, FileArchive, FileSpreadsheet, FileBox } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentDrawer } from "@/components/payment-drawer";
import { useDebounce } from "@/hooks/use-debounce";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

// Helpers to normalize date values to local YYYY-MM-DD and back to Date at local midnight
const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fromYMD = (s?: string): Date | undefined => (s ? new Date(`${s}T00:00:00`) : undefined);

// Lightweight signature pad
function SignaturePad({ value, onChange }: { value?: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const getPos = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : 0) - rect.left;
    const y = ("clientY" in e ? e.clientY : 0) - rect.top;
    return { x, y };
  };
  const drawTo = (e: React.PointerEvent) => {
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const start = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const end = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    drawing.current = false;
    ctx.closePath();
    onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onChange("");
  };
  return (
    <div className="space-y-2">
      <div className="border rounded-md bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full h-[180px] touch-none"
          onPointerDown={start}
          onPointerMove={drawTo}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={clear} size="sm">Clear</Button>
        {value ? <span className="text-xs text-muted-foreground">Signature captured</span> : null}
      </div>
    </div>
  );
}

interface InvoicesClientPageProps {
  initialInvoices: Invoice[];
  projects: Project[];
  departments: Department[];
  employees: Employee[];
  companies: Company[];
  users: User[];
  contracts?: Contract[]; // for Reports menu wizards
}

const statusColors: { [key: string]: string } = {
  draft: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  submitted: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  approved: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  rejected: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  // Note: workflow Status intentionally does not include payment statuses
};

// New: distinct colors for payment statuses
const paymentStatusColors: { [key: string]: string } = {
  paid: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  unpaid: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  partially_paid: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  write_off: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800",
};


export function InvoicesClientPage({ 
  initialInvoices, 
  projects, 
  departments, 
  // employees, // Currently unused
  companies, 
  users,
  contracts
 }: InvoicesClientPageProps) {
  const { user, firebaseUser, secureRequest } = useAuth();
  const router = useRouter();
  // Stabilize secureRequest to avoid effect loops when its identity changes per render
  const secureRef = useRef(secureRequest);
  useEffect(() => { secureRef.current = secureRequest; }, [secureRequest]);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // Fix: correct setter name for payment status filter
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  // New: additional filters
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{id: string, status: string} | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  // Reports dialog state
  const [openCoverPage, setOpenCoverPage] = useState(false);
  const [openInvoices, setOpenInvoices] = useState(false);
  const [openTimecard, setOpenTimecard] = useState(false);
  const [openSummary, setOpenSummary] = useState(false);
  const [openBillingPacket, setOpenBillingPacket] = useState(false);
  const { toast } = useToast();

  // Cover page wizard state
  const [coverDeptId, setCoverDeptId] = useState<string>("");
  const [coverFrom, setCoverFrom] = useState<string>("");
  const [coverTo, setCoverTo] = useState<string>("");
  const [coverTemplate, setCoverTemplate] = useState<{ id: string; templateName: string } | null>(null);
  const [coverTemplateDetails, setCoverTemplateDetails] = useState<{
    id: string;
    templateName: string;
    manualOnly?: boolean;
    fieldMappings?: TemplateFieldMapping[];
  } | null>(null);
  const [coverManualData, setCoverManualData] = useState<Record<string, any>>({});
  const [coverLoading, setCoverLoading] = useState(false);

  // Billing packet wizard state
  const [billingDeptId, setBillingDeptId] = useState<string>("");
  const [billingFrom, setBillingFrom] = useState<string>("");
  const [billingTo, setBillingTo] = useState<string>("");
  const [billingIncludeInactive, setBillingIncludeInactive] = useState<boolean>(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingTemplate, setBillingTemplate] = useState<{ id: string; templateName: string } | null>(null);
  const [billingTemplateDetails, setBillingTemplateDetails] = useState<{
    id: string;
    templateName: string;
    manualOnly?: boolean;
    fieldMappings?: TemplateFieldMapping[];
  } | null>(null);
  const [billingManualData, setBillingManualData] = useState<Record<string, any>>({});

  // Action state for approvals flow (single declaration)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; status: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reverseApproval, setReverseApproval] = useState(false);

  // Restore PDF state (single declaration)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; versions: any[] } | null>(null);

  // Payment drawer state (shared component)
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);

  // Use centralized invoice access logic
  const isAdminOrPrime = user?.role === 'Admin' || user?.role === 'Prime';

  // Helper to get access for any invoice
  const getAccess = (invoice: any) => getInvoiceAccess(user, invoice);

  // Legacy helpers that use getInvoiceAccess (kept for backward compatibility)
  const isAuthor = (invoice: Invoice & { userId?: any }) => getAccess(invoice).isAuthor;
  const canSubmit = (invoice: any) => getAccess(invoice).canSubmit;
  const canApprove = (invoice: any) => getAccess(invoice).canApprove;
  const canReject = (invoice: any) => getAccess(invoice).canReject;
  const canGeneratePdf = (invoice: any) => getAccess(invoice).canGeneratePdf;
  const canRestorePdf = (invoice: any) => getAccess(invoice).canRestorePdf;

  const openPaymentDrawer = (invoice: any) => {
    if (!isAdminOrPrime) return;
    setPaymentTarget(invoice);
    setPaymentDrawerOpen(true);
  };

  // Filter invoices based on user role
  const filteredInvoices = useMemo(() => {
    if (!user) return [];

    let baseInvoices = initialInvoices;

    // Role-based filtering - compare document references properly
    if (user.role === 'Subconsultant') {
      baseInvoices = baseInvoices.filter(invoice => {
        const invoiceUserId = typeof invoice.userId === 'object' && (invoice.userId as any)?.id ? (invoice.userId as any).id : (invoice as any).userId;
        return invoiceUserId === user.uid;
      });
    }

    // Enrich invoices with additional data for display
    const enrichedInvoices = baseInvoices.map((invoice) => {
      const projectId = typeof invoice.projectId === 'object' && (invoice.projectId as any)?.id ? (invoice.projectId as any).id : (invoice as any).projectId;
      const project = projects.find(p => p.id === projectId);
      const userId = typeof invoice.userId === 'object' && (invoice.userId as any)?.id ? (invoice.userId as any).id : (invoice as any).userId;
      const submitter = users.find(u => u.uid === userId);
      const companyId = typeof invoice.submitterCompanyId === 'object' && (invoice.submitterCompanyId as any)?.id ? (invoice.submitterCompanyId as any).id : (invoice as any).submitterCompanyId;
      const submitterCompany = companies.find(c => c.id === companyId);

      return {
        ...invoice,
        id: (invoice as any).id || '',
        projectName: project?.projectName || 'Unknown Project',
        submitterName: submitter?.displayName || (invoice as any).submitterName || 'Unknown User',
        companyName: submitterCompany?.companyName || (invoice as any).submitterCompany || 'Unknown Company',
        submitterCompanyIdString: companyId,
        projectIdString: projectId,
      } as any;
    });

    // Apply filters
    let filtered = enrichedInvoices;

    if (debouncedSearchTerm) {
      filtered = filtered.filter((invoice: any) =>
        String(invoice.invoiceNumber || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(invoice.projectName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(invoice.submitterName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(invoice.companyName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice: any) => invoice.status === statusFilter);
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((invoice: any) => {
        return invoice.paymentStatus === paymentStatusFilter;
      });
    }



    if (companyFilter !== "all") {
      filtered = filtered.filter((invoice: any) => invoice.submitterCompanyIdString === companyFilter);
    }

    if (projectFilter !== "all") {
      filtered = filtered.filter((invoice: any) => invoice.projectIdString === projectFilter);
    }

    const parseInvDate = (inv: any): Date | null => {
      const raw = inv.toDate || inv.dueDate || inv.fromDate;
      if (!raw) return null;
      if (typeof raw === 'string') {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
      }
      if (raw && typeof raw === 'object' && 'seconds' in raw) {
        const seconds = Number((raw as any).seconds);
        const d = !isNaN(seconds) ? new Date(seconds * 1000) : null;
        return d && !isNaN(d.getTime()) ? d : null;
      }
      if (raw instanceof Date) return raw;
      return null;
    };

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((invoice: any) => {
        const d = parseInvDate(invoice);
        return d ? d >= from : true;
      });
    }

    if (dateTo) {
      const to = new Date(dateTo);
      filtered = filtered.filter((invoice: any) => {
        const d = parseInvDate(invoice);
        return d ? d <= to : true;
      });
    }

    return filtered;
  // Fix: dependency list should depend on paymentStatusFilter, not setter
  }, [initialInvoices, user, projects, users, companies, debouncedSearchTerm, statusFilter, paymentStatusFilter, companyFilter, projectFilter, dateFrom, dateTo]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalInvoices = filteredInvoices.length;
    const draftInvoices = filteredInvoices.filter(inv => inv.status === 'draft').length;
    const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'submitted').length;
    const approvedInvoices = filteredInvoices.filter(inv => inv.status === 'approved').length;
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);

    return {
      totalInvoices,
      draftInvoices,
      pendingInvoices,
      approvedInvoices,
      totalAmount,
    };
  }, [filteredInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: unknown) => {
    if (!date) return '--';
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? '--' : parsed.toLocaleDateString();
    }
    // Support Firestore Timestamp-like objects without importing to keep client bundle slim
    if (typeof date === 'object' && date !== null && 'seconds' in date && typeof (date as { seconds: unknown }).seconds === 'number') {
      const ts = new Date((date as { seconds: number }).seconds * 1000);
      return ts.toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return '--';
  };

  const handleDepartmentalCompilation = async (departmentId: string, startDate: string, endDate: string) => {
    try {
      // Get auth token
      if (!firebaseUser) {
        alert('Authentication required. Please sign in again.');
        return;
      }

      const idToken = await firebaseUser.getIdToken();

      const response = await fetch('/api/departmental-compilation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ departmentId, startDate, endDate })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Get filename from response headers or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename="')[1]?.split('"')[0]
          : `departmental-compilation-${departmentId}-${new Date().toISOString().split('T')[0]}.zip`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert(`Compilation failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error during departmental compilation:', error);
      alert('Compilation failed. Please try again.');
    }
  };

  const handleGeneratePDF = async (invoiceId: string) => {
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setTimeout(() => router.refresh(), 1000);
      } else {
        const error = await response.json();
        alert(`PDF generation failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('PDF generation failed');
    }
  };

  const handleViewInvoice = (invoice: Partial<Invoice>) => {
    // Use the actual invoice document ID for editing
    const invoiceId = invoice.id || invoice.invoiceNumber;
    if (invoiceId) {
      router.push(`/invoicing?id=${invoiceId}`);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const { deleteInvoice } = await import('./actions');
      const result = await deleteInvoice(invoiceId, user.uid);
      
      if (result.success) {
        router.refresh();
      } else {
        alert(`Failed to delete invoice: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('An unexpected error occurred while deleting the invoice.');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const confirmDeleteInvoice = (invoiceId: string, status: string) => {
    setInvoiceToDelete({id: invoiceId, status});
    setDeleteDialogOpen(true);
  };

  const handleDeleteMultipleInvoices = async () => {
    if (!user || selectedInvoices.length === 0) return;

    setIsDeleting(true);
    try {
      const { deleteMultipleInvoices } = await import('./actions');
      const result = await deleteMultipleInvoices(selectedInvoices, user.uid);
      
      if (result.success) {
        setSelectedInvoices([]);
        router.refresh();
      } else {
        alert(`Failed to delete invoices: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting invoices:', error);
      alert('An unexpected error occurred while deleting the invoices.');
    } finally {
      setIsDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const confirmBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const toggleSelectAll = () => {
    const deletableInvoices = filteredInvoices.filter((inv) => ['draft', 'submitted', 'approved'].includes(inv.status));
    if (selectedInvoices.length === deletableInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(deletableInvoices.map((inv) => inv.id).filter(Boolean) as string[]);
    }
  };

  // Actions wiring for invoice workflow
  const handleSubmitForReview = async (invoiceId: string) => {
    if (!user) return;
    setActionLoadingId(invoiceId);
    try {
      const { submitInvoiceForReview, approveInvoice } = await import('./actions');
      const res = await submitInvoiceForReview(invoiceId, user.uid);
      if (res?.success) {
        // If Admin/Prime submitting own invoice, auto-approve immediately per rules
        const inv = filteredInvoices.find(i => i.id === invoiceId);
        if (isAdminOrPrime && inv && isAuthor(inv)) {
          const runId = `${invoiceId}-${Date.now()}`;
          try {
            await approveInvoice(invoiceId, user.uid, runId);
          } catch (e) {
            // If auto-approve fails, still show submitted toast
          }
        }
        toast({ title: 'Submitted for review' });
        // If a PDF URL was generated during submission, auto-download
        const pdfUrl = (res as any)?.pdfUrl as string | undefined;
        if (pdfUrl) {
          const sanitizedUrl = pdfUrl.replace(/[<>"']/g, '');
          const link = document.createElement('a');
          link.href = sanitizedUrl;
          link.download = `${invoiceId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        router.refresh();
      } else {
        toast({ title: 'Submit failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Submit failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = async (invoiceId: string) => {
    if (!user) return;
    setActionLoadingId(invoiceId);
    try {
      const { approveInvoice } = await import('./actions');
      const runId = `${invoiceId}-${Date.now()}`;
      const res = await approveInvoice(invoiceId, user.uid, runId);
      if (res?.success) {
        toast({ title: 'Invoice approved' });
        router.refresh();
      } else {
        toast({ title: 'Approval failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Approval failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectDialog = (invoiceId: string, status: string) => {
    setRejectTarget({ id: invoiceId, status });
    setReverseApproval(status === 'approved');
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!user || !rejectTarget) return;
    setActionLoadingId(rejectTarget.id);
    try {
      const { rejectInvoice } = await import('./actions');
      const res = await rejectInvoice(rejectTarget.id, user.uid, rejectReason || 'Rejected', { reversePriorApproval: reverseApproval });
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
      setActionLoadingId(null);
    }
  };

  const handleGenerateApprovedPdf = async (invoiceId: string) => {
    if (!user) return;
    setActionLoadingId(invoiceId);
    try {
      const { generateInvoicePdf } = await import('./actions');
      const res = await generateInvoicePdf(invoiceId, user.uid);
      if (res?.success) {
        toast({ title: 'PDF generated' });
        // Auto-download locally if a URL is returned
        const url = (res as any).pdfUrl as string | undefined;
        if (url) {
          const sanitizedUrl = url.replace(/[<>"']/g, '');
          const link = document.createElement('a');
          link.href = sanitizedUrl;
          link.download = `${invoiceId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        router.refresh();
      } else {
        toast({ title: 'PDF generation failed', description: (res as any)?.message || (res as any)?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'PDF generation failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRestoreDialog = (invoice: any) => {
    const versions = Array.isArray(invoice.pdfVersions) ? invoice.pdfVersions : [];
    if (!invoice?.id) return;
    setRestoreTarget({ id: invoice.id, versions });
    setRestoreDialogOpen(true);
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!user || !restoreTarget) return;
    setActionLoadingId(restoreTarget.id);
    try {
      const { restoreInvoicePdfVersion } = await import('./actions');
      const res = await restoreInvoicePdfVersion(restoreTarget.id, user.uid, versionNumber, `Restore v${versionNumber}`);
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
      setActionLoadingId(null);
    }
  };

  // Get unique companies for filter (admins/prime see all, subconsultants see only theirs)
  const availableCompanies = useMemo(() => {
    if (user?.role === 'Subconsultant') {
      const userCompanyId = typeof user.companyId === 'object' && user.companyId.id ? user.companyId.id : user.companyId;
      const userCompany = companies.find(c => c.id === userCompanyId);
      return userCompany ? [userCompany] : [];
    }
    return companies;
  }, [companies, user]);

  // Resolve assigned CoverPage template when dialog opens or scope changes
  // Guard against repeated fetches with last-fetched key and abort controller
  const lastCoverDeptFetched = useRef<string | null>(null);
  const coverResolveAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const run = async () => {
      if (!openCoverPage || !coverDeptId) return;
      if (lastCoverDeptFetched.current === coverDeptId) return;
      lastCoverDeptFetched.current = coverDeptId;
      // abort any in-flight
      if (coverResolveAbort.current) {
        coverResolveAbort.current.abort();
      }
      const ac = new AbortController();
      coverResolveAbort.current = ac;
      try {
        const res = await secureRef.current(`/api/template-assignments/resolve?category=CoverPage&departmentId=${encodeURIComponent(coverDeptId)}`, { signal: ac.signal } as any);
        if (res.ok) {
          const data = await res.json();
          setCoverTemplate(data.template);
        } else {
          setCoverTemplate(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setCoverTemplate(null);
        }
      }
    };
    run();
  // Intentionally exclude secureRequest to avoid identity churn loops
  }, [openCoverPage, coverDeptId]);

  // New: Resolve assigned CoverPage template for Billing Packet (uses same CoverPage assignment)
  const lastBillingDeptFetched = useRef<string | null>(null);
  const billingResolveAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const run = async () => {
      if (!openBillingPacket || !billingDeptId) return;
      if (lastBillingDeptFetched.current === billingDeptId) return;
      lastBillingDeptFetched.current = billingDeptId;
      if (billingResolveAbort.current) billingResolveAbort.current.abort();
      const ac = new AbortController();
      billingResolveAbort.current = ac;
      try {
        const res = await secureRef.current(`/api/template-assignments/resolve?category=CoverPage&departmentId=${encodeURIComponent(billingDeptId)}`, { signal: ac.signal } as any);
        if (res.ok) {
          const data = await res.json();
          setBillingTemplate(data.template);
        } else {
          setBillingTemplate(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setBillingTemplate(null);
        }
      }
    };
    run();
  }, [openBillingPacket, billingDeptId]);

  // Fetch template details (field mappings) when template id is known (Cover Pages)
  const lastCoverTemplateFetched = useRef<string | null>(null);
  const coverTemplateAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const fetchDetails = async () => {
      if (!openCoverPage || !coverTemplate?.id) {
        return;
      }
      if (lastCoverTemplateFetched.current === coverTemplate.id) return;
      lastCoverTemplateFetched.current = coverTemplate.id;
      if (coverTemplateAbort.current) coverTemplateAbort.current.abort();
      const ac = new AbortController();
      coverTemplateAbort.current = ac;
      try {
        const res = await secureRef.current(`/api/pdf-templates/${encodeURIComponent(coverTemplate.id)}`, { signal: ac.signal } as any);
        if (res.ok) {
          const data = await res.json();
          setCoverTemplateDetails(data);
          // Initialize manualData with defaults if provided
          const manualMappings: TemplateFieldMapping[] = Array.isArray(data.fieldMappings)
            ? data.fieldMappings.filter((m: TemplateFieldMapping) => (m?.sourceCollection || '') === 'manual')
            : [];
          const initial: Record<string, any> = {};
          manualMappings.forEach((m: TemplateFieldMapping) => {
            const key = m.sourceField || m.fieldName;
            if (m.defaultValue !== undefined && m.defaultValue !== null) {
              initial[key] = m.defaultValue;
            }
          });
          if (Object.keys(initial).length) setCoverManualData((prev: Record<string, any>) => ({ ...initial, ...prev }));
        } else {
          setCoverTemplateDetails(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Network or auth error; don't clear to prevent flicker
        }
      }
    };
    fetchDetails();
  }, [openCoverPage, coverTemplate?.id]);

  // Fetch template details (field mappings) for Billing Packet when template id is known
  const lastBillingTemplateFetched = useRef<string | null>(null);
  const billingTemplateAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const fetchDetails = async () => {
      if (!openBillingPacket || !billingTemplate?.id) {
        return;
      }
      if (lastBillingTemplateFetched.current === billingTemplate.id) return;
      lastBillingTemplateFetched.current = billingTemplate.id;
      if (billingTemplateAbort.current) billingTemplateAbort.current.abort();
      const ac = new AbortController();
      billingTemplateAbort.current = ac;
      try {
        const res = await secureRef.current(`/api/pdf-templates/${encodeURIComponent(billingTemplate.id)}`, { signal: ac.signal } as any);
        if (res.ok) {
          const data = await res.json();
          setBillingTemplateDetails(data);
          // Initialize manualData with defaults if provided
          const manualMappings: TemplateFieldMapping[] = Array.isArray(data.fieldMappings)
            ? data.fieldMappings.filter((m: TemplateFieldMapping) => (m?.sourceCollection || '') === 'manual')
            : [];
          const initial: Record<string, any> = {};
          manualMappings.forEach((m: TemplateFieldMapping) => {
            const key = m.sourceField || m.fieldName;
            if (m.defaultValue !== undefined && m.defaultValue !== null) {
              initial[key] = m.defaultValue;
            }
          });
          if (Object.keys(initial).length) setBillingManualData((prev: Record<string, any>) => ({ ...initial, ...prev }));
        } else {
          setBillingTemplateDetails(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Network or auth error; don't clear to prevent flicker
        }
      }
    };
    fetchDetails();
  }, [openBillingPacket, billingTemplate?.id]);

  // Reset caches and abort in-flight requests when dialogs open, to ensure fresh resolve/template fetch
  useEffect(() => {
    if (openCoverPage) {
      // Abort any pending resolve or template detail requests
      if (coverResolveAbort.current) { coverResolveAbort.current.abort(); coverResolveAbort.current = null; }
      if (coverTemplateAbort.current) { coverTemplateAbort.current.abort(); coverTemplateAbort.current = null; }
      // Clear last-fetched keys so reopening triggers fresh calls
      lastCoverDeptFetched.current = null;
      lastCoverTemplateFetched.current = null;
    }
  }, [openCoverPage]);

  useEffect(() => {
    if (openBillingPacket) {
      // Abort any pending resolve or template detail requests
      if (billingResolveAbort.current) { billingResolveAbort.current.abort(); billingResolveAbort.current = null; }
      if (billingTemplateAbort.current) { billingTemplateAbort.current.abort(); billingTemplateAbort.current = null; }
      // Clear last-fetched keys so reopening triggers fresh calls
      lastBillingDeptFetched.current = null;
      lastBillingTemplateFetched.current = null;
    }
  }, [openBillingPacket]);

  // Render manual fields from template UI hints for Cover Pages
  const renderManualFields = () => {
    const mappings = (coverTemplateDetails?.fieldMappings?.filter((m: TemplateFieldMapping) => (m.sourceCollection || '') === 'manual') || []) as TemplateFieldMapping[];
    if (!mappings.length) {
      return null;
    }
    const sorted = [...mappings].sort((a: TemplateFieldMapping, b: TemplateFieldMapping) => (a.order ?? 0) - (b.order ?? 0));

    const setValue = (key: string, value: any) => {
      setCoverManualData((prev: Record<string, any>) => ({ ...prev, [key]: value }));
    };

    // Group by section
    const groups = sorted.reduce<Record<string, TemplateFieldMapping[]>>((acc, m: TemplateFieldMapping) => {
      const sec = m.section || 'Details';
      if (!acc[sec]) acc[sec] = [] as TemplateFieldMapping[];
      acc[sec].push(m);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        {Object.entries(groups).map(([section, fields]) => (
          <div key={section} className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">{section}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((m: TemplateFieldMapping) => {
                const key = m.sourceField || m.fieldName;
                const label = m.uiLabel || m.fieldName;
                const required = m.validation?.required ?? m.isRequired;
                const inputType = m.inputType || 'text';
                const placeholder = m.placeholder || '';
                const help = m.helpText || '';
                const val = coverManualData[key] ?? '';
                const staticOptions = m.options && m.options.length ? m.options : (m.optionsSource?.staticOptions || []);

                return (
                  <div key={key} className="space-y-1">
                    <Label className="flex items-center gap-1">{label}{required ? <span className="text-destructive">*</span> : null}</Label>

                    {inputType === 'textarea' && (
                      <Textarea value={val} placeholder={placeholder} onChange={(e) => setValue(key, e.target.value)} />
                    )}

                    {inputType === 'text' && (
                      <Input value={val} placeholder={placeholder} onChange={(e) => setValue(key, e.target.value)} />
                    )}

                    {inputType === 'number' && (
                      <Input type="number" value={val} placeholder={placeholder} onChange={(e) => setValue(key, e.target.value)} />
                    )}

                    {inputType === 'currency' && (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="number" className="pl-7" value={val} placeholder={placeholder || '0.00'} onChange={(e) => setValue(key, e.target.value)} />
                      </div>
                    )}

                    {inputType === 'date' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !val && "text-muted-foreground")}
                            type="button"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {val ? (fromYMD(val)?.toLocaleDateString() || 'Pick a date') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={fromYMD(val)}
                            onSelect={(d) => d && setValue(key, toYMD(d))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}

                    {inputType === 'select' && (
                      <Select value={val} onValueChange={(v) => setValue(key, v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={placeholder || 'Select'} />
                        </SelectTrigger>
                        <SelectContent>
                          {staticOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {inputType === 'checkbox' && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={(e) => setValue(key, e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">{placeholder || label}</span>
                      </div>
                    )}

                    {inputType === 'signature' && (
                      <SignaturePad value={val} onChange={(data) => setValue(key, data)} />
                    )}

                    {inputType === 'image' && (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => setValue(key, reader.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                        {val ? <img src={val} alt={label} className="h-24 w-auto rounded border" /> : null}
                      </div>
                    )}

                    {help && inputType !== 'checkbox' ? (
                      <div className="text-xs text-muted-foreground">{help}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Generate Cover Pages PDF
  const handleGenerateCover = async () => {
    if (!coverDeptId || !coverFrom || !coverTo) {
      toast({ title: "Missing fields", description: "Select department and dates.", variant: "destructive" });
      return;
    }

    // Validate required manual fields if template requires them
    const requiredMissing: string[] = [];
    const manualMappings = coverTemplateDetails?.fieldMappings?.filter((m) => (m.sourceCollection || '') === 'manual') || [];
    manualMappings.forEach((m) => {
      const key = m.sourceField || m.fieldName;
      const isReq = m.validation?.required ?? m.isRequired;
      if (isReq) {
        const val = coverManualData[key];
        const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '') === true;
        if (isEmpty) requiredMissing.push(m.uiLabel || m.fieldName);
      }
    });
    if (requiredMissing.length) {
      toast({ title: 'Missing required fields', description: requiredMissing.join(', '), variant: 'destructive' });
      return;
    }

    setCoverLoading(true);
    try {
      const response = await secureRequest('/api/coverpage', {
        method: 'POST',
        body: JSON.stringify({ departmentId: coverDeptId, fromDate: coverFrom, toDate: coverTo, manualData: coverManualData })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate cover page');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coverpage-${coverDeptId}-${coverFrom}-${coverTo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Cover page generated' });
      setOpenCoverPage(false);
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setCoverLoading(false);
    }
  };

  // Generate Monthly Billing Packet
  const handleGenerateBillingPacket = async () => {
    if (!billingDeptId || !billingFrom || !billingTo) {
      toast({ title: 'Missing fields', description: 'Select department and dates.', variant: 'destructive' });
      return;
    }

    // Validate required manual fields if template requires them
    const requiredMissing: string[] = [];
    const manualMappings = billingTemplateDetails?.fieldMappings?.filter((m) => (m.sourceCollection || '') === 'manual') || [];
    manualMappings.forEach((m) => {
      const key = m.sourceField || m.fieldName;
      const isReq = m.validation?.required ?? m.isRequired;
      if (isReq) {
        const val = billingManualData[key];
        const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '') === true;
        if (isEmpty) requiredMissing.push(m.uiLabel || m.fieldName);
      }
    });
    if (requiredMissing.length) {
      toast({ title: 'Missing required fields', description: requiredMissing.join(', '), variant: 'destructive' });
      return;
    }

    setBillingLoading(true);
    try {
      const res = await secureRequest('/api/department-packet', {
        method: 'POST',
        body: JSON.stringify({ departmentId: billingDeptId, fromDate: billingFrom, toDate: billingTo, includeInactive: billingIncludeInactive, manualData: billingManualData })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate billing packet');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Department-Packet-${billingDeptId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Billing packet generated' });
      setOpenBillingPacket(false);
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message || String(e), variant: 'destructive' });
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: "Invoices" }]}
        className="mb-4"
      />

      {/* Header */}
      <div id="main-content" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track all invoice submissions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Reports Menu - hidden for Subconsultants */}
          {user?.role !== 'Subconsultant' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <Layers className="mr-2 h-4 w-4" /> Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setOpenCoverPage(true)}>
                  <FileBox className="mr-2 h-4 w-4" /> Generate Cover Pages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenInvoices(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Generate PDF Invoices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenTimecard(true)}>
                  <ClipboardList className="mr-2 h-4 w-4" /> Generate Time Card Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenSummary(true)}>
                  <FileText className="mr-2 h-4 w-4" /> Overall Projects Summary Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenBillingPacket(true)}>
                  <FileArchive className="mr-2 h-4 w-4" /> Generate Monthly Billing Packet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {selectedInvoices.length > 0 && (
            <Button 
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedInvoices.length})
            </Button>
          )}
          <DepartmentalCompilationDialog
            departments={departments}
            onCompile={handleDepartmentalCompilation}
          />
          <NewInvoiceDialog 
            projects={projects}
            departments={departments}
          />
        </div>
      </div>

      {/* Placeholder modals, to be implemented next */}
      {/* Cover Pages Wizard */}
      <Dialog open={openCoverPage} onOpenChange={setOpenCoverPage}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Generate Cover Pages</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[78vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={coverDeptId} onValueChange={setCoverDeptId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.departmentName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={coverFrom} onChange={(e) => setCoverFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={coverTo} onChange={(e) => setCoverTo(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium">Assigned Template</div>
              <div className="text-muted-foreground">{coverTemplate?.templateName || 'None found (Global or Department)'}</div>
            </div>

            <ScrollArea className="h-[48vh] pr-2">
              {renderManualFields()}
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenCoverPage(false)} disabled={coverLoading}>Cancel</Button>
              <Button onClick={handleGenerateCover} disabled={coverLoading || !coverDeptId || !coverFrom || !coverTo}>
                {coverLoading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Invoices Wizard */}
      <Dialog open={openInvoices} onOpenChange={setOpenInvoices}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Generate Invoices</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">Coming soon</div>
        </DialogContent>
      </Dialog>
      {/* Time Card Wizard */}
      <Dialog open={openTimecard} onOpenChange={setOpenTimecard}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Generate Time Card</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">Coming soon</div>
        </DialogContent>
      </Dialog>
      {/* Summary Wizard */}
      {/* Overall Projects Summary Dialog */}
      <OverallProjectsSummaryDialog
        open={openSummary}
        onOpenChange={setOpenSummary}
        departments={departments}
        contracts={contracts || []}
      />
      {/* Billing Packet Wizard */}
      <Dialog open={openBillingPacket} onOpenChange={setOpenBillingPacket}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Generate Billing Packet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[78vh]">
            {/* Info: what will be generated */}
            <div className="rounded-md border p-3 text-sm text-muted-foreground bg-muted/50">
              <div className="font-medium text-foreground/80 mb-1">What will be generated</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cover Page (uses the manual fields below)</li>
                <li>Department Summary</li>
                <li>
                  Projects with invoices in the selected date range:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Invoices (PDF)</li>
                    <li>Labor Reports</li>
                    <li>Attachments</li>
                  </ul>
                </li>
              </ul>
              <div className="mt-2">Projects without invoices are not included. Use “Include inactive projects” to also include inactive ones.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={billingDeptId} onValueChange={setBillingDeptId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.departmentName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={billingFrom} onChange={(e) => setBillingFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={billingTo} onChange={(e) => setBillingTo(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium text-sm">Include inactive projects</div>
                <div className="text-xs text-muted-foreground">Include projects marked inactive in the packet</div>
              </div>
              <Switch checked={billingIncludeInactive} onCheckedChange={setBillingIncludeInactive} />
            </div>

            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium">Assigned Template</div>
              <div className="text-muted-foreground">{billingTemplate?.templateName || 'None found (Global or Department)'}</div>
            </div>

            <ScrollArea className="h-[40vh] pr-2">
              {/* Render manual fields for Billing Packet Cover Page */}
              {(() => {
                const mappings = billingTemplateDetails?.fieldMappings?.filter((m) => (m.sourceCollection || '') === 'manual') || [];
                if (!mappings.length) return null;
                const sorted = [...mappings].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const groups = sorted.reduce<Record<string, typeof sorted>>((acc, m) => {
                  const sec = m.section || 'Details';
                  if (!acc[sec]) acc[sec] = [] as any;
                  acc[sec].push(m);
                  return acc;
                }, {});
                const setValue = (key: string, value: any) => setBillingManualData((prev) => ({ ...prev, [key]: value }));
                return (
                  <div className="space-y-6">
                    {Object.entries(groups).map(([section, fields]) => (
                      <div key={section} className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">{section}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fields.map((m) => {
                            const key = m.sourceField || m.fieldName;
                            const label = m.uiLabel || m.fieldName;
                            const required = m.validation?.required ?? m.isRequired;
                            const inputType = m.inputType || 'text';
                            const placeholder = m.placeholder || '';
                            const help = m.helpText || '';
                            const val = billingManualData[key] ?? '';
                            const staticOptions = m.options && m.options.length ? m.options : (m.optionsSource?.staticOptions || []);
                            return (
                              <div key={key} className="space-y-1">
                                <Label className="flex items-center gap-1">{label}{required ? <span className="text-destructive">*</span> : null}</Label>
                                {inputType === 'textarea' && (
                                  <Textarea value={val} placeholder={placeholder} onChange={(e) => setValue(key, e.target.value)} />
                                )}
                                {inputType === 'text' && (
                                  <Input value={val} placeholder={placeholder} onChange={(e) => setValue(key, e.target.value)} />
                                )}
                                {inputType === 'number' && (
                                  <Input type="number" value={val} placeholder={placeholder} onChange={(e) => setValue(key, e.target.value)} />
                                )}
                                {inputType === 'currency' && (
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input type="number" className="pl-7" value={val} placeholder={placeholder || '0.00'} onChange={(e) => setValue(key, e.target.value)} />
                                  </div>
                                )}
                                {inputType === 'date' && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn("w-full justify-start text-left font-normal", !val && "text-muted-foreground")}
                                        type="button"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {val ? new Date(val).toLocaleDateString() : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={val ? new Date(val) : undefined}
                                        onSelect={(d) => d && setValue(key, new Date(d.setHours(0,0,0,0)).toISOString().slice(0,10))}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )}
                                {inputType === 'select' && (
                                  <Select value={val} onValueChange={(v) => setValue(key, v)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={placeholder || 'Select'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {staticOptions.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                {inputType === 'checkbox' && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(val)}
                                      onChange={(e) => setValue(key, e.target.checked)}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{placeholder || label}</span>
                                  </div>
                                )}
                                {inputType === 'signature' && (
                                  <SignaturePad value={val} onChange={(data) => setValue(key, data)} />
                                )}
                                {inputType === 'image' && (
                                  <div className="space-y-2">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => setValue(key, reader.result as string);
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                    {val ? <img src={val} alt={label} className="h-24 w-auto rounded border" /> : null}
                                  </div>
                                )}
                                {help && inputType !== 'checkbox' ? (
                                  <div className="text-xs text-muted-foreground">{help}</div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenBillingPacket(false)} disabled={billingLoading}>Cancel</Button>
              <Button onClick={handleGenerateBillingPacket} disabled={billingLoading || !billingDeptId || !billingFrom || !billingTo}>
                {billingLoading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.approvedInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border overflow-visible">
        <CardContent className="py-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-auto">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <Input
                id="search"
                placeholder="Search invoices, project, submitter"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full sm:w-60 md:w-[280px]"
              />
            </div>

            <div>
              <Label className="sr-only">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="sr-only">Payment Status</Label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Payment Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="write_off">Write-Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {user?.role !== 'Subconsultant' && (
              <div>
                <Label className="sr-only">Company</Label>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent className="z-50 max-h-64">
                    <SelectItem value="all">All Companies</SelectItem>
                    {availableCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="sr-only">Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-9 w-[220px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-64">
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div>
                <Label className="sr-only">From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-40" />
              </div>
              <span className="text-muted-foreground text-sm">to</span>
              <div>
                <Label className="sr-only">To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-40" />
              </div>
            </div>

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPaymentStatusFilter("all");
                  setCompanyFilter("all");
                  setProjectFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.length > 0 && selectedInvoices.length === filteredInvoices.filter(inv => ['draft', 'submitted', 'approved'].includes(inv.status)).length}
                      onChange={toggleSelectAll}
                      disabled={filteredInvoices.filter(inv => ['draft', 'submitted', 'approved'].includes(inv.status)).length === 0}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Submitter</TableHead>
                  {user?.role !== 'Subconsultant' && <TableHead>Company</TableHead>}
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {/* New: Payment Status column */}
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={invoice.id ? selectedInvoices.includes(invoice.id) : false}
                        onChange={() => invoice.id && toggleInvoiceSelection(invoice.id)}
                        disabled={!['draft', 'submitted', 'approved'].includes(invoice.status) || !invoice.id}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber || `INV-${invoice.id?.substring(0, 8) || 'DRAFT'}`}
                    </TableCell>
                    <TableCell>{invoice.projectName}</TableCell>
                    <TableCell>{invoice.submitterName}</TableCell>
                    {user?.role !== 'Subconsultant' && (
                      <TableCell>{invoice.companyName}</TableCell>
                    )}
                    <TableCell className="font-semibold">
                      {formatCurrency(invoice.invoiceTotal || 0)}
                    </TableCell>
                    {/* Workflow Status */}
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[420px]">
                        <Badge 
                          variant="outline" 
                          className={statusColors[invoice.status] || statusColors.draft}
                        >
                          {invoice.status}
                        </Badge>
                        {invoice.status === 'rejected' && invoice.rejectedNotes ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 truncate" title={invoice.rejectedNotes}>
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            {invoice.rejectedNotes}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    {/* New: Payment Status */}
                    <TableCell>
                      {invoice.paymentStatus ? (
                        <Badge
                          variant="outline"
                          className={paymentStatusColors[invoice.paymentStatus] || ''}
                        >
                          {invoice.paymentStatus === 'partially_paid' ? 'Partially Paid' : (
                            invoice.paymentStatus === 'write_off' ? 'Write-Off' : invoice.paymentStatus
                          )}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    {/* Due Date and Actions remain unchanged */}
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                                               <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting || actionLoadingId === invoice.id}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View/Edit
                          </DropdownMenuItem>

                          {/* Submit/Resubmit for author */}
                          {canSubmit(invoice) && invoice.id && (
                            <DropdownMenuItem onClick={() => handleSubmitForReview(invoice.id!)} disabled={actionLoadingId === invoice.id}>
                              <Send className="mr-2 h-4 w-4" />
                              {invoice.status === 'rejected' ? 'Resubmit' : 'Submit for Review'}
                            </DropdownMenuItem>
                          )}

                          {/* Approve/Reject for Admin/Prime */}
                          {canApprove(invoice) && invoice.id && (
                            <DropdownMenuItem onClick={() => handleApprove(invoice.id!)} disabled={actionLoadingId === invoice.id}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          {canReject(invoice) && invoice.id && (
                            <DropdownMenuItem onClick={() => openRejectDialog(invoice.id!, invoice.status)} disabled={actionLoadingId === invoice.id}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject...
                            </DropdownMenuItem>
                          )}

                          {/* PDF actions */}
                          {/* Restrict download to Admin/Prime */}
                          {isAdminOrPrime && invoice.pdfUrl ? (
                            <DropdownMenuItem onClick={() => {
                              const sanitizedUrl = invoice.pdfUrl?.replace(/[<>"']/g, '');
                              if (sanitizedUrl) window.open(sanitizedUrl, '_blank');
                            }}>
                              <Download className="mr-2 h-4 w-4" />
                              Download Generated PDF
                            </DropdownMenuItem>
                          ) : null}
                          {canGeneratePdf(invoice) && invoice.id && (
                            <DropdownMenuItem onClick={() => handleGenerateApprovedPdf(invoice.id!)} disabled={actionLoadingId === invoice.id}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Generate/ReGenerate PDF
                            </DropdownMenuItem>
                          )}
                          {canRestorePdf(invoice) && (
                            <DropdownMenuItem onClick={() => openRestoreDialog(invoice)} disabled={actionLoadingId === invoice.id}>
                              <History className="mr-2 h-4 w-4" />
                              Restore PDF Version...
                            </DropdownMenuItem>
                          )}

                          {isAdminOrPrime && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openPaymentDrawer(invoice)}>
                                <DollarSign className="mr-2 h-4 w-4" /> Manage Payment...
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuSeparator />
                          {['draft', 'submitted', 'approved'].includes(invoice.status) && invoice.id && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => invoice.id && confirmDeleteInvoice(invoice.id, invoice.status)}
                              disabled={isDeleting || actionLoadingId === invoice.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8">
              {debouncedSearchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || companyFilter !== 'all' || projectFilter !== 'all' || dateFrom || dateTo ? (
                <div className="text-center py-12">
                  <div className="rounded-full bg-muted p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    No invoices match your current filters. Try adjusting your search criteria or clear the filters to see all invoices.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setPaymentStatusFilter("all");
                        setCompanyFilter("all");
                        setProjectFilter("all");
                        setDateFrom("");
                        setDateTo("");
                      }}
                    >
                      Clear Filters
                    </Button>
                    <NewInvoiceDialog
                      projects={projects}
                      departments={departments}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="rounded-full bg-muted p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    {user?.role === 'Subconsultant'
                      ? "Get started by creating your first invoice. You can track payments, generate PDFs, and manage approvals all in one place."
                      : "No invoices have been created yet. Create your first invoice to get started tracking payments and approvals."
                    }
                  </p>
                  <NewInvoiceDialog
                    projects={projects}
                    departments={departments}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Invoice
            </AlertDialogTitle>
            <AlertDialogDescription>
              {invoiceToDelete?.status === 'draft' ? (
                "Are you sure you want to delete this draft invoice? This action cannot be undone."
              ) : (
                <span>
                  <strong>Warning:</strong> You are about to delete a {invoiceToDelete?.status} invoice. 
                  This is a permanent action that cannot be undone and may affect financial records.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => invoiceToDelete && handleDeleteInvoice(invoiceToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Multiple Invoices
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span>
                <strong>Warning:</strong> You are about to delete {selectedInvoices.length} invoice(s). 
                This action cannot be undone and may include submitted or approved invoices that affect financial records.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMultipleInvoices}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedInvoices.length} Invoice(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Invoice
            </AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejection. Authors will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this invoice is rejected" />
            {rejectTarget?.status === 'approved' && (
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
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoadingId !== null}>
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
            {restoreTarget?.versions?.length ? (
              <div className="space-y-2">
                {restoreTarget.versions.map((v: any) => (
                  <div key={v.version} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <div className="font-medium">Version v{v.version} <span className="text-xs text-muted-foreground">({v.type})</span></div>
                      <div className="text-xs text-muted-foreground">{typeof v.createdAt === 'string' ? new Date(v.createdAt).toLocaleString() : (v.createdAt?.seconds ? new Date(v.createdAt.seconds * 1000).toLocaleString() : '')}</div>
                      <div className="text-xs truncate max-w-[320px]">{v.fileName}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleRestoreVersion(v.version)} disabled={actionLoadingId === restoreTarget?.id}>
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

      {/* Replace inline AP/Payment Side Drawer with shared PaymentDrawer */}
      <PaymentDrawer open={paymentDrawerOpen} onOpenChange={setPaymentDrawerOpen} invoice={paymentTarget} />
    </>
  );
}
