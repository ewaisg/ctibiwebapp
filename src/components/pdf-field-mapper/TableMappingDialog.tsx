'use client';

/**
 * Table Mapping Dialog
 * Dialog for configuring table/repeating sections
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { PdfFieldInfo, TableMapping, TableColumnMapping } from '@/types/pdf-field-mapper';

interface TableMappingDialogProps {
  fields: PdfFieldInfo[];
  dataSource: string;
  existingTable?: TableMapping;
  onSave: (table: TableMapping) => void;
  onClose: () => void;
}

// Common table data sources
const TABLE_DATA_SOURCES: Record<string, { path: string; label: string; sampleColumns: string[] }[]> = {
  invoices: [
    {
      path: 'invoiceItems',
      label: 'Invoice Line Items',
      sampleColumns: ['description', 'hours', 'rate', 'amount', 'employeeName', 'companyName'],
    },
    {
      path: 'reimbursableExpenses',
      label: 'Reimbursable Expenses',
      sampleColumns: ['description', 'date', 'amount', 'companyName'],
    },
  ],
  timesheets: [
    {
      path: 'entries',
      label: 'Timesheet Entries',
      sampleColumns: ['date', 'projectName', 'hours', 'description'],
    },
  ],
  projects: [
    {
      path: 'team',
      label: 'Project Team Members',
      sampleColumns: ['employeeName', 'role', 'rate'],
    },
  ],
};

export function TableMappingDialog({
  fields,
  dataSource,
  existingTable,
  onSave,
  onClose,
}: TableMappingDialogProps) {
  const [tableName, setTableName] = useState(existingTable?.name || '');
  const [dataPath, setDataPath] = useState(existingTable?.dataPath || '');
  const [startRow, setStartRow] = useState(existingTable?.startRow || 1);
  const [maxRows, setMaxRows] = useState(existingTable?.maxRows || 10);
  const [columns, setColumns] = useState<TableColumnMapping[]>(
    existingTable?.columns || [
      { pdfFieldPattern: '', dataPath: '' },
    ]
  );

  const availableTables = TABLE_DATA_SOURCES[dataSource] || [];

  // Detect field pattern (e.g., "Item_1", "Item_2" -> "Item_{row}")
  const detectFieldPattern = (fieldName: string): string => {
    // Check if field ends with a number
    const match = fieldName.match(/^(.+?)_?(\d+)$/);
    if (match) {
      return `${match[1]}_{row}`;
    }
    return fieldName;
  };

  const handleAddColumn = () => {
    setColumns([...columns, { pdfFieldPattern: '', dataPath: '' }]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, field: keyof TableColumnMapping, value: string) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleTableDataSourceChange = (path: string) => {
    setDataPath(path);
    const selectedTable = availableTables.find((t) => t.path === path);
    if (selectedTable) {
      setTableName(selectedTable.label);
      // Auto-populate columns based on sample
      const autoColumns = selectedTable.sampleColumns.map((col) => ({
        pdfFieldPattern: `${col}_{row}`,
        dataPath: col,
      }));
      setColumns(autoColumns);
    }
  };

  const handleSave = () => {
    if (!tableName.trim()) {
      alert('Please enter a table name');
      return;
    }

    if (!dataPath.trim()) {
      alert('Please select a data source');
      return;
    }

    if (columns.length === 0) {
      alert('Please add at least one column');
      return;
    }

    const table: TableMapping = {
      id: existingTable?.id || `table_${Date.now()}`,
      name: tableName.trim(),
      dataPath: dataPath.trim(),
      startRow,
      maxRows,
      columns: columns.filter((c) => c.pdfFieldPattern && c.dataPath),
    };

    onSave(table);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Table Mapping</DialogTitle>
          <DialogDescription>
            Map repeating PDF fields to array data (e.g., invoice line items)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Table Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tableName">Table Name</Label>
              <Input
                id="tableName"
                placeholder="Invoice Line Items"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dataPath">Data Source</Label>
              <Select value={dataPath} onValueChange={handleTableDataSourceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data array" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((t) => (
                    <SelectItem key={t.path} value={t.path}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="Or enter custom path (e.g., invoice.items)"
                value={dataPath}
                onChange={(e) => setDataPath(e.target.value)}
              />
            </div>
          </div>

          {/* Table Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startRow">Start Row</Label>
              <Input
                id="startRow"
                type="number"
                min="1"
                value={startRow}
                onChange={(e) => setStartRow(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground mt-1">First row index for data</p>
            </div>
            <div>
              <Label htmlFor="maxRows">Max Rows</Label>
              <Input
                id="maxRows"
                type="number"
                min="1"
                value={maxRows}
                onChange={(e) => setMaxRows(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum rows in table</p>
            </div>
          </div>

          {/* Column Mappings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Column Mappings</Label>
              <Button variant="outline" size="sm" onClick={handleAddColumn}>
                <Plus className="h-4 w-4 mr-1" />
                Add Column
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((column, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded">
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-xs">PDF Field Pattern</Label>
                      <Input
                        placeholder="e.g., Item_Description_{row} or Hours_{row}"
                        value={column.pdfFieldPattern}
                        onChange={(e) => handleColumnChange(index, 'pdfFieldPattern', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use {'{row}'} as placeholder for row number
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs">Data Field</Label>
                      <Input
                        placeholder="e.g., description, hours, amount"
                        value={column.dataPath}
                        onChange={(e) => handleColumnChange(index, 'dataPath', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Field name in array item
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveColumn(index)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Example */}
          {columns.length > 0 && (
            <div className="p-3 bg-gray-50 rounded border">
              <p className="text-sm font-medium mb-2">Example</p>
              <p className="text-xs text-muted-foreground">
                For a row with index 1, these PDF fields will be filled:
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
                {columns
                  .filter((c) => c.pdfFieldPattern)
                  .map((column, idx) => (
                    <li key={idx}>
                      <code>{column.pdfFieldPattern.replace('{row}', '1')}</code> ←{' '}
                      <code>
                        {dataPath}[0].{column.dataPath}
                      </code>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Table Mapping</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
