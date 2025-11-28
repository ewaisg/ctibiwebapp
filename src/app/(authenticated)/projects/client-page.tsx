"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconCash, IconBriefcase, IconClock, IconTrendingUp } from "@tabler/icons-react";
import { Pie, PieChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal,
  X,
  FileText,
  Calendar,
  Search,
  Download,
  Loader2
} from "lucide-react";
import type { Project, Department } from "@/types";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

const statusColors: { [key: string]: string } = {
  Active: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  Inactive: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
  Complete: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
};

interface ProjectsClientPageProps {
  initialProjects: Project[];
  departments: Department[];
}

// Chart configurations
const departmentChartConfig = {
  projects: {
    label: "Projects",
  },
} satisfies ChartConfig;

const budgetChartConfig = {
  budget: {
    label: "Budget",
    color: "var(--chart-1)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function ProjectsClientPage({ initialProjects, departments }: ProjectsClientPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params
  const [filters, setFilters] = useState({
    projectManager: searchParams.get("manager") || "all",
    departmentId: searchParams.get("dept") || "all",
    showInactive: searchParams.get("inactive") === "true",
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleFilterChange = (key: keyof typeof filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Update URL when filters/search change
  useMemo(() => {
    const params = new URLSearchParams();
    if (filters.projectManager !== "all") params.set("manager", filters.projectManager);
    if (filters.departmentId !== "all") params.set("dept", filters.departmentId);
    if (filters.showInactive) params.set("inactive", "true");
    if (searchQuery) params.set("search", searchQuery);

    const queryString = params.toString();
    const newUrl = queryString ? `/projects?${queryString}` : '/projects';

    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [filters, searchQuery, router]);

  const clearFilters = () => {
    setFilters({
      projectManager: "all",
      departmentId: "all",
      showInactive: false,
    });
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleArchiveProject = async () => {
    if (!archivingProject) return;

    setIsArchiving(true);
    try {
      const response = await fetch(`/api/projects/${archivingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInactive: !archivingProject.isInactive }),
      });

      if (!response.ok) throw new Error('Failed to update project');

      toast.success(
        archivingProject.isInactive
          ? 'Project activated successfully'
          : 'Project archived successfully'
      );

      // Refresh the page to show updated data
      router.refresh();
      setArchivingProject(null);
    } catch (error) {
      toast.error('Failed to update project');
      console.error(error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportProjects = () => {
    const csvRows: string[] = [];
    csvRows.push("Project Export - " + new Date().toISOString());
    csvRows.push("");
    csvRows.push("Project Name,Department,Status,PO Number,Budget,Project Manager");

    filteredProjects.forEach(project => {
      const deptCode = project.departmentCode || (
        departments.find(d => {
          const projectDeptId = typeof project.departmentId === 'string' ? project.departmentId : project.departmentId?.id;
          return d.id === projectDeptId;
        })?.departmentCode
      ) || 'N/A';

      const status = getProjectStatus(project);
      const budget = project.newPoAmount || project.originalPoAmount || 0;

      csvRows.push([
        `"${project.projectName}"`,
        deptCode,
        status,
        project.poNumber || 'N/A',
        budget.toString(),
        project.projectManager || 'N/A'
      ].join(','));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredProjects = useMemo(() => {
    if (!initialProjects.length) return [];

    return initialProjects.filter(project => {
      // Filter by inactive
      if (!filters.showInactive && project.isInactive) {
        return false;
      }

      // Filter by project manager
      if (filters.projectManager !== 'all' && project.projectManager !== filters.projectManager) {
        return false;
      }

      // Filter by department
      if (filters.departmentId !== 'all') {
        const projectDeptId = typeof project.departmentId === 'string'
          ? project.departmentId
          : project.departmentId?.id;
        if (projectDeptId !== filters.departmentId) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = project.projectName?.toLowerCase().includes(query);
        const matchesPO = project.poNumber?.toLowerCase().includes(query);
        const matchesManager = project.projectManager?.toLowerCase().includes(query);

        if (!matchesName && !matchesPO && !matchesManager) {
          return false;
        }
      }

      return true;
    });
  }, [initialProjects, filters, searchQuery]);

  // Paginated projects
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProjects.slice(startIndex, endIndex);
  }, [filteredProjects, currentPage]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  const projectManagers = useMemo(() => {
    if (!initialProjects.length) return [];
    return [...new Set(initialProjects.map(p => p.projectManager).filter(Boolean))] as string[];
  }, [initialProjects]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeProjects = initialProjects.filter(p => !p.isInactive);
    
    const totalBudget = initialProjects.reduce((sum, p) => {
      const budget = p.newPoAmount || p.originalPoAmount || 0;
      return sum + budget;
    }, 0);
    
    const totalInvoiced = initialProjects.reduce((sum, p) => {
      return sum + (p.previouslyInvoicedAmount || 0);
    }, 0);
    
    const utilizationRate = totalBudget > 0 ? ((totalInvoiced / totalBudget) * 100).toFixed(1) : '0';

    return {
      totalProjects: initialProjects.length,
      activeProjects: activeProjects.length,
      totalBudget,
      utilizationRate: `${utilizationRate}%`,
    };
  }, [initialProjects]);

  // Calculate chart data
  const departmentChartData = useMemo(() => {
    if (!initialProjects.length || !departments.length) return [];
    
    const deptCounts = departments.reduce((acc, dept) => {
      const count = initialProjects.filter(project => {
        const projectDeptId = typeof project.departmentId === 'string' 
          ? project.departmentId 
          : project.departmentId?.id;
        return projectDeptId === dept.id;
      }).length;
      
      if (count > 0) {
        acc.push({
          department: dept.departmentName,
          projects: count,
          fill: `var(--chart-${Math.min(acc.length + 1, 5)})`,
        });
      }
      return acc;
    }, [] as Array<{ department: string; projects: number; fill: string }>);
    
    return deptCounts;
  }, [initialProjects, departments]);

  const topProjectsChartData = useMemo(() => {
    if (!initialProjects.length) return [];
    
    const projectsWithBudget = initialProjects
      .filter(project => project.projectName && typeof project.projectName === 'string') // Filter out projects without valid names
      .map(project => {
        const budget = project.newPoAmount || project.originalPoAmount || 0;
        const deptCode = departments.find(d => {
          const projectDeptId = typeof project.departmentId === 'string' 
            ? project.departmentId 
            : project.departmentId?.id;
          return d.id === projectDeptId;
        })?.departmentCode || 'N/A';
        
        const projectName = project.projectName || 'Unnamed Project';
        
        return {
          projectName: projectName.length > 20 ? 
            projectName.substring(0, 20) + '...' : 
            projectName,
          budget,
          departmentCode: deptCode,
          displayName: `${projectName} (${deptCode})`,
        };
      })
      .filter(p => p.budget > 0)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 6);
    
    return projectsWithBudget;
  }, [initialProjects, departments]);

  const getProjectStatus = (project: Project) => {
    return project.isInactive ? "Inactive" : "Active";
  };

  const handleRowClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  // Show empty state if no data
  if (!initialProjects.length) {
    return (
      <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Projects</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                0
              </CardTitle>
              <CardAction>
                <IconBriefcase />
              </CardAction>
            </CardHeader>
          </Card>
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Active Projects</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                0
              </CardTitle>
              <CardAction>
                <IconClock />
              </CardAction>
            </CardHeader>
          </Card>
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Budget</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                $0
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
                0%
              </CardTitle>
              <CardAction>
                <IconTrendingUp />
              </CardAction>
            </CardHeader>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="h-[220px] p-6 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <IconBriefcase className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Project Status Chart</p>
                <p className="text-sm">Will display when projects are available</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="h-[220px] p-6 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <IconTrendingUp className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Budget Trends Chart</p>
                <p className="text-sm">Will display when projects are available</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty Projects Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>No projects found in the system</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <IconBriefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects to display</p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: "Projects" }]}
        className="mb-4"
      />

      {/* Page Header */}
      <div id="main-content" className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          View and manage all projects across departments
        </p>
      </div>

      {/* KPI Cards - Following exact dashboard structure */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Projects</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metrics.totalProjects.toLocaleString()}
            </CardTitle>
            <CardAction>
              <IconBriefcase />
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Active Projects</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metrics.activeProjects.toLocaleString()}
            </CardTitle>
            <CardAction>
              <IconClock />
            </CardAction>
          </CardHeader>
        </Card>

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
              {metrics.utilizationRate}
            </CardTitle>
            <CardAction>
              <IconTrendingUp />
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Section - Following dashboard structure */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Projects by Department Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-2">
            <CardTitle>Projects by Department</CardTitle>
            <CardDescription>Distribution across departments</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            {departmentChartData.length > 0 ? (
              <div className="px-2 sm:px-4">
                <ChartContainer config={departmentChartConfig} className="mx-auto w-full">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={departmentChartData}
                        dataKey="projects"
                        nameKey="department"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        cornerRadius={4}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                <div className="text-center">
                  <IconBriefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No data available</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="text-muted-foreground leading-none">
              Total departments with projects: {departmentChartData.length}
            </div>
          </CardFooter>
        </Card>

        {/* Top Projects by Budget Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Projects by Budget</CardTitle>
            <CardDescription>Highest value projects with department codes</CardDescription>
          </CardHeader>
          <CardContent>
            {topProjectsChartData.length > 0 ? (
              <div className="px-2 sm:px-4">
                <ChartContainer config={budgetChartConfig} className="w-full">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart accessibilityLayer data={topProjectsChartData} layout="vertical" margin={{ right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid horizontal={false} />
                      <YAxis dataKey="projectName" type="category" tickLine={false} tickMargin={8} axisLine={false} hide />
                      <XAxis dataKey="budget" type="number" hide />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                      <Bar dataKey="budget" layout="vertical" fill="var(--color-budget)" radius={4} barSize={24} maxBarSize={28}>
                        <LabelList dataKey="displayName" position="insideLeft" offset={8} className="fill-[--color-label]" fontSize={11} />
                        <LabelList
                          dataKey="budget"
                          position="right"
                          offset={6}
                          className="fill-foreground"
                          fontSize={11}
                          formatter={(value: number) =>
                            new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(value)
                          }
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground">
                <div className="text-center">
                  <IconTrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No budget data available</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="text-muted-foreground leading-none">
              Showing top {topProjectsChartData.length} projects by budget value
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Filters and Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Projects Data</CardTitle>
              <CardDescription>
                {filteredProjects.length} of {initialProjects.length} projects
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportProjects}
              disabled={filteredProjects.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by name, PO number, or manager..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
            <Select value={filters.projectManager} onValueChange={value => handleFilterChange('projectManager', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Project Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {projectManagers.map(pm => (
                  <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.departmentId} onValueChange={value => handleFilterChange('departmentId', value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.departmentName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={filters.showInactive}
                onCheckedChange={value => handleFilterChange('showInactive', value)}
              />
              <Label htmlFor="show-inactive" className="text-sm">Show Inactive</Label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>

          {/* Data Table */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IconBriefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects match your filters</p>
              <p className="text-sm">Try adjusting your filter criteria</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Project Name</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">PO #</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProjects.map((project) => {
                    const status = getProjectStatus(project);
                    const deptCode = project.departmentCode || (
                      departments.find(d => {
                        const projectDeptId = typeof project.departmentId === 'string' ? project.departmentId : project.departmentId?.id;
                        return d.id === projectDeptId;
                      })?.departmentCode
                    ) || 'N/A';

                    return (
                      <TableRow
                        key={project.id}
                        onClick={() => handleRowClick(project.id)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-medium py-4">
                          {project.projectName}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {deptCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-medium", statusColors[status])}
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-mono text-sm">{project.poNumber}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onSelect={() => handleRowClick(project.id)}
                                className="cursor-pointer"
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setEditingProject(project)}
                                className="cursor-pointer"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Edit Project
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setArchivingProject(project)}
                                className="cursor-pointer text-destructive"
                              >
                                <X className="mr-2 h-4 w-4" />
                                {project.isInactive ? 'Activate' : 'Archive'} Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of{" "}
                {filteredProjects.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Make changes to {editingProject?.projectName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Full project editing functionality will be implemented here.
              For now, you can view project details by clicking "View Details".
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Close
            </Button>
            <Button onClick={() => handleRowClick(editingProject?.id || '')}>
              View Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Project Dialog */}
      <AlertDialog open={!!archivingProject} onOpenChange={() => setArchivingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archivingProject?.isInactive ? 'Activate' : 'Archive'} Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {archivingProject?.isInactive ? 'activate' : 'archive'}{" "}
              <strong>{archivingProject?.projectName}</strong>?
              {!archivingProject?.isInactive && (
                <span className="block mt-2">
                  This will hide the project from the default view. You can reactivate it later.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveProject}
              disabled={isArchiving}
              className={!archivingProject?.isInactive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isArchiving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {archivingProject?.isInactive ? 'Activating...' : 'Archiving...'}
                </>
              ) : (
                archivingProject?.isInactive ? 'Activate' : 'Archive'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
