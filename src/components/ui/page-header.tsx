import { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Consistent page header component
 * Includes title, description, breadcrumbs, and action buttons
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}

      {/* Title and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-base text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Additional content */}
      {children}
    </div>
  );
}

/**
 * Compact page header variant
 */
export function CompactPageHeader({
  title,
  description,
  actions,
  className,
}: Omit<PageHeaderProps, "breadcrumbs" | "children">) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold tracking-tight truncate">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Page header with tabs
 */
interface PageHeaderWithTabsProps extends PageHeaderProps {
  tabs: ReactNode;
}

export function PageHeaderWithTabs({
  tabs,
  ...props
}: PageHeaderWithTabsProps) {
  return (
    <div className={cn("space-y-4", props.className)}>
      <PageHeader {...props} className={undefined} />
      <div className="border-b">{tabs}</div>
    </div>
  );
}

/**
 * Page section header (h2 level)
 */
interface PageSectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageSectionHeader({
  title,
  description,
  actions,
  className,
}: PageSectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Page subsection header (h3 level)
 */
export function PageSubsectionHeader({
  title,
  description,
  actions,
  className,
}: PageSectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}
