"use client";

import React, { useState, useTransition } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Project, Contract, Department, Service } from "@/types";
import { processProjectImport } from "@/app/admin/actions";
import { toast } from "react-hot-toast";

interface ProjectImportProps {
  contracts: Contract[];
  departments: Department[];
  services: Service[];
  onProjectsImported: (projects: Project[]) => void;
  onCancel: () => void;
}

export function ProjectImport({ onProjectsImported, onCancel }: ProjectImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    processed?: number;
    duplicates?: number;
    errors?: number;
  } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast.error("Please select a valid Excel (.xlsx, .xls) or CSV file");
      }
    }
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Please select a file to import");
      return;
    }

    startTransition(async () => {
      try {
        setProgress(10);
        
        const result = await processProjectImport(file);
        
        setProgress(100);
        setImportResult(result);
        
        if (result.success && result.projects) {
          onProjectsImported(result.projects);
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        setProgress(0);
        const errorMessage = error instanceof Error ? error.message : "Import failed";
        setImportResult({
          success: false,
          message: errorMessage
        });
        toast.error(errorMessage);
      }
    });
  };

  const resetImport = () => {
    setFile(null);
    setProgress(0);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="file-upload">Select Project File</Label>
          <div className="mt-2">
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isPending}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Supported formats: Excel (.xlsx, .xls) and CSV files
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <span className="font-medium">{file.name}</span>
            <span className="text-sm text-muted-foreground">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
            {!isPending && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetImport}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expected Format */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          <strong>Expected columns:</strong> Project Name, PO Number, Contract ID, Department ID (optional), 
          Project Manager (optional), Original PO Amount (optional), Budgeted Hours (optional)
        </AlertDescription>
      </Alert>

      {/* Progress */}
      {isPending && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing import...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {importResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <div className="space-y-1">
              <p className={importResult.success ? "text-green-800" : "text-red-800"}>
                {importResult.message}
              </p>
              {importResult.success && (
                <div className="text-sm text-green-700">
                  <p>✅ Processed: {importResult.processed || 0}</p>
                  <p>⚠️ Duplicates: {importResult.duplicates || 0}</p>
                  <p>❌ Errors: {importResult.errors || 0}</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={!file || isPending}>
          <Upload className="h-4 w-4 mr-2" />
          {isPending ? "Importing..." : "Import Projects"}
        </Button>
      </div>
    </div>
  );
}