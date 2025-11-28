import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Loading state for admin page
 * Only renders content skeleton; shell persists in RootLayout
 */
export default function AdminLoading() {
  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32" />
        ))}
      </div>

      {/* Content Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <FormSkeleton fields={3} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
