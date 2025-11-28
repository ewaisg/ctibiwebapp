"use client";

import { useMemo, memo } from "react";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";

export type TimeAllocationDatum = { name: string; value: number; color?: string };

const BASE_CONFIG: ChartConfig = {
  billable: { label: "Billable", color: "var(--chart-1)" },
  unbillable: { label: "Non-Billable", color: "var(--chart-2)" },
  paidLeave: { label: "Paid Leave", color: "var(--chart-3)" },
  unpaidLeave: { label: "Unpaid Leave", color: "var(--chart-4)" },
};

const fallbackLabel = (key: string) =>
  key
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());

interface TimeAllocationPieProps {
  data?: TimeAllocationDatum[];
  title?: string;
  subtitle?: string;
}

function TimeAllocationPie({
  data = [] as TimeAllocationDatum[],
  title = "Time Allocation",
  subtitle = "Breakdown of paid hours",
}: TimeAllocationPieProps) {
  const chartConfig = useMemo<ChartConfig>(() => {
    const merged: ChartConfig = { ...BASE_CONFIG };

    for (const datum of Array.isArray(data) ? data : []) {
      const rawKey = typeof datum.name === "string" ? datum.name.trim() : "";
      if (!rawKey) continue;
      if (!merged[rawKey]) {
        merged[rawKey] = {
          label: fallbackLabel(rawKey),
          color: datum.color ?? "var(--chart-5)",
        };
      } else if (datum.color) {
        merged[rawKey] = {
          label: merged[rawKey].label,
          color: datum.color,
        };
      }
    }

    return merged;
  }, [data]);

  const { chartData, totalHours } = useMemo(() => {
    const sanitized = (Array.isArray(data) ? data : [])
      .map((datum) => {
        const key = typeof datum.name === "string" ? datum.name.trim() : "";
        const numericValue = Number.isFinite(datum.value) ? Number(datum.value) : Number(datum.value ?? 0);
        const safeValue = Math.max(0, numericValue || 0);
        return {
          ...datum,
          name: key,
          value: safeValue,
        };
      })
      .filter((datum) => datum.name && datum.value > 0);

    const aggregate = sanitized.reduce((sum, datum) => sum + datum.value, 0);

    const mapped = sanitized.map((datum) => {
      const configEntry = chartConfig[datum.name];
      const fill = datum.color ?? configEntry?.color ?? "var(--chart-5)";
      return {
        ...datum,
        fill,
      };
    });

    return {
      chartData: mapped,
      totalHours: aggregate,
    };
  }, [data, chartConfig]);

  const hasData = chartData.length > 0;
  const safeTotal = totalHours > 0 ? totalHours : 1;

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ChartContainer config={chartConfig} className="h-64">
          <PieChart accessibilityLayer>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              allowEscapeViewBox={{ x: true, y: true }}
              content={
                <ChartTooltipContent
                  nameKey="name"
                  formatter={(value, name) => {
                    const numericValue =
                      typeof value === "number" ? value : Number(value) || 0;
                    const key = typeof name === "string" ? name : String(name ?? "");
                    const configEntry = chartConfig[key];
                    const label = configEntry?.label ?? fallbackLabel(key);
                    const percent = safeTotal > 0 ? (numericValue / safeTotal) * 100 : 0;

                    return (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium text-foreground">
                          {numericValue.toLocaleString()}h
                          <span className="ml-2 text-xs text-muted-foreground">
                            {percent.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      )}
    </Card>
  );
}

export default memo(TimeAllocationPie);
