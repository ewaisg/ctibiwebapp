"use client";

import React, { useMemo, useState } from "react";
import { Trash2, ShieldAlert, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SCOPES = [
  "Test Data",
  "Orphaned Records",
  "Invoices",
  "Timesheets",
  "Logs",
];

export function DataDeletionSettings() {
  const [scope, setScope] = useState<string>("Test Data");
  const [dateBefore, setDateBefore] = useState<string>("");
  const [includeChildren, setIncludeChildren] = useState<boolean>(false);
  const [dryRunCounts, setDryRunCounts] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);

  const canDelete = useMemo(() => dryRunCounts !== null && dryRunCounts > 0 && confirmText === "DELETE", [dryRunCounts, confirmText]);

  const onDryRun = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/system/deletion/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, dateBefore, includeChildren })
      });
      const json = await res.json();
      if (json?.success) setDryRunCounts(Number(json.count || 0));
      else setDryRunCounts(null);
    } catch {
      setDryRunCounts(null);
    } finally {
      setIsRunning(false);
    }
  };

  const onDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setIsRunning(true);
    try {
      const res = await fetch('/api/system/deletion/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, dateBefore, includeChildren, archiveBeforeDelete: false })
      });
      const json = await res.json();
      if (json?.success) {
        alert(`Deleted ${json.deletedCount} items${json.archivedCount ? `, archived ${json.archivedCount}` : ''}.`);
        setDryRunCounts(null);
        setConfirmText('');
      } else {
        alert(`Deletion failed: ${json?.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Deletion error: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Deletion</CardTitle>
        <CardDescription>Targeted deletes with preview and safety checks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded border p-4 space-y-2">
            <div className="font-semibold">Scope</div>
            <select className="border rounded px-2 py-1 w-full" value={scope} onChange={e => setScope(e.target.value)}>
              {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeChildren} onChange={e => setIncludeChildren(e.target.checked)} />
              Include related children
            </label>
          </div>
          <div className="rounded border p-4 space-y-2">
            <div className="font-semibold">Filters</div>
            <label className="flex items-center gap-2 text-sm">
              <span className="w-28">Before</span>
              <input type="date" value={dateBefore} onChange={e => setDateBefore(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </label>
          </div>
          <div className="rounded border p-4 space-y-2">
            <div className="font-semibold">Safety</div>
            <div className="text-xs text-muted-foreground">Type DELETE to confirm</div>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="DELETE" />
            <div className="flex items-center gap-2">
              <Button onClick={onDryRun} variant="outline"><Eye className="h-4 w-4 mr-2" />Preview</Button>
              <Button onClick={onDelete} disabled={!canDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
            </div>
            {dryRunCounts !== null && (
              <div className="text-sm mt-2">Will delete <span className="font-semibold">{dryRunCounts}</span> items</div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <ShieldAlert className="h-4 w-4" /> Two-person approval and audit logging recommended
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
