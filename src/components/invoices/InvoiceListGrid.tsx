"use client";

import type { Company, Contract, Department, Project, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HistoricalInvoiceDialog } from '@/components/historical-invoice-dialog';
import { NewInvoiceDialog } from '@/components/new-invoice-dialog';
import { InvoiceListActions } from '@/components/invoices/InvoiceListActions';
import {
  ColumnsDirective,
  ColumnDirective,
  Filter,
  GridComponent,
  Inject,
  Page,
  Sort,
  Toolbar,
} from '@syncfusion/ej2-react-grids';
import type { EnrichedInvoice } from '@/hooks/use-invoice-list';
import { normalizeInvoiceStatus } from '@/lib/invoice-status';

export function InvoiceListGrid(props: {
  user: User | null;
  projects: Project[];
  departments: Department[];
  contracts: Contract[];
  companies: Company[];
  users: User[];

  filteredInvoices: EnrichedInvoice[];
  hasActiveFilters: boolean;
  onClearFiltersAction: () => void;

  selectedInvoices: string[];
  toggleSelectAllAction: () => void;
  toggleInvoiceSelectionAction: (invoiceId: string) => void;

  isDeleting: boolean;
  actionLoadingId: string | null;

  isAdminOrPrime: boolean;

  statusColors: Record<string, string>;
  paymentStatusColors: Record<string, string>;

  formatCurrencyAction: (amount: number) => string;
  formatDateAction: (date: unknown) => string;

  canSubmitAction: (invoice: any) => boolean;
  canApproveAction: (invoice: any) => boolean;
  canRejectAction: (invoice: any) => boolean;
  canGeneratePdfAction: (invoice: any) => boolean;
  canRestorePdfAction: (invoice: any) => boolean;

  onViewInvoiceAction: (invoice: any) => void;
  onSubmitForReviewAction: (invoiceId: string) => void;
  onApproveAction: (invoiceId: string) => void;
  onOpenRejectDialogAction: (invoiceId: string, status: string) => void;
  onGenerateApprovedPdfAction: (invoiceId: string) => void;
  onOpenRestoreDialogAction: (invoice: any) => void;
  onOpenPaymentDrawerAction: (invoice: any) => void;
  onConfirmDeleteInvoiceAction: (invoiceId: string, status: string) => void;

  onHistoricalInvoiceCreatedAction: () => void;
}) {
  const {
    user,
    projects,
    departments,
    contracts,
    companies,
    users,
    filteredInvoices,
    hasActiveFilters,
    onClearFiltersAction,
    selectedInvoices,
    toggleSelectAllAction,
    toggleInvoiceSelectionAction,
    isDeleting,
    actionLoadingId,
    isAdminOrPrime,
    statusColors,
    paymentStatusColors,
    formatCurrencyAction,
    formatDateAction,
    canSubmitAction,
    canApproveAction,
    canRejectAction,
    canGeneratePdfAction,
    canRestorePdfAction,
    onViewInvoiceAction,
    onSubmitForReviewAction,
    onApproveAction,
    onOpenRejectDialogAction,
    onGenerateApprovedPdfAction,
    onOpenRestoreDialogAction,
    onOpenPaymentDrawerAction,
    onConfirmDeleteInvoiceAction,
    onHistoricalInvoiceCreatedAction,
  } = props;

  const isBulkSelectableStatus = (status: unknown) => {
    const s = normalizeInvoiceStatus(status);
    return s === 'draft' || s === 'submitted' || s === 'resubmitted' || s === 'approved';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredInvoices.length > 0 ? (
          <GridComponent
            dataSource={filteredInvoices}
            allowPaging={true}
            pageSettings={{ pageSize: 10 }}
            allowSorting={true}
            allowFiltering={true}
            filterSettings={{ type: 'Menu' }}
          >
            <ColumnsDirective>
              <ColumnDirective
                headerTemplate={() => (
                  <input
                    type="checkbox"
                    checked={
                      selectedInvoices.length > 0 &&
                      selectedInvoices.length ===
                        filteredInvoices.filter((inv: any) => isBulkSelectableStatus(inv.status)).length
                    }
                    onChange={toggleSelectAllAction}
                    disabled={filteredInvoices.filter((inv: any) => isBulkSelectableStatus(inv.status)).length === 0}
                    className="rounded"
                  />
                )}
                template={(row: any) => (
                  <input
                    type="checkbox"
                    checked={row.id ? selectedInvoices.includes(row.id) : false}
                    onChange={() => row.id && toggleInvoiceSelectionAction(row.id)}
                    disabled={!isBulkSelectableStatus(row.status) || !row.id}
                    className="rounded"
                  />
                )}
                width="50"
              />

              <ColumnDirective
                field="invoiceNumber"
                headerText="Invoice #"
                width="120"
                template={(row: any) => (
                  <span className="font-medium">{row.invoiceNumber || `INV-${row.id?.substring(0, 8) || 'DRAFT'}`}</span>
                )}
              />
              <ColumnDirective field="projectName" headerText="Project" width="150" />
              <ColumnDirective field="submitterName" headerText="Submitter" width="150" />
              {user?.role !== 'Subconsultant' ? (
                <ColumnDirective field="companyName" headerText="Company" width="150" />
              ) : null}

              <ColumnDirective
                field="invoiceTotal"
                headerText="Amount"
                width="120"
                template={(row: any) => <span className="font-semibold">{formatCurrencyAction(row.invoiceTotal || 0)}</span>}
              />

              <ColumnDirective
                field="status"
                headerText="Status"
                width="130"
                template={(row: any) => (
                  <div className="flex items-center gap-2 max-w-[420px]">
                    <Badge
                      variant="outline"
                      className={
                        statusColors[normalizeInvoiceStatus(row.status)] ||
                        statusColors[row.status] ||
                        statusColors.draft
                      }
                    >
                      {normalizeInvoiceStatus(row.status)}
                    </Badge>
                    {row.status === 'rejected' && row.rejectedNotes ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 truncate"
                        title={row.rejectedNotes}
                      >
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        {row.rejectedNotes}
                      </span>
                    ) : null}
                  </div>
                )}
              />

              <ColumnDirective
                field="paymentStatus"
                headerText="Payment Status"
                width="130"
                template={(row: any) =>
                  row.paymentStatus ? (
                    <Badge variant="outline" className={paymentStatusColors[row.paymentStatus] || ''}>
                      {row.paymentStatus === 'partially_paid'
                        ? 'Partially Paid'
                        : row.paymentStatus === 'write_off'
                          ? 'Write-Off'
                          : row.paymentStatus}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )
                }
              />

              <ColumnDirective field="dueDate" headerText="Due Date" width="120" template={(row: any) => formatDateAction(row.dueDate)} />

              <ColumnDirective
                headerText="Actions"
                width="100"
                template={(row: any) => (
                  <InvoiceListActions
                    invoice={row}
                    isDeleting={isDeleting}
                    actionLoadingId={actionLoadingId}
                    isAdminOrPrime={isAdminOrPrime}
                    canSubmitAction={canSubmitAction}
                    canApproveAction={canApproveAction}
                    canRejectAction={canRejectAction}
                    canGeneratePdfAction={canGeneratePdfAction}
                    canRestorePdfAction={canRestorePdfAction}
                    onViewInvoiceAction={onViewInvoiceAction}
                    onSubmitForReviewAction={onSubmitForReviewAction}
                    onApproveAction={onApproveAction}
                    onOpenRejectDialogAction={onOpenRejectDialogAction}
                    onGenerateApprovedPdfAction={onGenerateApprovedPdfAction}
                    onOpenRestoreDialogAction={onOpenRestoreDialogAction}
                    onOpenPaymentDrawerAction={onOpenPaymentDrawerAction}
                    onConfirmDeleteInvoiceAction={onConfirmDeleteInvoiceAction}
                  />
                )}
              />
            </ColumnsDirective>

            <Inject services={[Page, Sort, Filter, Toolbar]} />
          </GridComponent>
        ) : (
          <div className="py-8">
            {hasActiveFilters ? (
              <div className="text-center py-12">
                <div className="rounded-full bg-muted p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  No invoices match your current filters. Try adjusting your search criteria or clear the filters to see all
                  invoices.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={onClearFiltersAction}>
                    Clear Filters
                  </Button>
                  <HistoricalInvoiceDialog
                    projects={projects}
                    departments={departments}
                    contracts={contracts}
                    companies={companies}
                    users={users}
                    currentUser={user || undefined}
                    onInvoiceCreated={onHistoricalInvoiceCreatedAction}
                  />
                  <NewInvoiceDialog projects={projects} departments={departments} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="rounded-full bg-muted p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  {user?.role === 'Subconsultant'
                    ? 'Get started by creating your first invoice. You can track payments, generate PDFs, and manage approvals all in one place.'
                    : 'No invoices have been created yet. Create your first invoice to get started tracking payments and approvals.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <HistoricalInvoiceDialog
                    projects={projects}
                    departments={departments}
                    contracts={contracts}
                    companies={companies}
                    users={users}
                    currentUser={user || undefined}
                    onInvoiceCreated={onHistoricalInvoiceCreatedAction}
                  />
                  <NewInvoiceDialog projects={projects} departments={departments} />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
