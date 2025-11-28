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
import type { RevenueTimeseriesPoint } from "@/types/dashboard";

interface CashProjectionChartProps {
  data?: RevenueTimeseriesPoint[];
  title?: string;
  subtitle?: string;
}

const config: ChartConfig = {
  invoicedAmount: {
    label: "Invoiced",
    color: "var(--chart-1)",
  },
  forecastInvoicedAmount: {
    label: "Forecast",
    color: "var(--chart-4)",
  },
};

const currencyFormatter = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

function CashProjectionChart({
  data = [],
  title = "Cash Projection",
  subtitle = "Total invoiced over time with forecast",
}: CashProjectionChartProps) {
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
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => currencyFormatter(Number(value))} />
            <Line
              type="monotone"
              dataKey="invoicedAmount"
              stroke="var(--color-invoicedAmount)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="forecastInvoicedAmount"
              stroke="var(--color-forecastInvoicedAmount)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 4"
              activeDot={{ r: 3 }}
            />
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
          </LineChart>
        </ChartContainer>
      )}
    </Card>
  );
}

const MemoizedCashProjectionChart = memo(CashProjectionChart);
export { MemoizedCashProjectionChart as CashProjectionChart };
export default MemoizedCashProjectionChart;
