"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiMetric } from "@/types/dashboard";

interface HighlightsGridProps {
  data?: KpiMetric[];
  loading?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatValue(metric: KpiMetric): string {
  const value = metric.value ?? 0;

  if (metric.isCurrency) {
    return currencyFormatter.format(value);
  }

  const formatted = numberFormatter.format(value);

  if (metric.unit) {
    if (metric.unit.trim() === "%") {
      return `${numberFormatter.format(value)}${metric.unit}`;
    }
    return `${formatted} ${metric.unit}`;
  }

  return formatted;
}

function formatDelta(metric: KpiMetric): string | null {
  if (metric.deltaPercent !== undefined && metric.deltaPercent !== null) {
    const value = metric.deltaPercent;
    const sign = value > 0 ? "+" : value < 0 ? "" : "";
    return `${sign}${numberFormatter.format(value)}%`;
  }

  if (metric.delta !== undefined && metric.delta !== null) {
    const value = metric.delta;
    if (metric.isCurrency) {
      const formatted = currencyFormatter.format(Math.abs(value));
      const sign = value > 0 ? "+" : value < 0 ? "-" : "";
      return sign ? `${sign}${formatted.replace(/^[+-]/, "")}` : formatted;
    }
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    const formatted = numberFormatter.format(Math.abs(value));
    if (metric.unit) {
      return `${sign}${formatted} ${metric.unit}`.trim();
    }
    return `${sign}${formatted}`;
  }

  return null;
}

function deltaColor(direction: KpiMetric["direction"]): string {
  switch (direction) {
    case "up":
      return "text-emerald-600 dark:text-emerald-400";
    case "down":
      return "text-rose-600 dark:text-rose-400";
    default:
      return "text-muted-foreground";
  }
}

const skeletonCards = Array.from({ length: 3 });

export function HighlightsGrid({ data = [], loading = false }: HighlightsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {skeletonCards.map((_, index) => (
          <Card key={index} className="p-4">
            <CardHeader className="space-y-3">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted-foreground/20" />
              <div className="h-7 w-2/3 animate-pulse rounded bg-muted-foreground/30" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted-foreground/20" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        No executive highlight metrics available for the selected filters.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((metric) => {
        const delta = formatDelta(metric);
        return (
          <Card key={metric.label} className="p-4">
            <CardHeader className="space-y-3">
              <CardDescription>{metric.label}</CardDescription>
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {formatValue(metric)}
                </CardTitle>
                {delta ? (
                  <span className={`text-xs font-medium ${deltaColor(metric.direction)}`}>
                    {delta}
                  </span>
                ) : null}
              </div>
              {metric.description ? (
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              ) : null}
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

export default HighlightsGrid;
