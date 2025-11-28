import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Loading state for utilization page
 * Only renders content skeleton; shell persists in RootLayout
 */
export default function UtilizationLoading() {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <Skeleton className="h-10 w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-56 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Table card */}
      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-6 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-10 rounded" />
          </div>
          <TableSkeleton rows={8} columns={13} />
        </CardContent>
      </Card>
    </>
  );
}
