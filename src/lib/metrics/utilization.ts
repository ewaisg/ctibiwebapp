import { startOfWeek, formatISO } from 'date-fns';
import type {
  CtiTimesheet,
  ResourceAllocation,
  Employee,
  Department,
  Project,
} from '@/types';
import type {
  DashboardFilters,
  UtilizationSlice,
  HoursTimeseriesPoint,
  ResourceCapacityRow,
} from '@/types/dashboard';
import type { DetailedUtilizationRow } from '@/types';
import {
  BILLABLE_PAY_ITEM_CODES,
  PTO_PAY_ITEM_CODES,
  NON_BILLABLE_DEPARTMENT_CODES,
} from '@/types';
import {
  resolveDateRange,
  timestampToDate,
  withinRange,
  iterateDateRange,
  toIsoDate,
  safeDivide,
  sum,
  clamp,
} from './utils';
import { toReferenceId } from '@/lib/document-reference-utils';

export interface UtilizationComputationArgs {
  timesheets: CtiTimesheet[];
  allocations: ResourceAllocation[];
  employees: Employee[];
  departments: Department[];
  projects: Project[];
  filters: DashboardFilters;
  now?: Date;
}

export interface UtilizationComputationResult {
  slices: UtilizationSlice[];
  hoursSeries: HoursTimeseriesPoint[];
  scheduledVsActualSeries: HoursTimeseriesPoint[];
  capacityByDepartment: ResourceCapacityRow[];
  detailedRows: DetailedUtilizationRow[];
  totals: {
    billableHours: number;
    nonBillableHours: number;
    paidLeaveHours: number;
    unpaidHours: number;
    totalHours: number;
    scheduledHours: number;
  };
}

interface EnrichedTimesheet extends CtiTimesheet {
  isoDate: string;
  billableHours: number;
  nonBillableHours: number;
  paidLeaveHours: number;
  unpaidHours: number;
  totalHours: number;
  employeeDocId?: string;
  departmentId?: string;
  departmentCode?: string;
  companyId?: string;
  projectId?: string;
  projectPo?: string;
}

const BILLABLE_CODES = new Set<string>(BILLABLE_PAY_ITEM_CODES);
const PTO_CODES = new Set<string>(PTO_PAY_ITEM_CODES);
const NON_BILLABLE_DEPARTMENTS = new Set<string>(NON_BILLABLE_DEPARTMENT_CODES);

type EmployeeKey = string;

type EmployeeLookup = {
  byDocId: Map<string, Employee>;
  byNumericId: Map<number, Employee>;
  byEmployeeNumber: Map<string, Employee>;
};

function buildEmployeeLookup(employees: Employee[]): EmployeeLookup {
  const byDocId = new Map<string, Employee>();
  const byNumericId = new Map<number, Employee>();
  const byEmployeeNumber = new Map<string, Employee>();

  employees.forEach(employee => {
    if (typeof employee.id === 'string') {
      byDocId.set(employee.id, employee);
    }
    if (typeof employee.employeeId === 'number') {
      byNumericId.set(employee.employeeId, employee);
    }
    if (typeof employee.employeeNumber === 'string' && employee.employeeNumber) {
      byEmployeeNumber.set(employee.employeeNumber, employee);
    }
  });

  return { byDocId, byNumericId, byEmployeeNumber };
}

function resolveEmployee(
  lookup: EmployeeLookup,
  timesheet: CtiTimesheet,
): { employee?: Employee; employeeDocId?: string } {
  const numericMatch = typeof timesheet.employeeId === 'number'
    ? lookup.byNumericId.get(timesheet.employeeId)
    : undefined;
  const employeeNumberMatch = lookup.byEmployeeNumber.get(timesheet.employeeNumber ?? '');
  const resolved = numericMatch ?? employeeNumberMatch;
  const employeeDocId = typeof resolved?.id === 'string' ? resolved.id : undefined;
  return { employee: resolved, employeeDocId };
}

function resolveProject(
  projects: Project[],
  projectIdOrPo?: string,
): Project | undefined {
  if (!projectIdOrPo) return undefined;
  return projects.find(project => project.id === projectIdOrPo || project.poNumber === projectIdOrPo);
}

