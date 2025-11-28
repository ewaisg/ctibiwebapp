"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgingInvoiceDetail } from "@/types/dashboard";

interface ARDetailTableProps {
  data?: AgingInvoiceDetail[];
  title?: string;
  subtitle?: string;
  maxRows?: number;
}

const currencyFormatter = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

const formatDate = (value?: string) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }
  return parsed.toLocaleDateString();
};

export function ARDetailTable({
  data = [],
  title = "Aging Detail",
  subtitle = "Invoices contributing to AR",
  maxRows = 25,
}: ARDetailTableProps) {
  const hasData = Array.isArray(data) && data.length > 0;
  const rows = hasData ? data.slice(0, maxRows) : [];

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No data
        </div>
      ) : (
        <ScrollArea className="h-64">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((invoice) => (
                <TableRow key={invoice.invoiceId}>
                  <TableCell className="font-medium">{invoice.invoiceNumber || invoice.invoiceId}</TableCell>
                  <TableCell>{invoice.projectName || "--"}</TableCell>
                  <TableCell className="capitalize">{invoice.status?.toLowerCase() || "--"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {currencyFormatter(invoice.outstandingAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {invoice.daysOutstanding ?? "--"}
                  </TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </Card>
  );
}

export default ARDetailTable;
