import { startOfWeek, formatISO, differenceInCalendarDays } from 'date-fns';
import type { Invoice, PaymentTracking, Project } from '@/types';
import type {
  DashboardFilters,
  RevenueTimeseriesPoint,
  AgingBucketDetail,
  AgingInvoiceDetail,
} from '@/types/dashboard';
import {
  resolveDateRange,
  timestampToDate,
  withinRange,
  toIsoDate,
  safeDivide,
  sum,
  clamp,
} from './utils';
import { toReferenceId } from '@/lib/document-reference-utils';

export interface RevenueComputationArgs {
  invoices: Invoice[];
  paymentTrackings: PaymentTracking[];
  projects: Project[];
  filters: DashboardFilters;
  now?: Date;
}

export interface RevenueComputationResult {
  revenueSeries: RevenueTimeseriesPoint[];
  arAging: AgingBucketDetail[];
  arDetail: AgingInvoiceDetail[];
  cashProjection: RevenueTimeseriesPoint[];
  totals: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    forecastAmount: number;
  };
}

interface InvoiceWithMetrics {
  invoice: Invoice;
  createdAt?: Date;
  submittedAt?: Date;
  dueDate?: Date;
  projectId?: string;
  companyId?: string;
  paidAmount: number;
  outstanding: number;
}

const AGING_BUCKETS = [
  { label: '0-30', maxDays: 30 },
  { label: '31-60', maxDays: 60 },
  { label: '61-90', maxDays: 90 },
  { label: '90+', maxDays: Infinity },
] as const;

function enrichInvoices(
  invoices: Invoice[],
  payments: Map<string, { paid: number; outstanding: number }>,
): InvoiceWithMetrics[] {
  return invoices.map(invoice => {
    const createdAt = timestampToDate(invoice.createdAt);
    const dueDate = timestampToDate(invoice.dueDate);
    const submittedAt = timestampToDate(invoice.approvedAt ?? invoice.createdAt);
    const projectId = toReferenceId(invoice.projectId);
    const companyId = toReferenceId(invoice.submitterCompanyId);
    const payment = payments.get(invoice.id ?? '') ?? { paid: 0, outstanding: Math.max(0, invoice.invoiceTotal ?? 0) };

    return {
      invoice,
      createdAt,
      dueDate,
      submittedAt,
      projectId,
      companyId,
      paidAmount: payment.paid,
      outstanding: Math.max(0, (invoice.invoiceTotal ?? 0) - payment.paid),
    };
  });
}

function buildPaymentMap(paymentTrackings: PaymentTracking[]): Map<string, { paid: number; outstanding: number }> {
  const map = new Map<string, { paid: number, outstanding: number }>();
  const latestTs = new Map<string, number>();
  paymentTrackings.forEach(tracking => {
    const invoiceId = toReferenceId(tracking.invoiceId) ?? tracking.invoiceNumber;
    if (!invoiceId) return;
    // Determine a comparable timestamp: prefer updatedAt, then paymentDate, then createdAt
    const t: any = tracking as any;
    const ts = (t.updatedAt?.seconds ?? t.updatedAt?._seconds)
      ? Number(t.updatedAt.seconds ?? t.updatedAt._seconds) * 1000
      : (t.paymentDate?.seconds ?? t.paymentDate?._seconds)
        ? Number(t.paymentDate.seconds ?? t.paymentDate._seconds) * 1000
        : (t.createdAt?.seconds ?? t.createdAt?._seconds)
          ? Number(t.createdAt.seconds ?? t.createdAt._seconds) * 1000
          : 0;
    const prevTs = latestTs.get(invoiceId) ?? -1;
    if (ts >= prevTs) {
      latestTs.set(invoiceId, ts);
      map.set(invoiceId, {
        paid: clamp(tracking.paidAmount ?? 0),
        outstanding: clamp(tracking.outstandingAmount ?? 0),
      });
    }
  });
  return map;
}

