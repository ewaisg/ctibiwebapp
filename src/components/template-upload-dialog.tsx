"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import type { TemplateFieldMapping } from "@/types";

interface TemplateUploadDialogProps {
  children: React.ReactNode;
  onTemplateUploaded: () => void;
}

type FillingMode = 'manual' | 'auto';

export function TemplateUploadDialog({ children, onTemplateUploaded }: TemplateUploadDialogProps) {
  const { user, secureRequest } = useAuth() as any;
  const [open, setOpen] = useState(false);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Clear all state when dialog closes
      setTemplateName("");
      setTemplateType("");
      setFillingMode('manual');
      setFile(null);
      setFieldMappings([]);
    }
  };
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<string>("");
  const [fillingMode, setFillingMode] = useState<FillingMode>('manual');
  const [file, setFile] = useState<File | null>(null);
  const [fieldMappings, setFieldMappings] = useState<TemplateFieldMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    setFile(selectedFile);
    
    // Extract form fields from PDF
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      const mappings: TemplateFieldMapping[] = fields.map(field => ({
        fieldName: field.getName(),
        sourceCollection: fillingMode === 'manual' ? 'manual' : '',
        sourceField: '',
        isRequired: false,
        fieldType: 'text',
        uiLabel: field.getName(),
        inputType: 'text',
      }));
      
      setFieldMappings(mappings);
    } catch (error) {
      console.error('Error reading PDF fields:', error);
      alert('Error reading PDF form fields');
    }
  };

  const updateFieldMapping = (index: number, field: keyof TemplateFieldMapping, value: any) => {
    setFieldMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as any;
      // Auto-generate relationship path when collection changes (auto mode)
      if (field === 'sourceCollection' && value !== 'invoice') {
        updated[index].relationshipPath = getRelationshipPath(value as string);
      }
      return updated;
    });
  };

  const updateOptionsCsv = (index: number, csv: string) => {
    const opts = csv
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    updateFieldMapping(index, 'options', opts as any);
  };

  const getRelationshipPath = (targetCollection: string): string => {
    const relationships: Record<string, string> = {
      'contract': 'invoice.contractId -> contract.id',
      'project': 'invoice.projectId -> project.id', 
      'department': 'project.departmentId -> department.id',
      'company': 'invoice.submitterCompanyId -> company.id',
      'employee': 'invoiceItem.employeeId -> employee.id'
    };
    return relationships[targetCollection] || '';
  };

  const handleSubmit = async () => {
    if (!templateName || !templateType || !file || !user) {
      alert('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.set('templateName', templateName);
      formData.set('templateType', templateType);
      formData.set('isActive', 'true');
      formData.set('createdBy', user.uid);
      formData.set('createdByName', user.displayName || '');
      formData.set('manualOnly', fillingMode === 'manual' ? 'true' : 'false');
      formData.set('file', file);

      let mappingsToSend: any[] = [];
      if (fillingMode === 'manual') {
        mappingsToSend = fieldMappings.map(m => ({
          ...m,
          sourceCollection: 'manual',
          sourceField: m.sourceField || m.fieldName, // key for manualData
        }));
      } else {
        // Auto-fill mode: only include rows with a target mapping
        mappingsToSend = fieldMappings.filter(m => m.sourceCollection && m.sourceField);
      }

      formData.set('fieldMappings', JSON.stringify(mappingsToSend));

      const response = await secureRequest('/api/pdf-templates', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        handleOpenChange(false);
        onTemplateUploaded();
      } else {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const collectionOptions = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'project', label: 'Project' },
    { value: 'contract', label: 'Contract' },
    { value: 'department', label: 'Department' },
    { value: 'company', label: 'Company' },
    { value: 'employee', label: 'Employee' },
    { value: 'generated', label: 'Generated Values' }
  ];

  const getFieldOptions = (collection: string) => {
    const fieldsByCollection: Record<string, Array<{value: string, label: string}>> = {
      invoice: [
        { value: 'invoiceNumber', label: 'Invoice Number' },
        { value: 'contractNumber', label: 'Contract Number' },
        { value: 'poNumber', label: 'PO Number' },
        { value: 'fromDate', label: 'From Date' },
        { value: 'toDate', label: 'To Date' },
        { value: 'dueDate', label: 'Due Date' },
        { value: 'invoiceTotal', label: 'Invoice Total' },
        { value: 'invoiceItemsTotal', label: 'Professional Services Total' },
        { value: 'reimbursableExpensesTotal', label: 'Expenses Total' },
        { value: 'termOfWeek', label: 'Term of Week' },
        { value: 'pmisNumber', label: 'PMIS Number' },
        { value: 'approvingSupervisor', label: 'Approving Supervisor' }
      ],
      project: [
        { value: 'projectName', label: 'Project Name' },
        { value: 'poNumber', label: 'PO Number' },
        { value: 'projectManager', label: 'Project Manager' },
        { value: 'approvingSupervisor', label: 'Approving Supervisor' },
        { value: 'originalPoAmount', label: 'Original PO Amount' },
        { value: 'remainingPoAmount', label: 'Remaining PO Amount' }
      ],
      contract: [
        { value: 'contractName', label: 'Contract Name' },
        { value: 'contractNumber', label: 'Contract Number' },
        { value: 'contractEffectiveDate', label: 'Contract Effective Date' },
        { value: 'contractCapacity', label: 'Contract Capacity' },
        { value: 'contractDuration', label: 'Contract Duration' }
      ],
      department: [
        { value: 'departmentName', label: 'Department Name' },
        { value: 'departmentCode', label: 'Department Code' }
      ],
      company: [
        { value: 'companyName', label: 'Company Name' },
        { value: 'companyCode', label: 'Company Code' },
        { value: 'diversityCertification', label: 'Diversity Certification' }
      ],
      employee: [
        { value: 'formalName', label: 'Full Name' },
        { value: 'firstName', label: 'First Name' },
        { value: 'lastName', label: 'Last Name' },
        { value: 'employeeNumber', label: 'Employee Number' }
      ],
      generated: [
        { value: 'currentDate', label: 'Current Date' },
        { value: 'currentTime', label: 'Current Time' },
        { value: 'currentUser', label: 'Current User Name' },
        { value: 'currentUserEmail', label: 'Current User Email' },
        { value: 'staticText', label: 'Static Text' }
      ]
    };
    return fieldsByCollection[collection] || [];
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PDF Template
          </DialogTitle>
          <DialogDescription>
            Upload a PDF form template. Choose Manual to collect user inputs at generation time, or Auto to map fields to data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Cover Page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateType">Template Type *</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
              <Label>Filling Mode *</Label>
              <Select value={fillingMode} onValueChange={(v) => setFillingMode(v as FillingMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (form-driven)</SelectItem>
                  <SelectItem value="auto">Auto (map to data)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">PDF File *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
            />
          </div>

          {fieldMappings.length > 0 && (
            <div className="space-y-4">
              <Label>Field Configuration</Label>
              {fillingMode === 'auto' ? (
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-5 gap-2 items-center text-xs font-medium text-muted-foreground mb-2">
                    <div>PDF Field</div>
                    <div>Collection</div>
                    <div>Field</div>
                    <div>Type</div>
                    <div>Required</div>
                  </div>
                  <div className="space-y-2">
                    {fieldMappings.map((mapping, index) => (
                      <div key={`${index}-${mapping.fieldName}`} className="grid grid-cols-5 gap-2 items-center text-sm">
                        <div className="font-medium">{mapping.fieldName}</div>
                        
                        <Select
                          key={`collection-${index}-${mapping.sourceCollection}`}
                          value={mapping.sourceCollection || ''}
                          onValueChange={(value) => {
                            updateFieldMapping(index, 'sourceCollection', value);
                            updateFieldMapping(index, 'sourceField', ''); // Reset field when collection changes
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Collection" />
                          </SelectTrigger>
                          <SelectContent>
                            {collectionOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          key={`field-${index}-${mapping.sourceCollection}-${mapping.sourceField}`}
                          value={mapping.sourceField || ''}
                          onValueChange={(value) => updateFieldMapping(index, 'sourceField', value)}
                          disabled={!mapping.sourceCollection}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFieldOptions(mapping.sourceCollection || '').map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={mapping.fieldType}
                          onValueChange={(value) => updateFieldMapping(index, 'fieldType', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="currency">Currency</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={mapping.isRequired}
                            onChange={(e) => updateFieldMapping(index, 'isRequired', e.target.checked)}
                            className="rounded"
                            title="Required"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-6 gap-2 items-center text-xs font-medium text-muted-foreground mb-2">
                    <div>PDF Field</div>
                    <div>Label</div>
                    <div>Input</div>
                    <div className="col-span-2">Options (for Select)</div>
                    <div>Required</div>
                  </div>
                  <div className="space-y-2">
                    {fieldMappings.map((mapping, index) => (
                      <div key={`${index}-${mapping.fieldName}`} className="grid grid-cols-6 gap-2 items-center text-sm">
                        <div className="font-medium truncate" title={mapping.fieldName}>{mapping.fieldName}</div>
                        <Input
                          value={mapping.uiLabel || ''}
                          onChange={(e) => updateFieldMapping(index, 'uiLabel', e.target.value)}
                          placeholder="Label"
                        />
                        <Select
                          value={mapping.inputType || 'text'}
                          onValueChange={(value) => updateFieldMapping(index, 'inputType', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="currency">Currency</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="signature">Signature</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={(mapping.options || []).join(', ')}
                          onChange={(e) => updateOptionsCsv(index, e.target.value)}
                          placeholder="opt1, opt2, opt3"
                          disabled={(mapping.inputType || 'text') !== 'select'}
                        />
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={mapping.isRequired}
                            onChange={(e) => updateFieldMapping(index, 'isRequired', e.target.checked)}
                            className="rounded"
                            title="Required"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!templateName || !templateType || !file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}