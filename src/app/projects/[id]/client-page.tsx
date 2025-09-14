"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { IconTrendingUp, IconCash, IconClock, IconFileText, IconUsers } from "@tabler/icons-react";
import { ArrowLeft } from "lucide-react";
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

// Dynamic import for file manager
const ProjectFileManager = dynamic(() => import("@/components/project-file-manager"), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">Loading file manager...</div>
});

// Dynamic import for team management
const ProjectTeamManagement = dynamic(() => import("@/components/project-team-management").then(mod => ({ default: mod.ProjectTeamManagement })), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">Loading team management...</div>
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
  const [activeTab, setActiveTab] = useState("overview");

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


  return (
    <>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
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
          </div>

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
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{invoice.invoiceNumber || `INV-${index + 1}`}</TableCell>
                        <TableCell>
                          {invoice.toDate ? new Date(typeof invoice.toDate === 'string' ? invoice.toDate : invoice.toDate.seconds * 1000).toLocaleDateString() : '--'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(invoice.invoiceTotal || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={(invoice.status === 'Paid' || invoice.status === 'Approved') ? "default" : "secondary"}>
                            {(invoice.status === 'Paid' || invoice.status === 'Approved') ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate ? new Date(typeof invoice.dueDate === 'string' ? invoice.dueDate : invoice.dueDate.seconds * 1000).toLocaleDateString() : '--'}
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
    </>
  );
}
