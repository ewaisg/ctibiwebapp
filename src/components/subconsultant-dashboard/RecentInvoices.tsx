"use client";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentInvoices({ data, loading }: { data: any[]; loading?: boolean }) {
  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground mb-2">Recent Invoices</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.length ? data.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>{inv.invoiceNumber || inv.id}</TableCell>
              <TableCell>{inv.status}</TableCell>
              <TableCell className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(inv.invoiceTotal || 0)}</TableCell>
              <TableCell>{formatDate(inv.createdAt)}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">No invoices yet</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function formatDate(val: any) {
  try {
    if (val?.seconds) return new Date(val.seconds * 1000).toISOString().slice(0, 10);
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return '';
}
