"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TemplateUploadProps {
  onTemplateUploaded: (template: any) => void;
}

export function TemplateUpload({ onTemplateUploaded }: TemplateUploadProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    templateName: '',
    templateType: 'Invoice' as 'Invoice' | 'CoverPage' | 'Report' | 'Custom',
    description: '',
    version: '1.0.0',
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFileSelected(pdfFile);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      handleFileSelected(file);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);

    // Auto-populate template name from filename
    if (!formData.templateName) {
      const nameWithoutExt = file.name.replace('.pdf', '');
      setFormData(prev => ({ ...prev, templateName: nameWithoutExt }));
    }

    // Detect fields in the PDF
    await detectPdfFields(file);
  };

  const detectPdfFields = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/templates/detect-fields', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setDetectedFields(data.fields || []);
      }
    } catch (error) {
      console.error('Error detecting PDF fields:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a PDF file to upload',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.templateName) {
      toast({
        title: 'Template name required',
        description: 'Please enter a name for the template',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert PDF to base64
      const base64 = await fileToBase64(selectedFile);

      const payload = {
        ...formData,
        base64Data: base64,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        detectedFields,
        fieldMappings: detectedFields.map(fieldName => ({
          fieldName,
          sourceCollection: '',
          sourceField: '',
          isRequired: false,
        })),
      };

      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newTemplate = await response.json();
        toast({
          title: 'Template uploaded',
          description: `${formData.templateName} has been uploaded successfully`,
        });
        onTemplateUploaded(newTemplate);
      } else {
        const error = await response.json();
        toast({
          title: 'Upload failed',
          description: error.error || 'Failed to upload template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      toast({
        title: 'Upload failed',
        description: 'An error occurred while uploading the template',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          selectedFile && "border-green-500 bg-green-500/5"
        )}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
              {detectedFields.length > 0 && (
                <p className="text-sm text-green-600">
                  Detected {detectedFields.length} form fields
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setDetectedFields([]);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              Drag and drop your PDF template here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <Input
              type="file"
              accept="application/pdf"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Choose PDF File
              </label>
            </Button>
          </>
        )}
      </div>

      {/* Template Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="templateName">Template Name *</Label>
          <Input
            id="templateName"
            value={formData.templateName}
            onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
            placeholder="e.g., Standard Invoice Template"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="templateType">Template Type *</Label>
          <Select
            value={formData.templateType}
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, templateType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Invoice">Invoice</SelectItem>
              <SelectItem value="CoverPage">Cover Page</SelectItem>
              <SelectItem value="Report">Report</SelectItem>
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
            placeholder="1.0.0"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of this template..."
            rows={3}
          />
        </div>
      </div>

      {/* Detected Fields Preview */}
      {detectedFields.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Detected Form Fields ({detectedFields.length})</h3>
            <div className="flex flex-wrap gap-2">
              {detectedFields.map((field, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-muted rounded-full text-sm font-mono"
                >
                  {field}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              You'll be able to map these fields to your data in the next step
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !formData.templateName || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Template
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
