"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyInvoiceKpis({ data, loading }: { data: any | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  const k = data?.kpi || { drafts: 0, submitted: 0, approved: 0, paid: 0, totalSubmittedAmount: 0, totalPaidAmount: 0, totalOutstandingAmount: 0 };
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);

  const items = [
    { label: 'Drafts', value: k.drafts },
    { label: 'Submitted', value: k.submitted },
    { label: 'Approved', value: k.approved },
    { label: 'Paid', value: k.paid },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.label} className="p-4">
            <div className="text-sm text-muted-foreground">{it.label}</div>
            <div className="text-2xl font-semibold">{it.value ?? 0}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Submitted</div>
          <div className="text-2xl font-semibold">{fmt(k.totalSubmittedAmount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Paid</div>
          <div className="text-2xl font-semibold">{fmt(k.totalPaidAmount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className="text-2xl font-semibold">{fmt(k.totalOutstandingAmount)}</div>
        </Card>
      </div>
    </div>
  );
}
