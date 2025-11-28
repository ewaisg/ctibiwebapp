"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, PieChart, Calendar, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyChartStateProps {
  title?: string;
  subtitle?: string;
  message?: string;
  suggestion?: string;
  icon?: "bar" | "line" | "pie" | "calendar" | "refresh";
  onAction?: () => void;
  actionLabel?: string;
  variant?: "default" | "card";
}

const icons: Record<string, LucideIcon> = {
  bar: BarChart3,
  line: TrendingUp,
  pie: PieChart,
  calendar: Calendar,
  refresh: RefreshCw,
};

export function EmptyChartState({
  title,
  subtitle,
  message = "No data available",
  suggestion = "Try adjusting your filters or date range to see more data.",
  icon = "bar",
  onAction,
  actionLabel,
  variant = "default",
}: EmptyChartStateProps) {
  const Icon = icons[icon];

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{message}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{suggestion}</p>
      </div>
      {onAction && actionLabel && (
        <Button onClick={onAction} variant="outline" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <Card className="h-full">
        {(title || subtitle) && (
          <CardHeader>
            {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center min-h-[240px]">
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[240px]">
      {content}
    </div>
  );
}
