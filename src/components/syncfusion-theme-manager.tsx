"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function SyncfusionThemeManager() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themeFile = resolvedTheme === "dark" ? "dark.css" : "light.css";

  return (
    <link
      id="syncfusion-theme"
      rel="stylesheet"
      href={`/themes/syncfusion/${themeFile}`}
    />
  );
}
