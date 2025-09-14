
"use client";

import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

interface AnnualUtilizationChartProps {
  data: { week: number; capacity: number | null; scheduled: number | null; actual: number | null; }[];
}

const formatXAxisTick = (tick: number) => `W${tick}`;

const chartConfig = {
  capacity: {
    label: "Capacity",
    color: "hsl(var(--chart-3))",
  },
  scheduled: {
    label: "Scheduled",
    color: "hsl(var(--chart-2))",
  },
  actual: {
    label: "Actual",
    color: "hsl(var(--chart-1))",
  },
} as const;

export function AnnualUtilizationChart({ data }: AnnualUtilizationChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No data available for this year.</div>;
    }

    return (
        <ChartContainer config={chartConfig} className="h-[400px]">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={formatXAxisTick}
                  ticks={[1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 52]}
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  label={{ value: 'Avg. Cumulative Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px' }, offset: -5 }}
                  domain={[0, 'dataMax']}
                />
                <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(label) => `Week ${label}`}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="capacity" name="Capacity" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="scheduled" name="Scheduled" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
        </ChartContainer>
    );
}
