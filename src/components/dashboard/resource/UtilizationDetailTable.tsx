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
import type { DetailedUtilizationRow } from "@/types";

interface UtilizationDetailTableProps {
  data?: DetailedUtilizationRow[];
  title?: string;
  subtitle?: string;
  maxRows?: number;
}

const sum = (values: number[]) => values.reduce((acc, value) => acc + Math.max(0, value || 0), 0);

const percent = (value: number) => `${Math.round(Math.max(0, value))}%`;

export function UtilizationDetailTable({
  data = [],
  title = "Utilization Detail",
  subtitle = "Employee level utilization snapshots",
  maxRows = 15,
}: UtilizationDetailTableProps) {
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
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Weeks</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Avg Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const scheduledTotal = sum(row.weeklyMetrics.map(metric => metric.scheduledHours ?? 0));
                const billableTotal = sum(row.weeklyMetrics.map(metric => metric.billableHours ?? 0));
                const utilizationAverage = row.weeklyMetrics.length
                  ? sum(row.weeklyMetrics.map(metric => metric.utilization ?? 0)) / row.weeklyMetrics.length
                  : 0;

                return (
                  <TableRow key={row.employee.id}>
                    <TableCell className="font-medium">{row.employee.formalName}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.weeklyMetrics.length}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{Math.round(scheduledTotal)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{Math.round(billableTotal)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{percent(utilizationAverage)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </Card>
  );
}

export default UtilizationDetailTable;
