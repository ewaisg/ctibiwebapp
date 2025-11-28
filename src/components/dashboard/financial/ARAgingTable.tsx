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
  TableCaption,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgingBucketDetail } from "@/types/dashboard";

interface ARAgingTableProps {
  data?: AgingBucketDetail[];
  title?: string;
  subtitle?: string;
}

const currencyFormatter = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

export function ARAgingTable({
  data = [],
  title = "Accounts Receivable Aging",
  subtitle = "Outstanding balances by aging bucket",
}: ARAgingTableProps) {
  const hasData = Array.isArray(data) && data.length > 0;
  const totalAmount = data.reduce((sum, item) => sum + Math.max(0, item.amount || 0), 0);
  const totalInvoices = data.reduce((sum, item) => sum + Math.max(0, item.invoiceCount || 0), 0);

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
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((bucket) => (
                <TableRow key={bucket.bucket}>
                  <TableCell className="font-medium">{bucket.bucket}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {currencyFormatter(bucket.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {bucket.invoiceCount ?? 0}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {currencyFormatter(totalAmount)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {totalInvoices}
                </TableCell>
              </TableRow>
            </TableBody>
            <TableCaption>Totals reflect current outstanding invoices.</TableCaption>
          </Table>
        </ScrollArea>
      )}
    </Card>
  );
}

export default ARAgingTable;
