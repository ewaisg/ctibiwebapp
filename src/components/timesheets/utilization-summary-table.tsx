
"use client";

import { useMemo, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfWeek, endOfWeek } from 'date-fns';
import type { DetailedUtilizationRow } from '@/types';
import { cn } from '@/lib/utils';

interface UtilizationSummaryTableProps {
  weeklyData: DetailedUtilizationRow[];
  timePeriods: Date[];
}

export function UtilizationSummaryTable({ weeklyData, timePeriods }: UtilizationSummaryTableProps) {
    const weekStartsOn = 0;

    const teamTotals = useMemo(() => {
        return timePeriods.map((_, weekIndex) => {
            const totalBillable = weeklyData.reduce((sum, data) => sum + data.weeklyMetrics[weekIndex].billableHours, 0);
            const totalScheduled = weeklyData.reduce((sum, data) => sum + data.weeklyMetrics[weekIndex].scheduledHours, 0);
            const totalUtilization = totalScheduled > 0 ? (totalBillable / totalScheduled) * 100 : 0;
            return { totalBillable, totalScheduled, totalUtilization };
        });
    }, [weeklyData, timePeriods]);

    return (
        <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px] sticky left-0 bg-card z-10 font-bold">Employee</TableHead>
                        {timePeriods.map((period, index) => (
                            <TableHead key={index} colSpan={3} className="text-center border-l">
                                WK {format(startOfWeek(period, { weekStartsOn: 0 }), 'M/dd')} - {format(endOfWeek(period, { weekStartsOn: 0 }), 'M/dd')}
                                <div className="grid grid-cols-3 font-medium text-muted-foreground border-t mt-1 pt-1">
                                    <div>Billable</div>
                                    <div>Scheduled</div>
                                    <div>Utilization</div>
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {weeklyData.map(({ employee, weeklyMetrics }) => (
                        <TableRow key={employee.id}>
                            <TableCell className="font-medium sticky left-0 bg-card z-10">{employee.formalName}</TableCell>
                            {weeklyMetrics.map((metrics, index) => (
                                <Fragment key={index}>
                                    <TableCell className={cn("text-center font-mono border-l", metrics.billableHours > 0 ? 'text-primary' : 'text-muted-foreground')}>
                                        {metrics.billableHours.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-muted-foreground">
                                        {metrics.scheduledHours.toFixed(1)}
                                    </TableCell>
                                    <TableCell className={cn("text-center font-mono font-semibold", metrics.utilization >= 100 ? 'text-green-600' : 'text-foreground')}>
                                        {`${metrics.utilization.toFixed(1)}%`}
                                    </TableCell>
                                </Fragment>
                            ))}
                        </TableRow>
                    ))}
                    <TableRow className="bg-muted hover:bg-muted font-bold">
                        <TableCell className="sticky left-0 bg-muted z-10">Team Total</TableCell>
                        {teamTotals.map((totals, index) => (
                            <Fragment key={index}>
                                <TableCell className="text-center font-mono border-l">{totals.totalBillable.toFixed(1)}</TableCell>
                                <TableCell className="text-center font-mono">{totals.totalScheduled.toFixed(1)}</TableCell>
                                <TableCell className="text-center font-mono">{`${totals.totalUtilization.toFixed(1)}%`}</TableCell>
                            </Fragment>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
