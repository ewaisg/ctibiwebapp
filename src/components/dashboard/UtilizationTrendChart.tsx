"use client";

import { memo, useMemo, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "next-themes";
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  ColumnSeries,
  Category,
  Legend,
  Tooltip,
  ChartTheme,
} from "@syncfusion/ej2-react-charts";
import { Browser } from "@syncfusion/ej2-base";

export type UtilizationTrendDatum = {
  date: string;
  billableHours: number;
  nonBillableHours: number;
  utilization: number;
  trend?: number;
};

interface UtilizationTrendChartProps {
  data?: UtilizationTrendDatum[];
  title?: string;
  subtitle?: string;
  targetUtilization?: number; // Target percentage (default: 80)
}

function UtilizationTrendChart({
  data = [] as UtilizationTrendDatum[],
  title = "Utilization Rate Trend",
  subtitle = "Company-wide billable utilization over time",
  targetUtilization = 80
}: UtilizationTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const [sfTheme, setSfTheme] = useState<ChartTheme>("Tailwind");

  useEffect(() => {
    setSfTheme(resolvedTheme === "dark" ? "TailwindDark" : "Tailwind");
  }, [resolvedTheme]);

  const hasData = Array.isArray(data) && data.length > 0;

  // Calculate average utilization and status
  const avgUtilization = useMemo(() => {
    if (!hasData) return 0;
    const sum = data.reduce((acc, d) => acc + d.utilization, 0);
    return sum / data.length;
  }, [data, hasData]);

  const status = useMemo(() => {
    if (avgUtilization >= targetUtilization) return { label: "On Target", color: "text-green-600", bgColor: "bg-green-50" };
    if (avgUtilization >= 60) return { label: "Below Target", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { label: "Critical", color: "text-red-600", bgColor: "bg-red-50" };
  }, [avgUtilization, targetUtilization]);

  const maxHoursValue = useMemo(() => {
    if (!hasData) return 10;
    const dataMax = Math.max(
      ...data.map(d => Math.max(0, (d.billableHours ?? 0) + (d.nonBillableHours ?? 0)))
    );
    return Math.max(10, Math.ceil(dataMax / 10) * 10);
  }, [data, hasData]);

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {hasData && (
            <div className={`text-right rounded-lg px-3 py-2 `}>
              <div className="text-xs text-muted-foreground">Average</div>
              <div className="text-2xl font-bold">{avgUtilization.toFixed(1)}%</div>
              <div className={`text-xs font-medium ${status.color}`}>{status.label}</div>
            </div>
          )}
        </div>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No utilization data available</p>
            <p className="text-xs mt-1">Try adjusting your filters or date range</p>
          </div>
        </div>
      ) : (
        <div className="h-64">
          <ChartComponent
            id="utilization-trend-hours"
            theme={sfTheme}
            primaryXAxis={{
              valueType: "Category",
              title: "Week Ending",
              majorGridLines: { width: 0 },
              majorTickLines: { width: 0 },
              minorTickLines: { width: 0 },
              lineStyle: { width: 0 },
              labelIntersectAction: Browser.isDevice ? "None" : "Rotate45",
              labelStyle: { size: "11px" },
            }}
            primaryYAxis={{
              title: "Hours",
              minimum: 0,
              maximum: maxHoursValue,
              interval: Math.max(5, Math.ceil(maxHoursValue / 5)),
              majorTickLines: { width: 0 },
              lineStyle: { width: 0 },
            }}
            tooltip={{ enable: true, header: "<b>${point.x}</b>", format: "${series.name} : <b>${point.y}</b>h" }}
            legendSettings={{ visible: true, position: "Bottom" }}
            chartArea={{ border: { width: 0 } }}
            height="100%"
            width="100%"
          >
            <Inject services={[ColumnSeries, Category, Legend, Tooltip]} />
            <SeriesCollectionDirective>
              <SeriesDirective
                dataSource={data}
                xName="date"
                yName="billableHours"
                name="Billable"
                type="Column"
                fill="#00bdae"
              />
              <SeriesDirective
                dataSource={data}
                xName="date"
                yName="nonBillableHours"
                name="Non-Billable"
                type="Column"
                fill="#404041"
              />
            </SeriesCollectionDirective>
          </ChartComponent>
        </div>
      )}
    </Card>
  );
}

export default memo(UtilizationTrendChart);
