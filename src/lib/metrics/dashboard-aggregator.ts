import { Timestamp, DocumentData, DocumentReference } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type {
  CtiTimesheet,
  ResourceAllocation,
  Employee,
  Department,
  Company,
  Project,
  Invoice,
  PaymentTracking,
  DashboardData,
  UtilizationData,
} from '@/types';
import type {
  DashboardFilters,
  DashboardStoryPayload,
  KpiMetric,
  ExecutiveNarrativeBlock,
} from '@/types/dashboard';
import { resolveDateRange, safeDivide, toIsoDate } from './utils';
import { computeUtilizationMetrics } from './utilization';
import { computeRevenueMetrics } from './revenue';
import { computeProjectHealth } from './project-health';
import { computeTopBottomInsights } from './top-bottom';

async function fetchCollection<T extends DocumentData>(collectionName: string): Promise<T[]> {
  if (!adminDb) {
    throw new Error('Firebase Admin Firestore is not initialized');
  }
  const snapshot = await adminDb.collection(collectionName).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as T[];
}

async function fetchTimesheets(range: { start: Date; end: Date }): Promise<CtiTimesheet[]> {
  if (!adminDb) {
    return [];
  }
  const snapshot = await adminDb
    .collection('cti_timesheets')
    .where('timecardDate', '>=', Timestamp.fromDate(range.start))
    .where('timecardDate', '<=', Timestamp.fromDate(range.end))
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as CtiTimesheet[];
}

async function fetchResourceAllocations(range: { start: Date; end: Date }): Promise<ResourceAllocation[]> {
  if (!adminDb) {
    return [];
  }
  const snapshot = await adminDb
    .collection('resource_allocations')
    .where('weekStartDate', '>=', Timestamp.fromDate(range.start))
    .where('weekStartDate', '<=', Timestamp.fromDate(range.end))
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as ResourceAllocation[];
}

async function fetchInvoices(range: { start: Date; end: Date }): Promise<Invoice[]> {
  if (!adminDb) {
    return [];
  }
  const snapshot = await adminDb
    .collection('invoices')
    .where('createdAt', '>=', Timestamp.fromDate(range.start))
    .where('createdAt', '<=', Timestamp.fromDate(range.end))
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Invoice[];
}

// New: fetch payment tracking entries for a specific set of invoices (latest snapshots will be selected downstream)
async function fetchPaymentTrackingForInvoices(invoices: Invoice[]): Promise<PaymentTracking[]> {
  if (!adminDb || !invoices.length) return [] as PaymentTracking[];
  const db = adminDb!;
  const paymentTrackingCol = db.collection('payment_tracking');

  const refs: DocumentReference[] = invoices
    .map(inv => inv.id)
    .filter(Boolean)
    .map(id => db.doc(`invoices/${id as string}`));

  if (!refs.length) return [] as PaymentTracking[];
  const chunks: DocumentReference[][] = [];
  for (let i = 0; i < refs.length; i += 10) {
    chunks.push(refs.slice(i, i + 10));
  }

  const results: PaymentTracking[] = [];
  for (const group of chunks) {
    const snap = await paymentTrackingCol.where('invoiceId', 'in', group).get();
    results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as PaymentTracking[]);
  }
  return results;
}

// Remove date-filtered payment tracking fetch
// async function fetchPaymentTracking(range: { start: Date; end: Date }): Promise<PaymentTracking[]> { /* removed */ }

async function fetchLegacyDashboard(): Promise<{ dashboard?: DashboardData; utilization?: UtilizationData }> {
  if (!adminDb) {
    return {};
  }
  const snapshot = await adminDb.collection('dashboard_cache').orderBy('generatedAt', 'desc').limit(1).get();
  if (snapshot.empty) {
    return {};
  }
  const doc = snapshot.docs[0]?.data();
  return {
    dashboard: doc?.data as DashboardData | undefined,
    utilization: doc?.utilization as UtilizationData | undefined,
  };
}

function buildKpis(utilizationTotal: ReturnType<typeof computeUtilizationMetrics>['totals'], revenueTotals: ReturnType<typeof computeRevenueMetrics>['totals']): KpiMetric[] {
  const utilizationPercent = safeDivide(utilizationTotal.billableHours, Math.max(utilizationTotal.totalHours, 1)) * 100;
  const capacityRemaining = Math.max(0, utilizationTotal.scheduledHours - utilizationTotal.billableHours);

  return [
    {
      label: 'Total Invoiced',
      value: revenueTotals.totalInvoiced,
      isCurrency: true,
    },
    {
      label: 'Total Paid',
      value: revenueTotals.totalPaid,
      isCurrency: true,
    },
    {
      label: 'Outstanding AR',
      value: revenueTotals.totalOutstanding,
      isCurrency: true,
    },
    {
      label: 'Utilization',
      value: utilizationPercent,
      unit: '%',
    },
    {
      label: 'Billable Hours',
      value: utilizationTotal.billableHours,
      unit: 'hrs',
    },
    {
      label: 'Capacity Remaining',
      value: capacityRemaining,
      unit: 'hrs',
    },
  ];
}

