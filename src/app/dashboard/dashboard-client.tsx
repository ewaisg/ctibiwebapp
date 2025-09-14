"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCards } from "@/components/section-cards";
import TimeAllocationPie, { type TimeAllocationDatum } from "@/components/dashboard/TimeAllocationPie";
import BillableTrendLine, { type BillableTrendDatum } from "@/components/dashboard/BillableTrendLine";
import TopEmployeesBar, { type TopEmployeeDatum } from "@/components/dashboard/TopEmployeesBar";
import ProjectHoursStacked, { type ProjectHoursDatum } from "@/components/dashboard/ProjectHoursStacked";
import ProjectBudgetRadial, { type ProjectBudgetDatum } from "@/components/dashboard/ProjectBudgetRadial";
import type { DashboardData } from "@/types";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export type TimeRange = "7d" | "30d" | "90d" | "all";
export type DashboardTab = "overview" | "financial" | "resource" | "executive";

const ALL = "all";

export default function DashboardClient() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [projectId, setProjectId] = useState<string>(ALL);
  const [employeeId, setEmployeeId] = useState<string>(ALL);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Array<{ id: string; projectName: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; formalName: string; employeeId?: string | number }>>([]);

  useEffect(() => {
    const ac = new AbortController();
    const fetchFilters = async () => {
      try {
        const [projRes, empRes] = await Promise.all([
          fetch(`/api/projects`, { signal: ac.signal }),
          fetch(`/api/employees`, { signal: ac.signal }),
        ]);
        if (projRes.ok) {
          const pj = await projRes.json();
          setProjects(Array.isArray(pj) ? pj : []);
        }
        if (empRes.ok) {
          const ej = await empRes.json();
          setEmployees(Array.isArray(ej) ? ej : []);
        }
      } catch (e) {
        if ((e as any)?.name !== "AbortError") {
          console.error("Failed to load filter data");
        }
      }
    };
    fetchFilters();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (timeRange) params.set("timeRange", timeRange);
        if (projectId && projectId !== ALL) params.set("projectId", projectId);
        if (employeeId && employeeId !== ALL) params.set("employeeId", employeeId);
        const res = await fetch(`/api/dashboard-data?${params.toString()}`, { signal: ac.signal });
        if (res.ok) {
          const json: any = await res.json();
          setData(json as DashboardData);
        }
      } catch (e) {
        if ((e as any)?.name !== "AbortError") {
          console.error("Failed to load dashboard data");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => ac.abort();
  }, [timeRange, projectId, employeeId]);

  const timeAllocation: TimeAllocationDatum[] = useMemo(() => {
    if (!data) return [];
    const billable = Math.max(0, Math.round((data as any).kpi?.billableHours || 0));
    const unbillable = Math.max(0, Math.round((data as any).kpi?.unbillableHours || 0));
    const paidLeave = Math.max(0, Math.round(((data as any).departmentalUtilization || []).reduce((s: number, d: any) => s + (d.Holiday || 0), 0)));
    const unpaidLeave = Math.max(0, Math.round(((data as any).departmentalUtilization || []).reduce((s: number, d: any) => s + (d.unpaidHours || 0), 0)));
    return [
      { name: "billable", value: billable },
      { name: "unbillable", value: unbillable },
      { name: "paidLeave", value: paidLeave },
      { name: "unpaidLeave", value: unpaidLeave },
    ];
  }, [data]);

  const billableTrend: BillableTrendDatum[] = useMemo(() => {
    if (!(data as any)?.billableTrends?.length) return [];
    return (data as any).billableTrends.map((d: any) => ({
      date: (d.date as unknown as { seconds?: number })?.seconds ? new Date((d.date as any).seconds * 1000).toISOString().slice(0, 10) : "",
      billable: d.billableHours || 0,
      unbillable: d.unbillableHours || 0,
    }));
  }, [data]);

  const topEmployees: TopEmployeeDatum[] = useMemo(() => {
    if (!(data as any)?.topEmployees?.length) return [];
    return (data as any).topEmployees.map((e: any) => ({ name: e.name, billableHours: Math.round(e.billableHours || 0) }));
  }, [data]);

  const projectHours: ProjectHoursDatum[] = useMemo(() => {
    if (!Array.isArray(projects) || projects.length === 0) return [];
    const list = projectId !== ALL ? projects.filter((p) => p.id === projectId) : projects;
    return list
      .map((p: any) => ({
        name: p.projectName,
        budgetedHours: Math.max(0, p.budgetedHours || 0),
        actualHours: Math.max(0, p.usedHours || 0),
      }))
      .filter((d) => d.budgetedHours > 0 || d.actualHours > 0)
      .slice(0, 10);
  }, [projects, projectId]);

  const projectBudgets: ProjectBudgetDatum[] = useMemo(() => {
    if (!(data as any)?.projectHealth?.length) return [];
    return (data as any).projectHealth.map((p: any) => ({ name: p.name, used: Math.max(0, p.previouslyInvoicedAmount || 0), remaining: Math.max(0, p.remainingPoAmount || 0) }));
  }, [data]);

  const clearFilters = () => {
    setTimeRange("30d");
    setProjectId(ALL);
    setEmployeeId(ALL);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header + Global Filters Row */}
      <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 md:flex-row md:items-start md:justify-between">
        <DashboardHeader inline />
        <div className="flex flex-1 flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-end">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.formalName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={clearFilters}>Clear</Button>
        </div>
      </div>

      {/* Page Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="resource">Resource</TabsTrigger>
          <TabsTrigger value="executive">Executive</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* KPI Cards */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Key Metrics</h2>
              <p className="text-xs text-muted-foreground">Company-wide KPIs</p>
            </div>
            <SectionCards />
          </div>

          {/* Visuals Grid */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Analytics Overview</h2>
              <p className="text-xs text-muted-foreground">Utilization and performance snapshots</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TimeAllocationPie data={timeAllocation} />
              <BillableTrendLine data={billableTrend} />
              <TopEmployeesBar data={topEmployees} />
              <ProjectHoursStacked data={projectHours} />
              <div className="lg:col-span-2">
                <ProjectBudgetRadial data={projectBudgets} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="mt-4 space-y-4">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">Financial Performance</h2>
            <p className="text-xs text-muted-foreground">Project summaries, billing metrics, and more</p>
          </div>
          <Card className="p-4">Placeholders for project summaries, billing metrics, department financials, contracts, clients, subconsultants</Card>
        </TabsContent>

        {/* Resource Tab */}
        <TabsContent value="resource" className="mt-4 space-y-4">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">Resource Management</h2>
            <p className="text-xs text-muted-foreground">Allocation and capacity planning</p>
          </div>
          <Card className="p-4">Placeholders for resource allocation and capacity planning</Card>
        </TabsContent>

        {/* Executive Tab */}
        <TabsContent value="executive" className="mt-4 space-y-4">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">Executive Summary</h2>
            <p className="text-xs text-muted-foreground">High-level KPIs and summary charts</p>
          </div>
          <Card className="p-4">Placeholders for high-level KPIs and summary charts</Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
