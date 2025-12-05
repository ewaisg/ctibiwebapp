"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "next-themes";
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  Category,
  BarSeries,
  DataLabel,
  Tooltip,
  Legend,
  ChartTheme
} from '@syncfusion/ej2-react-charts';
import { Browser } from '@syncfusion/ej2-base';

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
  const { resolvedTheme } = useTheme();
  const [sfTheme, setSfTheme] = useState<ChartTheme>('Tailwind');

  useEffect(() => {
    setSfTheme(resolvedTheme === 'dark' ? 'TailwindDark' : 'Tailwind');
  }, [resolvedTheme]);

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
             <ChartComponent
                id='charts2'
                style={{ textAlign: "center" }}
                theme={sfTheme}
                primaryXAxis={{
                    valueType: 'Category',
                    interval: 1,
                    majorGridLines: { width: 0 },
                    majorTickLines: { width: 0 },
                    minorTickLines: { width: 0 },
                    lineStyle: { width: 0 },
                    labelIntersectAction: Browser.isDevice ? 'None' : 'Rotate45',
                    labelStyle: { size: '11px' }
                }}
                primaryYAxis={{
                    title: 'Hours',
                    majorGridLines: { width: 0 },
                    majorTickLines: { width: 0 },
                    lineStyle: { width: 0 },
                    labelFormat: '{value}'
                }}
                chartArea={{ border: { width: 0 } }}
                tooltip={{ enable: true, header: "<b>${point.x}</b>", format: "Billable Hours : <b>${point.y}</b>" }}
                height='100%'
                width='100%'
            >
                <Inject services={[BarSeries, DataLabel, Category, Tooltip, Legend]} />
                <SeriesCollectionDirective>
                    <SeriesDirective
                        dataSource={processedData}
                        xName='name'
                        yName='billableHours'
                        type='Bar'
                        columnWidth={0.5}
                        marker={{
                            dataLabel: {
                                visible: true,
                                position: 'Top',
                                font: { fontWeight: '600', color: '#ffffff' }
                            }
                        }}
                        cornerRadius={{
                            topLeft: 0,
                            topRight: 10,
                            bottomLeft: 0,
                            bottomRight: 10
                        }}
                        fill="#0ea5e9"
                    />
                </SeriesCollectionDirective>
            </ChartComponent>
        </div>
      )}
    </Card>
  );
}

export default memo(TopEmployeesBar);
