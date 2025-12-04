"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";

export type BillableHoursForecastDatum = {
  date: string;
  actual: number;
  trend?: number;
};

interface BillableHoursForecastProps {
  data?: BillableHoursForecastDatum[];
  title?: string;
  subtitle?: string;
  targetHours?: number; // Minimum target threshold (default: 40 for weekly avg)
}

function BillableHoursForecast({
  data = [] as BillableHoursForecastDatum[],
  title = "Billable Hours Forecast",
  subtitle = "Actual vs target trend over time",
  targetHours = 40
}: BillableHoursForecastProps) {
  const config: ChartConfig = {
    actual: { label: "Avg per Employee", color: "var(--chart-1)" },
    trend: { label: "Trend Line", color: "var(--chart-3)" },
    target: { label: `Target (${targetHours}h)`, color: "var(--chart-4)" },
  };

  const hasData = Array.isArray(data) && data.length > 0;
  const hasTrend = hasData && data.some(d => d.trend !== undefined && d.trend !== null);

  // Calculate average for status indicator
  const avgBillable = useMemo(() => {
    if (!hasData) return 0;
    const sum = data.reduce((acc, d) => acc + d.actual, 0);
    return sum / data.length;
  }, [data, hasData]);

  const status = useMemo(() => {
    if (avgBillable >= targetHours) return { label: "On Target", color: "text-green-600" };
    if (avgBillable >= targetHours * 0.85) return { label: "Below Target", color: "text-yellow-600" };
    return { label: "Critical", color: "text-red-600" };
  }, [avgBillable, targetHours]);

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {hasData && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Average</div>
              <div className="text-lg font-semibold">{avgBillable.toFixed(1)}h</div>
              <div className={`text-xs font-medium ${status.color}`}>{status.label}</div>
            </div>
          )}
        </div>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No billable hours data available</p>
            <p className="text-xs mt-1">Try adjusting your filters or date range</p>
          </div>
        </div>
      ) : (
        <ChartContainer config={config} className="h-64">
          <LineChart data={data} accessibilityLayer margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickMargin={8}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Week Starting', position: 'insideBottom', offset: -5, fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />

            {/* Target threshold line (dashed horizontal) */}
            <ReferenceLine
              y={targetHours}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: `Target: ${targetHours}h`, position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />

            {/* Actual billable hours (solid line with smooth curve) */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--color-actual)"
              strokeWidth={3}
              dot={{ r: 5, fill: "var(--color-actual)", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              connectNulls
            />

            {/* Trend/rolling average (dashed line) - only if data exists */}
            {hasTrend && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke="var(--color-trend)"
                strokeWidth={2.5}
                strokeDasharray="8 4"
                dot={false}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}

            <ChartTooltip content={<ChartTooltipContent />} allowEscapeViewBox={{ x: true, y: true }} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </Card>
  );
}

export default memo(BillableHoursForecast);
