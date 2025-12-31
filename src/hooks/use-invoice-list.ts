import { useMemo } from 'react';
import type { Company, Invoice, Project, User } from '@/types';

export type EnrichedInvoice = Invoice & {
  id: string;
  projectName: string;
  submitterName: string;
  companyName: string;
  submitterCompanyIdString?: string;
  projectIdString?: string;
};

function toId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in (value as any) && typeof (value as any).id === 'string') {
    return (value as any).id;
  }
  return undefined;
}

export function useInvoiceList(params: {
  initialInvoices: Invoice[];
  user: User | null;
  projects: Project[];
  users: User[];
  companies: Company[];
}) {
  const { initialInvoices, user, projects, users, companies } = params;

  const enrichedInvoices = useMemo<EnrichedInvoice[]>(() => {
    if (!user) return [];

    let baseInvoices: any[] = initialInvoices;

    // Role-based filtering
    if (user.role === 'Subconsultant') {
      baseInvoices = baseInvoices.filter((invoice: any) => {
        const invoiceUserId = toId(invoice?.userId) ?? invoice?.userId;
        return invoiceUserId === user.uid;
      });

      // Preserve Subconsultant view for approved invoices by using immutable submittedSnapshot totals/items.
      baseInvoices = baseInvoices.map((invoice: any) => {
        const status = String(invoice?.status || '').toLowerCase();
        const snapshot = invoice?.submittedSnapshot;
        if (status === 'approved' && snapshot) {
          return {
            ...invoice,
            invoiceItems: Array.isArray(snapshot.invoiceItems) ? snapshot.invoiceItems : invoice.invoiceItems,
            reimbursableExpenses: Array.isArray(snapshot.reimbursableExpenses)
              ? snapshot.reimbursableExpenses
              : invoice.reimbursableExpenses,
            invoiceItemsTotal: typeof snapshot.invoiceItemsTotal === 'number' ? snapshot.invoiceItemsTotal : invoice.invoiceItemsTotal,
            reimbursableExpensesTotal:
              typeof snapshot.reimbursableExpensesTotal === 'number'
                ? snapshot.reimbursableExpensesTotal
                : invoice.reimbursableExpensesTotal,
            invoiceTotal: typeof snapshot.invoiceTotal === 'number' ? snapshot.invoiceTotal : invoice.invoiceTotal,
          };
        }
        return invoice;
      });
    }

    return baseInvoices.map((invoice: any) => {
      const projectId = toId(invoice?.projectId) ?? invoice?.projectId;
      const project = projects.find((p) => p.id === projectId);

      const userId = toId(invoice?.userId) ?? invoice?.userId;
      const submitter = users.find((u) => u.uid === userId);

      const companyId = toId(invoice?.submitterCompanyId) ?? invoice?.submitterCompanyId;
      const submitterCompany = companies.find((c) => c.id === companyId);

      return {
        ...invoice,
        id: invoice?.id || '',
        projectName: project?.projectName || 'Unknown Project',
        submitterName: submitter?.displayName || invoice?.submitterName || 'Unknown User',
        companyName: submitterCompany?.companyName || invoice?.submitterCompany || 'Unknown Company',
        submitterCompanyIdString: companyId,
        projectIdString: projectId,
      } as EnrichedInvoice;
    });
  }, [initialInvoices, user, projects, users, companies]);

  const availableCompanies = useMemo(() => {
    if (user?.role === 'Subconsultant') {
      const userCompanyId = toId(user.companyId) ?? (user.companyId as any);
      const userCompany = companies.find((c) => c.id === userCompanyId);
      return userCompany ? [userCompany] : [];
    }
    return companies;
  }, [companies, user]);

  return {
    enrichedInvoices,
    availableCompanies,
  };
}
