"use client";

import React, { useState } from "react";
import { ArrowLeft, Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { processTimesheetUpload } from "../actions";
import Link from "next/link";

export default function TimesheetUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    processed?: number;
    duplicates?: number;
    errors?: number;
    message?: string;
  } | null>(null);
  // Router imported but not used - removed for cleaner code

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
      const uploadResult = await processTimesheetUpload(file);
      setResult(uploadResult);
    } catch (error) {
      setResult({
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center space-x-4">
        <Button asChild variant="outline">
          <Link href="/timesheets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Timesheets
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload Timesheet</h2>
          <p className="text-muted-foreground">
            Upload XLSX files containing timesheet data from iSolved or other systems
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Upload XLSX File</CardTitle>
          <CardDescription>
            Select a timesheet XLSX file to upload and process. The system will automatically detect columns and import the data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                      <p className="text-sm text-muted-foreground">Processing timesheet data...</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleUpload} 
                      disabled={uploading}
                      className="flex-1"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Processing...' : 'Upload & Process'}
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
                <Button asChild className="flex-1">
                  <Link href="/timesheets">
                    View Timesheets
                  </Link>
                </Button>
                <Button variant="outline" onClick={resetUpload}>
                  Upload Another
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Supported formats:</strong> Excel (.xlsx, .xls)</p>
            <p><strong>Required columns:</strong> employeeNumber (or Employee #), timecardDate (or Date), payItemHour (or Hours)</p>
            <p><strong>Optional columns:</strong> startTime, endTime, Division, Customer, Department, Project/Categories, Project/Job, notes, Pay Item columns</p>
            <p><strong>Note:</strong> Duplicate entries (same employee, date, hours, times, and notes) will be skipped automatically.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
