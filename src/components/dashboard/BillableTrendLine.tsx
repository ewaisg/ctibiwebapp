"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

export type BillableTrendDatum = { date: string; billable: number; unbillable: number };

interface BillableTrendLineProps {
  data?: BillableTrendDatum[];
  title?: string;
  subtitle?: string;
}

function BillableTrendLine({ data = [] as BillableTrendDatum[], title = "Billable vs Non-Billable", subtitle = "Daily trend" }: BillableTrendLineProps) {
  const config: ChartConfig = {
    billable: { label: "Billable", color: "var(--chart-1)" },
    unbillable: { label: "Non-Billable", color: "var(--chart-2)" },
  };
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No billable/non-billable data available</p>
            <p className="text-xs mt-1">Try adjusting your filters or date range</p>
          </div>
        </div>
      ) : (
        <ChartContainer config={config} className="h-64">
          <LineChart data={data} accessibilityLayer margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickMargin={8} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Line type="monotone" dataKey="billable" stroke="var(--color-billable)" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="unbillable" stroke="var(--color-unbillable)" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} />
            <ChartTooltip content={<ChartTooltipContent />} allowEscapeViewBox={{ x: true, y: true }} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </Card>
  );
}

export default memo(BillableTrendLine);
