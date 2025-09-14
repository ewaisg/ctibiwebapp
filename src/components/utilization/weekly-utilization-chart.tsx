
"use client";

import { Bar, Line, XAxis, YAxis, CartesianGrid, ComposedChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

interface WeeklyUtilizationChartProps {
  data: { week: number; scheduled: number; actual: number; utilization: number }[];
}

const formatXAxisTick = (tick: number) => `W${tick}`;

const chartConfig = {
  scheduled: {
    label: "Scheduled",
    color: "hsl(var(--chart-2))",
  },
  actual: {
    label: "Actual", 
    color: "hsl(var(--chart-1))",
  },
  utilization: {
    label: "Utilization",
    color: "hsl(var(--chart-5))",
  },
} as const;

export function WeeklyUtilizationChart({ data }: WeeklyUtilizationChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">No data available for this year.</div>;
    }

    // Filter out future weeks with no data for a cleaner chart
    const lastDataWeekIndex = data.findLastIndex(d => d.scheduled > 0 || d.actual > 0);
    const chartData = lastDataWeekIndex > -1 ? data.slice(0, lastDataWeekIndex + 5) : data.slice(0, 10);


    return (
        <ChartContainer config={chartConfig} className="h-[400px]">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={formatXAxisTick} 
                />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-5))" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(label) => `Week ${label}`}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar yAxisId="left" dataKey="scheduled" name="Scheduled" fill="hsl(var(--chart-2))" barSize={20} />
                <Bar yAxisId="left" dataKey="actual" name="Actual" fill="hsl(var(--chart-1))" barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="utilization" name="Utilization" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
            </ComposedChart>
        </ChartContainer>
    );
}
