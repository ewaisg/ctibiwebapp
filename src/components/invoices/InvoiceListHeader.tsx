"use client";

import type { Company, Contract, Department, Project, User } from '@/types';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ClipboardList,
  FileArchive,
  FileBox,
  FileSpreadsheet,
  FileText,
  Layers,
  Trash2,
} from 'lucide-react';
import { DepartmentalCompilationDialog } from '@/components/departmental-compilation-dialog';
import { HistoricalInvoiceDialog } from '@/components/historical-invoice-dialog';
import { NewInvoiceDialog } from '@/components/new-invoice-dialog';

export function InvoiceListHeader(props: {
  user: User | null;
  departments: Department[];
  projects: Project[];
  contracts: Contract[];
  companies: Company[];
  users: User[];

  selectedCount: number;
  isDeleting: boolean;
  onConfirmBulkDeleteAction: () => void;

  onOpenCoverPagesAction: () => void;
  onOpenInvoicesWizardAction: () => void;
  onOpenTimecardWizardAction: () => void;
  onOpenSummaryWizardAction: () => void;
  onOpenBillingPacketWizardAction: () => void;

  onHistoricalInvoiceCreatedAction: () => void;
}) {
  const {
    user,
    departments,
    projects,
    contracts,
    companies,
    users,
    selectedCount,
    isDeleting,
    onConfirmBulkDeleteAction,
    onOpenCoverPagesAction,
    onOpenInvoicesWizardAction,
    onOpenTimecardWizardAction,
    onOpenSummaryWizardAction,
    onOpenBillingPacketWizardAction,
    onHistoricalInvoiceCreatedAction,
  } = props;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Invoices' }]} className="mb-4" />

      <div id="main-content" className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and track all invoice submissions</p>
        </div>

        <div className="flex items-center space-x-2">
          {user?.role !== 'Subconsultant' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <Layers className="mr-2 h-4 w-4" /> Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={onOpenCoverPagesAction}>
                  <FileBox className="mr-2 h-4 w-4" /> Generate Cover Pages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenInvoicesWizardAction}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Generate PDF Invoices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenTimecardWizardAction}>
                  <ClipboardList className="mr-2 h-4 w-4" /> Generate Time Card Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSummaryWizardAction}>
                  <FileText className="mr-2 h-4 w-4" /> Overall Projects Summary Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenBillingPacketWizardAction}>
                  <FileArchive className="mr-2 h-4 w-4" /> Generate Monthly Billing Packet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {selectedCount > 0 ? (
            <Button variant="destructive" onClick={onConfirmBulkDeleteAction} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedCount})
            </Button>
          ) : null}

          {user?.role !== 'Subconsultant' ? (
            <DepartmentalCompilationDialog departments={departments} />
          ) : null}

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
    </>
  );
}
