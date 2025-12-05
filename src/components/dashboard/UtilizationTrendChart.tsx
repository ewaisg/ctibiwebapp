"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Cell } from "recharts";

export type UtilizationTrendDatum = {
  date: string;
  utilization: number;
  trend?: number;
};

interface UtilizationTrendChartProps {
  data?: UtilizationTrendDatum[];
  title?: string;
  subtitle?: string;
  targetUtilization?: number; // Target percentage (default: 80)
}

function UtilizationTrendChart({
  data = [] as UtilizationTrendDatum[],
  title = "Utilization Rate Trend",
  subtitle = "Company-wide billable utilization over time",
  targetUtilization = 80
}: UtilizationTrendChartProps) {
  const config: ChartConfig = {
    utilization: { label: "Utilization %", color: "hsl(var(--chart-1))" },
    target: { label: `Target (${targetUtilization}%)`, color: "hsl(var(--muted-foreground))" },
  };

  // Function to get color based on utilization value
  const getBarColor = (value: number) => {
    if (value >= targetUtilization) return "#22c55e"; // Green
    if (value >= 60) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };

  const hasData = Array.isArray(data) && data.length > 0;

  // Calculate average utilization and status
  const avgUtilization = useMemo(() => {
    if (!hasData) return 0;
    const sum = data.reduce((acc, d) => acc + d.utilization, 0);
    return sum / data.length;
  }, [data, hasData]);

  const status = useMemo(() => {
    if (avgUtilization >= targetUtilization) return { label: "On Target", color: "text-green-600", bgColor: "bg-green-50" };
    if (avgUtilization >= 60) return { label: "Below Target", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { label: "Critical", color: "text-red-600", bgColor: "bg-red-50" };
  }, [avgUtilization, targetUtilization]);

  // Find max value for chart scaling
  const maxValue = useMemo(() => {
    if (!hasData) return 100;
    const dataMax = Math.max(...data.map(d => d.utilization), ...data.map(d => d.trend ?? 0));
    return Math.max(100, Math.ceil(dataMax / 10) * 10);
  }, [data, hasData]);

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {hasData && (
            <div className={`text-right rounded-lg px-3 py-2 `}>
              <div className="text-xs text-muted-foreground">Average</div>
              <div className="text-2xl font-bold">{avgUtilization.toFixed(1)}%</div>
              <div className={`text-xs font-medium ${status.color}`}>{status.label}</div>
            </div>
          )}
        </div>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No utilization data available</p>
            <p className="text-xs mt-1">Try adjusting your filters or date range</p>
          </div>
        </div>
      ) : (
        <ChartContainer config={config} className="h-64">
          <BarChart data={data} accessibilityLayer margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="date"
              tickMargin={8}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Week Starting', position: 'insideBottom', offset: -5, fontSize: 11 }}
            />
            <YAxis
              domain={[0, maxValue]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />

            {/* Target threshold line (dashed horizontal) */}
            <ReferenceLine
              y={targetUtilization}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Target: ${targetUtilization}%`,
                position: 'right',
                fill: '#64748b',
                fontSize: 12
              }}
            />

            {/* Utilization bars with color-coding */}
            <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.utilization)} />
              ))}
            </Bar>

            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
              allowEscapeViewBox={{ x: true, y: true }}
            />
          </BarChart>
        </ChartContainer>
      )}

      {/* Color legend */}
      {hasData && (
        <div className="mt-4 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: "#22c55e" }} />
            <span className="text-muted-foreground">On Target (≥{targetUtilization}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: "#eab308" }} />
            <span className="text-muted-foreground">Below Target (60-{targetUtilization - 1}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: "#ef4444" }} />
            <span className="text-muted-foreground">Critical (&lt;60%)</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default memo(UtilizationTrendChart);
