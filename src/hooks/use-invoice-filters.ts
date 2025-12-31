import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import type { EnrichedInvoice } from '@/hooks/use-invoice-list';

export interface InvoiceMetrics {
  totalInvoices: number;
  draftInvoices: number;
  pendingInvoices: number;
  approvedInvoices: number;
  totalAmount: number;
}

function parseInvoiceDate(inv: any): Date | null {
  const raw = inv?.toDate || inv?.dueDate || inv?.fromDate;
  if (!raw) return null;

  if (typeof raw === 'string') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  if (raw && typeof raw === 'object' && 'seconds' in raw) {
    const seconds = Number((raw as any).seconds);
    const d = !isNaN(seconds) ? new Date(seconds * 1000) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  }

  if (raw instanceof Date) return raw;
  return null;
}

export function useInvoiceFilters(invoices: EnrichedInvoice[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [showChart, setShowChart] = useState(false);

  const filteredInvoices = useMemo(() => {
    let filtered: any[] = invoices;

    if (debouncedSearchTerm) {
      const q = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((invoice: any) =>
        String(invoice.invoiceNumber || '').toLowerCase().includes(q) ||
        String(invoice.projectName || '').toLowerCase().includes(q) ||
        String(invoice.submitterName || '').toLowerCase().includes(q) ||
        String(invoice.companyName || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((invoice: any) => invoice.status === statusFilter);
    }

    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter((invoice: any) => invoice.paymentStatus === paymentStatusFilter);
    }

    if (companyFilter !== 'all') {
      filtered = filtered.filter((invoice: any) => invoice.submitterCompanyIdString === companyFilter);
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter((invoice: any) => invoice.projectIdString === projectFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((invoice: any) => {
        const d = parseInvoiceDate(invoice);
        return d ? d >= from : true;
      });
    }

    if (dateTo) {
      const to = new Date(dateTo);
      filtered = filtered.filter((invoice: any) => {
        const d = parseInvoiceDate(invoice);
        return d ? d <= to : true;
      });
    }

    return filtered as EnrichedInvoice[];
  }, [
    invoices,
    debouncedSearchTerm,
    statusFilter,
    paymentStatusFilter,
    companyFilter,
    projectFilter,
    dateFrom,
    dateTo,
  ]);

  const metrics = useMemo<InvoiceMetrics>(() => {
    const totalInvoices = filteredInvoices.length;
    const draftInvoices = filteredInvoices.filter((inv) => inv.status === 'draft').length;
    const pendingInvoices = filteredInvoices.filter((inv) => inv.status === 'submitted').length;
    const approvedInvoices = filteredInvoices.filter((inv) => inv.status === 'approved').length;
    const totalAmount = filteredInvoices.reduce((sum, inv: any) => sum + (inv.invoiceTotal || 0), 0);

    return {
      totalInvoices,
      draftInvoices,
      pendingInvoices,
      approvedInvoices,
      totalAmount,
    };
  }, [filteredInvoices]);

  const chartData = useMemo(() => {
    const monthlyData = new Map<string, { amount: number; sortKey: number }>();

    filteredInvoices.forEach((inv: any) => {
      if (!inv.invoiceTotal) return;
      const dateStr = inv.toDate;
      if (!dateStr) return;

      let date: Date;
      if (typeof dateStr === 'object' && 'seconds' in dateStr) {
        date = new Date((dateStr as any).seconds * 1000);
      } else if (dateStr instanceof Date) {
        date = dateStr;
      } else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) return;

      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const existing = monthlyData.get(key);
      if (existing) {
        existing.amount += inv.invoiceTotal;
      } else {
        monthlyData.set(key, { amount: inv.invoiceTotal, sortKey: date.getTime() });
      }
    });

    return Array.from(monthlyData.entries())
      .map(([Period, data]) => ({ Period, Amount: data.amount, sortKey: data.sortKey }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ Period, Amount }) => ({ Period, Amount }));
  }, [filteredInvoices]);

  const hasActiveFilters = Boolean(
    debouncedSearchTerm ||
      statusFilter !== 'all' ||
      paymentStatusFilter !== 'all' ||
      companyFilter !== 'all' ||
      projectFilter !== 'all' ||
      dateFrom ||
      dateTo
  );

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setCompanyFilter('all');
    setProjectFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,

    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    companyFilter,
    setCompanyFilter,
    projectFilter,
    setProjectFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,

    showChart,
    setShowChart,

    filteredInvoices,
    metrics,
    chartData,
    hasActiveFilters,
    resetFilters,
  };
}
