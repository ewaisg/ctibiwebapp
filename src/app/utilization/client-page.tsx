"use client";

import { useState, useTransition, useEffect, useRef, useMemo, useCallback } from "react";
import type { UtilizationData, Employee, Assignment, CtiTimesheet, Project } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UtilizationSummaryTable } from "@/components/timesheets/utilization-summary-table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, AreaChart, Area } from "recharts";
import { ChartDownloadButton } from "@/components/utilization/chart-download-button";
import { format, addWeeks, startOfWeek, getWeek, getYear } from 'date-fns';
import { BILLABLE_PAY_ITEM_CODES, NON_BILLABLE_DEPARTMENT_CODES } from "@/types";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";
import { utils as XLSXUtils, writeFile as writeXLSX } from 'xlsx';
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

// Enhance timestamp conversion to support { __time__: string }
const convertToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date(NaN);
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'object' && timestamp !== null) {
      if (typeof (timestamp as any).toDate === 'function') return (timestamp as any).toDate();
      if (typeof (timestamp as any).seconds === 'number') return new Date((timestamp as any).seconds * 1000);
      if (typeof (timestamp as any)._seconds === 'number') return new Date((timestamp as any)._seconds * 1000);
      if (typeof (timestamp as any).__time__ === 'string') return new Date((timestamp as any).__time__);
  }
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (typeof timestamp === 'number') return new Date(timestamp);
  return new Date(NaN);
};

// Derive available years from actual data (assignments + timesheets)
const deriveAvailableYears = (assignments: Assignment[] | undefined, timesheetEntries: CtiTimesheet[] | undefined): number[] => {
  const years = new Set<number>();
  const aList = assignments ?? [];
  const tList = timesheetEntries ?? [];
  aList.forEach(a => {
    const d = startOfWeek(convertToDate(a.weekStartDate), { weekStartsOn: 0 });
    if (!isNaN(d.getTime())) years.add(getYear(d));
  });
  tList.forEach(t => {
    const d = convertToDate(t.timecardDate);
    if (!isNaN(d.getTime())) years.add(getYear(d));
  });
  const arr = Array.from(years).sort((a, b) => a - b);
  return arr.length ? arr : [new Date().getFullYear()];
};

interface UtilizationClientPageProps {
    initialData: UtilizationData;
    employees: Employee[];
    assignments: Assignment[];
    timesheetEntries: CtiTimesheet[];
    projects: Project[];
}

// Update cohort helper to exclude managers if flag exists
const getCohortEmployees = (employees: Employee[], cohort: 'team' | 'active' | 'all') => {
  const notManager = (e: Employee) => (e as any).isManager !== true;
  if (cohort === 'team') {
    return employees.filter(e => e.role === 'Internal' && !e.isSubconsultant && e.employmentStatus === 'Active' && notManager(e));
  }
  if (cohort === 'active') {
    return employees.filter(e => e.employmentStatus === 'Active' && notManager(e));
  }
  return employees.filter(notManager);
};

