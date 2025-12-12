"use client";

import { useMemo, memo } from "react";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  AccumulationDataLabel,
  AccumulationTooltip,
  AccumulationAnnotation,
  AccumulationAnnotationsDirective,
  AccumulationAnnotationDirective,
  Inject,
  PieSeries,
} from "@syncfusion/ej2-react-charts";
import { Browser } from "@syncfusion/ej2-base";

export type TimeAllocationDatum = { name: string; value: number; color?: string };

type LocalChartConfig = Record<string, { label: string; color: string }>;

const BASE_CONFIG: LocalChartConfig = {
  billable: { label: "Billable", color: "var(--chart-1)" },
  unbillable: { label: "Non-Billable", color: "var(--chart-2)" },
  paidLeave: { label: "Paid Leave", color: "var(--chart-3)" },
  unpaidLeave: { label: "Unpaid Leave", color: "var(--chart-4)" },
};

const fallbackLabel = (key: string) =>
  key
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());

interface TimeAllocationPieProps {
  data?: TimeAllocationDatum[];
  title?: string;
  subtitle?: string;
}

function TimeAllocationPie({
  data = [] as TimeAllocationDatum[],
  title = "Time Allocation",
  subtitle = "Breakdown of paid hours",
}: TimeAllocationPieProps) {
  const chartConfig = useMemo<LocalChartConfig>(() => {
    const merged: LocalChartConfig = { ...BASE_CONFIG };

    for (const datum of Array.isArray(data) ? data : []) {
      const rawKey = typeof datum.name === "string" ? datum.name.trim() : "";
      if (!rawKey) continue;
      if (!merged[rawKey]) {
        merged[rawKey] = {
          label: fallbackLabel(rawKey),
          color: datum.color ?? "var(--chart-5)",
        };
      } else if (datum.color) {
        merged[rawKey] = {
          label: merged[rawKey].label,
          color: datum.color,
        };
      }
    }

    return merged;
  }, [data]);

  const { chartData, totalHours } = useMemo(() => {
    const sanitized = (Array.isArray(data) ? data : [])
      .map((datum) => {
        const key = typeof datum.name === "string" ? datum.name.trim() : "";
        const numericValue = Number.isFinite(datum.value) ? Number(datum.value) : Number(datum.value ?? 0);
        const safeValue = Math.max(0, numericValue || 0);
        return {
          ...datum,
          name: key,
          value: safeValue,
        };
      })
      .filter((datum) => datum.name && datum.value > 0);

    const aggregate = sanitized.reduce((sum, datum) => sum + datum.value, 0);

    const mapped = sanitized.map((datum) => {
      const configEntry = chartConfig[datum.name];
      const fill = datum.color ?? configEntry?.color ?? "var(--chart-5)";
      return {
        ...datum,
        fill,
      };
    });

    return {
      chartData: mapped,
      totalHours: aggregate,
    };
  }, [data, chartConfig]);

  const syncfusionData = useMemo(() => {
    const safeTotal = totalHours > 0 ? totalHours : 1;

    return chartData.map((datum) => {
      const configEntry = chartConfig[datum.name];
      const label = configEntry?.label ?? fallbackLabel(datum.name);
      const percent = safeTotal > 0 ? (datum.value / safeTotal) * 100 : 0;

      const valueText = datum.value.toLocaleString();
      const percentText = percent.toFixed(1);
      const text = Browser.isDevice
        ? `${label}: ${percentText}%`
        : `${label}: ${valueText}h (${percentText}%)`;

      return {
        x: label,
        y: datum.value,
        text,
        fill: datum.fill,
      };
    });
  }, [chartData, chartConfig, totalHours]);

  const hasData = chartData.length > 0;
  const safeTotal = totalHours > 0 ? totalHours : 1;
  const annotationHtml = useMemo(() => {
    const totalText = totalHours.toLocaleString();
    const fontSize = Browser.isDevice ? 10 : 14;
    return `<div style="text-align:center;font-size:${fontSize}px;font-weight:600;line-height:1.1">
      <div>${totalText}h</div>
      <div style="font-weight:500;opacity:.75">Paid Hours</div>
    </div>`;
  }, [totalHours]);

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <div className="h-64">
          <AccumulationChartComponent
            id="paid-hours-doughnut"
            enableBorderOnMouseMove={false}
            enableSmartLabels={true}
            legendSettings={{ visible: false }}
            tooltip={{
              enable: true,
              header: "",
              enableHighlight: true,
              format: `<b>${"${point.x}"}</b><br/>Hours: <b>${"${point.y}"}h</b>`,
            }}
          >
            <Inject services={[PieSeries, AccumulationDataLabel, AccumulationTooltip, AccumulationAnnotation]} />
            <AccumulationSeriesCollectionDirective>
              <AccumulationSeriesDirective
                dataSource={syncfusionData}
                xName="x"
                yName="y"
                innerRadius="65%"
                radius={Browser.isDevice ? "40%" : "70%"}
                startAngle={Browser.isDevice ? 70 : 60}
                border={{ color: "var(--card)", width: 2 }}
                borderRadius={3}
                pointColorMapping="fill"
                dataLabel={{
                  visible: true,
                  position: "Outside",
                  name: "text",
                  font: { size: Browser.isDevice ? "8px" : "12px", fontWeight: "600" },
                  connectorStyle: { length: Browser.isDevice ? "10px" : "20px", type: "Curve" },
                }}
              />
            </AccumulationSeriesCollectionDirective>
            <AccumulationAnnotationsDirective>
              <AccumulationAnnotationDirective
                content={annotationHtml}
                region="Series"
                x="50%"
                y="50%"
              />
            </AccumulationAnnotationsDirective>
          </AccumulationChartComponent>
        </div>
      )}
    </Card>
  );
}

export default memo(TimeAllocationPie);
