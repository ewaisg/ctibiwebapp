"use client";

import React, { useCallback, useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EnhancedFileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
}

export function EnhancedFileUpload({
  onFileSelect,
  acceptedTypes = ".xlsx,.xls,.csv",
  maxSize = 10,
  disabled = false
}: EnhancedFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    setError(null);

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = acceptedTypes.split(',').map(type => type.replace('.', '').trim());
    
    if (fileExtension && !allowedExtensions.includes(fileExtension)) {
      setError(`File type not supported. Allowed types: ${acceptedTypes}`);
      return;
    }

    onFileSelect(file);
  }, [maxSize, acceptedTypes, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center
          ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
          transition-colors
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="p-3 rounded-full bg-accent/20">
            <Upload className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Drop your file here or click to browse</p>
            <p className="text-xs text-muted-foreground">
              Supported formats: {acceptedTypes.replace(/[<>"'&]/g, '')} (max {maxSize}MB)
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <Label htmlFor="file-input">Or select a file:</Label>
        <Input
          id="file-input"
          type="file"
          accept={acceptedTypes}
          onChange={handleFileInput}
          disabled={disabled}
        />
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error.replace(/[<>"'&]/g, '')}</span>
        </div>
      )}
    </div>
  );
}