function buildExecutiveSummary(kpis: KpiMetric[], projectHealthFlags: number, arHotspots: number): ExecutiveNarrativeBlock[] {
  const utilization = kpis.find(kpi => kpi.label === 'Utilization')?.value ?? 0;
  const outstanding = kpis.find(kpi => kpi.label === 'Outstanding AR')?.value ?? 0;

  return [
    {
      title: 'Operational Pulse',
      body: `Billable utilization is tracking at ${utilization.toFixed(1)}%. ${projectHealthFlags} projects require attention based on PO burn and hours remaining.`,
      severity: utilization > 90 ? 'warning' : 'info',
    },
    {
      title: 'Financial Pipeline',
      body: `There is ${outstanding.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} outstanding across ${arHotspots} key accounts.`,
      severity: outstanding > 0 ? 'warning' : 'success',
    },
  ];
}

export async function buildDashboardStory(filters: DashboardFilters): Promise<DashboardStoryPayload> {
  const now = new Date();
  const effectiveFilters: DashboardFilters = {
    timeRange: filters.timeRange ?? '30d',
    projectId: filters.projectId,
    employeeId: filters.employeeId,
    departmentId: filters.departmentId,
    companyId: filters.companyId,
  };
  const range = resolveDateRange(effectiveFilters.timeRange, now);

  const [
    timesheets,
    allocations,
    employees,
    departments,
    companies,
    projects,
    invoices,
    legacy,
  ] = await Promise.all([
    fetchTimesheets(range),
    fetchResourceAllocations(range),
    fetchCollection<Employee>('employees'),
    fetchCollection<Department>('departments'),
    fetchCollection<Company>('companies'),
    fetchCollection<Project>('projects'),
    fetchInvoices(range),
    fetchLegacyDashboard(),
  ]);

  // Fetch payment tracking matching the loaded invoices (get all snapshots; reducer will pick latest per invoice)
  const paymentTracking = await fetchPaymentTrackingForInvoices(invoices);

  const utilization = computeUtilizationMetrics({
    timesheets,
    allocations,
    employees,
    departments,
    projects,
    filters: effectiveFilters,
    now,
  });

  const revenue = computeRevenueMetrics({
    invoices,
    paymentTrackings: paymentTracking,
    projects,
    filters: effectiveFilters,
    now,
  });

  const projectHealth = computeProjectHealth({
    projects,
    invoices,
    paymentTrackings: paymentTracking,
    filters: effectiveFilters,
  });

  const topBottom = computeTopBottomInsights({
    employees,
    utilization,
    projectHealth,
  });

  const filterOptions = {
    projects: projects
      .map(project => ({
        id: project.id,
        name: project.projectName ?? project.poNumber ?? project.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    employees: employees
      .map(employee => ({
        id: employee.id,
        name:
          employee.formalName?.trim() ||
          [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
          `Employee ${employee.employeeNumber ?? employee.id}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    departments: departments
      .map(department => ({
        id: department.id,
        name: department.departmentName ?? department.departmentCode ?? department.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    companies: companies
      .map(company => ({
        id: company.id,
        name: company.companyName ?? company.companyCode ?? company.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  } as const;

  const kpis = buildKpis(utilization.totals, revenue.totals);
  const flaggedProjects = projectHealth.rows.filter(row => row.flag !== 'healthy');
  const executiveSummary = buildExecutiveSummary(kpis, flaggedProjects.length, topBottom.arHotspots.length);

  const payload: DashboardStoryPayload = {
    fetchedAt: new Date().toISOString(),
    filters: effectiveFilters,
    overview: {
      kpis,
      utilizationSlices: utilization.slices,
      hoursSeries: utilization.hoursSeries,
      revenueFunnel: revenue.revenueSeries,
      projectHealthTable: projectHealth.rows,
      topPerformers: topBottom.topPerformers,
    },
    financial: {
      revenueOverTime: revenue.revenueSeries,
      arAging: revenue.arAging,
      arDetail: revenue.arDetail,
      cashProjection: revenue.cashProjection,
    },
    resource: {
      scheduledVsActual: utilization.scheduledVsActualSeries,
      capacityBySegment: utilization.capacityByDepartment,
      overtimeSignals: topBottom.underUtilizedSegments,
      utilizationDetail: utilization.detailedRows,
    },
    executive: {
      summary: executiveSummary,
      highlights: kpis.slice(0, 3),
  hotspotProjects: flaggedProjects.slice(0, 5),
      actionItems: executiveSummary.map(item => ({
        ...item,
        severity: item.severity === 'info' ? 'warning' : item.severity,
        actions: item.severity === 'warning'
          ? ['Review flagged projects for PO adjustments', 'Coordinate with finance on AR follow-up']
          : ['Maintain current cadence'],
      })),
    },
    meta: {
      projectsLoaded: projects.length,
      employeesLoaded: employees.length,
      companiesLoaded: companies.length,
      timeRangeLabel: `${toIsoDate(range.start)} – ${toIsoDate(range.end)}`,
      source: 'live',
    },
    filterOptions,
    legacy,
  };

  return payload;
}
