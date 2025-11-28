import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Skeleton loader for Utilization Analytics page
 * Matches the layout of the actual Utilization client page
 */
export function UtilizationSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <Skeleton className="h-9 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Charts Row - 2 Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Weekly Performance Chart */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Chart Checkboxes */}
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
            {/* Chart Area */}
            <Skeleton className="h-[220px] w-full" />
          </CardContent>
        </Card>

        {/* Annual Utilization Chart */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div className="space-y-1 flex-1">
              <Skeleton className="h-5 w-56 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Chart Checkboxes */}
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            {/* Chart Area */}
            <Skeleton className="h-[220px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-8 w-8" />
        </CardHeader>
        <CardContent>
          {/* Timeline Navigation */}
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 flex-1 max-w-md" />
            <Skeleton className="h-10 w-10" />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            {/* Table Header */}
            <div className="border-b bg-muted/50">
              <div className="flex p-3">
                <Skeleton className="h-5 w-32" />
                <div className="flex-1 flex justify-around ml-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-20" />
                  ))}
                </div>
              </div>
            </div>

            {/* Table Rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-b">
                <div className="flex p-3">
                  <Skeleton className="h-5 w-40" />
                  <div className="flex-1 flex justify-around ml-4">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <Skeleton key={j} className="h-5 w-12" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
