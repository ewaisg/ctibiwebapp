"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";

export type TimeAllocationDatum = { name: string; value: number; color?: string };

export default function TimeAllocationPie({ data = [] as TimeAllocationDatum[], title = "Time Allocation", subtitle = "Breakdown of paid hours" }: { data?: TimeAllocationDatum[]; title?: string; subtitle?: string }) {
  const config: ChartConfig = {
    billable: { label: "Billable", color: "hsl(var(--chart-1))" },
    unbillable: { label: "Non-Billable", color: "hsl(var(--chart-2))" },
    paidLeave: { label: "Paid Leave", color: "hsl(var(--chart-3))" },
    unpaidLeave: { label: "Unpaid Leave", color: "hsl(var(--chart-4))" },
  };

  const hasData = Array.isArray(data) && data.some(d => d.value > 0);
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ChartContainer config={config} className="h-64">
          <PieChart accessibilityLayer>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={`var(--color-${String(entry.name)})`} />
              ))}
            </Pie>
            <ChartTooltip
              content={(
                <ChartTooltipContent
                  nameKey="name"
                  formatter={(value, name) => {
                    const val = typeof value === 'number' ? value : Number(value) || 0;
                    const pct = `${Math.round((val / total) * 100)}%`;
                    return (
                      <span>{pct}</span>
                    );
                  }}
                />
              )}
              allowEscapeViewBox={{ x: true, y: true }}
            />
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      )}
    </Card>
  );
}
