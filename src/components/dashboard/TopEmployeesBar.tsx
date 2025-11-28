"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type TopEmployeeDatum = { name: string; billableHours: number };

interface TopEmployeesBarProps {
  data?: TopEmployeeDatum[];
  title?: string;
  subtitle?: string;
}

function TopEmployeesBar({
  data = [] as TopEmployeeDatum[],
  title = "Top Employees",
  subtitle = "Billable Hours",
}: TopEmployeesBarProps) {
  const hasData = Array.isArray(data) && data.length > 0;

  // Sort and slice for nicer display (top 10)
  const processedData = useMemo(
    () =>
      [...data]
        .filter((d) => typeof d.billableHours === "number")
        .sort((a, b) => b.billableHours - a.billableHours)
        .slice(0, 10),
    [data]
  );

  const chartConfig = {
    billableHours: {
      label: "Billable Hours",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

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
        <div className="h-64 w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart accessibilityLayer data={processedData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                angle={0}
                textAnchor="middle"
                height={80}
                fontSize={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `${label}`}
                    formatter={(value) => [`${value} hrs`]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="billableHours"
                fill="var(--chart-2)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </Card>
  );
}

export default memo(TopEmployeesBar);