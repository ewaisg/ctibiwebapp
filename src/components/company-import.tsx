"use client";

import React, { useState } from "react";
import { Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { processCompanyImport } from "@/app/admin/actions";
import type { Company } from "@/types";

interface CompanyImportProps {
  onCompaniesImported: (companies: Company[]) => void;
  onCancel: () => void;
}

interface ImportResult {
  success: boolean;
  processed?: number;
  duplicates?: number;
  errors?: number;
  message?: string;
  companies?: Company[];
}

export function CompanyImport({ onCompaniesImported, onCancel }: CompanyImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const uploadResult = await processCompanyImport(file);
      setResult(uploadResult);
      
      if (uploadResult.success && uploadResult.companies) {
        onCompaniesImported(uploadResult.companies);
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      {!result && (
        <>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Choose XLSX file to upload</p>
                <p className="text-xs text-muted-foreground">Supports Excel files (.xlsx)</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          </div>

          {file && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground">Processing company data...</p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Processing...' : 'Import Companies'}
                </Button>
                <Button variant="outline" onClick={resetUpload} disabled={uploading}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="space-y-4">
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.message}
            </AlertDescription>
          </Alert>

          {result.success && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.processed || 0}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.duplicates || 0}</div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{result.errors || 0}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button onClick={onCancel} className="flex-1">
              Done
            </Button>
            <Button variant="outline" onClick={resetUpload}>
              Import Another
            </Button>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Supported formats:</strong> Excel (.xlsx, .xls)</p>
        <p><strong>Required columns:</strong> companyName, companyCode</p>
        <p><strong>Optional columns:</strong> isSubconsultant, isInactive, diversityCertification</p>
        <p><strong>Certification values:</strong> MWBE, WBE, SBE, None</p>
        <p><strong>Boolean values:</strong> true/false for isSubconsultant and isInactive</p>
      </div>
    </div>
  );
}