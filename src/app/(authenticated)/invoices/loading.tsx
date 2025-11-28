import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceListSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Loading state for invoices page
 * Only renders content skeleton; shell persists in RootLayout
 */
export default function InvoicesLoading() {
  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-[280px]" />
            <Skeleton className="h-9 w-[160px]" />
            <Skeleton className="h-9 w-[180px]" />
            <Skeleton className="h-9 w-[200px]" />
            <Skeleton className="h-9 w-[220px]" />
            <Skeleton className="h-9 w-[160px]" />
            <Skeleton className="h-9 w-[160px]" />
            <Skeleton className="h-9 w-[80px] ml-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <InvoiceListSkeleton count={10} />
        </CardContent>
      </Card>
    </>
  );
}
