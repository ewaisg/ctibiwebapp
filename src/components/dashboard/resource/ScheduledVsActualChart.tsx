"use client";

import { memo } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { HoursTimeseriesPoint } from "@/types/dashboard";

interface ScheduledVsActualChartProps {
  data?: HoursTimeseriesPoint[];
  title?: string;
  subtitle?: string;
}

const config: ChartConfig = {
  scheduledHours: {
    label: "Scheduled",
    color: "var(--chart-3)",
  },
  totalHours: {
    label: "Actual",
    color: "var(--chart-1)",
  },
  billableHours: {
    label: "Billable",
    color: "var(--chart-2)",
  },
};

function ScheduledVsActualChart({
  data = [],
  title = "Scheduled vs Actual",
  subtitle = "Weekly comparison of planned and actual hours",
}: ScheduledVsActualChartProps) {
  const hasData = Array.isArray(data) && data.length > 0;

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
        <ChartContainer config={config} className="h-64">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Line
              type="monotone"
              dataKey="scheduledHours"
              stroke="var(--color-scheduledHours)"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="totalHours"
              stroke="var(--color-totalHours)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="billableHours"
              stroke="var(--color-billableHours)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} allowEscapeViewBox={{ x: true, y: true }} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </Card>
  );
}

const MemoizedScheduledVsActualChart = memo(ScheduledVsActualChart);
export { MemoizedScheduledVsActualChart as ScheduledVsActualChart };
export default MemoizedScheduledVsActualChart;
