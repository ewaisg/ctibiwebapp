"use client";

import { ReactNode, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface ResponsiveTableProps {
  children: ReactNode;
  mobileView?: ReactNode;
  className?: string;
  /**
   * Breakpoint at which to switch to mobile view
   * @default "md" (768px)
   */
  breakpoint?: "sm" | "md" | "lg";
}

/**
 * Responsive table wrapper
 * Shows table on desktop, custom mobile view on small screens
 */
export function ResponsiveTable({
  children,
  mobileView,
  className,
  breakpoint = "md",
}: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  // If no mobile view is provided, wrap table in horizontal scroll
  if (!mobileView) {
    return (
      <div className={cn("w-full", className)}>
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Show mobile view on small screens
  const breakpointClass = {
    sm: "sm:block",
    md: "md:block",
    lg: "lg:block",
  }[breakpoint];

  return (
    <div className={className}>
      {/* Mobile View */}
      <div className={cn("block", breakpointClass.replace("block", "hidden"))}>
        {mobileView}
      </div>

      {/* Desktop View */}
      <div className={cn("hidden", breakpointClass)}>
        <div className="overflow-x-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Scrollable table container for when mobile cards aren't suitable
 */
interface ScrollableTableProps {
  children: ReactNode;
  className?: string;
}

export function ScrollableTable({ children, className }: ScrollableTableProps) {
  return (
    <Card className={className}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          {children}
        </div>
      </div>
    </Card>
  );
}

/**
 * Hook to detect table overflow and show scroll hint
 */
export function useTableOverflow(tableRef: React.RefObject<HTMLDivElement | null>) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  useEffect(() => {
    const element = tableRef.current;
    if (!element) return;

    const checkOverflow = () => {
      const { scrollWidth, clientWidth, scrollLeft } = element;
      setIsOverflowing(scrollWidth > clientWidth);
      setShowLeftShadow(scrollLeft > 0);
      setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
    };

    checkOverflow();
    element.addEventListener("scroll", checkOverflow);
    window.addEventListener("resize", checkOverflow);

    return () => {
      element.removeEventListener("scroll", checkOverflow);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [tableRef]);

  return { isOverflowing, showLeftShadow, showRightShadow };
}

/**
 * Table with scroll shadows to indicate more content
 */
interface TableWithScrollShadowsProps {
  children: ReactNode;
  className?: string;
}

export function TableWithScrollShadows({
  children,
  className,
}: TableWithScrollShadowsProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { showLeftShadow, showRightShadow } = useTableOverflow(tableRef);

  return (
    <div className={cn("relative", className)}>
      {/* Left shadow */}
      {showLeftShadow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      )}

      {/* Right shadow */}
      {showRightShadow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      )}

      {/* Scrollable content */}
      <div ref={tableRef} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

// Import useRef
import { useRef } from "react";
