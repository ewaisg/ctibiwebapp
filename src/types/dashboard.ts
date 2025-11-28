import type { DashboardData, DetailedUtilizationRow, UtilizationData } from './index';

export type DashboardTimeRange = '7d' | '30d' | '90d' | 'all';

export interface DashboardFilters {
  timeRange: DashboardTimeRange;
  projectId?: string;
  employeeId?: string;
  departmentId?: string;
  companyId?: string;
}

export type MetricDeltaDirection = 'up' | 'down' | 'flat';

export interface KpiMetric {
  /** Display label for the KPI (e.g., "Total Invoiced") */
  label: string;
  /** Primary value for the KPI */
  value: number;
  /** Optional change amount (absolute) compared to prior period */
  delta?: number;
  /** Optional percentage change compared to prior period */
  deltaPercent?: number;
  /** Directional hint for UI arrows */
  direction?: MetricDeltaDirection;
  /** Indicates the KPI should be rendered as currency */
  isCurrency?: boolean;
  /** Optional unit suffix (e.g., "hrs") */
  unit?: string;
  /** Tooltip or supporting copy */
  description?: string;
}

export interface UtilizationSlice {
  key: 'billable' | 'nonBillable' | 'paidLeave' | 'unpaidLeave';
  hours: number;
  percentage: number;
}

export interface HoursTimeseriesPoint {
  /** ISO date (YYYY-MM-DD) representing start of period */
  date: string;
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
  scheduledHours?: number;
  rollingBillableAverage?: number;
}

export interface RevenueTimeseriesPoint {
  /** ISO date (YYYY-MM-DD) or period label (YYYY-MM) */
  period: string;
  invoicedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  forecastAmount?: number;
  forecastInvoicedAmount?: number;
}

export type AgingBucketLabel = '0-30' | '31-60' | '61-90' | '90+';

export interface AgingInvoiceDetail {
  invoiceId: string;
  invoiceNumber: string;
  projectName?: string;
  dueDate?: string;
  outstandingAmount: number;
  daysOutstanding: number;
  status: string;
}

export interface AgingBucketDetail {
  bucket: AgingBucketLabel;
  amount: number;
  invoiceCount: number;
  invoices: AgingInvoiceDetail[];
}

export type ProjectFlag = 'healthy' | 'warning' | 'critical';

export interface ProjectHealthRow {
  projectId: string;
  projectName: string;
  poOriginal?: number;
  poChange?: number;
  poCurrent?: number;
  previouslyInvoiced?: number;
  remainingPo?: number;
  budgetedHours?: number;
  usedHours?: number;
  remainingHours?: number;
  utilizationPercent?: number;
  arOutstanding?: number;
  lastInvoiceDate?: string;
  flag: ProjectFlag;
  narrative?: string;
}

export type ResourceSegmentType = 'department' | 'company' | 'employee';

export interface ResourceCapacityRow {
  segmentType: ResourceSegmentType;
  segmentId: string;
  segmentName: string;
  scheduledHours: number;
  actualHours: number;
  varianceHours: number;
  variancePercent?: number;
  capacityHours?: number;
  utilizationPercent?: number;
}

export type TopPerformerSegment = 'employee' | 'company' | 'project' | 'service' | 'department';

export interface TopPerformerRow {
  segment: TopPerformerSegment;
  entityId: string;
  entityName: string;
  billableHours: number;
  revenueAmount: number;
  utilizationPercent?: number;
  trendPercent?: number;
  supportingCopy?: string;
}

export type ExecutiveSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface ExecutiveNarrativeBlock {
  title: string;
  body: string;
  severity: ExecutiveSeverity;
  actions?: string[];
}

export interface DashboardOverviewData {
  kpis: KpiMetric[];
  utilizationSlices: UtilizationSlice[];
  hoursSeries: HoursTimeseriesPoint[];
  revenueFunnel: RevenueTimeseriesPoint[];
  projectHealthTable: ProjectHealthRow[];
  topPerformers: TopPerformerRow[];
}

export interface DashboardFinancialData {
  revenueOverTime: RevenueTimeseriesPoint[];
  arAging: AgingBucketDetail[];
  arDetail: AgingInvoiceDetail[];
  cashProjection: RevenueTimeseriesPoint[];
}

export interface DashboardResourceData {
  scheduledVsActual: HoursTimeseriesPoint[];
  capacityBySegment: ResourceCapacityRow[];
  overtimeSignals: TopPerformerRow[];
  utilizationDetail: DetailedUtilizationRow[];
}

export interface DashboardExecutiveData {
  summary: ExecutiveNarrativeBlock[];
  highlights: KpiMetric[];
  hotspotProjects: ProjectHealthRow[];
  actionItems: ExecutiveNarrativeBlock[];
}

export interface DashboardStoryPayload {
  fetchedAt: string;
  filters: DashboardFilters;
  overview: DashboardOverviewData;
  financial: DashboardFinancialData;
  resource: DashboardResourceData;
  executive: DashboardExecutiveData;
  meta: {
    projectsLoaded: number;
    employeesLoaded: number;
    companiesLoaded: number;
    timeRangeLabel: string;
    source: 'live' | 'cache';
  };
  filterOptions?: {
    projects: Array<{ id: string; name: string }>;
    employees: Array<{ id: string; name: string }>;
    departments: Array<{ id: string; name: string }>;
    companies: Array<{ id: string; name: string }>;
  };
  legacy?: {
    /** Existing dashboard contract retained for backward compatibility */
    aggregated?: DashboardData;
    utilization?: UtilizationData;
  };
}