// Update calculateWeeklyTotals: robust date and Department/Customer exclusion
const calculateWeeklyTotals = (
  employeeId: string,
  weekStartDate: Date,
  assignments: Assignment[],
  timesheetEntries: CtiTimesheet[],
  employeeNumberLookup: (id: string) => string | undefined
) => {
  const scheduledHours = assignments
      .filter(a => (typeof a.employeeId === 'string' ? a.employeeId : (a.employeeId as any)?.id) === employeeId && 
                  startOfWeek(convertToDate(a.weekStartDate), { weekStartsOn: 0 }).getTime() === weekStartDate.getTime())
      .reduce((sum, a) => sum + (a.scheduledHours || 0), 0);

  const empNumber = employeeNumberLookup(employeeId);
  const actualHours = timesheetEntries
      .filter(t => empNumber && String(t.employeeNumber) === String(empNumber) &&
                   startOfWeek(convertToDate(t.timecardDate), { weekStartsOn: 0 }).getTime() === weekStartDate.getTime())
      .map(t => {
        const deptOrCustomer = (t.labors || []).find(l => l.laborTitle === 'Customer' || l.laborTitle === 'Department')?.laborValue;
        const isDeptNonBillable = deptOrCustomer ? NON_BILLABLE_DEPARTMENT_CODES.includes(deptOrCustomer) : false;
        const billable = (t.payItems || [])
          .filter(p => BILLABLE_PAY_ITEM_CODES.includes(p.payItemCode))
          .reduce((sum, p) => sum + (Number(p.payItemHours) || 0), 0);
        return isDeptNonBillable ? 0 : billable;
      })
      .reduce((sum, h) => sum + h, 0);

  const utilization = scheduledHours > 0 ? (actualHours / scheduledHours) * 100 : 0;
  return { billableHours: actualHours, scheduledHours, utilization };
};

// Helper: latest relevant date for a given year, aligned to week start
const deriveLatestDateForYear = (
  assignments: Assignment[] | undefined,
  timesheetEntries: CtiTimesheet[] | undefined,
  year: number,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
): Date => {
  const dates: Date[] = [];
  const aList = assignments ?? [];
  const tList = timesheetEntries ?? [];
  aList.forEach(a => {
    const d = convertToDate(a.weekStartDate);
    if (!isNaN(d.getTime()) && getYear(d) === year) {
      dates.push(startOfWeek(d, { weekStartsOn }));
    }
  });
  tList.forEach(t => {
    const d = convertToDate(t.timecardDate);
    if (!isNaN(d.getTime()) && getYear(d) === year) {
      dates.push(startOfWeek(d, { weekStartsOn }));
    }
  });
  if (dates.length === 0) return startOfWeek(new Date(year, 0, 1), { weekStartsOn });
  dates.sort((a, b) => a.getTime() - b.getTime());
  return dates[dates.length - 1];
};

