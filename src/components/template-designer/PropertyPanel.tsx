"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, X } from 'lucide-react';
import type { TemplateElement, TextElement, ImageElement, RectangleElement, LineElement, TableElement } from '@/types/template-designer';
import { ImageUploader } from './ImageUploader';
import { DataMappingPanel } from './DataMappingPanel';

interface PropertyPanelProps {
  selectedElement: TemplateElement | null;
  onUpdateElement: (elementId: string, updates: Partial<TemplateElement>) => void;
  onDeleteElement: (elementId: string) => void;
}

export function PropertyPanel({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
}: PropertyPanelProps) {
  if (!selectedElement) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No element selected</p>
          <p className="text-xs mt-1">Select an element to edit its properties</p>
        </div>
      </div>
    );
  }

  const updateField = (field: string, value: any) => {
    onUpdateElement(selectedElement.id, { [field]: value });
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold capitalize">{selectedElement.type} Properties</h3>
          <p className="text-xs text-muted-foreground">ID: {selectedElement.id.slice(0, 8)}</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteElement(selectedElement.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Common Properties */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Position & Size</h4>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">X Position</Label>
            <Input
              type="number"
              value={selectedElement.x}
              onChange={(e) => updateField('x', parseFloat(e.target.value))}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Y Position</Label>
            <Input
              type="number"
              value={selectedElement.y}
              onChange={(e) => updateField('y', parseFloat(e.target.value))}
              className="h-8"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={selectedElement.width}
              onChange={(e) => updateField('width', parseFloat(e.target.value))}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={selectedElement.height}
              onChange={(e) => updateField('height', parseFloat(e.target.value))}
              className="h-8"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Type-specific Properties */}
      {selectedElement.type === 'text' && (
        <TextProperties
          element={selectedElement as TextElement}
          updateField={updateField}
        />
      )}

      {selectedElement.type === 'image' && (
        <ImageProperties
          element={selectedElement as ImageElement}
          updateField={updateField}
        />
      )}

      {selectedElement.type === 'rectangle' && (
        <RectangleProperties
          element={selectedElement as RectangleElement}
          updateField={updateField}
        />
      )}

      {selectedElement.type === 'line' && (
        <LineProperties
          element={selectedElement as LineElement}
          updateField={updateField}
        />
      )}

      {selectedElement.type === 'table' && (
        <TableProperties
          element={selectedElement as TableElement}
          updateField={updateField}
        />
      )}
    </div>
  );
}

