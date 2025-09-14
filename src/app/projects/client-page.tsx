"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconCash, IconBriefcase, IconClock, IconTrendingUp } from "@tabler/icons-react";
import { Pie, PieChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  MoreHorizontal, 
  X, 
  FileText,
  Calendar
} from "lucide-react";
import type { Project, Department } from "@/types";
import { cn } from "@/lib/utils";
// import { toast } from "@/hooks/use-toast"; // Currently unused

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
  const [filters, setFilters] = useState({
    projectManager: "all",
    departmentId: "all",
    showInactive: false,
  });

  const handleFilterChange = (key: keyof typeof filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      projectManager: "all",
      departmentId: "all",
      showInactive: false,
    });
  };

  const filteredProjects = useMemo(() => {
    if (!initialProjects.length) return [];
    
    return initialProjects.filter(project => {
      if (!filters.showInactive && project.isInactive) {
        return false;
      }
      if (filters.projectManager !== 'all' && project.projectManager !== filters.projectManager) {
        return false;
      }
      if (filters.departmentId !== 'all') {
        const projectDeptId = typeof project.departmentId === 'string' 
          ? project.departmentId 
          : project.departmentId?.id;
        if (projectDeptId !== filters.departmentId) {
          return false;
        }
      }
      return true;
    });
  }, [initialProjects, filters]);

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="min-h-[300px] flex-1 rounded-xl bg-muted/50 md:min-h-min p-8 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <IconBriefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Project Status Chart</p>
              <p className="text-sm">Will display when projects are available</p>
            </div>
          </div>
          <div className="min-h-[300px] flex-1 rounded-xl bg-muted/50 md:min-h-min p-8 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <IconTrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Budget Trends Chart</p>
              <p className="text-sm">Will display when projects are available</p>
            </div>
          </div>
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
          <CardHeader className="items-center pb-0">
            <CardTitle>Projects by Department</CardTitle>
            <CardDescription>Distribution across departments</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {departmentChartData.length > 0 ? (
              <ChartContainer
                config={departmentChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie 
                    data={departmentChartData} 
                    dataKey="projects" 
                    nameKey="department" 
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
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
          <CardHeader>
            <CardTitle>Top Projects by Budget</CardTitle>
            <CardDescription>Highest value projects with department codes</CardDescription>
          </CardHeader>
          <CardContent>
            {topProjectsChartData.length > 0 ? (
              <ChartContainer config={budgetChartConfig}>
                <BarChart
                  accessibilityLayer
                  data={topProjectsChartData}
                  layout="vertical"
                  margin={{
                    right: 16,
                  }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="projectName"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    hide
                  />
                  <XAxis dataKey="budget" type="number" hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Bar
                    dataKey="budget"
                    layout="vertical"
                    fill="var(--color-budget)"
                    radius={4}
                  >
                    <LabelList
                      dataKey="displayName"
                      position="insideLeft"
                      offset={8}
                      className="fill-[--color-label]"
                      fontSize={12}
                    />
                    <LabelList
                      dataKey="budget"
                      position="right"
                      offset={8}
                      className="fill-foreground"
                      fontSize={12}
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
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projects Data</CardTitle>
              <CardDescription>
                {filteredProjects.length} of {initialProjects.length} projects
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    <TableHead className="font-semibold">PMIS #</TableHead>
                    <TableHead className="font-semibold">PO #</TableHead>
                    <TableHead className="font-semibold">Project Manager</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">PO Amount</TableHead>
                    <TableHead className="font-semibold text-right">Remaining</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const status = getProjectStatus(project);
                    const poAmount = project.newPoAmount || project.originalPoAmount || 0;
                    const remaining = project.remainingPoAmount || 0;
                    
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
                            {project.pmisNumber || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-mono text-sm">{project.poNumber}</span>
                        </TableCell>
                        <TableCell className="py-4">{project.projectManager || 'N/A'}</TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs font-medium", statusColors[status])}
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4 font-semibold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(poAmount)}
                        </TableCell>
                        <TableCell className="text-right py-4 font-semibold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(remaining)}
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
                              <DropdownMenuItem className="cursor-pointer">
                                <Calendar className="mr-2 h-4 w-4" />
                                Edit Project
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer text-destructive">
                                <X className="mr-2 h-4 w-4" />
                                Archive Project
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
        </CardContent>
      </Card>
    </>
  );
}
