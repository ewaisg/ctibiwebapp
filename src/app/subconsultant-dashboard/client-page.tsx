"use client";

import { useEffect, useState } from "react";
import MyInvoiceKpis from "@/components/subconsultant-dashboard/MyInvoiceKpis";
import RecentInvoices from "@/components/subconsultant-dashboard/RecentInvoices";

export default function SubconsultantDashboardClient() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/subconsultant-dashboard-data', { signal: ac.signal });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') console.error('Failed to load subconsultant data');
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <MyInvoiceKpis data={data} loading={loading} />
      <RecentInvoices data={data?.recent || []} loading={loading} />
    </div>
  );
}
