'use client';

/**
 * Field Mapping Dialog
 * Dialog for mapping PDF field to data path
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PdfFieldInfo, FieldMapping } from '@/types/pdf-field-mapper';

interface FieldMappingDialogProps {
  field: PdfFieldInfo;
  existingMapping?: FieldMapping;
  dataSource: string;
  onSave: (mapping: FieldMapping) => void;
  onClose: () => void;
}

// Common field mappings for different data sources
const DATA_SOURCE_FIELDS: Record<string, { path: string; label: string }[]> = {
  invoices: [
    { path: 'invoiceNumber', label: 'Invoice Number' },
    { path: 'invoiceDate', label: 'Invoice Date' },
    { path: 'dueDate', label: 'Due Date' },
    { path: 'fromDate', label: 'Billing From Date' },
    { path: 'toDate', label: 'Billing To Date' },
    { path: 'invoiceTotal', label: 'Invoice Total' },
    { path: 'invoiceItemsTotal', label: 'Items Total' },
    { path: 'reimbursableExpensesTotal', label: 'Expenses Total' },
    { path: 'taxTotal', label: 'Tax Total' },
    { path: 'poNumber', label: 'PO Number' },
    { path: 'contractNumber', label: 'Contract Number' },
    { path: 'projectName', label: 'Project Name' },
    { path: 'departmentName', label: 'Department Name' },
    { path: 'project.projectName', label: 'Project: Name' },
    { path: 'project.projectNumber', label: 'Project: Number' },
    { path: 'project.poAmount', label: 'Project: PO Amount' },
    { path: 'contract.contractNumber', label: 'Contract: Number' },
    { path: 'contract.vendor', label: 'Contract: Vendor' },
    { path: 'department.departmentName', label: 'Department: Name' },
    { path: 'department.departmentCode', label: 'Department: Code' },
  ],
  timesheets: [
    { path: 'employeeName', label: 'Employee Name' },
    { path: 'employeeId', label: 'Employee ID' },
    { path: 'weekEnding', label: 'Week Ending' },
    { path: 'totalHours', label: 'Total Hours' },
    { path: 'regularHours', label: 'Regular Hours' },
    { path: 'overtimeHours', label: 'Overtime Hours' },
    { path: 'projectName', label: 'Project Name' },
    { path: 'status', label: 'Status' },
  ],
  projects: [
    { path: 'projectName', label: 'Project Name' },
    { path: 'projectNumber', label: 'Project Number' },
    { path: 'poNumber', label: 'PO Number' },
    { path: 'poAmount', label: 'PO Amount' },
    { path: 'startDate', label: 'Start Date' },
    { path: 'endDate', label: 'End Date' },
    { path: 'status', label: 'Status' },
    { path: 'description', label: 'Description' },
  ],
  contracts: [
    { path: 'contractNumber', label: 'Contract Number' },
    { path: 'vendor', label: 'Vendor' },
    { path: 'startDate', label: 'Start Date' },
    { path: 'endDate', label: 'End Date' },
    { path: 'totalAmount', label: 'Total Amount' },
  ],
  departments: [
    { path: 'departmentName', label: 'Department Name' },
    { path: 'departmentCode', label: 'Department Code' },
    { path: 'manager', label: 'Manager' },
  ],
  employees: [
    { path: 'formalName', label: 'Formal Name' },
    { path: 'firstName', label: 'First Name' },
    { path: 'lastName', label: 'Last Name' },
    { path: 'email', label: 'Email' },
    { path: 'phone', label: 'Phone' },
    { path: 'position', label: 'Position' },
  ],
};

export function FieldMappingDialog({
  field,
  existingMapping,
  dataSource,
  onSave,
  onClose,
}: FieldMappingDialogProps) {
  const [dataPath, setDataPath] = useState(existingMapping?.dataPath || '');
  const [transform, setTransform] = useState<FieldMapping['transform']>(existingMapping?.transform);
  const [format, setFormat] = useState(existingMapping?.format || '');
  const [defaultValue, setDefaultValue] = useState(existingMapping?.defaultValue || '');

  const availableFields = DATA_SOURCE_FIELDS[dataSource] || [];

  const handleSave = () => {
    if (!dataPath.trim()) {
      alert('Please select or enter a data path');
      return;
    }

    const mapping: FieldMapping = {
      pdfFieldName: field.name,
      dataPath: dataPath.trim(),
      transform,
      format: format.trim() || undefined,
      defaultValue: defaultValue.trim() || undefined,
    };

    onSave(mapping);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Map Field: {field.name}</DialogTitle>
          <DialogDescription>
            Map this PDF field to a data source field
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Field Info */}
          <div className="p-3 bg-gray-50 rounded border">
            <p className="text-sm">
              <span className="font-medium">Field Type:</span> {field.type}
            </p>
            <p className="text-sm">
              <span className="font-medium">Page:</span> {field.page + 1}
            </p>
            {field.defaultValue && (
              <p className="text-sm">
                <span className="font-medium">Default Value:</span> {field.defaultValue}
              </p>
            )}
          </div>

          {/* Data Path Selection */}
          <div>
            <Label htmlFor="dataPath">Data Field</Label>
            <Select value={dataPath} onValueChange={setDataPath}>
              <SelectTrigger>
                <SelectValue placeholder="Select a field or enter custom path" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((f) => (
                  <SelectItem key={f.path} value={f.path}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              placeholder="Or enter custom path (e.g., invoice.items[0].amount)"
              value={dataPath}
              onChange={(e) => setDataPath(e.target.value)}
            />
          </div>

          {/* Transform */}
          <div>
            <Label htmlFor="transform">Transform</Label>
            <Select
              value={transform || 'none'}
              onValueChange={(v) => setTransform(v === 'none' ? undefined : (v as any))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="date">Format as Date</SelectItem>
                <SelectItem value="currency">Format as Currency</SelectItem>
                <SelectItem value="number">Format as Number</SelectItem>
                <SelectItem value="uppercase">Uppercase</SelectItem>
                <SelectItem value="lowercase">Lowercase</SelectItem>
                <SelectItem value="boolean">Convert to Boolean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format String */}
          {(transform === 'date' || transform === 'currency' || transform === 'number') && (
            <div>
              <Label htmlFor="format">Format</Label>
              <Input
                id="format"
                placeholder={
                  transform === 'date'
                    ? 'MM/dd/yyyy'
                    : transform === 'currency'
                    ? '$0,0.00'
                    : '0,0.00'
                }
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {transform === 'date' && 'Date format (e.g., MM/dd/yyyy, yyyy-MM-dd)'}
                {transform === 'currency' && 'Currency format (e.g., $0,0.00)'}
                {transform === 'number' && 'Number format (e.g., 0,0.00)'}
              </p>
            </div>
          )}

          {/* Default Value */}
          <div>
            <Label htmlFor="defaultValue">Default Value</Label>
            <Input
              id="defaultValue"
              placeholder="Value to use if data is missing"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Mapping</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
