"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ title = "Loading chart..." }: { title?: string }) {
  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <div className="mt-4">
        <Skeleton className="h-64 w-full" />
      </div>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-1 flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-end">
          <Skeleton className="h-10 w-full md:w-48" />
          <Skeleton className="h-10 w-full md:w-56" />
          <Skeleton className="h-10 w-full md:w-56" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center space-x-2 border-b">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>

      {/* KPI Cards */}
      <div className="space-y-4 mt-4">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <KPISkeleton />
      </div>

      {/* Charts Section */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
          <ChartSkeleton />
          <div className="lg:col-span-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