// Text-specific properties
function TextProperties({
  element,
  updateField,
}: {
  element: TextElement;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Text Properties</h4>

      {/* Data Mapping Panel */}
      <DataMappingPanel
        currentBinding={element.content}
        elementType="text"
        onBindingChange={(binding) => updateField('content', binding)}
      />

      <Separator />

      <div>
        <Label className="text-xs">Advanced: Manual Content</Label>
        <Textarea
          value={element.content}
          onChange={(e) => updateField('content', e.target.value)}
          placeholder="Enter text or {{dataBinding}}"
          className="min-h-[60px] text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          For advanced users: Edit binding syntax directly
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={element.fontSize}
            onChange={(e) => updateField('fontSize', parseFloat(e.target.value))}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={element.color}
            onChange={(e) => updateField('color', e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Font Family</Label>
        <Select value={element.fontFamily} onValueChange={(v) => updateField('fontFamily', v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Weight</Label>
          <Select value={element.fontWeight} onValueChange={(v) => updateField('fontWeight', v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Font Style</Label>
          <Select value={element.fontStyle} onValueChange={(v) => updateField('fontStyle', v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="italic">Italic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Text Align</Label>
        <Select value={element.textAlign} onValueChange={(v) => updateField('textAlign', v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Image-specific properties
function ImageProperties({
  element,
  updateField,
}: {
  element: ImageElement;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Image Properties</h4>

      {/* Data Mapping Panel for dynamic image URLs */}
      <DataMappingPanel
        currentBinding={element.imageUrl || ''}
        elementType="image"
        onBindingChange={(binding) => updateField('imageUrl', binding)}
      />

      <Separator />

      <div>
        <Label className="text-xs">Or Upload Image</Label>
        <ImageUploader
          currentImageUrl={element.imageUrl}
          onImageUploaded={(url) => updateField('imageUrl', url)}
          onImageRemoved={() => updateField('imageUrl', '')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Upload a static image file
        </p>
      </div>

      <div>
        <Label className="text-xs">Alt Text</Label>
        <Input
          value={element.altText || ''}
          onChange={(e) => updateField('altText', e.target.value)}
          placeholder="Image description"
          className="h-8"
        />
      </div>
    </div>
  );
}

// Rectangle-specific properties
function RectangleProperties({
  element,
  updateField,
}: {
  element: RectangleElement;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Rectangle Properties</h4>

      <div>
        <Label className="text-xs">Fill Color</Label>
        <Input
          type="color"
          value={element.fillColor}
          onChange={(e) => updateField('fillColor', e.target.value)}
          className="h-8"
        />
      </div>

      <div>
        <Label className="text-xs">Border Color</Label>
        <Input
          type="color"
          value={element.borderColor}
          onChange={(e) => updateField('borderColor', e.target.value)}
          className="h-8"
        />
      </div>

      <div>
        <Label className="text-xs">Border Width</Label>
        <Input
          type="number"
          value={element.borderWidth}
          onChange={(e) => updateField('borderWidth', parseFloat(e.target.value))}
          className="h-8"
        />
      </div>
    </div>
  );
}

// Line-specific properties
function LineProperties({
  element,
  updateField,
}: {
  element: LineElement;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Line Properties</h4>

      <div>
        <Label className="text-xs">Color</Label>
        <Input
          type="color"
          value={element.color}
          onChange={(e) => updateField('color', e.target.value)}
          className="h-8"
        />
      </div>

      <div>
        <Label className="text-xs">Line Width</Label>
        <Input
          type="number"
          value={element.lineWidth}
          onChange={(e) => updateField('lineWidth', parseFloat(e.target.value))}
          className="h-8"
        />
      </div>
    </div>
  );
}

// Table-specific properties
function TableProperties({
  element,
  updateField,
}: {
  element: TableElement;
  updateField: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Table Properties</h4>

      {/* Data Mapping Panel for table data source */}
      <DataMappingPanel
        currentBinding={element.dataSource || ''}
        elementType="table"
        onBindingChange={(binding) => updateField('dataSource', binding)}
      />

      <Separator />

      {element.dataSource && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
          <strong>Data Source:</strong> {element.dataSource}
          <br />
          <span className="text-xs text-muted-foreground">
            This table will create one row for each item in this array
          </span>
        </div>
      )}

      <div>
        <Label className="text-xs mb-2 block">Columns</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Define what data to show in each column. Use item.fieldName to reference fields from your data source.
        </p>
        {element.columns.map((col, index) => (
          <div key={index} className="mb-2 p-3 border rounded bg-background">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Column {index + 1}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  const newColumns = element.columns.filter((_, i) => i !== index);
                  updateField('columns', newColumns);
                }}
                title="Remove column"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={col.header}
              onChange={(e) => {
                const newColumns = [...element.columns];
                newColumns[index] = { ...col, header: e.target.value };
                updateField('columns', newColumns);
              }}
              placeholder="Column Header (e.g., Description)"
              className="h-8 mb-2 text-sm"
            />
            <Input
              value={col.dataKey}
              onChange={(e) => {
                const newColumns = [...element.columns];
                newColumns[index] = { ...col, dataKey: e.target.value };
                updateField('columns', newColumns);
              }}
              placeholder="Field (e.g., item.description)"
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use <code className="bg-muted px-1 rounded">item.fieldName</code> to access fields
            </p>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const newColumns = [
              ...element.columns,
              { header: 'New Column', dataKey: 'item.field', width: 100 },
            ];
            updateField('columns', newColumns);
          }}
          className="w-full"
        >
          + Add Column
        </Button>
      </div>

      <Separator />

      <div>
        <Label className="text-xs">Advanced: Manual Data Source</Label>
        <Input
          value={element.dataSource || ''}
          onChange={(e) => updateField('dataSource', e.target.value)}
          placeholder="{{arrayFieldName}}"
          className="h-8"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Manually edit the array binding
        </p>
      </div>
    </div>
  );
}
