"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";

export type ProjectBudgetDatum = { name: string; used: number; remaining: number };

interface ProjectBudgetRadialProps {
  data?: ProjectBudgetDatum[];
  title?: string;
  subtitle?: string;
}

function ProjectBudgetRadial({ data = [] as ProjectBudgetDatum[], title = "Project Budget Utilization", subtitle = "PO used vs remaining (combined)" }: ProjectBudgetRadialProps) {
  const config: ChartConfig = {
    used: { label: "Used", color: "var(--chart-1)" },
    remaining: { label: "Remaining", color: "var(--chart-4)" },
  };
  const hasData = Array.isArray(data) && data.length > 0;

  const totalUsed = Math.max(0, data.reduce((s, d) => s + (d.used || 0), 0));
  const totalRemaining = Math.max(0, data.reduce((s, d) => s + (d.remaining || 0), 0));
  const total = totalUsed + totalRemaining;
  const combined = [
    { name: "used", value: totalUsed },
    { name: "remaining", value: totalRemaining },
  ];

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {!hasData || total === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ChartContainer config={config} className="h-64">
          <PieChart>
            <Pie data={combined} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {combined.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={`var(--color-${entry.name})`} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} allowEscapeViewBox={{ x: true, y: true }} />
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      )}
    </Card>
  );
}

export default memo(ProjectBudgetRadial);