export function computeRevenueMetrics(args: RevenueComputationArgs): RevenueComputationResult {
  const { invoices, paymentTrackings, projects, filters, now = new Date() } = args;
  const range = resolveDateRange(filters.timeRange, now);
  const paymentMap = buildPaymentMap(paymentTrackings);

  const enrichedInvoices = enrichInvoices(invoices, paymentMap).filter(row => {
    if (!row.createdAt) return false;
    if (!withinRange(row.createdAt, range)) return false;
    if (filters.projectId && row.projectId !== filters.projectId) return false;
    if (filters.companyId && row.companyId !== filters.companyId) return false;
    return true;
  });

  const revenueSeriesMap = new Map<string, { invoiced: number; paid: number; outstanding: number }>();
  enrichedInvoices.forEach(row => {
    if (!row.createdAt) return;
    const period = formatISO(startOfWeek(row.createdAt), { representation: 'date' });
    const entry = revenueSeriesMap.get(period) ?? { invoiced: 0, paid: 0, outstanding: 0 };
    entry.invoiced += clamp(row.invoice.invoiceTotal ?? 0);
    entry.paid += clamp(row.paidAmount);
    entry.outstanding += clamp(row.outstanding);
    revenueSeriesMap.set(period, entry);
  });

  const revenueSeries: RevenueTimeseriesPoint[] = Array.from(revenueSeriesMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([period, value]) => ({
      period,
      invoicedAmount: value.invoiced,
      paidAmount: value.paid,
      outstandingAmount: value.outstanding,
    } satisfies RevenueTimeseriesPoint));

  const totals = revenueSeries.reduce(
    (acc, point) => {
      acc.totalInvoiced += point.invoicedAmount;
      acc.totalPaid += point.paidAmount;
      acc.totalOutstanding += point.outstandingAmount;
      return acc;
    },
    { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, forecastAmount: 0 },
  );

  const arInvoices: AgingInvoiceDetail[] = enrichedInvoices
    .filter(row => row.dueDate)
    .map(row => {
      const dueDateIso = toIsoDate(row.dueDate);
      const daysOutstanding = row.dueDate ? differenceInCalendarDays(now, row.dueDate) : 0;
      return {
        invoiceId: row.invoice.id ?? row.invoice.invoiceNumber,
        invoiceNumber: row.invoice.invoiceNumber,
        projectName: projects.find(project => project.id === row.projectId)?.projectName,
        dueDate: dueDateIso,
        outstandingAmount: row.outstanding,
        daysOutstanding,
        status: row.invoice.status,
      } satisfies AgingInvoiceDetail;
    })
    .sort((a, b) => b.daysOutstanding - a.daysOutstanding);

  const arAgingMap = new Map<string, AgingBucketDetail>();
  AGING_BUCKETS.forEach(bucket => {
    arAgingMap.set(bucket.label, {
      bucket: bucket.label,
      amount: 0,
      invoiceCount: 0,
      invoices: [],
    });
  });

  arInvoices.forEach(invoice => {
    const bucket = AGING_BUCKETS.find(b => invoice.daysOutstanding <= b.maxDays) ?? AGING_BUCKETS[AGING_BUCKETS.length - 1];
    const entry = arAgingMap.get(bucket.label);
    if (!entry) return;
    entry.amount += invoice.outstandingAmount;
    entry.invoiceCount += 1;
    entry.invoices.push(invoice);
  });

  const arAging = Array.from(arAgingMap.values()).map(entry => ({
    ...entry,
    invoices: entry.invoices.slice(0, 10),
  }));

  const cashProjection: RevenueTimeseriesPoint[] = revenueSeries.slice(0, 12).map(point => ({
    period: point.period,
    invoicedAmount: point.invoicedAmount,
    paidAmount: point.paidAmount,
    outstandingAmount: point.outstandingAmount,
    forecastAmount: safeDivide(point.paidAmount, Math.max(point.invoicedAmount, 1)) * point.outstandingAmount,
    forecastInvoicedAmount: undefined,
  }));

  // Compute simple moving average (SMA) for invoiced amounts and produce forward forecast
  const window = 3;
  const amounts = cashProjection.map(p => p.invoicedAmount);
  const sma = amounts.map((_, idx) => {
    const slice = amounts.slice(Math.max(0, idx - window + 1), idx + 1);
    return slice.length ? sum(slice) / slice.length : amounts[idx] ?? 0;
  });
  cashProjection.forEach((p, i) => {
    p.forecastInvoicedAmount = Math.max(0, sma[i] ?? 0);
  });

  // Forward forecast next 3 periods using last SMA value
  const forwardCount = 3;
  const lastPeriod = cashProjection.length ? cashProjection[cashProjection.length - 1].period : undefined;
  const lastSma = sma.length ? sma[sma.length - 1] : 0;
  if (lastPeriod) {
    for (let i = 1; i <= forwardCount; i++) {
      // For simplicity, label future periods as lastPeriod + "+" + i
      cashProjection.push({
        period: `${lastPeriod}+${i}`,
        invoicedAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        forecastAmount: 0,
        forecastInvoicedAmount: Math.max(0, lastSma),
      } as RevenueTimeseriesPoint);
    }
  }

  totals.forecastAmount = sum(cashProjection.map(point => point.forecastAmount ?? 0));

  return {
    revenueSeries,
    arAging,
    arDetail: arInvoices,
    cashProjection,
    totals,
  };
}
