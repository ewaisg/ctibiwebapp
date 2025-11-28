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
import type { ResourceCapacityRow } from "@/types/dashboard";

interface CapacityBySegmentTableProps {
  data?: ResourceCapacityRow[];
  title?: string;
  subtitle?: string;
  maxRows?: number;
}

const hours = (value: number | undefined) => `${Math.round(value ?? 0)}`;

const percent = (value: number | undefined) => `${Math.round(value ?? 0)}%`;

const formatSegmentType = (segment: ResourceCapacityRow["segmentType"]) => {
  switch (segment) {
    case "company":
      return "Company";
    case "employee":
      return "Employee";
    default:
      return "Department";
  }
};

export function CapacityBySegmentTable({
  data = [],
  title = "Capacity by Segment",
  subtitle = "Scheduled vs actual hours",
  maxRows = 10,
}: CapacityBySegmentTableProps) {
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
                <TableHead>Segment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.segmentType}-${row.segmentId}`}>
                  <TableCell className="font-medium">{row.segmentName}</TableCell>
                  <TableCell>{formatSegmentType(row.segmentType)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{hours(row.scheduledHours)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{hours(row.actualHours)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{hours(row.varianceHours)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{percent(row.utilizationPercent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </Card>
  );
}

export default CapacityBySegmentTable;
