"use client";

import { memo, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "next-themes";
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  AccumulationDataLabel,
  PieSeries,
  Inject,
  IAccLoadedEventArgs,
  AccumulationAnnotationsDirective,
  AccumulationAnnotationDirective,
  ChartAnnotation,
  AccumulationAnnotation,
  AccumulationTooltip,
  AccumulationTheme
} from '@syncfusion/ej2-react-charts';
import { Browser } from '@syncfusion/ej2-base';

export type ProjectBudgetDatum = { name: string; used: number; remaining: number };

interface ProjectBudgetRadialProps {
  data?: ProjectBudgetDatum[];
  title?: string;
  subtitle?: string;
}

function ProjectBudgetRadial({ data = [] as ProjectBudgetDatum[], title = "Project Budget Utilization", subtitle = "PO used vs remaining (combined)" }: ProjectBudgetRadialProps) {
  const { resolvedTheme } = useTheme();
  const [sfTheme, setSfTheme] = useState<AccumulationTheme>('Tailwind');

  useEffect(() => {
    setSfTheme(resolvedTheme === 'dark' ? 'TailwindDark' : 'Tailwind');
  }, [resolvedTheme]);

  const hasData = Array.isArray(data) && data.length > 0;

  const totalUsed = Math.max(0, data.reduce((s, d) => s + (d.used || 0), 0));
  const totalRemaining = Math.max(0, data.reduce((s, d) => s + (d.remaining || 0), 0));
  const total = totalUsed + totalRemaining;

  const chartData = [
    { x: 'Used', y: totalUsed, text: `Used`, tooltipMappingName: total > 0 ? `${((totalUsed/total)*100).toFixed(1)}%` : '0%' },
    { x: 'Remaining', y: totalRemaining, text: `Remaining`, tooltipMappingName: total > 0 ? `${((totalRemaining/total)*100).toFixed(1)}%` : '0%' }
  ];

  const content = Browser.isDevice ? "<div style='font-Weight:700; font-size:11px;'>Budget<br>Utilization</div>" : "<div style='font-Weight:600; font-size:14px;'>Budget<br>Utilization</div>";

  const onChartLoad = (args: IAccLoadedEventArgs): void => {
    const chart = document.getElementById('pie-chart');
    if (chart) {
        chart.setAttribute('title', '');
    }
  };

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {!hasData || total === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <div className="h-64 w-full">
            <AccumulationChartComponent
                id='pie-chart'
                theme={sfTheme}
                legendSettings={{ visible: false }}
                enableBorderOnMouseMove={false}
                loaded={onChartLoad}
                tooltip={{ enable: true, format: "<b>${point.x}</b><br>Percentage: <b>${point.tooltip}</b>", header:'', enableHighlight: true }}
                height='100%'
                width='100%'
            >
                <Inject services={[AccumulationDataLabel, PieSeries, AccumulationTooltip, ChartAnnotation, AccumulationAnnotation]} />
                <AccumulationSeriesCollectionDirective>
                    <AccumulationSeriesDirective
                        dataSource={chartData}
                        tooltipMappingName='tooltipMappingName'
                        xName='x'
                        yName='y'
                        startAngle={270}
                        endAngle={90}
                        explode={false}
                        radius={Browser.isDevice ? '85%' : '100%'}
                        innerRadius='55%'
                        dataLabel={{
                            visible: true,
                            position: 'Outside',
                            enableRotation: true,
                            connectorStyle: { length: '10%' },
                            name: 'text',
                            font: {
                                fontWeight: '600',
                                size: Browser.isDevice ? '8px' : '11px',
                                color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
                            }
                        }}
                    />
                </AccumulationSeriesCollectionDirective>
                <AccumulationAnnotationsDirective>
                    <AccumulationAnnotationDirective
                        content={content}
                        region="Series"
                        x={Browser.isDevice ? "52%" : "50%"}
                        y={Browser.isDevice ? "82%" : "85%"}
                    />
                </AccumulationAnnotationsDirective>
            </AccumulationChartComponent>
        </div>
      )}
    </Card>
  );
}

export default memo(ProjectBudgetRadial);