function getTimesheetProjectValue(timesheet: CtiTimesheet): string | undefined {
  const candidate = timesheet.labors?.find(labor =>
    labor?.laborTitle === 'Project/Categories' || labor?.laborTitle === 'Project/Job',
  );
  return candidate?.laborValue;
}

function getTimesheetDepartmentCode(
  timesheet: CtiTimesheet,
  employee?: Employee,
): string | undefined {
  if (employee?.departmentCode) return employee.departmentCode;
  const laborDepartment = timesheet.labors?.find(labor => labor?.laborTitle === 'Department');
  return laborDepartment?.laborValue;
}

function classifyPayItems(payItems: CtiTimesheet['payItems'] | undefined): {
  billable: number;
  paidLeave: number;
  unpaid: number;
  other: number;
} {
  return (payItems ?? []).reduce(
    (acc, item) => {
      const code = item?.payItemCode?.trim();
      const hours = clamp(item?.payItemHours ?? 0);
      if (!code) {
        acc.other += hours;
        return acc;
      }
      if (BILLABLE_CODES.has(code)) {
        acc.billable += hours;
      } else if (PTO_CODES.has(code)) {
        acc.paidLeave += hours;
      } else {
        acc.unpaid += hours;
      }
      return acc;
    },
    { billable: 0, paidLeave: 0, unpaid: 0, other: 0 },
  );
}

