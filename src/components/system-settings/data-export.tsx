"use client";

import React, { useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SCOPES = [
	"Users",
	"Companies",
	"Employees",
	"Projects",
	"Contracts",
	"Divisions",
	"Departments",
	"Invoices",
	"Timesheets",
	"Templates",
];

export function DataExportSettings() {
	const [selectedScopes, setSelectedScopes] = useState<string[]>(["Users", "Companies"]);
	const [dateFrom, setDateFrom] = useState<string>("");
	const [dateTo, setDateTo] = useState<string>("");
	const [format, setFormat] = useState<"csv" | "jsonl">("jsonl");
	const [denormalize, setDenormalize] = useState<boolean>(true);
	const [includeAssets, setIncludeAssets] = useState<boolean>(false);
	const [previewCounts, setPreviewCounts] = useState<Record<string, number> | null>(null);
	const [isPreviewing, setIsPreviewing] = useState(false);

	const canExport = useMemo(() => !!previewCounts && Object.values(previewCounts).some(v => v > 0), [previewCounts]);

	const toggleScope = (scope: string) => {
		setSelectedScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
	};

	const onPreview = async () => {
		setIsPreviewing(true);
		try {
			const res = await fetch('/api/system/export/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ selectedScopes, dateFrom, dateTo })
			});
			const json = await res.json();
			if (json?.success && json?.counts) {
				setPreviewCounts(json.counts as Record<string, number>);
			} else {
				setPreviewCounts(null);
			}
		} catch {
			setPreviewCounts(null);
		} finally {
			setIsPreviewing(false);
		}
	};

	const onExport = async () => {
		try {
			const res = await fetch('/api/system/export/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ selectedScopes, dateFrom, dateTo, format })
			});
			if (!res.ok) return;
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `export-${new Date().toISOString().replace(/[:.]/g, '-')}.${format === 'jsonl' ? 'jsonl' : 'zip'}`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			// swallow error for now; can add toast later
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Data Export</CardTitle>
				<CardDescription>Select collections, filters, and format. Preview before export.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded border p-4">
						<div className="font-semibold mb-2">Scope</div>
						<div className="grid grid-cols-2 gap-2">
							{SCOPES.map(scope => (
								<label key={scope} className="flex items-center gap-2 text-sm">
									<input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} />
									{scope}
								</label>
							))}
						</div>
					</div>
					<div className="rounded border p-4">
						<div className="font-semibold mb-2">Filters</div>
						<div className="space-y-2">
							<label className="flex items-center gap-2 text-sm">
								<span className="w-28">From</span>
								<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input input-bordered w-full border rounded px-2 py-1" />
							</label>
							<label className="flex items-center gap-2 text-sm">
								<span className="w-28">To</span>
								<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input input-bordered w-full border rounded px-2 py-1" />
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={denormalize} onChange={e => setDenormalize(e.target.checked)} />
								Denormalize names (company/department)
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={includeAssets} onChange={e => setIncludeAssets(e.target.checked)} />
								Include assets (PDFs/templates)
							</label>
						</div>
					</div>
					<div className="rounded border p-4">
						<div className="font-semibold mb-2">Format</div>
						<div className="space-y-2">
							<label className="flex items-center gap-2 text-sm">
								<input type="radio" name="fmt" checked={format === "jsonl"} onChange={() => setFormat("jsonl")} /> JSONL (one item per line)
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="radio" name="fmt" checked={format === "csv"} onChange={() => setFormat("csv")} /> CSV (per collection)
							</label>
							<div className="text-xs text-muted-foreground">Outputs in a ZIP archive with schema.json</div>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={onPreview} disabled={isPreviewing || selectedScopes.length === 0}>
						<Eye className="h-4 w-4 mr-2" />
						{isPreviewing ? "Previewing…" : "Preview Counts"}
					</Button>
					<Button onClick={onExport} disabled={!canExport}>
						<Download className="h-4 w-4 mr-2" />
						Export
					</Button>
				</div>
				{previewCounts && (
					<div className="rounded border p-4">
						<div className="font-semibold mb-2">Preview</div>
						<ul className="text-sm grid md:grid-cols-3 gap-2">
							{Object.entries(previewCounts).map(([scope, count]) => (
								<li key={scope} className="flex justify-between">
									<span>{scope}</span>
									<span className="text-muted-foreground">{count} items</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
