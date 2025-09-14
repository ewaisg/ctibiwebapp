"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export type ProjectHoursDatum = { name: string; budgetedHours: number; actualHours: number };

export default function ProjectHoursStacked({ data = [] as ProjectHoursDatum[], title = "Project Hours", subtitle = "Budget vs actual" }: { data?: ProjectHoursDatum[]; title?: string; subtitle?: string }) {
  const config: ChartConfig = {
    budgetedHours: { label: "Budgeted", color: "var(--chart-3)" },
    actualHours: { label: "Actual", color: "var(--chart-1)" },
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
          <BarChart data={data} accessibilityLayer margin={{ top: 8, right: 16, left: 4, bottom: 8 }} barSize={18} barCategoryGap={12}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tickMargin={8} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Bar dataKey="budgetedHours" fill="var(--color-budgetedHours)" stackId="a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actualHours" fill="var(--color-actualHours)" stackId="a" radius={[0, 0, 4, 4]} />
            <ChartTooltip content={<ChartTooltipContent />} allowEscapeViewBox={{ x: true, y: true }} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  );
}
