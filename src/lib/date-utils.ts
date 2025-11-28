export function normalizeDateValue(raw: any): Date | undefined {
  try {
    if (!raw) return undefined;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? undefined : raw;
    if (typeof raw === 'string' || typeof raw === 'number') {
      const d = new Date(raw as any);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof raw === 'object') {
      if (typeof (raw as any).toDate === 'function') {
        const d = (raw as any).toDate();
        return isNaN(d.getTime()) ? undefined : d;
      }
      const seconds = typeof (raw as any).seconds === 'number' ? (raw as any).seconds : (typeof (raw as any)._seconds === 'number' ? (raw as any)._seconds : undefined);
      if (typeof seconds === 'number') {
        const d = new Date(seconds * 1000);
        return isNaN(d.getTime()) ? undefined : d;
      }
    }
  } catch {}
  return undefined;
}
