import { Timestamp } from 'firebase-admin/firestore';
import { addDays, differenceInCalendarDays, endOfDay, formatISO, startOfDay, subDays } from 'date-fns';
import type { DashboardTimeRange } from '@/types/dashboard';

export interface DateRange {
  start: Date;
  end: Date;
}

export function timestampToDate(value: Timestamp | Date | string | number | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if ((value as any)?.toDate instanceof Function) {
    try {
      return (value as any).toDate();
    } catch (error) {
      console.warn('Failed to convert timestamp-like object to Date', error);
      return undefined;
    }
  }
  return undefined;
}

export function resolveDateRange(timeRange: DashboardTimeRange, now = new Date()): DateRange {
  const end = endOfDay(now);
  switch (timeRange) {
    case '7d':
      return { start: startOfDay(subDays(end, 6)), end };
    case '30d':
      return { start: startOfDay(subDays(end, 29)), end };
    case '90d':
      return { start: startOfDay(subDays(end, 89)), end };
    case 'all':
    default:
      return { start: startOfDay(subDays(end, 364)), end };
  }
}

export function withinRange(date: Date | undefined, range: DateRange): boolean {
  if (!date) return false;
  const value = date.getTime();
  return value >= range.start.getTime() && value <= range.end.getTime();
}

export interface SeriesPoint<T = number> {
  period: string;
  value: T;
}

export function toIsoDate(date: Date | undefined): string {
  if (!date) return '';
  return formatISO(date, { representation: 'date' });
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || Number.isNaN(denominator)) {
    return 0;
  }
  return numerator / denominator;
}

export function clamp(value: number | undefined | null): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
}

export function sum(array: Array<number | undefined | null>): number {
  return array.reduce<number>((total, current) => total + clamp(current), 0);
}

export function groupBy<T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K | undefined,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    if (key === undefined) {
      return acc;
    }
    if (!acc[key]) {
      acc[key] = [] as any;
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function differenceInDaysInclusive(range: DateRange): number {
  return differenceInCalendarDays(range.end, range.start) + 1;
}

export function iterateDateRange(range: DateRange): Date[] {
  const days = differenceInDaysInclusive(range);
  const dates: Date[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    dates.push(startOfDay(addDays(range.start, offset)));
  }
  return dates;
}
