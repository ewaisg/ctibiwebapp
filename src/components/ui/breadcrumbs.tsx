"use client";

import { Fragment, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  separator?: ReactNode;
  className?: string;
}

/**
 * Breadcrumb navigation component
 * Helps users understand their current location in the app hierarchy
 */
export function Breadcrumbs({
  items,
  showHome = true,
  homeHref = "/dashboard",
  separator,
  className,
}: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: "Home", href: homeHref, icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm", className)}
    >
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const Separator = separator || <ChevronRight className="h-4 w-4 text-muted-foreground" />;

          return (
            <Fragment key={index}>
              <li className="flex items-center space-x-1">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      isLast ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
              {!isLast && (
                <li className="flex items-center" aria-hidden="true">
                  {Separator}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumbs from pathname
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return { label, href };
  });
}

/**
 * Hook to use breadcrumbs with current pathname
 */
export function useBreadcrumbs(
  customItems?: BreadcrumbItem[]
): BreadcrumbItem[] {
  if (customItems) return customItems;

  // This would work with Next.js usePathname
  // For now, return empty array as fallback
  if (typeof window === "undefined") return [];

  const pathname = window.location.pathname;
  return generateBreadcrumbs(pathname);
}

/**
 * Breadcrumb skeleton loader
 */
export function BreadcrumbsSkeleton() {
  return (
    <div className="flex items-center space-x-1">
      <div className="h-4 w-12 bg-muted animate-pulse rounded" />
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
    </div>
  );
}

/**
 * Breadcrumb with dropdown for long paths
 */
interface CollapsibleBreadcrumbsProps extends BreadcrumbsProps {
  maxItems?: number;
}

export function CollapsibleBreadcrumbs({
  items,
  maxItems = 3,
  ...props
}: CollapsibleBreadcrumbsProps) {
  if (items.length <= maxItems) {
    return <Breadcrumbs items={items} {...props} />;
  }

  // Show first item, ellipsis, and last (maxItems - 1) items
  const firstItem = items[0];
  const lastItems = items.slice(-(maxItems - 1));
  const hiddenItems = items.slice(1, -(maxItems - 1));

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm", props.className)}
    >
      <ol className="flex items-center space-x-1">
        {/* First item */}
        {props.showHome !== false && (
          <>
            <li>
              <Link
                href={props.homeHref || "/dashboard"}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
          </>
        )}

        <li>
          {firstItem.href ? (
            <Link
              href={firstItem.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {firstItem.label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{firstItem.label}</span>
          )}
        </li>

        {/* Ellipsis for hidden items */}
        {hiddenItems.length > 0 && (
          <>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
            <li>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={`${hiddenItems.length} hidden items`}
              >
                ...
              </button>
            </li>
          </>
        )}

        {/* Last items */}
        {lastItems.map((item, index) => (
          <Fragment key={index}>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </li>
            <li>
              {item.href && index !== lastItems.length - 1 ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    index === lastItems.length - 1 &&
                      "text-foreground font-medium"
                  )}
                  aria-current={
                    index === lastItems.length - 1 ? "page" : undefined
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
