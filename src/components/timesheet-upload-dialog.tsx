"use client";

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, XCircle, Minimize2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { processTimesheetUpload } from '@/app/(authenticated)/timesheets/actions';

interface UploadProgress {
  currentRow: number;
  totalRows: number;
  processed: number;
  duplicates: number;
  errors: number;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  currentEmployee?: string;
  isMinimized: boolean;
}

interface TimesheetUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TimesheetUploadDialog({ isOpen, onClose, onSuccess }: TimesheetUploadDialogProps) {
  const { firebaseUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress>({
    currentRow: 0,
    totalRows: 0,
    processed: 0,
    duplicates: 0,
    errors: 0,
    status: 'idle',
    isMinimized: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!firebaseUser) {
      toast({
        title: "Authentication Error",
        description: "Please sign in to upload timesheets",
        variant: "destructive",
      });
      return;
    }

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.group(`📤 Timesheet upload ${uploadId}`);
    console.log('Starting upload with file:', { name: file.name, size: file.size, type: file.type });
    setIsProcessing(true);
    setProgress(prev => ({
      ...prev,
      status: 'uploading',
      currentRow: 0,
      processed: 0,
      duplicates: 0,
      errors: 0,
      totalRows: 0
    }));

    try {
      // Get auth token
      const idToken = await firebaseUser.getIdToken();
      console.log(`[${uploadId}] Got auth token`);

      const authHeaders = {
        'Authorization': `Bearer ${idToken}`
      };
      // Start upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadId', uploadId);

      // Start polling for progress
      const pollProgress = async () => {
        try {
          console.log(`[${uploadId}] Polling progress...`);
          const response = await fetch(`/api/timesheet-upload?uploadId=${uploadId}`, {
            headers: authHeaders
          });
          console.log(`[${uploadId}] Progress response status:`, response.status);
          if (response.ok) {
            const progressData = await response.json();
            console.log(`[${uploadId}] Progress payload:`, progressData);
            setProgress(prev => ({
              ...prev,
              status: progressData.status === 'completed' ? 'completed' : 'processing',
              currentRow: progressData.currentEntry || 0,
              totalRows: progressData.totalEntries || 0,
              processed: progressData.processed || 0,
              duplicates: progressData.duplicates || 0,
              errors: progressData.errors || 0,
              currentEmployee: progressData.currentEmployee
            }));
            
            if (progressData.status === 'completed') {
              return true; // Stop polling
            }
          }
          console.warn(`[${uploadId}] Progress polling returned status:`, response.status);
        } catch (error) {
          console.error(`[${uploadId}] Progress polling error:`, error);
        }
        return false;
      };

      console.log(`[${uploadId}] Sending upload request to /api/timesheet-upload`);
      const uploadPromise = fetch('/api/timesheet-upload', {
        method: 'POST',
        headers: authHeaders,
        body: formData
      }).then(async (response) => {
        console.log(`[${uploadId}] Upload response status:`, response.status);
        const responseText = await response.clone().text();
        console.log(`[${uploadId}] Upload response body:`, responseText);
        return new Response(responseText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      });

      // Poll for progress every 500ms
      const progressInterval = setInterval(async () => {
        const completed = await pollProgress();
        if (completed) {
          clearInterval(progressInterval);
        }
      }, 500);

      const uploadResponse = await uploadPromise;
      clearInterval(progressInterval);

      let data: any = {};
      try {
        data = await uploadResponse.json();
      } catch (parseError) {
        console.error(`[${uploadId}] Failed to parse upload response as JSON:`, parseError);
      }
      console.log(`[${uploadId}] Parsed upload response:`, data);

      if (data.success) {
        setProgress(prev => ({
          ...prev,
          status: 'completed',
          processed: data.processed || 0,
          duplicates: data.duplicates || 0,
          errors: data.errors || 0
        }));

        toast({
          title: "Upload Successful",
          description: `Processed ${data.processed} entries, ${data.duplicates} duplicates, ${data.errors} errors`,
        });

        setTimeout(() => {
          onSuccess(); // This triggers router.refresh() in parent
          setTimeout(() => {
            handleClose();
          }, 500); // Small delay to ensure refresh completes
        }, 2000);
      } else {
        console.error(`[${uploadId}] Upload reported failure:`, data);
        setProgress(prev => ({ ...prev, status: 'error' }));
        toast({
          title: "Upload Failed",
          description: data.error || 'Unknown error',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`[${uploadId}] Upload process threw an error:`, error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      console.log(`[${uploadId}] Upload flow finished.`);
      console.groupEnd();
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    console.warn('Timesheet upload cancelled by user');
    setProgress(prev => ({ ...prev, status: 'cancelled' }));
    setIsProcessing(false);
  };

  const handleMinimize = () => {
    console.log('Minimizing upload dialog');
    setProgress(prev => ({ ...prev, isMinimized: true }));
  };

  const handleMaximize = () => {
    console.log('Restoring upload dialog');
    setProgress(prev => ({ ...prev, isMinimized: false }));
  };

  const handleClose = () => {
    console.log('Closing upload dialog and resetting state');
    setFile(null);
    setProgress({
      currentRow: 0,
      totalRows: 0,
      processed: 0,
      duplicates: 0,
      errors: 0,
      status: 'idle',
      isMinimized: false
    });
    setIsProcessing(false);
    onClose();
  };

  const getProgressPercentage = () => {
    if (progress.totalRows === 0) return 0;
    return Math.round((progress.currentRow / progress.totalRows) * 100);
  };


  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': case 'cancelled': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'uploading': case 'processing': return <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default: return <FileSpreadsheet className="h-5 w-5 text-gray-400" />;
    }
  };

  if (!isOpen) return null;

  // Minimized view
  if (progress.isMinimized && isProcessing) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">Uploading Timesheets</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleMaximize}>
              <Play className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
          <div className="text-xs text-gray-500 mt-1">
            {progress.currentRow} of {progress.totalRows} entries
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isProcessing ? handleClose : undefined} />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Upload Timesheets</h2>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <Button variant="ghost" size="sm" onClick={handleMinimize}>
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isProcessing}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {progress.status === 'idle' && (
            <>
              {!file ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-4">
                    Select an XLSX file to upload timesheet entries
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-green-800 truncate">{file.name}</p>
                      <p className="text-xs text-green-600">
                        {(file.size / 1024).toFixed(1)} KB • Ready to upload
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setFile(null)}
                        className="text-green-600 hover:text-green-700 mt-2 h-6 px-2 text-xs"
                      >
                        Change File
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {(progress.status === 'uploading' || progress.status === 'processing') && (
            <div className="space-y-6">
              {/* Header with animated icon */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 rounded-full animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg text-blue-900">
                    Processing Timesheet Entries
                  </p>
                  <p className="text-sm text-blue-600">
                    {progress.currentEmployee ? `Processing ${progress.currentEmployee}` : 'Reading file data...'}
                  </p>
                </div>
              </div>

              {/* Progress bar with percentage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Entry {progress.currentRow} of {progress.totalRows}
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {getProgressPercentage()}%
                  </span>
                </div>
                <div className="relative">
                  <Progress value={getProgressPercentage()} className="h-4" />
                  <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-green-500/20 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Live counters with animations */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center transition-all duration-300 hover:scale-105">
                  <div className="text-2xl font-bold text-green-600 animate-pulse">{progress.processed}</div>
                  <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Processed</div>
                  <div className="h-1 bg-green-200 rounded-full mt-2">
                    <div className="h-1 bg-green-500 rounded-full transition-all duration-500" style={{width: `${progress.totalRows > 0 ? (progress.processed / progress.totalRows) * 100 : 0}%`}} />
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center transition-all duration-300 hover:scale-105">
                  <div className="text-2xl font-bold text-yellow-600 animate-pulse">{progress.duplicates}</div>
                  <div className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Duplicates</div>
                  <div className="h-1 bg-yellow-200 rounded-full mt-2">
                    <div className="h-1 bg-yellow-500 rounded-full transition-all duration-500" style={{width: `${progress.totalRows > 0 ? (progress.duplicates / progress.totalRows) * 100 : 0}%`}} />
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center transition-all duration-300 hover:scale-105">
                  <div className="text-2xl font-bold text-red-600 animate-pulse">{progress.errors}</div>
                  <div className="text-xs font-medium text-red-700 uppercase tracking-wide">Errors</div>
                  <div className="h-1 bg-red-200 rounded-full mt-2">
                    <div className="h-1 bg-red-500 rounded-full transition-all duration-500" style={{width: `${progress.totalRows > 0 ? (progress.errors / progress.totalRows) * 100 : 0}%`}} />
                  </div>
                </div>
              </div>

              {/* Processing speed indicator */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Processing Speed</span>
                  <span className="font-mono">{progress.totalRows > 0 ? Math.round((progress.currentRow / progress.totalRows) * 100) : 0} entries/sec</span>
                </div>
              </div>
            </div>
          )}

          {progress.status === 'completed' && (
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-in zoom-in-50 duration-500">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 bg-green-500 rounded-full animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-green-600">Upload Completed Successfully!</h3>
                <p className="text-gray-600">
                  Processed <span className="font-semibold text-green-600">{progress.processed}</span> entries
                </p>
              </div>
              
              {/* Final summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-600">{progress.processed}</div>
                    <div className="text-xs text-green-700">Processed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">{progress.duplicates}</div>
                    <div className="text-xs text-yellow-700">Duplicates</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{progress.errors}</div>
                    <div className="text-xs text-red-700">Errors</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(progress.status === 'error' || progress.status === 'cancelled') && (
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-red-600 mx-auto" />
              <div>
                <h3 className="font-semibold text-red-600">
                  {progress.status === 'cancelled' ? 'Upload Cancelled' : 'Upload Failed'}
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  {progress.status === 'cancelled' 
                    ? 'The upload process was cancelled'
                    : 'Please check your file and try again'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          {progress.status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </>
          )}

          {(progress.status === 'uploading' || progress.status === 'processing') && (
            <Button variant="outline" onClick={handleCancel}>
              Cancel Upload
            </Button>
          )}

          {(progress.status === 'completed' || progress.status === 'error' || progress.status === 'cancelled') && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}