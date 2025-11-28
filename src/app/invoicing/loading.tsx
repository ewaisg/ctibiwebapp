import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton, TableSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Loading state for invoicing page (create/edit)
 * Only renders content skeleton; shell persists in RootLayout
 */
export default function InvoicingLoading() {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <FormSkeleton fields={8} />
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={6} columns={6} />
            </CardContent>
          </Card>

          {/* Reimbursable Expenses */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-56" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={4} columns={4} />
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-10 w-48" />
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-28 rounded" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary + Actions column */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <div className="mt-3">
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
