"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExecutiveNarrativeBlock } from "@/types/dashboard";

interface NarrativeListProps {
  data?: ExecutiveNarrativeBlock[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
}

const severityClasses: Record<ExecutiveNarrativeBlock["severity"], string> = {
  info: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-100",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100",
  critical: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-100",
};

export function NarrativeList({
  data = [],
  title = "Executive Summary",
  subtitle = "Top callouts for leadership",
  loading = false,
}: NarrativeListProps) {
  const hasData = Array.isArray(data) && data.length > 0;
  const skeletonItems = Array.from({ length: 3 });

  return (
    <Card className="h-full p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {loading ? (
        <ul className="space-y-3 text-sm">
          {skeletonItems.map((_, index) => (
            <li
              key={index}
              className="animate-pulse rounded-lg border border-muted bg-muted/30 p-3"
            >
              <div className="h-4 w-1/3 rounded bg-muted-foreground/30" />
              <div className="mt-2 h-3 w-full rounded bg-muted-foreground/20" />
              <div className="mt-1 h-3 w-5/6 rounded bg-muted-foreground/20" />
            </li>
          ))}
        </ul>
      ) : !hasData ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">No data</div>
      ) : (
        <ul className="space-y-3 text-sm">
          {data.map((item) => (
            <li
              key={item.title}
              className={`rounded-lg border p-3 leading-relaxed ${severityClasses[item.severity]}`}
            >
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 opacity-90">{item.body}</p>
              {item.actions?.length ? (
                <ul className="mt-2 list-disc pl-5 text-xs opacity-80">
                  {item.actions.map((action, index) => (
                    <li key={`${action}-${index}`}>{action}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default NarrativeList;
