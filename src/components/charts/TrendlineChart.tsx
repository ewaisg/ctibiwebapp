"use client";

import * as React from "react";
import { useState } from "react";
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  TrendlineDirective,
  TrendlinesDirective,
  Inject,
  Tooltip,
  LineSeries,
  ScatterSeries,
  SplineSeries,
  Trendlines,
  Category,
  Legend,
  DateTime,
  TrendlineTypes
} from '@syncfusion/ej2-react-charts';
import { Browser } from '@syncfusion/ej2-base';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface TrendlineChartProps {
  data: any[];
  xName: string;
  yName: string;
  title?: string;
  yAxisTitle?: string;
  height?: string;
}

const TREND_TYPES: { value: TrendlineTypes; label: string }[] = [
  { value: 'Linear', label: 'Linear' },
  { value: 'Exponential', label: 'Exponential' },
  { value: 'Logarithmic', label: 'Logarithmic' },
  { value: 'Polynomial', label: 'Polynomial' },
  { value: 'Power', label: 'Power' },
  { value: 'MovingAverage', label: 'Moving Average' },
];

export function TrendlineChart({
  data,
  xName,
  yName,
  title = "Trend Analysis",
  yAxisTitle = "Value",
  height = "400px"
}: TrendlineChartProps) {
  const [trendType, setTrendType] = useState<TrendlineTypes>('Linear');
  const [polynomialOrder, setPolynomialOrder] = useState<string>("2");
  const [period, setPeriod] = useState<string>("2");

  const primaryXAxis = {
    valueType: 'Category' as const,
    edgeLabelPlacement: 'Shift' as const,
    majorGridLines: { width: 0 },
    majorTickLines: { width: 0 },
    lineStyle: { width: 1 },
    labelStyle: { color: 'gray' }
  };

  const primaryYAxis = {
    title: yAxisTitle,
    lineStyle: { width: 0 },
    majorTickLines: { width: 0 },
    minorTickLines: { width: 0 },
    labelStyle: { color: 'gray' }
  };

  const tooltip = {
    enable: true,
    shared: true,
    format: '${point.x} : ${point.y}'
  };

  const legendSettings = { visible: true };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="trend-type" className="text-sm whitespace-nowrap">Trend Type:</Label>
              <Select
                value={trendType}
                onValueChange={(value) => setTrendType(value as TrendlineTypes)}
              >
                <SelectTrigger id="trend-type" className="w-[180px] h-8">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TREND_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {trendType === 'Polynomial' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="poly-order" className="text-sm whitespace-nowrap">Order:</Label>
                <Select
                  value={polynomialOrder}
                  onValueChange={setPolynomialOrder}
                >
                  <SelectTrigger id="poly-order" className="w-20 h-8">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {trendType === 'MovingAverage' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="period" className="text-sm whitespace-nowrap">Period:</Label>
                <Select
                  value={period}
                  onValueChange={setPeriod}
                >
                  <SelectTrigger id="period" className="w-20 h-8">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height }}>
          <ChartComponent
            id={`trend-chart-${Math.random().toString(36).substr(2, 9)}`}
            primaryXAxis={primaryXAxis}
            primaryYAxis={primaryYAxis}
            tooltip={tooltip}
            legendSettings={legendSettings}
            chartArea={{ border: { width: 0 } }}
            width={Browser.isDevice ? '100%' : '100%'}
            height="100%"
            background="transparent"
          >
            <Inject services={[Category, SplineSeries, ScatterSeries, Tooltip, Trendlines, Legend, DateTime]} />
            <SeriesCollectionDirective>
              <SeriesDirective
                dataSource={data}
                xName={xName}
                yName={yName}
                name="Data"
                type="Spline"
                marker={{ visible: true, width: 7, height: 7, isFilled: true }}
                fill="#00bdae"
              >
                <TrendlinesDirective>
                  <TrendlineDirective
                    type={trendType}
                    width={3}
                    name="Trend"
                    fill="#C64A75"
                    polynomialOrder={parseInt(polynomialOrder)}
                    period={parseInt(period)}
                  />
                </TrendlinesDirective>
              </SeriesDirective>
            </SeriesCollectionDirective>
          </ChartComponent>
        </div>
      </CardContent>
    </Card>
  );
}
