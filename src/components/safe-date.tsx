"use client";

import { format } from "date-fns";
import type { Timestamp } from "firebase/firestore";

interface SafeDateProps {
  date: Date | Timestamp | string | null | undefined;
  formatString?: string;
}

export function SafeDate({ date, formatString = "MMM dd, yyyy" }: SafeDateProps) {
  if (!date) return <span>-</span>;

  try {
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && 'toDate' in date) {
      // Firestore Timestamp
      dateObj = (date as Timestamp).toDate();
    } else {
      return <span>-</span>;
    }

    if (isNaN(dateObj.getTime())) {
      return <span>-</span>;
    }

    return <span>{format(dateObj, formatString)}</span>;
  } catch (error) {
    console.warn("SafeDate error:", error);
    return <span>-</span>;
  }
}
