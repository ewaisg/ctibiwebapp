import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Skeleton loader for Admin Panel page
 * Matches the layout of the actual Admin client page
 */
export function AdminSkeleton() {
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
      </div>

      {/* Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Tab Content Area */}
        <div className="space-y-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            <CardContent>
              {/* Search/Filter Bar */}
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-10 flex-1 max-w-md" />
                <Skeleton className="h-10 w-32" />
              </div>

              {/* Table Structure */}
              <div className="rounded-md border">
                {/* Table Header */}
                <div className="border-b bg-muted/50">
                  <div className="flex p-3 gap-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>

                {/* Table Rows */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-b">
                    <div className="flex p-3 gap-4 items-center">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-32" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-10" />
                  <Skeleton className="h-10 w-10" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
