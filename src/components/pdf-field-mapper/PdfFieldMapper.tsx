'use client';

/**
 * PDF Field Mapper Component
 * Upload PDF, extract fields, map them to data sources
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Save, Eye, Trash2, Table as TableIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { PdfFieldInfo, FieldMapping, MappedPdfTemplate, TableMapping } from '@/types/pdf-field-mapper';
import { PdfViewer } from './PdfViewer';
import { FieldMappingDialog } from './FieldMappingDialog';
import { TableMappingDialog } from './TableMappingDialog';

interface PdfFieldMapperProps {
  templateId?: string;
  onSave?: (template: MappedPdfTemplate) => void;
  onCancel?: () => void;
}

export function PdfFieldMapper({ templateId, onSave, onCancel }: PdfFieldMapperProps) {
  const { secureRequest } = useAuth() as any;
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<PdfFieldInfo[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [tableMappings, setTableMappings] = useState<TableMapping[]>([]);
  const [selectedField, setSelectedField] = useState<PdfFieldInfo | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'Invoice' | 'Report' | 'CoverPage' | 'Custom'>('Invoice');
  const [dataSource, setDataSource] = useState('invoices');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle PDF upload
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfFile(file);

    // Create URL for PDF viewer
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setPdfBase64(base64);
    };
    reader.readAsDataURL(file);

    // Extract fields from PDF
    await extractFields(file);
  };

  // Extract form fields from PDF
  const extractFields = async (file: File) => {
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await secureRequest('/api/pdf-templates/extract-fields', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedFields(data.fields);
        setMetadata(data.metadata);
        console.log(`Extracted ${data.fields.length} fields from PDF`);
      } else {
        alert('Failed to extract fields from PDF');
      }
    } catch (error) {
      console.error('Error extracting fields:', error);
      alert('Error extracting fields from PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle field click from PDF viewer
  const handleFieldClick = (field: PdfFieldInfo) => {
    setSelectedField(field);
    setShowMappingDialog(true);
  };

  // Save field mapping
  const handleSaveMapping = (mapping: FieldMapping) => {
    setFieldMappings((prev) => {
      const existing = prev.findIndex((m) => m.pdfFieldName === mapping.pdfFieldName);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = mapping;
        return updated;
      }
      return [...prev, mapping];
    });
    setShowMappingDialog(false);
    setSelectedField(null);
  };

  // Delete field mapping
  const handleDeleteMapping = (pdfFieldName: string) => {
    setFieldMappings((prev) => prev.filter((m) => m.pdfFieldName !== pdfFieldName));
  };

  // Save table mapping
  const handleSaveTableMapping = (tableMapping: TableMapping) => {
    setTableMappings((prev) => {
      const existing = prev.findIndex((t) => t.id === tableMapping.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = tableMapping;
        return updated;
      }
      return [...prev, tableMapping];
    });
    setShowTableDialog(false);
  };

  // Delete table mapping
  const handleDeleteTableMapping = (tableId: string) => {
    setTableMappings((prev) => prev.filter((t) => t.id !== tableId));
  };

  // Save complete template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (!pdfBase64) {
      alert('Please upload a PDF file');
      return;
    }

    setIsSaving(true);

    try {
      const template: MappedPdfTemplate = {
        id: templateId,
        templateName,
        templateType,
        base64Data: pdfBase64,
        pdfFields: extractedFields,
        fieldMappings,
        tableMappings,
        dataSource: {
          primaryCollection: dataSource,
        },
        createdBy: '', // Will be set by API
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        pageCount: metadata?.pageCount,
        pageSize: metadata?.pageSize,
      };

      // Save to Firestore
      const response = await secureRequest('/api/pdf-templates/mapped', {
        method: templateId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        const savedTemplate = await response.json();
        alert('Template saved successfully!');
        onSave?.(savedTemplate);
      } else {
        alert('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if field has mapping
  const getFieldMapping = (fieldName: string): FieldMapping | undefined => {
    return fieldMappings.find((m) => m.pdfFieldName === fieldName);
  };

  return (
    <div className="space-y-6">
      {/* Upload Form - Only show if no PDF is uploaded */}
      {!pdfUrl && (
        <Card>
          <CardHeader>
            <CardTitle>PDF Field Mapper</CardTitle>
            <CardDescription>
              Upload a PDF form and map its fields to your data sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Invoice Template"
                />
              </div>
              <div>
                <Label htmlFor="templateType">Template Type</Label>
                <Select value={templateType} onValueChange={(v: any) => setTemplateType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Invoice">Invoice</SelectItem>
                    <SelectItem value="Report">Report</SelectItem>
                    <SelectItem value="CoverPage">Cover Page</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="dataSource">Primary Data Source</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="timesheets">Timesheets</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="contracts">Contracts</SelectItem>
                  <SelectItem value="departments">Departments</SelectItem>
                  <SelectItem value="employees">Employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PDF Upload */}
            <div>
              <Label>PDF Template</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isExtracting ? 'Extracting...' : 'Upload PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with metadata - Only show after PDF is uploaded */}
      {pdfUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{templateName || 'PDF Field Mapper'}</CardTitle>
                <CardDescription>
                  {metadata && `${metadata.totalFields} fields found • ${metadata.pageCount} pages`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPdfFile(null);
                  setPdfUrl(null);
                  setPdfBase64(null);
                  setExtractedFields([]);
                  setFieldMappings([]);
                  setTableMappings([]);
                  setMetadata(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove PDF
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* PDF Viewer & Field List */}
      {pdfUrl && (
        <div className="grid grid-cols-4 gap-6">
          {/* PDF Viewer - Takes up 3 columns */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>PDF Preview</CardTitle>
              <CardDescription>Click on fields to map them to data</CardDescription>
            </CardHeader>
            <CardContent>
              <PdfViewer
                pdfUrl={pdfUrl}
                fields={extractedFields}
                mappedFields={fieldMappings.map((m) => m.pdfFieldName)}
                onFieldClick={handleFieldClick}
              />
            </CardContent>
          </Card>

          {/* Field List - Takes up 1 column */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fields ({extractedFields.length})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTableDialog(true)}
                  disabled={extractedFields.length === 0}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </div>
              <CardDescription>
                {fieldMappings.length} mapped • {tableMappings.length} tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[900px] overflow-y-auto">
                {extractedFields.map((field) => {
                  const mapping = getFieldMapping(field.name);
                  return (
                    <div
                      key={field.name}
                      className={`p-2 rounded border cursor-pointer hover:bg-accent ${
                        mapping ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleFieldClick(field)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{field.name}</p>
                          {mapping && (
                            <p className="text-xs text-muted-foreground truncate">
                              → {mapping.dataPath}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {field.type} • Page {field.page + 1}
                          </p>
                        </div>
                        {mapping && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMapping(field.name);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table Mappings */}
      {tableMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Table Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tableMappings.map((table) => (
                <div key={table.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{table.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {table.dataPath} • {table.columns.length} columns • Max {table.maxRows} rows
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTableMapping(table.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSaveTemplate} disabled={isSaving || !pdfFile}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      {/* Field Mapping Dialog */}
      {showMappingDialog && selectedField && (
        <FieldMappingDialog
          field={selectedField}
          existingMapping={getFieldMapping(selectedField.name)}
          dataSource={dataSource}
          onSave={handleSaveMapping}
          onClose={() => {
            setShowMappingDialog(false);
            setSelectedField(null);
          }}
        />
      )}

      {/* Table Mapping Dialog */}
      {showTableDialog && (
        <TableMappingDialog
          fields={extractedFields}
          dataSource={dataSource}
          onSave={handleSaveTableMapping}
          onClose={() => setShowTableDialog(false)}
        />
      )}
    </div>
  );
}
