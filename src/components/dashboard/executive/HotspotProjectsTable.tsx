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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ProjectHealthRow } from "@/types/dashboard";

interface HotspotProjectsTableProps {
  data?: ProjectHealthRow[];
  loading?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const flagVariant: Record<ProjectHealthRow["flag"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; }> = {
  healthy: { label: "Healthy", variant: "secondary" },
  warning: { label: "Warning", variant: "default" },
  critical: { label: "Critical", variant: "destructive" },
};

const skeletonRows = Array.from({ length: 4 });

export function HotspotProjectsTable({ data = [], loading = false }: HotspotProjectsTableProps) {
  return (
    <Card className="p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">Hotspot Projects</CardTitle>
        <CardDescription>Projects requiring immediate attention</CardDescription>
      </CardHeader>
      {loading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">PO Remaining</TableHead>
              <TableHead className="text-right">AR Outstanding</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skeletonRows.map((_, index) => (
              <TableRow key={index} className="animate-pulse">
                <TableCell>
                  <div className="h-4 w-40 rounded bg-muted-foreground/20" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="ml-auto h-4 w-20 rounded bg-muted-foreground/20" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="ml-auto h-4 w-20 rounded bg-muted-foreground/20" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="ml-auto h-4 w-16 rounded bg-muted-foreground/20" />
                </TableCell>
                <TableCell>
                  <div className="h-5 w-16 rounded-full bg-muted-foreground/20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : !data.length ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No critical projects for the selected filters.
        </div>
      ) : (
        <Table>
          <TableCaption>Ranked by PO burn, hours remaining, and receivables risk.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">PO Remaining</TableHead>
              <TableHead className="text-right">AR Outstanding</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const flag = flagVariant[row.flag];
              return (
                <TableRow key={row.projectId}>
                  <TableCell className="font-medium">
                    <div>{row.projectName}</div>
                    {row.narrative ? (
                      <p className="mt-1 text-xs text-muted-foreground">{row.narrative}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {currencyFormatter.format(Math.max(0, row.remainingPo ?? 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {currencyFormatter.format(Math.max(0, row.arOutstanding ?? 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {`${percentFormatter.format(Math.max(0, row.utilizationPercent ?? 0))}%`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={flag.variant}>{flag.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export default HotspotProjectsTable;
