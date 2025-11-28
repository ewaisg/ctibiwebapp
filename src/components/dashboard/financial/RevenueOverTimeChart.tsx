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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { RevenueTimeseriesPoint } from "@/types/dashboard";

interface RevenueOverTimeChartProps {
  data?: RevenueTimeseriesPoint[];
  title?: string;
  subtitle?: string;
}

const config: ChartConfig = {
  invoicedAmount: {
    label: "Invoiced",
    color: "var(--chart-1)",
  },
  paidAmount: {
    label: "Paid",
    color: "var(--chart-2)",
  },
};

const currencyFormatter = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

function RevenueOverTimeChart({
  data = [],
  title = "Revenue Over Time",
  subtitle = "Monthly invoiced vs paid amounts",
}: RevenueOverTimeChartProps) {
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
          <BarChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => currencyFormatter(Number(value))} />
            <Bar dataKey="invoicedAmount" fill="var(--color-invoicedAmount)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="paidAmount" fill="var(--color-paidAmount)" radius={[4, 4, 0, 0]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span>{currencyFormatter(Number(value))}</span>
                  )}
                />
              }
              allowEscapeViewBox={{ x: true, y: true }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  );
}

const MemoizedRevenueOverTimeChart = memo(RevenueOverTimeChart);
export { MemoizedRevenueOverTimeChart as RevenueOverTimeChart };
export default MemoizedRevenueOverTimeChart;
