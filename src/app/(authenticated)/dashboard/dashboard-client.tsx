"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Download } from "lucide-react";
import { DashboardLoadingSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { SectionCards } from "@/components/section-cards";
import TimeAllocationPie, { type TimeAllocationDatum } from "@/components/dashboard/TimeAllocationPie";
import BillableTrendLine, { type BillableTrendDatum } from "@/components/dashboard/BillableTrendLine";
import BillableHoursForecast, { type BillableHoursForecastDatum } from "@/components/dashboard/BillableHoursForecast";
import UtilizationTrendChart, { type UtilizationTrendDatum } from "@/components/dashboard/UtilizationTrendChart";
import TopEmployeesBar, { type TopEmployeeDatum } from "@/components/dashboard/TopEmployeesBar";
import ProjectHoursStacked, { type ProjectHoursDatum } from "@/components/dashboard/ProjectHoursStacked";
import ProjectBudgetRadial, { type ProjectBudgetDatum } from "@/components/dashboard/ProjectBudgetRadial";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { RevenueOverTimeChart } from "@/components/dashboard/financial/RevenueOverTimeChart";
import { ARAgingTable } from "@/components/dashboard/financial/ARAgingTable";
import { ARDetailTable } from "@/components/dashboard/financial/ARDetailTable";
import { CashProjectionChart } from "@/components/dashboard/financial/CashProjectionChart";
import { ScheduledVsActualChart } from "@/components/dashboard/resource/ScheduledVsActualChart";
import { OverutilizationTrend } from "@/components/dashboard/resource/OverutilizationTrend";
import { OvertimeSignalsList } from "@/components/dashboard/resource/OvertimeSignalsList";
import { UtilizationDetailTable } from "@/components/dashboard/resource/UtilizationDetailTable";
import { HighlightsGrid } from "@/components/dashboard/executive/HighlightsGrid";
import { NarrativeList } from "@/components/dashboard/executive/NarrativeList";
import { HotspotProjectsTable } from "@/components/dashboard/executive/HotspotProjectsTable";
import { loadDashboardStory } from "./actions";
import type { DashboardStoryPayload, DashboardFilters, DashboardTimeRange, RevenueTimeseriesPoint, AgingBucketDetail, AgingInvoiceDetail, HoursTimeseriesPoint, ResourceCapacityRow, TopPerformerRow, KpiMetric, ExecutiveNarrativeBlock, ProjectHealthRow } from "@/types/dashboard";
import type { DetailedUtilizationRow } from "@/types";

export type TimeRange = DashboardTimeRange;
export type DashboardTab = "overview" | "financial" | "resource" | "executive";

const ALL = "all";

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [timeRange, setTimeRange] = useState<TimeRange>(
    (searchParams.get("timeRange") as TimeRange) || "90d"
  );
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    (searchParams.get("tab") as DashboardTab) || "overview"
  );
  const [projectId, setProjectId] = useState<string>(
    searchParams.get("project") || ALL
  );
  const [employeeId, setEmployeeId] = useState<string>(
    searchParams.get("employee") || ALL
  );
  const [data, setData] = useState<DashboardStoryPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (timeRange !== "90d") params.set("timeRange", timeRange);
    if (activeTab !== "overview") params.set("tab", activeTab);
    if (projectId !== ALL) params.set("project", projectId);
    if (employeeId !== ALL) params.set("employee", employeeId);

    const queryString = params.toString();
    const newUrl = queryString ? `/dashboard?${queryString}` : '/dashboard';

    // Only update if URL actually changed
    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [timeRange, activeTab, projectId, employeeId, router]);

  // Load dashboard data
  const loadData = useCallback(async (isRefresh = false) => {
    const nextFilters: Partial<DashboardFilters> = {
      timeRange,
      projectId: projectId !== ALL ? projectId : undefined,
      employeeId: employeeId !== ALL ? employeeId : undefined,
    };

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const payload = await loadDashboardStory(nextFilters);
      setData(payload);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange, projectId, employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const projectOptions = useMemo(
    () => data?.filterOptions?.projects ?? [],
    [data],
  );

  const employeeOptions = useMemo(
    () => data?.filterOptions?.employees ?? [],
    [data],
  );

  const timeAllocation: TimeAllocationDatum[] = useMemo(() => {
    if (!data) return [];
    return (data.overview.utilizationSlices ?? []).map(slice => ({
      name: slice.key === "nonBillable" ? "unbillable" : slice.key,
      value: Math.max(0, Math.round(slice.hours ?? 0)),
    }));
  }, [data]);

  const billableTrend: BillableTrendDatum[] = useMemo(() => {
    if (!data) return [];
    const series = [...(data.overview.hoursSeries ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    return series.map(point => ({
      date: point.date,
      billable: Math.max(0, Math.round(point.billableHours ?? 0)),
      unbillable: Math.max(0, Math.round(point.nonBillableHours ?? 0)),
    }));
  }, [data]);

  const billableHoursForecast: BillableHoursForecastDatum[] = useMemo(() => {
    if (!data) return [];
    const series = [...(data.overview.hoursSeries ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const employeeCount = data.meta?.employeesLoaded ?? 1; // Get active employee count

    // Group by week and calculate weekly totals
    const weeklyData = new Map<string, { dates: string[], billableSum: number, trendSum: number, trendCount: number }>();

    series.forEach(point => {
      const billableHours = point.billableHours ?? 0;
      if (billableHours === 0) return; // Skip zero values

      const date = new Date(point.date);
      // Get the Monday of the week (ISO week)
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
      const monday = new Date(date.setDate(diff));
      const weekKey = monday.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { dates: [], billableSum: 0, trendSum: 0, trendCount: 0 });
      }

      const weekData = weeklyData.get(weekKey)!;
      weekData.dates.push(point.date);
      weekData.billableSum += billableHours; // Total for all employees for the day

      if (point.rollingBillableAverage) {
        weekData.trendSum += point.rollingBillableAverage;
        weekData.trendCount++;
      }
    });

    // Convert to array and calculate per-employee weekly averages
    return Array.from(weeklyData.entries())
      .map(([weekStart, data]) => {
        const weekStartDate = new Date(weekStart);
        const weekEndDate = new Date(weekStart);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        // Format as "MM/DD"
        const formatDate = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
        const weekLabel = `${formatDate(weekStartDate)}`;

        // Total billable hours for the week across all employees
        const weeklyTotal = data.billableSum;
        // Average per employee for the week
        const avgPerEmployee = employeeCount > 0 ? weeklyTotal / employeeCount : weeklyTotal;

        // Trend: total trend for week divided by employee count
        const weeklyTrendTotal = data.trendCount > 0 ? data.trendSum : 0;
        const avgTrendPerEmployee = employeeCount > 0 && data.trendCount > 0 ? weeklyTrendTotal / employeeCount : undefined;

        return {
          date: weekLabel,
          actual: Math.round(avgPerEmployee),
          trend: avgTrendPerEmployee ? Math.round(avgTrendPerEmployee) : undefined,
        };
      })
      .sort((a, b) => {
        // Parse dates for proper sorting
        const parseDate = (label: string) => {
          const [month, day] = label.split('/').map(Number);
          return new Date(2024, month - 1, day).getTime();
        };
        return parseDate(a.date) - parseDate(b.date);
      });
  }, [data]);

  const utilizationTrend: UtilizationTrendDatum[] = useMemo(() => {
    if (!data) return [];
    const series = [...(data.overview.hoursSeries ?? [])].sort((a, b) => a.date.localeCompare(b.date));

    // Group by week and calculate weekly utilization
    const weeklyData = new Map<string, { billableSum: number, totalSum: number, count: number }>();

    series.forEach(point => {
      const billableHours = point.billableHours ?? 0;
      const totalHours = point.totalHours ?? 0;

      if (totalHours === 0) return; // Skip days with no hours logged

      const date = new Date(point.date);
      // Get the Monday of the week (ISO week)
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const weekKey = monday.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { billableSum: 0, totalSum: 0, count: 0 });
      }

      const weekData = weeklyData.get(weekKey)!;
      weekData.billableSum += billableHours;
      weekData.totalSum += totalHours;
      weekData.count++;
    });

    // Convert to array and calculate weekly utilization percentages
    const weeklyArray = Array.from(weeklyData.entries())
      .map(([weekStart, data]) => {
        const weekStartDate = new Date(weekStart);
        const formatDate = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
        const weekLabel = `${formatDate(weekStartDate)}`;

        const utilization = data.totalSum > 0 ? (data.billableSum / data.totalSum) * 100 : 0;

        return {
          date: weekLabel,
          weekStart,
          utilization: Math.round(utilization * 10) / 10, // Round to 1 decimal
        };
      })
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Calculate trend line (simple moving average over 3 weeks)
    return weeklyArray.map((week, index) => {
      let trendValue: number | undefined;

      if (index >= 2) {
        // Calculate 3-week moving average
        const window = weeklyArray.slice(Math.max(0, index - 2), index + 1);
        const sum = window.reduce((acc, w) => acc + w.utilization, 0);
        trendValue = Math.round((sum / window.length) * 10) / 10;
      }

      return {
        date: week.date,
        utilization: week.utilization,
        trend: trendValue,
      };
    });
  }, [data]);

  const topEmployees: TopEmployeeDatum[] = useMemo(() => {
    if (!data) return [];
    return (data.overview.topPerformers ?? [])
      .filter(row => row.segment === "employee")
      .slice(0, 5)
      .map(row => ({ name: row.entityName, billableHours: Math.round(row.billableHours ?? 0) }));
  }, [data]);

  const projectHours: ProjectHoursDatum[] = useMemo(() => {
    if (!data) return [];
    const rows = data.overview.projectHealthTable ?? [];
    const filtered = projectId !== ALL ? rows.filter(row => row.projectId === projectId) : rows;
    return filtered
      .map(row => ({
        name: row.projectName,
        budgetedHours: Math.max(0, row.budgetedHours ?? 0),
        actualHours: Math.max(0, row.usedHours ?? 0),
      }))
      .filter(entry => entry.budgetedHours > 0 || entry.actualHours > 0)
      .slice(0, 10);
  }, [data, projectId]);

  const projectBudgets: ProjectBudgetDatum[] = useMemo(() => {
    if (!data) return [];
    return (data.overview.projectHealthTable ?? [])
      .map(row => ({
        name: row.projectName,
        used: Math.max(0, row.previouslyInvoiced ?? 0),
        remaining: Math.max(0, row.remainingPo ?? 0),
      }))
      .filter(entry => entry.used > 0 || entry.remaining > 0)
      .slice(0, 10);
  }, [data]);

  const revenueOverTime: RevenueTimeseriesPoint[] = useMemo(() => {
    if (!data?.financial?.revenueOverTime) return [];
    const series = [...data.financial.revenueOverTime].sort((a, b) => a.period.localeCompare(b.period));
    return series.map(point => ({
      period: point.period,
      invoicedAmount: Math.max(0, point.invoicedAmount ?? 0),
      paidAmount: Math.max(0, point.paidAmount ?? 0),
      outstandingAmount: Math.max(0, point.outstandingAmount ?? 0),
      forecastAmount: Math.max(0, point.forecastAmount ?? 0),
    }));
  }, [data]);

  const cashProjection: RevenueTimeseriesPoint[] = useMemo(() => {
    if (!data?.financial?.cashProjection) return [];
    const series = [...data.financial.cashProjection].sort((a, b) => a.period.localeCompare(b.period));
    return series.map(point => ({
      period: point.period,
      invoicedAmount: Math.max(0, point.invoicedAmount ?? 0),
      paidAmount: Math.max(0, point.paidAmount ?? 0),
      outstandingAmount: Math.max(0, point.outstandingAmount ?? 0),
      forecastAmount: Math.max(0, point.forecastAmount ?? 0),
      forecastInvoicedAmount: Math.max(0, point.forecastInvoicedAmount ?? 0),
    }));
  }, [data]);

  const arAging: AgingBucketDetail[] = useMemo(() => {
    if (!data?.financial?.arAging) return [];
    return data.financial.arAging.map(bucket => ({
      bucket: bucket.bucket,
      amount: Math.max(0, bucket.amount ?? 0),
      invoiceCount: Math.max(0, bucket.invoiceCount ?? 0),
      invoices: bucket.invoices ?? [],
    }));
  }, [data]);

  const arDetail: AgingInvoiceDetail[] = useMemo(() => {
    if (!data?.financial?.arDetail) return [];
    return [...data.financial.arDetail]
      .sort((a, b) => (b.daysOutstanding ?? 0) - (a.daysOutstanding ?? 0))
      .map(invoice => ({
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      projectName: invoice.projectName,
      dueDate: invoice.dueDate,
      outstandingAmount: Math.max(0, invoice.outstandingAmount ?? 0),
      daysOutstanding: Math.max(0, invoice.daysOutstanding ?? 0),
      status: invoice.status ?? "--",
      }));
  }, [data]);

  const scheduledVsActual: HoursTimeseriesPoint[] = useMemo(() => {
    if (!data?.resource?.scheduledVsActual) return [];
    const series = [...data.resource.scheduledVsActual].sort((a, b) => a.date.localeCompare(b.date));
    return series.map(point => ({
      date: point.date,
      billableHours: Math.max(0, point.billableHours ?? 0),
      nonBillableHours: Math.max(0, point.nonBillableHours ?? 0),
      totalHours: Math.max(0, point.totalHours ?? 0),
      scheduledHours: Math.max(0, point.scheduledHours ?? 0),
      rollingBillableAverage: Math.max(0, point.rollingBillableAverage ?? 0),
    }));
  }, [data]);

  const capacityBySegment: ResourceCapacityRow[] = useMemo(() => {
    if (!data?.resource?.capacityBySegment) return [];
    return [...data.resource.capacityBySegment]
      .sort((a, b) => (b.utilizationPercent ?? 0) - (a.utilizationPercent ?? 0))
      .map(row => ({
      ...row,
      scheduledHours: row.scheduledHours ?? 0,
      actualHours: row.actualHours ?? 0,
      varianceHours: row.varianceHours ?? 0,
      variancePercent: row.variancePercent ?? 0,
      capacityHours: row.capacityHours ?? 0,
      utilizationPercent: row.utilizationPercent ?? 0,
      }));
  }, [data]);

  const overtimeSignals: TopPerformerRow[] = useMemo(() => {
    if (!data?.resource?.overtimeSignals) return [];
    return [...data.resource.overtimeSignals]
      .sort((a, b) => (b.utilizationPercent ?? 0) - (a.utilizationPercent ?? 0))
      .map(signal => ({
      ...signal,
      billableHours: signal.billableHours ?? 0,
      revenueAmount: signal.revenueAmount ?? 0,
      utilizationPercent: signal.utilizationPercent ?? 0,
      trendPercent: signal.trendPercent ?? 0,
      supportingCopy: signal.supportingCopy,
      }));
  }, [data]);

  const utilizationDetail: DetailedUtilizationRow[] = useMemo(() => {
    if (!data?.resource?.utilizationDetail) return [];
    return data.resource.utilizationDetail;
  }, [data]);

  const executiveHighlights: KpiMetric[] = useMemo(() => {
    if (!data?.executive?.highlights) return [];
    return data.executive.highlights.map(metric => ({
      ...metric,
      value: metric.value ?? 0,
    }));
  }, [data]);

  const executiveSummary: ExecutiveNarrativeBlock[] = useMemo(() => {
    if (!data?.executive?.summary) return [];
    return data.executive.summary;
  }, [data]);

  const executiveActionItems: ExecutiveNarrativeBlock[] = useMemo(() => {
    if (!data?.executive?.actionItems) return [];
    return data.executive.actionItems;
  }, [data]);

  const executiveHotspots: ProjectHealthRow[] = useMemo(() => {
    if (!data?.executive?.hotspotProjects) return [];
    return data.executive.hotspotProjects.map(row => ({
      ...row,
      remainingPo: row.remainingPo ?? 0,
      arOutstanding: row.arOutstanding ?? 0,
      utilizationPercent: row.utilizationPercent ?? 0,
    }));
  }, [data]);

  const clearFilters = () => {
    setTimeRange("90d");
    setProjectId(ALL);
    setEmployeeId(ALL);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const handleExport = () => {
    // Export dashboard data as CSV
    if (!data) return;

    const csvData: string[] = [];
    csvData.push("Dashboard Export - " + new Date().toISOString());
    csvData.push("");
    csvData.push("Filters:");
    csvData.push(`Time Range,${timeRange}`);
    csvData.push(`Project,${projectId === ALL ? "All Projects" : projectOptions.find(p => p.id === projectId)?.name || projectId}`);
    csvData.push(`Employee,${employeeId === ALL ? "All Employees" : employeeOptions.find(e => e.id === employeeId)?.name || employeeId}`);
    csvData.push("");

    // Add KPIs
    if (data.overview.kpis && data.overview.kpis.length > 0) {
      csvData.push("Key Metrics:");
      csvData.push("Metric,Value");
      data.overview.kpis.forEach(kpi => {
        csvData.push(`${kpi.label},${kpi.value}`);
      });
      csvData.push("");
    }

    // Create blob and download
    const blob = new Blob([csvData.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (timeRange !== "90d") count++;
    if (projectId !== ALL) count++;
    if (employeeId !== ALL) count++;
    return count;
  }, [timeRange, projectId, employeeId]);

  // Format last updated timestamp
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const isLoading = loading && !data;

  // Show loading skeleton on initial load
  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: "Dashboard" }]}
        className="mb-2"
      />

      <div id="main-content" className="flex flex-col gap-3 rounded-xl border bg-background p-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <DashboardHeader inline />
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {formatLastUpdated(lastUpdated)}
            </p>
          )}
        </div>
        <div className="flex flex-1 flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-end">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select
                    value={projectId}
                    onValueChange={setProjectId}
                    disabled={!projectOptions.length}
                  >
                    <SelectTrigger className="w-full md:w-56">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Projects</SelectItem>
                      {projectOptions.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              {!projectOptions.length && (
                <TooltipContent>
                  <p>No projects available to filter</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select
                    value={employeeId}
                    onValueChange={setEmployeeId}
                    disabled={!employeeOptions.length}
                  >
                    <SelectTrigger className="w-full md:w-56">
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Employees</SelectItem>
                      {employeeOptions.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              {!employeeOptions.length && (
                <TooltipContent>
                  <p>No employees available to filter</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={clearFilters}
              disabled={loading || activeFilterCount === 0}
              className="relative"
            >
              Clear
              {activeFilterCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh data</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  disabled={!data}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export to CSV</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="resource">Resource</TabsTrigger>
          <TabsTrigger value="executive">Executive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Key Metrics</h2>
              <p className="text-xs text-muted-foreground">Company-wide KPIs</p>
            </div>
            <SectionCards
              loading={isLoading}
              kpis={data?.overview.kpis ?? []}
              projectCount={data?.overview.projectHealthTable?.length ?? 0}
              employeesCount={data?.meta.employeesLoaded ?? 0}
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Analytics Overview</h2>
              <p className="text-xs text-muted-foreground">Utilization and performance snapshots</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <UtilizationTrendChart
                  data={utilizationTrend}
                  title="Utilization Rate Trend"
                  subtitle={`Company-wide billable utilization over ${timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'selected period'}`}
                  targetUtilization={80}
                />
              </div>
              <TopEmployeesBar data={topEmployees} />
              <ProjectHoursStacked data={projectHours} />
              <div className="lg:col-span-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TimeAllocationPie data={timeAllocation} />
                <ProjectBudgetRadial data={projectBudgets} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-4 space-y-4">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">Financial Performance</h2>
            <p className="text-xs text-muted-foreground">Revenue trends and account receivables</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RevenueOverTimeChart data={revenueOverTime} />
            <CashProjectionChart data={cashProjection} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ARAgingTable data={arAging} />
            <ARDetailTable data={arDetail} />
          </div>
        </TabsContent>

        <TabsContent value="resource" className="mt-4 space-y-4">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">Resource Management</h2>
            <p className="text-xs text-muted-foreground">Allocation and capacity planning</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ScheduledVsActualChart data={scheduledVsActual} />
            <OverutilizationTrend data={utilizationDetail} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <OvertimeSignalsList data={overtimeSignals} />
            <UtilizationDetailTable data={utilizationDetail} />
          </div>
        </TabsContent>

        <TabsContent value="executive" className="mt-4 space-y-4">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">Executive Summary</h2>
            <p className="text-xs text-muted-foreground">High-level performance signals and recommended actions</p>
          </div>
          <HighlightsGrid data={executiveHighlights} loading={isLoading} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <NarrativeList
              data={executiveSummary}
              loading={isLoading}
              title="Leadership Briefing"
              subtitle="Context behind current performance"
            />
            <NarrativeList
              data={executiveActionItems}
              loading={isLoading}
              title="Action Items"
              subtitle="Recommended next steps"
            />
          </div>
          <HotspotProjectsTable data={executiveHotspots} loading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
