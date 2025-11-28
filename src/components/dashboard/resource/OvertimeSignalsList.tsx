"use client";

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
import { Scatter, ScatterChart, XAxis, YAxis, ZAxis, CartesianGrid } from "recharts";
import type { TopPerformerRow } from "@/types/dashboard";

interface OvertimeSignalsListProps {
  data?: TopPerformerRow[];
  title?: string;
  subtitle?: string;
}

const config: ChartConfig = {
  bubble: {
    label: "Hours",
    color: "var(--chart-1)",
  },
};

const hoursFormatter = (value: number) => `${Math.round(Math.max(0, value || 0))} hrs`;

export function OvertimeSignalsList({
  data = [],
  title = "Overtime Signals",
  subtitle = "Bubble size reflects total hours in period",
}: OvertimeSignalsListProps) {
  const hasData = Array.isArray(data) && data.length > 0;

  // Map TopPerformerRow to bubble points. Assume an index-based X axis when period isn't provided.
  const points = (data ?? []).map((row, idx) => ({
    x: idx + 1,
    y: Math.max(0, row.utilizationPercent ?? 0),
    z: Math.max(0, row.billableHours ?? 0),
    label: row.entityName,
  }));

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
          <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="Period" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis dataKey="y" name="Utilization (%)" tickLine={false} axisLine={false} />
            <ZAxis dataKey="z" range={[60, 200]} name="Hours" />
            <Scatter name="Hours" data={points} fill="var(--color-bubble)" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const p = item?.payload as any;
                    if (name === "Hours") {
                      return <span>{hoursFormatter(Number(p?.z ?? value))}</span>;
                    }
                    return <span>{String(value)}</span>;
                  }}
                  labelFormatter={(label: any, payload: any[]) => {
                    const p = payload && payload[0] ? (payload[0] as any).payload : undefined;
                    return p?.label ?? "";
                  }}
                />
              }
              allowEscapeViewBox={{ x: true, y: true }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ScatterChart>
        </ChartContainer>
      )}
    </Card>
  );
}

export default OvertimeSignalsList;
