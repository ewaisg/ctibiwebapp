"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { IconTrendingUp, IconCash, IconClock, IconFileText, IconUsers } from "@tabler/icons-react";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project, Department, Invoice, Company, Employee, Service } from "@/types";
import { cn } from "@/lib/utils";
// Add shared payment drawer
import { PaymentDrawer } from "@/components/payment-drawer";

// Loading skeleton for dynamic components
function DynamicComponentSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}

// Dynamic import for file manager
const ProjectFileManager = dynamic(() => import("@/components/project-file-manager"), {
  ssr: false,
  loading: () => <DynamicComponentSkeleton />
});

// Dynamic import for team management
const ProjectTeamManagement = dynamic(() => import("@/components/project-team-management").then(mod => ({ default: mod.ProjectTeamManagement })), {
  ssr: false,
  loading: () => <DynamicComponentSkeleton />
});

interface ProjectDetailClientPageProps {
  project: Project;
  departments: Department[];
  invoices: Invoice[];
  companies: Company[];
  employees: Employee[];
  services: Service[];
}

const statusColors: { [key: string]: string } = {
  Active: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  Inactive: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
};

const paymentStatusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  partially_paid: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  unpaid: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  pending: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
  write_off: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
};

// Chart configurations
const budgetChartConfig = {
  budgeted: {
    label: "Budgeted",
    color: "var(--chart-1)",
  },
  invoiced: {
    label: "Invoiced",
    color: "var(--chart-2)",
  },
  remaining: {
    label: "Remaining",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const hoursChartConfig = {
  budgeted: {
    label: "Budgeted Hours",
    color: "var(--chart-1)",
  },
  used: {
    label: "Used Hours", 
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ProjectDetailClientPage({ project, departments, invoices, companies, employees, services }: ProjectDetailClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize tab from URL param
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  // New: local payment drawer state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab !== "overview") {
      params.set("tab", activeTab);
    } else {
      params.delete("tab");
    }

    const queryString = params.toString();
    const newUrl = queryString
      ? `/projects/${project.id}?${queryString}`
      : `/projects/${project.id}`;

    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [activeTab, project.id, router, searchParams]);

  // Find department info
  const department = departments.find(d => {
    const projectDeptId = typeof project.departmentId === 'string' 
      ? project.departmentId 
      : project.departmentId?.id;
    return d.id === projectDeptId;
  });

  // Calculate project metrics
  const metrics = useMemo(() => {
    const totalBudget = project.newPoAmount || project.originalPoAmount || 0;
    const totalInvoiced = project.previouslyInvoicedAmount || 0;
    const remaining = project.remainingPoAmount || (totalBudget - totalInvoiced);
    const budgetUtilization = totalBudget > 0 ? ((totalInvoiced / totalBudget) * 100) : 0;
    
    const budgetedHours = project.budgetedHours || 0;
    const usedHours = project.usedHours || 0;
    const remainingHours = project.remainingHours || (budgetedHours - usedHours);
    const hoursUtilization = budgetedHours > 0 ? ((usedHours / budgetedHours) * 100) : 0;

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid' || inv.status === 'Approved').length;
    const pendingInvoices = totalInvoices - paidInvoices;

    return {
      totalBudget,
      totalInvoiced,
      remaining,
      budgetUtilization,
      budgetedHours,
      usedHours,
      remainingHours,
      hoursUtilization,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
    };
  }, [project, invoices]);

  // Budget breakdown chart data
  const budgetChartData = [
    {
      category: "Budgeted",
      amount: metrics.totalBudget,
      fill: "var(--chart-1)",
    },
    {
      category: "Invoiced", 
      amount: metrics.totalInvoiced,
      fill: "var(--chart-2)",
    },
    {
      category: "Remaining",
      amount: metrics.remaining,
      fill: "var(--chart-3)",
    },
  ];

  // Hours comparison data
  const hoursComparisonData = [
    {
      type: "Budgeted",
      hours: metrics.budgetedHours,
    },
    {
      type: "Used",
      hours: metrics.usedHours,
    },
  ];

  const getProjectStatus = () => {
    return project.isInactive ? "Inactive" : "Active";
  };

  const handleBackToProjects = () => {
    router.push('/projects');
  };

  // Professional file management with Syncfusion

  // New: compute project-level payment totals and breakdown
  const paymentTotals = useMemo(() => {
    let totalPaid = 0;
    let totalOutstanding = 0;
    const breakdown: Record<string, number> = { paid: 0, partially_paid: 0, pending: 0, unpaid: 0, write_off: 0 };
    invoices.forEach((inv) => {
      const paid = Number((inv as any).paidAmount || 0);
      const outstanding = Number((inv as any).outstandingAmount ?? Math.max(0, (inv.invoiceTotal || 0) - paid));
      totalPaid += paid;
      totalOutstanding += outstanding;
      const status = (inv as any).paymentStatus as string | undefined;
      if (status && breakdown[status] !== undefined) breakdown[status] += 1;
    });
    return { totalPaid, totalOutstanding, breakdown };
  }, [invoices]);

  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.projectName }
        ]}
        className="mb-4"
      />

      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleBackToProjects} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{project.projectName}</h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span>PO: {project.poNumber}</span>
            <span>PMIS: {project.pmisNumber || 'N/A'}</span>
            {department && <span>Dept: {department.departmentName}</span>}
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", statusColors[getProjectStatus()])}
            >
              {getProjectStatus()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Budget</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(metrics.totalBudget)}
            </CardTitle>
            <CardAction>
              <IconCash />
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Budget Utilization</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metrics.budgetUtilization.toFixed(1)}%
            </CardTitle>
            <CardAction>
              <IconTrendingUp />
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Hours Used</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metrics.usedHours.toLocaleString()}
            </CardTitle>
            <CardAction>
              <IconClock />
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metrics.totalInvoices}
            </CardTitle>
            <CardAction>
              <IconFileText />
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Project Overview */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project Manager</label>
                  <p className="font-medium">{project.projectManager || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="font-medium">{department?.departmentName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Approving Supervisor</label>
                  <p className="font-medium">{project.approvingSupervisor || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contract Number</label>
                  <p className="font-medium">{project.contractNumber || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Budget Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Progress</CardTitle>
                <CardDescription>Financial utilization overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Utilization</span>
                    <span>{metrics.budgetUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.budgetUtilization} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Invoiced</p>
                    <p className="font-semibold text-green-600">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                      }).format(metrics.totalInvoiced)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-semibold text-blue-600">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                      }).format(metrics.remaining)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hours Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Hours Progress</CardTitle>
                <CardDescription>Time utilization overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hours Utilization</span>
                    <span>{metrics.hoursUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.hoursUtilization} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Used</p>
                    <p className="font-semibold text-orange-600">{metrics.usedHours.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-semibold text-purple-600">{metrics.remainingHours.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Budget Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Breakdown</CardTitle>
                <CardDescription>Financial distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={budgetChartConfig} className="mx-auto aspect-square max-h-[250px]">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={budgetChartData}
                      dataKey="amount"
                      nameKey="category"
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Hours Comparison Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Hours Comparison</CardTitle>
                <CardDescription>Budgeted vs Used Hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={hoursChartConfig}>
                  <BarChart data={hoursComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hours" fill="var(--chart-1)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          {/* Invoice Summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5 mb-6">
            <Card>
              <CardHeader>
                <CardDescription>Total Invoices</CardDescription>
                <CardTitle className="text-2xl font-semibold">{metrics.totalInvoices}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Paid Invoices</CardDescription>
                <CardTitle className="text-2xl font-semibold text-green-600">{metrics.paidInvoices}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Pending Invoices</CardDescription>
                <CardTitle className="text-2xl font-semibold text-orange-600">{metrics.pendingInvoices}</CardTitle>
              </CardHeader>
            </Card>
            {/* New: Total Paid */}
            <Card>
              <CardHeader>
                <CardDescription>Total Paid</CardDescription>
                <CardTitle className="text-2xl font-semibold text-emerald-700">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(paymentTotals.totalPaid)}
                </CardTitle>
              </CardHeader>
            </Card>
            {/* New: Total Outstanding */}
            <Card>
              <CardHeader>
                <CardDescription>Total Outstanding</CardDescription>
                <CardTitle className="text-2xl font-semibold text-red-700">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(paymentTotals.totalOutstanding)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* New: Payment Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status Breakdown</CardTitle>
              <CardDescription>Counts by latest payment status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(paymentTotals.breakdown).map(([status, count]) => (
                  <Badge key={status} variant="outline" className={paymentStatusColors[status] || ''}>
                    {status === 'partially_paid' ? 'Partially Paid' : (status === 'write_off' ? 'Write-Off' : status)}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Project Invoices</CardTitle>
              <CardDescription>All invoices related to this project</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{invoice.invoiceNumber || `INV-${index + 1}`}</TableCell>
                        <TableCell>
                          {invoice.toDate ? new Date(typeof invoice.toDate === 'string' ? invoice.toDate : (invoice.toDate as any).seconds * 1000).toLocaleDateString() : '--'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.invoiceTotal || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((invoice as any).paidAmount || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((invoice as any).outstandingAmount ?? Math.max(0, (invoice.invoiceTotal || 0) - ((invoice as any).paidAmount || 0)))}
                        </TableCell>
                        <TableCell>
                          {(invoice as any).paymentStatus ? (
                            <Badge variant="outline" className={paymentStatusColors[(invoice as any).paymentStatus] || ''}>
                              {(invoice as any).paymentStatus === 'partially_paid' ? 'Partially Paid' : (invoice as any).paymentStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate ? new Date(typeof invoice.dueDate === 'string' ? invoice.dueDate : (invoice.dueDate as any).seconds * 1000).toLocaleDateString() : '--'}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Reuse drawer instead of navigating to /invoices */}
                          <Button size="sm" variant="secondary" onClick={() => { setPaymentInvoice(invoice as any); setPaymentOpen(true); }}>
                            Manage Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <IconFileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found for this project</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <ProjectFileManager 
            projectId={project.id}
            files={project.files || []}
            onFilesUpdated={(updatedFiles) => {
              // In a real app, you might want to refresh the project data
              // For now, we'll just update the local state
              project.files = updatedFiles;
            }}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <ProjectTeamManagement
            project={project}
            companies={companies}
            employees={employees}
            services={services}
            onUpdate={async (updatedProject: Project) => {
              // In a real app, you might want to refresh the project data
              Object.assign(project, updatedProject);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Shared Payment Drawer */}
      <PaymentDrawer open={paymentOpen} onOpenChange={setPaymentOpen} invoice={paymentInvoice} />
    </>
  );
}
