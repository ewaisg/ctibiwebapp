"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function DepartmentPacketPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin" as any]}>
      <Wizard />
    </ProtectedRoute>
  );
}

function Wizard() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const deps = await fetch('/api/departments').then(r => r.json()).catch(() => []);
        if (!mounted) return;
        setDepartments(Array.isArray(deps) ? deps : []);
      } catch {
        toast({ title: 'Failed to load departments', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  const isValid = useMemo(() => !!departmentId && !!fromDate && !!toDate, [departmentId, fromDate, toDate]);

  const onGenerate = async () => {
    if (!isValid) {
      toast({ title: 'Missing fields', description: 'Department and date range are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/department-packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, fromDate, toDate, includeInactive })
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Department-Packet-${departmentId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Department packet generated' });
    } catch {
      toast({ title: 'Generation failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Department Packet</h1>
        <p className="text-sm text-muted-foreground">Generate a ZIP containing cover page, summary, and per-project PDFs and attachments for a billing period.</p>
      </header>

      <Card className="p-4 space-y-4 max-w-2xl">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onGenerate(); }}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Department</label>
              <select className="border rounded h-10 px-3 w-full" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.departmentName || d.id}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">From</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">To</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              Include inactive projects
            </label>
            <div className="flex items-center gap-3 pt-2">
              <Button disabled={!isValid || submitting} onClick={onGenerate}>
                {submitting ? 'Generating…' : 'Generate ZIP'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
