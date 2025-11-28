import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Skeleton loader for Timesheets page
 * Matches the layout of the actual Timesheets client page
 */
export function TimesheetSkeleton() {
  return (
    <>
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header */}
      <div id="main-content" className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-48" />
        </div>
      </div>

      {/* Filter Bar - Sticky Card */}
      <Card className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border overflow-visible">
        <CardContent className="py-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Time Period Tabs */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-64" />
            </div>

            {/* Filter Dropdowns */}
            <Skeleton className="h-9 w-[220px]" />
            <Skeleton className="h-9 w-[200px]" />
            <Skeleton className="h-9 w-[220px]" />
            <Skeleton className="h-9 w-[220px]" />

            {/* Clear Filters Button */}
            <div className="ml-auto">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid - 6 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="px-6 pb-6">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </Card>
        ))}
      </div>

      {/* Hours Trend Chart */}
      <Card>
        <div className="p-6">
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      {/* Timesheet Entries Table */}
      <Card>
        <div className="p-6">
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <CardContent>
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-9 gap-2 items-center pb-2 border-b">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-8" />
            </div>

            {/* Employee Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                {/* Employee Summary Row */}
                <div className="grid grid-cols-9 gap-2 items-center py-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-64 col-span-6" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
