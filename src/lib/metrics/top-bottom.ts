import type { Employee } from '@/types';
import type {
  TopPerformerRow,
  ResourceCapacityRow,
  ProjectHealthRow,
} from '@/types/dashboard';
import type { UtilizationComputationResult } from './utilization';
import type { ProjectHealthComputationResult } from './project-health';
import { sum, safeDivide } from './utils';

export interface TopBottomComputationArgs {
  employees: Employee[];
  utilization: UtilizationComputationResult;
  projectHealth: ProjectHealthComputationResult;
}

export interface TopBottomComputationResult {
  topPerformers: TopPerformerRow[];
  underUtilizedSegments: TopPerformerRow[];
  arHotspots: TopPerformerRow[];
}

function buildTopEmployees(
  employees: Employee[],
  utilization: UtilizationComputationResult,
): TopPerformerRow[] {
  return utilization.detailedRows
    .map(row => {
      const totalBillable = sum(row.weeklyMetrics.map(metric => metric.billableHours));
      const employee = employees.find(emp => String(emp.id) === String(row.employee.employeeId) || String(emp.employeeId) === String(row.employee.employeeId));
      const utilizationPercent = safeDivide(totalBillable, (employee?.weeklyCapacityHours ?? 0) * Math.max(row.weeklyMetrics.length, 1)) * 100;
      return {
        segment: 'employee' as const,
        entityId: String(row.employee.employeeId),
        entityName: employee?.formalName ?? row.employee.formalName,
        billableHours: totalBillable,
        revenueAmount: 0,
        utilizationPercent,
        supportingCopy: undefined,
      };
    })
    .sort((a, b) => b.billableHours - a.billableHours)
    .slice(0, 10);
}

function buildUnderUtilized(
  capacityRows: ResourceCapacityRow[],
): TopPerformerRow[] {
  return capacityRows
    .filter(row => (row.utilizationPercent ?? 0) < 60)
    .sort((a, b) => (a.utilizationPercent ?? 0) - (b.utilizationPercent ?? 0))
    .slice(0, 5)
    .map(row => ({
      segment: row.segmentType === 'employee' ? 'employee' : 'department',
      entityId: String(row.segmentId),
      entityName: row.segmentName,
      billableHours: row.actualHours,
      revenueAmount: 0,
      utilizationPercent: row.utilizationPercent,
      trendPercent: row.variancePercent,
      supportingCopy: 'Under target utilization',
    }));
}

function buildArHotspots(projects: ProjectHealthRow[]): TopPerformerRow[] {
  return projects
    .filter(project => (project.arOutstanding ?? 0) > 0)
    .sort((a, b) => (b.arOutstanding ?? 0) - (a.arOutstanding ?? 0))
    .slice(0, 5)
    .map(project => ({
      segment: 'project' as const,
      entityId: String(project.projectId),
      entityName: project.projectName,
      billableHours: 0,
      revenueAmount: project.arOutstanding ?? 0,
      utilizationPercent: project.utilizationPercent,
      supportingCopy: `Outstanding ${project.arOutstanding?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
    }));
}

export function computeTopBottomInsights(args: TopBottomComputationArgs): TopBottomComputationResult {
  const { employees, utilization, projectHealth } = args;

  const topPerformers = buildTopEmployees(employees, utilization);
  const underUtilizedSegments = buildUnderUtilized(utilization.capacityByDepartment);
  const arHotspots = buildArHotspots(projectHealth.rows);

  return {
    topPerformers,
    underUtilizedSegments,
    arHotspots,
  };
}