// Observe container width for responsive charts
function useContainerWidth(ref: React.RefObject<HTMLElement> | React.MutableRefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export function UtilizationClientPage({ 
  initialData, 
  employees,
  assignments,
  timesheetEntries,
  projects
}: UtilizationClientPageProps) {
  // Safe lists for robustness when props are undefined/null at runtime
  const safeAssignments = useMemo(() => assignments ?? [], [assignments]);
  const safeTimesheets = useMemo(() => timesheetEntries ?? [], [timesheetEntries]);

  // Compute available years and default to latest
  const availableYears = useMemo(() => deriveAvailableYears(safeAssignments, safeTimesheets), [safeAssignments, safeTimesheets]);
  const defaultYear = availableYears[availableYears.length - 1];

  const [isLoading, startTransition] = useTransition();
  const [data, setData] = useState<UtilizationData>(() => {
    const d: any = initialData as any;
    const weekly = Array.isArray(d?.weekly) ? d.weekly : [];
    const annual = Array.isArray(d?.annual) ? d.annual : [];
    return { weekly, annual } as UtilizationData;
  });

  const employeesMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const employeeNumberLookup = useCallback((id: string) => employeesMap.get(id)?.employeeNumber, [employeesMap]);

  // Filters: default to team cohort (Internal, Active, !subconsultant, !manager)
  const [filters, setFilters] = useState({
      year: defaultYear,
      cohort: 'team' as 'team' | 'active' | 'all',
      employeeId: 'all',
  });

  // Timeline start: previous week of current week
  const weekStartsOn = 0; // Sunday
  const [timelineStartDate, setTimelineStartDate] = useState<Date>(() =>
    startOfWeek(addWeeks(new Date(), -1), { weekStartsOn })
  );

  // Keep timeline in sync when year changes
  useEffect(() => {
    const next = deriveLatestDateForYear(safeAssignments, safeTimesheets, filters.year, weekStartsOn);
    setTimelineStartDate((prev: Date) => (prev && next && prev.getTime() === next.getTime()) ? prev : next);
  }, [filters.year]);

  const timePeriods = useMemo(
    () => Array.from({ length: 4 }, (_, i) => addWeeks(startOfWeek(timelineStartDate, { weekStartsOn }), i)),
    [timelineStartDate]
  );

  const weeklyCardRef = useRef<HTMLDivElement>(null);
  const annualCardRef = useRef<HTMLDivElement>(null);
  const summaryTableRef = useRef<HTMLDivElement>(null);

  // Correct weekly averages: per-week contributor counts instead of dividing by total employee count
  useEffect(() => {
    startTransition(() => {
      const cohortEmployees = getCohortEmployees(employees, filters.cohort);
      const targetEmployees = filters.employeeId === 'all' ? cohortEmployees : cohortEmployees.filter(e => e.id === filters.employeeId);

      const activeEmployeeIds = new Set(targetEmployees.map(e => e.id));
      const activeEmployeeNumbers = new Set(targetEmployees.map(e => String(e.employeeNumber)));

      const relevantAssignments = safeAssignments.filter(a =>
        activeEmployeeIds.has((typeof a.employeeId === 'string' ? a.employeeId : (a.employeeId as any)?.id)) && getYear(convertToDate(a.weekStartDate)) === filters.year
      );
      const relevantTimesheets = safeTimesheets.filter(t =>
        activeEmployeeNumbers.has(String(t.employeeNumber)) && getYear(convertToDate(t.timecardDate)) === filters.year
      );

      const weeklyScheduled: Record<number, number> = {};
      const weeklyActuals: Record<number, number> = {};
      const weeklyScheduledContrib: Record<number, Set<string>> = {};
      const weeklyActualContrib: Record<number, Set<string>> = {};

      relevantAssignments.forEach(a => {
        const week = getWeek(convertToDate(a.weekStartDate), { weekStartsOn: 0 });
        weeklyScheduled[week] = (weeklyScheduled[week] || 0) + (a.scheduledHours || 0);
        const eid = (typeof a.employeeId === 'string' ? a.employeeId : (a.employeeId as any)?.id) as string;
        (weeklyScheduledContrib[week] ||= new Set()).add(eid);
      });

      relevantTimesheets.forEach(t => {
        const week = getWeek(convertToDate(t.timecardDate), { weekStartsOn: 0 });
        const deptOrCustomer = (t.labors || []).find(l => l.laborTitle === 'Customer' || l.laborTitle === 'Department')?.laborValue;
        const isDeptNonBillable = deptOrCustomer ? NON_BILLABLE_DEPARTMENT_CODES.includes(deptOrCustomer) : false;
        if (isDeptNonBillable) return;
        const billable = (t.payItems || [])
          .filter(p => BILLABLE_PAY_ITEM_CODES.includes(p.payItemCode))
          .reduce((sum, p) => sum + (Number(p.payItemHours) || 0), 0);
        weeklyActuals[week] = (weeklyActuals[week] || 0) + billable;
        (weeklyActualContrib[week] ||= new Set()).add(String(t.employeeNumber));
      });

      const weeks = [...new Set([...Object.keys(weeklyScheduled), ...Object.keys(weeklyActuals)])].map(Number);
      const lastDataWeek = weeks.length > 0 ? Math.max(...weeks) : 0;

      const annual: UtilizationData['annual'] = [] as any;
      const weekly: UtilizationData['weekly'] = [];

      let cumulativeScheduled = 0;
      let cumulativeActual = 0;
      let cumulativeCapacity = 0;

      for (let week = 1; week <= lastDataWeek; week++) {
        const totalScheduled = weeklyScheduled[week] || 0;
        const totalActual = weeklyActuals[week] || 0;
        const cntSched = filters.employeeId === 'all' ? (weeklyScheduledContrib[week]?.size || 0) : (totalScheduled > 0 ? 1 : 0);
        const cntActual = filters.employeeId === 'all' ? (weeklyActualContrib[week]?.size || 0) : (totalActual > 0 ? 1 : 0);

        const avgScheduled = cntSched > 0 ? totalScheduled / cntSched : 0;
        const avgActual = cntActual > 0 ? totalActual / cntActual : 0;

        const employeesForCapacity = filters.employeeId === 'all' ? (weeklyScheduledContrib[week]?.size || weeklyActualContrib[week]?.size || 0) : 1;
        const avgCapacityForWeek = employeesForCapacity > 0 ? 40 : 0;
        cumulativeCapacity += avgCapacityForWeek;

        cumulativeScheduled += avgScheduled;
        cumulativeActual += avgActual;

        annual.push({ week, capacity: parseFloat(cumulativeCapacity.toFixed(1)), scheduled: parseFloat(cumulativeScheduled.toFixed(1)), actual: parseFloat(cumulativeActual.toFixed(1)) } as any);

        const utilization = avgScheduled > 0 ? (avgActual / avgScheduled) * 100 : 0;
        weekly.push({ week, scheduled: parseFloat(avgScheduled.toFixed(1)), actual: parseFloat(avgActual.toFixed(1)), utilization: parseFloat(utilization.toFixed(1)) });
      }

      setData({ annual, weekly });
    });
  }, [filters, employees, safeAssignments, safeTimesheets]);

  const getFilterText = useCallback(() => {
      const cohortLabel = filters.cohort === 'team' ? 'Team' : filters.cohort === 'active' ? 'All Active' : 'All';
      const employeeName = filters.employeeId === 'all' 
          ? `${cohortLabel} Average` 
          : employees.find(e => e.id === filters.employeeId)?.formalName || 'Unknown Employee';
      return `Filters: ${employeeName}, Year: ${filters.year}`;
  }, [filters.employeeId, filters.year, filters.cohort, employees]);

  const handleFilterChange = (key: keyof typeof filters, value: string | number) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTimelineNav = (direction: 'prev' | 'next') => {
      const amount = direction === 'prev' ? -4 : 4;
      setTimelineStartDate((currentDate: Date) => addWeeks(currentDate, amount));
  };

  const weeklyTableData = useMemo(() => {
      const cohortEmployees = getCohortEmployees(employees, filters.cohort);
      const employeeData = filters.employeeId === 'all' ? cohortEmployees : cohortEmployees.filter(e => e.id === filters.employeeId);
      return employeeData.map(employee => ({
          employee: { id: employee.id, formalName: employee.formalName, employeeId: employee.id as any, weeklyCapacityHours: employee.weeklyCapacityHours },
          weeklyMetrics: timePeriods.map(period => {
              const weekStartDate = startOfWeek(period, { weekStartsOn: 0 });
              return calculateWeeklyTotals(employee.id, weekStartDate, safeAssignments, safeTimesheets, employeeNumberLookup);
          })
      }));
  }, [filters.employeeId, filters.cohort, employees, safeAssignments, safeTimesheets, timePeriods, employeeNumberLookup]);

  // Series toggles for weekly chart
  const [visibleSeries, setVisibleSeries] = useState<{ scheduled: boolean; actual: boolean; utilization: boolean }>({ scheduled: true, actual: true, utilization: true });
  // Series toggles for annual trend
  const [visibleAnnual, setVisibleAnnual] = useState<{ capacity: boolean; scheduled: boolean; actual: boolean }>({ capacity: true, scheduled: true, actual: true });

  // State: maximize dialogs visibility
  const [showMaxAnnual, setShowMaxAnnual] = useState(false);

  // Compute data windows for charts
  const weeklyChartData = useMemo(() => {
     const source = Array.isArray((data as any)?.weekly) ? (data as any).weekly as any[] : [];
     const lastWeekWithData = [...source].reverse().find(w => (w.scheduled || w.actual));
     const lastWeekNum = lastWeekWithData ? lastWeekWithData.week : 0;
     return source.filter(w => lastWeekNum === 0 ? true : w.week <= lastWeekNum).map(w => ({
       name: `W${w.week}`,
       scheduled: w.scheduled,
       actual: w.actual,
       utilization: w.utilization,
     }));
   }, [data]);

   const annualChartData = useMemo(() => {
     const source = Array.isArray((data as any)?.annual) ? (data as any).annual as any[] : [];
     const lastWeekWithData = [...source].reverse().find(w => (w.scheduled ?? 0) > 0 || (w.actual ?? 0) > 0);
     const lastWeekNum = lastWeekWithData ? lastWeekWithData.week : 0;
     return source.filter(w => lastWeekNum === 0 ? true : w.week <= lastWeekNum).map(w => ({
       name: `W${w.week}`,
       capacity: w.capacity ?? null,
       scheduled: w.scheduled ?? null,
       actual: w.actual ?? null,
     }));
   }, [data]);

  // Max view: annual should display all working weeks in the year
  const maxAnnualChartData = useMemo(() => {
    const source = Array.isArray((data as any)?.annual) ? (data as any).annual as any[] : [];
    const weeksInYear = getWeek(new Date(filters.year, 11, 31), { weekStartsOn: 0 });
    const map = new Map<number, { capacity: number | null; scheduled: number | null; actual: number | null }>();
    source.forEach(w => {
      map.set(w.week, { capacity: w.capacity ?? null, scheduled: w.scheduled ?? null, actual: w.actual ?? null });
    });
    return Array.from({ length: weeksInYear }, (_, i) => {
      const week = i + 1;
      const v = map.get(week) || { capacity: null, scheduled: null, actual: null };
      return { name: `W${week}`, ...v } as any;
    });
  }, [data, filters.year]);

  // Update XLSX export to merged week headers, blanks instead of zeros, number formats, frozen header
  const exportTableToXlsx = useCallback(() => {
    const weeks = timePeriods.map((d) => getWeek(startOfWeek(d, { weekStartsOn: 0 }), { weekStartsOn: 0 }));
    const subHeaders = ["Scheduled", "Actual", "Utilization%"];
    const headerRow1 = ["Employee", ...weeks.flatMap((w) => [`W${w}`, "", ""])];
    const headerRow2 = ["", ...weeks.flatMap(() => subHeaders)];

    const rows: (string | number | null)[][] = weeklyTableData.map((row: any) => {
      const vals: (string | number | null)[] = [row.employee.formalName];
      row.weeklyMetrics.forEach((m: any) => {
        const sched = typeof m.scheduledHours === 'number' ? Number(m.scheduledHours.toFixed?.(1) ?? m.scheduledHours) : null;
        const act = typeof m.billableHours === 'number' ? Number(m.billableHours.toFixed?.(1) ?? m.billableHours) : null;
        const util = typeof m.utilization === 'number' ? Number(m.utilization.toFixed?.(1) ?? m.utilization) / 100 : null; // as fraction for % format
        vals.push(sched, act, util);
      });
      return vals;
    });

    const aoa = [headerRow1, headerRow2, ...rows];
    const sheet: any = XLSXUtils.aoa_to_sheet(aoa);

    // Merges for week group headers
    const merges: any[] = [];
    let col = 1; // 0-based index; col 0 = Employee
    weeks.forEach(() => {
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 2 } });
      col += 3;
    });
    sheet['!merges'] = merges;

    // Formats: percent for Utilization columns; width and freeze panes
    const colWidths = [{ wch: 28 } as any].concat(weeks.flatMap(() => [{ wch: 12 }, { wch: 12 }, { wch: 12 }]));
    sheet['!cols'] = colWidths;
    // Freeze top 2 rows
    sheet['!freeze'] = { xSplit: 1, ySplit: 2 } as any;
    // Auto filter
    const lastCol = 1 + weeks.length * 3;
    sheet['!autofilter'] = { ref: `A2:${String.fromCharCode(64 + Math.min(26, lastCol))}${2 + rows.length}` } as any;

    // Apply number format for % columns and keep blanks for nulls
    for (let r = 3; r < 3 + rows.length; r++) {
       for (let w = 0; w < weeks.length; w++) {
         const utilCol = 1 + (w * 3) + 2;
         const cellRef = XLSXUtils.encode_cell({ r: r - 1, c: utilCol });
         const cell = sheet[cellRef];
         if (cell && typeof cell.v === 'number') {
           cell.z = '0.0%';
           cell.s = { font: { bold: true } } as any;
         }
         const schedCell = sheet[XLSXUtils.encode_cell({ r: r - 1, c: 1 + (w * 3) })];
         const actCell = sheet[XLSXUtils.encode_cell({ r: r - 1, c: 1 + (w * 3) + 1 })];
         if (schedCell && typeof schedCell.v === 'number') (schedCell as any).z = '#,##0.0';
         if (actCell && typeof actCell.v === 'number') (actCell as any).z = '#,##0.0';
       }
     }

    // Center and bold top merged week headers (row 1) and center subheaders (row 2)
    try {
      let headerCol = 1;
      weeks.forEach(() => {
        const topCellRef = XLSXUtils.encode_cell({ r: 0, c: headerCol });
        (sheet as any)[topCellRef] = (sheet as any)[topCellRef] || { t: 's', v: '' };
        (sheet as any)[topCellRef].s = { alignment: { horizontal: 'center', vertical: 'center' }, font: { bold: true } } as any;
        for (let i = 0; i < 3; i++) {
          const subRef = XLSXUtils.encode_cell({ r: 1, c: headerCol + i });
          if ((sheet as any)[subRef]) (sheet as any)[subRef].s = { alignment: { horizontal: 'center' } } as any;
        }
        headerCol += 3;
      });
    } catch {}

     const wb = XLSXUtils.book_new();
     XLSXUtils.book_append_sheet(wb, sheet, `Utilization ${filters.year}`);
     const filename = `utilization-summary-${filters.year}.xlsx`;
     writeXLSX(wb, filename);
   }, [weeklyTableData, timePeriods, filters.year]);

  return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[{ label: "Utilization Analytics" }]}
            className="mb-4"
          />

          <div id="main-content" className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight">Utilization Analytics</h1>
              <div className="flex items-center gap-2">
                  {/* Employee select (defaults to cohort average) */}
                  <div className="w-56">
                      <Select value={filters.employeeId} onValueChange={(val) => handleFilterChange('employeeId', val)} disabled={isLoading}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select Employee" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Cohort Average</SelectItem>
                              {getCohortEmployees(employees, filters.cohort).map(emp => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.formalName}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  {/* Cohort select */}
                  <div className="w-44">
                      <Select value={filters.cohort} onValueChange={(val) => handleFilterChange('cohort', val)} disabled={isLoading}>
                          <SelectTrigger>
                              <SelectValue placeholder="Cohort" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="team">Team (Internal • Active • No Sub • No Manager)</SelectItem>
                              <SelectItem value="active">All Active</SelectItem>
                              <SelectItem value="all">All</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  {/* Year select */}
                  <div className="w-32">
                      <Select value={String(filters.year)} onValueChange={(val) => handleFilterChange('year', parseInt(val, 10))} disabled={isLoading}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent>
                              {availableYears.map(year => (
                                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Weekly Performance: grouped bars + utilization line */}
            <Card ref={weeklyCardRef}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <CardTitle data-card-title className="text-lg">Weekly Performance</CardTitle>
                  <CardDescription data-card-description>Avg Scheduled vs Avg Actual with Utilization</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Maximize"><Maximize2 className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl w-[90vw]">
                      <DialogTitle>Weekly Performance</DialogTitle>
                      <ChartContainer className="text-[12px] min-h-[520px]" config={{ scheduled: { label: 'Scheduled', color: 'var(--chart-3)' }, actual: { label: 'Actual', color: 'var(--chart-1)' }, utilization: { label: 'Utilization', color: 'var(--chart-2)' } }}>
                        <ComposedChart data={weeklyChartData} margin={{ left: 24, right: 24 }} accessibilityLayer>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="hours" tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="pct" orientation="right" tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12 }} />
                          <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          {visibleSeries.scheduled && <Bar yAxisId="hours" dataKey="scheduled" fill="var(--color-scheduled)" radius={4} />}
                          {visibleSeries.actual && <Bar yAxisId="hours" dataKey="actual" fill="var(--color-actual)" radius={4} />}
                          {visibleSeries.utilization && <Line yAxisId="pct" type="monotone" dataKey="utilization" stroke="var(--color-utilization)" strokeWidth={2} dot={false} />}
                        </ComposedChart>
                      </ChartContainer>
                    </DialogContent>
                  </Dialog>
                  <ChartDownloadButton targetRef={weeklyCardRef} filterText={getFilterText()} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={visibleSeries.scheduled} onChange={(e) => setVisibleSeries(v => ({ ...v, scheduled: e.target.checked }))} /> Scheduled
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={visibleSeries.actual} onChange={(e) => setVisibleSeries(v => ({ ...v, actual: e.target.checked }))} /> Actual
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={visibleSeries.utilization} onChange={(e) => setVisibleSeries(v => ({ ...v, utilization: e.target.checked }))} /> Utilization
                  </label>
                </div>
                <ChartContainer className="text-[11px] min-h-[220px]" config={{ scheduled: { label: 'Scheduled', color: 'var(--chart-3)' }, actual: { label: 'Actual', color: 'var(--chart-1)' }, utilization: { label: 'Utilization', color: 'var(--chart-2)' } }}>
                  <ComposedChart data={weeklyChartData} margin={{ left: 12, right: 12 }} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="hours" tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="pct" orientation="right" tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    {visibleSeries.scheduled && <Bar isAnimationActive animationDuration={500} yAxisId="hours" dataKey="scheduled" fill="var(--color-scheduled)" radius={4} />}
                    {visibleSeries.actual && <Bar isAnimationActive animationDuration={500} yAxisId="hours" dataKey="actual" fill="var(--color-actual)" radius={4} />}
                    {visibleSeries.utilization && <Line isAnimationActive animationDuration={600} yAxisId="pct" type="monotone" dataKey="utilization" stroke="var(--color-utilization)" strokeWidth={2} dot={false} />}
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Annual Utilization Trends with maximize */}
            <Card ref={annualCardRef}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <CardTitle data-card-title className="text-lg">Annual Utilization Trends</CardTitle>
                  <CardDescription data-card-description>YTD capacity vs scheduled vs actual</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={showMaxAnnual} onOpenChange={setShowMaxAnnual}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Maximize"><Maximize2 className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl w-[90vw]">
                      <DialogTitle>Annual Utilization Trends</DialogTitle>
                      <ChartContainer className="text-[12px] min-h-[520px]" config={{ capacity: { label: 'Capacity', color: 'var(--muted-foreground)' }, scheduled: { label: 'Scheduled (YTD)', color: 'var(--chart-3)' }, actual: { label: 'Actual (YTD)', color: 'var(--chart-1)' } }}>
                        <AreaChart data={maxAnnualChartData} margin={{ left: 24, right: 24 }} accessibilityLayer>
                           <CartesianGrid vertical={false} />
                           <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12 }} />
                           <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                           <ChartLegend content={<ChartLegendContent />} />
                           <Area dataKey="capacity" type="monotone" fill="transparent" stroke="var(--color-capacity)" strokeDasharray="4 4" />
                           <Area dataKey="scheduled" type="monotone" fill="var(--color-scheduled)" fillOpacity={0.3} stroke="var(--color-scheduled)" />
                           <Area dataKey="actual" type="monotone" fill="var(--color-actual)" fillOpacity={0.5} stroke="var(--color-actual)" />
                         </AreaChart>
                       </ChartContainer>
                    </DialogContent>
                  </Dialog>
                  <ChartDownloadButton targetRef={annualCardRef} filterText={getFilterText()} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                   <label className="flex items-center gap-2">
                     <input type="checkbox" checked={visibleAnnual.capacity} onChange={(e) => setVisibleAnnual(v => ({ ...v, capacity: e.target.checked }))} /> Capacity
                   </label>
                   <label className="flex items-center gap-2">
                     <input type="checkbox" checked={visibleAnnual.scheduled} onChange={(e) => setVisibleAnnual(v => ({ ...v, scheduled: e.target.checked }))} /> Scheduled
                   </label>
                   <label className="flex items-center gap-2">
                     <input type="checkbox" checked={visibleAnnual.actual} onChange={(e) => setVisibleAnnual(v => ({ ...v, actual: e.target.checked }))} /> Actual
                   </label>
                 </div>
                 <ChartContainer className="text-[11px] min-h-[220px]" config={{ capacity: { label: 'Capacity', color: 'var(--muted-foreground)' }, scheduled: { label: 'Scheduled (YTD)', color: 'var(--chart-3)' }, actual: { label: 'Actual (YTD)', color: 'var(--chart-1)' } }}>
                   <AreaChart data={annualChartData} margin={{ left: 12, right: 12 }} accessibilityLayer>
                     <CartesianGrid vertical={false} />
                     <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                     <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                     <ChartLegend content={<ChartLegendContent />} />
                     {visibleAnnual.capacity && <Area isAnimationActive animationDuration={500} dataKey="capacity" type="monotone" fill="transparent" stroke="var(--color-capacity)" strokeDasharray="4 4" />}
                     {visibleAnnual.scheduled && <Area isAnimationActive animationDuration={500} dataKey="scheduled" type="monotone" fill="var(--color-scheduled)" fillOpacity={0.3} stroke="var(--color-scheduled)" />}
                     {visibleAnnual.actual && <Area isAnimationActive animationDuration={500} dataKey="actual" type="monotone" fillOpacity={0.5} fill="var(--color-actual)" stroke="var(--color-actual)" />}
                   </AreaChart>
                 </ChartContainer>
               </CardContent>
             </Card>

          </div>
          
          {/* Table card with download */}
          <Card ref={summaryTableRef}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-card-title>Detailed Employee Utilization</CardTitle>
                <CardDescription data-card-description>
                  Granular breakdown of actuals vs scheduled hours by employee for a 4-week period.
                </CardDescription>
              </div>
              <ChartDownloadButton targetRef={summaryTableRef} filterText={getFilterText()} onExport={() => exportTableToXlsx()} />
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2 mb-4">
                   <Button variant="outline" size="icon" onClick={() => handleTimelineNav('prev')} title="Previous period">
                       <ChevronLeft className="h-4 w-4" />
                   </Button>
                   <Button variant="outline" className="w-full sm:w-auto text-center" disabled>
                       {`${format(timePeriods[0], 'MMM d')} - ${format(addWeeks(timePeriods[0], 3), 'MMM d, yyyy')}`}
                   </Button>
                   <Button variant="outline" size="icon" onClick={() => handleTimelineNav('next')} title="Next period">
                       <ChevronRight className="h-4 w-4" />
                   </Button>
               </div>
               <UtilizationSummaryTable weeklyData={weeklyTableData as any} timePeriods={timePeriods} />
             </CardContent>
           </Card>
      </div>
  );
}