import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Skeleton loader for Manpower Planner page
 * Matches the layout of the actual Manpower client page
 */
export function ManpowerSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between space-y-2 md:space-y-0 md:space-x-4">
        <Skeleton className="h-9 w-56" />
      </div>

      {/* Filter Bar and Timeline Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        {/* Left Side - Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-full md:w-[180px]" />
          <Skeleton className="h-10 w-full md:w-[180px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>

        {/* Right Side - Timeline Navigation */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
      </div>

      {/* Workload Planner Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="border-b bg-muted/50">
            <div className="flex">
              <div className="w-48 p-3 border-r">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="min-w-[120px] p-3 border-r">
                      <Skeleton className="h-5 w-16 mx-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b hover:bg-muted/30">
              <div className="flex">
                {/* Employee Name Column */}
                <div className="w-48 p-3 border-r">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>

                {/* Timeline Cells */}
                <div className="flex-1 overflow-x-auto">
                  <div className="flex">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div key={j} className="min-w-[120px] p-2 border-r">
                        <div className="space-y-1">
                          {Math.random() > 0.5 && (
                            <Skeleton className="h-6 w-full rounded" />
                          )}
                          {Math.random() > 0.7 && (
                            <Skeleton className="h-6 w-full rounded" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
