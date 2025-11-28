"use client";

import { memo } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DetailedUtilizationRow } from "@/types";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface OverutilizationTrendProps {
  data?: DetailedUtilizationRow[];
  title?: string;
  subtitle?: string;
  minConsecutiveWeeks?: number;
  maxRows?: number;
}

function consecutiveOverUtilWeeks(weekly: { utilization: number }[]): number {
  let maxRun = 0;
  let current = 0;
  weekly.forEach(w => {
    if ((w.utilization ?? 0) > 100) {
      current += 1;
      maxRun = Math.max(maxRun, current);
    } else {
      current = 0;
    }
  });
  return maxRun;
}

function OverutilizationTrend({
  data = [],
  title = "Overutilization Trend",
  subtitle = "Employees consistently over 100% utilization",
  minConsecutiveWeeks = 2,
  maxRows = 10,
}: OverutilizationTrendProps) {
  const candidates = (data ?? [])
    .map(row => {
      const run = consecutiveOverUtilWeeks(row.weeklyMetrics ?? []);
      return { row, run };
    })
    .filter(x => x.run >= minConsecutiveWeeks)
    .sort((a, b) => b.run - a.run)
    .slice(0, maxRows);

  const hasData = candidates.length > 0;

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
        <ScrollArea className="h-64 pr-2">
          <ul className="space-y-3">
            {candidates.map(({ row, run }) => {
              const trendData = (row.weeklyMetrics ?? []).map((w, idx) => ({
                idx,
                utilization: Math.max(0, Math.round(w.utilization ?? 0)),
              }));
              return (
                <li key={row.employee.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{row.employee.formalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {run} consecutive week{run > 1 ? "s" : ""} over 100%
                      </p>
                    </div>
                  </div>
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="idx" tick={false} axisLine={false} />
                        <YAxis domain={[0, 200]} hide />
                        <Line type="monotone" dataKey="utilization" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </Card>
  );
}

const MemoizedOverutilizationTrend = memo(OverutilizationTrend);
export { MemoizedOverutilizationTrend as OverutilizationTrend };
export default MemoizedOverutilizationTrend;
