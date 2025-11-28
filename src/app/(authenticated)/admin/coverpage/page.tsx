"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Fallbacks if internal UI lib exports differ
const FallbackButton: any = (Button as any) || ((props: any) => <button {...props} />);
const FallbackInput: any = (Input as any) || ((props: any) => <input {...props} />);

export default function CoverPageWizard() {
  return (
    <ProtectedRoute allowedRoles={["Admin" as any]}>
      <WizardInner />
    </ProtectedRoute>
  );
}

function WizardInner() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  const [departmentId, setDepartmentId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [contractId, setContractId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [deps, projs, cons] = await Promise.all([
          fetch('/api/departments').then(r => r.json()).catch(() => []),
          fetch('/api/projects').then(r => r.json()).catch(() => []),
          fetch('/api/contracts').then(r => r.json()).catch(() => []),
        ]);
        if (!mounted) return;
        setDepartments(Array.isArray(deps) ? deps : []);
        setProjects(Array.isArray(projs) ? projs : []);
        setContracts(Array.isArray(cons) ? cons : []);
      } catch (e) {
        toast({ title: 'Failed to load lists', description: 'Please try again later', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  useEffect(() => {
    if (!projectId) return;
    const proj = projects.find((p) => p.id === projectId);
    const derived = (proj as any)?.contractId?.id || (proj as any)?.contractId || '';
    if (derived) setContractId(derived);
  }, [projectId, projects]);

  const isValid = useMemo(() => {
    return Boolean(departmentId && fromDate && toDate);
  }, [departmentId, fromDate, toDate]);

  const onGenerate = async () => {
    if (!isValid) {
      toast({ title: 'Missing fields', description: 'Department and date range are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setPdfUrl(null);
    try {
      const res = await fetch('/api/coverpage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, fromDate, toDate, projectId: projectId || undefined, contractId: contractId || undefined })
      });
      if (!res.ok) throw new Error('Generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      toast({ title: 'Cover page generated' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to generate cover page', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Department Cover Page</h1>
        <p className="text-sm text-muted-foreground">Generate a cover page for a billing period. Choose the department and date range, optionally narrow by project or contract.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-1 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
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
                    <option key={d.id} value={d.id}>{d.departmentName || d.name || d.id}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">From</label>
                  <FallbackInput type="date" value={fromDate} onChange={(e: any) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">To</label>
                  <FallbackInput type="date" value={toDate} onChange={(e: any) => setToDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Project (optional)</label>
                <select className="border rounded h-10 px-3 w-full" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">All projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.projectName || p.name || p.id}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Contract (optional)</label>
                <select className="border rounded h-10 px-3 w-full" value={contractId} onChange={(e) => setContractId(e.target.value)}>
                  <option value="">All contracts</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.contractNumber || c.name || c.id}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <FallbackButton disabled={!isValid || submitting} className="btn btn-primary" onClick={onGenerate}>
                  {submitting ? 'Generating…' : 'Generate'}
                </FallbackButton>
                <a
                  className={`text-sm ${pdfUrl ? 'text-primary underline' : 'pointer-events-none text-muted-foreground'}`}
                  href={pdfUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in new tab
                </a>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2 min-h-[600px]">
          <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded">
            {!pdfUrl ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Generate a cover page to preview it here.</p>
              </div>
            ) : (
              typeof window !== 'undefined' && (
                <iframe title="CoverPage Preview" src={pdfUrl || ''} className="w-full h-[650px] rounded border" />
              )
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
