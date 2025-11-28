"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardHeader({ inline = false }: { inline?: boolean }) {
  const { user } = useAuth();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayName = useMemo(() => {
    const name = user?.displayName || "there";
    // Basic sanitization
    return String(name).replace(/[<>"'&]/g, "");
  }, [user?.displayName]);

  const subtitle = useMemo(() => {
    const d = new Date();
    const date = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    return date;
  }, []);

  if (inline) {
    return (
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold">{greeting}, {displayName}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-1">
      <h1 className="text-2xl font-semibold">{greeting}, {displayName}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
