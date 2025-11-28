import { DashboardSkeleton } from "@/components/ui/skeleton-loaders";

/**
 * Loading state for dashboard page
 * Only renders content skeleton; shell persists in RootLayout
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