export function computeUtilizationMetrics(args: UtilizationComputationArgs): UtilizationComputationResult {
  const { timesheets, allocations, employees, departments, projects, filters, now = new Date() } = args;
  const range = resolveDateRange(filters.timeRange, now);
  const employeeLookup = buildEmployeeLookup(employees);
  const departmentById = new Map<string, Department>();
  const departmentByCode = new Map<string, Department>();
  departments.forEach(department => {
    if (typeof department.id === 'string') {
      departmentById.set(department.id, department);
    }
    if (typeof department.departmentCode === 'string' && department.departmentCode) {
      departmentByCode.set(department.departmentCode, department);
    }
  });

  const enrichedTimesheets: EnrichedTimesheet[] = timesheets.flatMap(timesheet => {
    const date = timestampToDate(timesheet.timecardDate);
    if (!withinRange(date, range)) {
      return [];
    }

    const { employee, employeeDocId } = resolveEmployee(employeeLookup, timesheet);
    const departmentCode = getTimesheetDepartmentCode(timesheet, employee);
    const department = departmentCode ? (departmentByCode.get(departmentCode) ?? departmentById.get(departmentCode)) : undefined;
    const projectValue = getTimesheetProjectValue(timesheet);
    const project = resolveProject(projects, projectValue);
    const { billable, paidLeave, unpaid, other } = classifyPayItems(timesheet.payItems);

    const total = clamp(
      timesheet.totalHoursActual ?? billable + paidLeave + unpaid + other,
    );

    const isoDate = toIsoDate(date);

    return [{
      ...timesheet,
      isoDate,
      billableHours: billable,
      paidLeaveHours: paidLeave,
      unpaidHours: unpaid,
      nonBillableHours: Math.max(0, total - billable - paidLeave - unpaid),
      totalHours: total,
      employeeDocId,
      departmentId: department?.id,
      departmentCode,
      companyId: typeof employee?.companyId === 'string' ? employee.companyId : undefined,
      projectId: project?.id,
      projectPo: project?.poNumber ?? projectValue,
    } satisfies EnrichedTimesheet];
  });

  const filteredTimesheets = enrichedTimesheets.filter(entry => {
    if (filters.employeeId && entry.employeeDocId !== filters.employeeId) {
      return false;
    }
    if (filters.projectId && entry.projectId !== filters.projectId) {
      return false;
    }
    if (filters.departmentId && entry.departmentId !== filters.departmentId) {
      return false;
    }
    if (filters.companyId && entry.companyId !== filters.companyId) {
      return false;
    }
    return true;
  });

  const timesheetsByDay = new Map<string, EnrichedTimesheet[]>();
  filteredTimesheets.forEach(entry => {
    const bucket = timesheetsByDay.get(entry.isoDate) ?? [];
    bucket.push(entry);
    timesheetsByDay.set(entry.isoDate, bucket);
  });

  const dailySeries: HoursTimeseriesPoint[] = iterateDateRange(range).map(date => {
    const iso = toIsoDate(date);
    const entries = timesheetsByDay.get(iso) ?? [];
    const billable = sum(entries.map(entry => entry.billableHours));
    const nonBillable = sum(entries.map(entry => entry.nonBillableHours + entry.unpaidHours + entry.paidLeaveHours));
    const total = sum(entries.map(entry => entry.totalHours));
    return {
      date: iso,
      billableHours: billable,
      nonBillableHours: Math.max(0, nonBillable),
      totalHours: total,
    } satisfies HoursTimeseriesPoint;
  });

  const totals = filteredTimesheets.reduce(
    (acc, entry) => {
      acc.billableHours += entry.billableHours;
      acc.nonBillableHours += entry.nonBillableHours;
      acc.paidLeaveHours += entry.paidLeaveHours;
      acc.unpaidHours += entry.unpaidHours;
      acc.totalHours += entry.totalHours;
      return acc;
    },
    {
      billableHours: 0,
      nonBillableHours: 0,
      paidLeaveHours: 0,
      unpaidHours: 0,
      totalHours: 0,
      scheduledHours: 0,
    },
  );

  const filteredAllocations = allocations.filter(allocation => {
    const weekStart = timestampToDate(allocation.weekStartDate as any);
    if (!withinRange(weekStart, range)) {
      return false;
    }
    if (filters.employeeId) {
      const employeeId = toReferenceId(allocation.employeeId);
      if (employeeId !== filters.employeeId) {
        return false;
      }
    }
    if (filters.projectId) {
      const projectId = toReferenceId(allocation.projectId);
      if (projectId !== filters.projectId) {
        return false;
      }
    }
    return true;
  });

  totals.scheduledHours = sum(filteredAllocations.map(allocation => allocation.scheduledHours));

  const totalHoursForSlices = Math.max(
    1,
    totals.billableHours + totals.nonBillableHours + totals.paidLeaveHours + totals.unpaidHours,
  );

  const slices: UtilizationSlice[] = [
    {
      key: 'billable',
      hours: totals.billableHours,
      percentage: (totals.billableHours / totalHoursForSlices) * 100,
    },
    {
      key: 'nonBillable',
      hours: totals.nonBillableHours,
      percentage: (totals.nonBillableHours / totalHoursForSlices) * 100,
    },
    {
      key: 'paidLeave',
      hours: totals.paidLeaveHours,
      percentage: (totals.paidLeaveHours / totalHoursForSlices) * 100,
    },
    {
      key: 'unpaidLeave',
      hours: totals.unpaidHours,
      percentage: (totals.unpaidHours / totalHoursForSlices) * 100,
    },
  ];

  const scheduleByWeek = new Map<string, number>();
  filteredAllocations.forEach(allocation => {
    const weekStart = timestampToDate(allocation.weekStartDate as any);
    if (!weekStart) return;
    const period = formatISO(startOfWeek(weekStart), { representation: 'date' });
    scheduleByWeek.set(period, (scheduleByWeek.get(period) ?? 0) + clamp(allocation.scheduledHours));
  });

  const actualByWeek = new Map<string, { billable: number; total: number }>();
  filteredTimesheets.forEach(entry => {
    const date = timestampToDate(entry.timecardDate);
    if (!date) return;
    const period = formatISO(startOfWeek(date), { representation: 'date' });
    const current = actualByWeek.get(period) ?? { billable: 0, total: 0 };
    current.billable += entry.billableHours;
    current.total += entry.totalHours;
    actualByWeek.set(period, current);
  });

  const periods = Array.from(new Set([...scheduleByWeek.keys(), ...actualByWeek.keys()])).sort();
  const scheduledVsActualSeries: HoursTimeseriesPoint[] = periods.map(period => {
    const scheduled = scheduleByWeek.get(period) ?? 0;
    const actual = actualByWeek.get(period);
    return {
      date: period,
      billableHours: actual?.billable ?? 0,
      nonBillableHours: Math.max(0, (actual?.total ?? 0) - (actual?.billable ?? 0)),
      totalHours: actual?.total ?? 0,
      scheduledHours: scheduled,
      rollingBillableAverage: safeDivide(actual?.billable ?? 0, 1),
    } satisfies HoursTimeseriesPoint;
  });

  const capacityByDepartmentMap = new Map<string, ResourceCapacityRow>();
  filteredTimesheets.forEach(entry => {
    const departmentCode = entry.departmentCode;
    if (!departmentCode || NON_BILLABLE_DEPARTMENTS.has(departmentCode)) {
      return;
    }
    const department = departmentByCode.get(departmentCode) ?? departmentById.get(departmentCode);
    const current = capacityByDepartmentMap.get(departmentCode) ?? {
      segmentType: 'department' as const,
      segmentId: department?.id ?? departmentCode,
      segmentName: department?.departmentName ?? departmentCode,
      scheduledHours: 0,
      actualHours: 0,
      varianceHours: 0,
    };
    current.actualHours += entry.totalHours;
    capacityByDepartmentMap.set(departmentCode, current);
  });

  filteredAllocations.forEach(allocation => {
    const employeeId = toReferenceId(allocation.employeeId);
    if (!employeeId) return;
    const employee = employeeLookup.byDocId.get(employeeId);
    if (!employee?.departmentCode) return;
    const department = capacityByDepartmentMap.get(employee.departmentCode);
    if (!department) return;
    department.scheduledHours += clamp(allocation.scheduledHours);
    department.capacityHours = (department.capacityHours ?? 0) + (employee.weeklyCapacityHours ?? 0);
    department.varianceHours = department.actualHours - department.scheduledHours;
    department.variancePercent = safeDivide(department.varianceHours, department.scheduledHours || 1) * 100;
    department.utilizationPercent = safeDivide(department.actualHours, department.capacityHours || department.scheduledHours || 1) * 100;
  });

  const capacityByDepartment = Array.from(capacityByDepartmentMap.values()).sort(
    (a, b) => (b.utilizationPercent ?? 0) - (a.utilizationPercent ?? 0),
  );

  const timesheetsByEmployee = new Map<EmployeeKey, EnrichedTimesheet[]>();
  filteredTimesheets.forEach(entry => {
    const key = entry.employeeDocId ?? String(entry.employeeId ?? entry.employeeNumber ?? '');
    if (!key) return;
    const bucket = timesheetsByEmployee.get(key) ?? [];
    bucket.push(entry);
    timesheetsByEmployee.set(key, bucket);
  });

  const detailedRows: DetailedUtilizationRow[] = Array.from(timesheetsByEmployee.entries()).map(([key, entries]) => {
    const employee = employeeLookup.byDocId.get(key) ?? employeeLookup.byEmployeeNumber.get(key) ?? employeeLookup.byNumericId.get(Number.parseInt(key, 10));
    const weeklyMap = new Map<string, { billable: number; total: number }>();
    entries.forEach(entry => {
      const date = timestampToDate(entry.timecardDate);
      if (!date) return;
      const period = formatISO(startOfWeek(date), { representation: 'date' });
      const current = weeklyMap.get(period) ?? { billable: 0, total: 0 };
      current.billable += entry.billableHours;
      current.total += entry.totalHours;
      weeklyMap.set(period, current);
    });

    const weeklyMetrics = Array.from(weeklyMap.values()).map(metrics => ({
      billableHours: metrics.billable,
      scheduledHours: employee?.weeklyCapacityHours ?? 0,
      utilization: safeDivide(metrics.billable, employee?.weeklyCapacityHours || metrics.total || 1) * 100,
    }));

    return {
      employee: {
        id: String(employee?.id ?? key),
        formalName: employee?.formalName ?? 'Unknown Employee',
        employeeId: employee?.id ?? key,
        weeklyCapacityHours: employee?.weeklyCapacityHours ?? 0,
      },
      weeklyMetrics,
    } satisfies DetailedUtilizationRow;
  });

  return {
    slices,
    hoursSeries: dailySeries,
    scheduledVsActualSeries,
    capacityByDepartment,
    detailedRows,
    totals,
  };
}
