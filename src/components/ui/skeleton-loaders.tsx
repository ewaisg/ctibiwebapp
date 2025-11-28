import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

/**
 * Skeleton loader for a table with customizable rows and columns
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({ rows = 5, columns = 5, showHeader = true }: TableSkeletonProps) {
  return (
    <div className="rounded-md border">
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Skeleton loader for a card list
 */
interface CardListSkeletonProps {
  count?: number;
}

export function CardListSkeleton({ count = 3 }: CardListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for a form
 */
interface FormSkeletonProps {
  fields?: number;
}

export function FormSkeleton({ fields = 5 }: FormSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for dashboard charts/stats
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for an invoice list
 */
export function InvoiceListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead><Skeleton className="h-4 w-32" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: count }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20 rounded-full" />
              </TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Skeleton loader for a project list
 */
export function ProjectListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for page header with title and actions
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for a detail page (like invoice detail)
 */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <FormSkeleton fields={8} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Generic loading spinner with message
 */
interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ message, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 border-primary`} />
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

/**
 * Full page loading state
 */
export function PageLoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <TableSkeleton rows={10} columns={6} />
      </div>
    </div>
  );
}
