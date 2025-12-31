"use client";

import type { Company, Project, User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function InvoiceListFilters(props: {
  user: User | null;
  availableCompanies: Company[];
  projects: Project[];

  searchTerm: string;
  onSearchTermChangeAction: (value: string) => void;

  statusFilter: string;
  onStatusFilterChangeAction: (value: string) => void;

  paymentStatusFilter: string;
  onPaymentStatusFilterChangeAction: (value: string) => void;

  companyFilter: string;
  onCompanyFilterChangeAction: (value: string) => void;

  projectFilter: string;
  onProjectFilterChangeAction: (value: string) => void;

  dateFrom: string;
  onDateFromChangeAction: (value: string) => void;

  dateTo: string;
  onDateToChangeAction: (value: string) => void;

  onResetAction: () => void;
}) {
  const {
    user,
    availableCompanies,
    projects,
    searchTerm,
    onSearchTermChangeAction,
    statusFilter,
    onStatusFilterChangeAction,
    paymentStatusFilter,
    onPaymentStatusFilterChangeAction,
    companyFilter,
    onCompanyFilterChangeAction,
    projectFilter,
    onProjectFilterChangeAction,
    dateFrom,
    onDateFromChangeAction,
    dateTo,
    onDateToChangeAction,
    onResetAction,
  } = props;

  return (
    <Card className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border overflow-visible">
      <CardContent className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto">
            <Label htmlFor="search" className="sr-only">Search</Label>
            <Input
              id="search"
              placeholder="Search invoices, project, submitter"
              value={searchTerm}
              onChange={(e) => onSearchTermChangeAction(e.target.value)}
              className="h-9 w-full sm:w-60 md:w-[280px]"
            />
          </div>

          <div>
            <Label className="sr-only">Status</Label>
            <Select value={statusFilter} onValueChange={onStatusFilterChangeAction}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="sr-only">Payment Status</Label>
            <Select value={paymentStatusFilter} onValueChange={onPaymentStatusFilterChangeAction}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="all">All Payment Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="write_off">Write-Off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {user?.role !== 'Subconsultant' ? (
            <div>
              <Label className="sr-only">Company</Label>
              <Select value={companyFilter} onValueChange={onCompanyFilterChangeAction}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-64">
                  <SelectItem value="all">All Companies</SelectItem>
                  {availableCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <Label className="sr-only">Project</Label>
            <Select value={projectFilter} onValueChange={onProjectFilterChangeAction}>
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent className="z-50 max-h-64">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <Label className="sr-only">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => onDateFromChangeAction(e.target.value)} className="h-9 w-40" />
            </div>
            <span className="text-muted-foreground text-sm">to</span>
            <div>
              <Label className="sr-only">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => onDateToChangeAction(e.target.value)} className="h-9 w-40" />
            </div>
          </div>

          <div className="ml-auto">
            <Button variant="outline" size="sm" type="button" onClick={onResetAction}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
