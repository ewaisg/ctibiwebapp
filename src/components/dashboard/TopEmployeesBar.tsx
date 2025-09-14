"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export type TopEmployeeDatum = { name: string; billableHours: number };

export default function TopEmployeesBar({ data = [] as TopEmployeeDatum[], title = "Top Employees", subtitle = "Billable hours" }: { data?: TopEmployeeDatum[]; title?: string; subtitle?: string }) {
  const config: ChartConfig = {
    billableHours: { label: "Billable Hours", color: "var(--chart-1)" },
  };
  const hasData = Array.isArray(data) && data.length > 0;

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
          <BarChart data={data} layout="vertical" accessibilityLayer margin={{ top: 8, right: 16, left: 4, bottom: 8 }} barSize={18} barCategoryGap={12}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={160} tickLine={false} axisLine={false} />
            <Bar dataKey="billableHours" fill="var(--color-billableHours)" radius={[4, 4, 4, 4]} />
            <ChartTooltip content={<ChartTooltipContent />} allowEscapeViewBox={{ x: true, y: true }} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  );
}
