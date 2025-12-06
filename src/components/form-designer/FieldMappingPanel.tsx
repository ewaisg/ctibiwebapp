'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
// Removed Dialog imports as we are using custom overlay
import {
  Check,
  X,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Link2,
  FileText,
} from 'lucide-react';
import type { SyncfusionFormField, TemplateFieldMapping } from '@/types';
import { DataFieldBrowser } from './DataFieldBrowser';
import { getSchemaForCollection } from '@/lib/data-source-schemas';

interface FieldMappingPanelProps {
  formFields: SyncfusionFormField[];
  fieldMappings: TemplateFieldMapping[];
  primaryCollection: string;
  onMappingsChange: (mappings: TemplateFieldMapping[]) => void;
  selectedFieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
}

export function FieldMappingPanel({
  formFields,
  fieldMappings,
  primaryCollection,
  onMappingsChange,
  selectedFieldId,
  onFieldSelect,
}: FieldMappingPanelProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [currentMapping, setCurrentMapping] = useState<Partial<TemplateFieldMapping>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Get existing mapping for a field
  const getMappingForField = (fieldName: string): TemplateFieldMapping | undefined => {
    return fieldMappings.find(m => m.fieldName === fieldName);
  };

  // Check if field is mapped
  const isFieldMapped = (fieldName: string): boolean => {
    return fieldMappings.some(m => m.fieldName === fieldName);
  };

  // Get mapped count
  const mappedCount = formFields.filter(f => isFieldMapped(f.name)).length;

  // Filter form fields by search
  const filteredFields = formFields.filter(field =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle opening mapping dialog
  const handleOpenMapping = (field: SyncfusionFormField) => {
    const existing = getMappingForField(field.name);

    if (existing) {
      // Edit existing mapping
      setCurrentMapping(existing);
    } else {
      // Create new mapping
      setCurrentMapping({
        fieldName: field.name,
        sourceCollection: primaryCollection,
        sourceField: '',
        isRequired: field.isRequired || false,
        fieldType: field.type === 'Textbox' ? 'text' : undefined,
      });
    }

    setEditingField(field.name);
    setShowBrowser(true);
  };

  // Handle field selection from browser
  const handleFieldSelect = (fieldPath: string, fieldLabel: string, fieldType: string) => {
    // Parse field path to extract collection and field
    // Format: 'fieldName' or 'nested.fieldName' or 'array[].fieldName'
    const parts = fieldPath.split('.');
    const sourceField = parts[parts.length - 1];

    setCurrentMapping(prev => ({
      ...prev,
      sourceField,
      dataPath: `${primaryCollection}.${fieldPath}`, // For display purposes
      uiLabel: fieldLabel,
      fieldType: mapDataTypeToFieldType(fieldType),
    }));
  };

  // Map data type to field type
  const mapDataTypeToFieldType = (dataType: string): TemplateFieldMapping['fieldType'] => {
    switch (dataType) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'string':
      default:
        return 'text';
    }
  };

  // Handle save mapping
  const handleSaveMapping = () => {
    if (!editingField || !currentMapping.sourceField) {
      return;
    }

    const newMapping: TemplateFieldMapping = {
      fieldName: editingField,
      sourceCollection: currentMapping.sourceCollection || primaryCollection,
      sourceField: currentMapping.sourceField,
      isRequired: currentMapping.isRequired || false,
      fieldType: currentMapping.fieldType,
      uiLabel: currentMapping.uiLabel,
      defaultValue: currentMapping.defaultValue,
      dataPath: currentMapping.dataPath,
    };

    const existingIndex = fieldMappings.findIndex(m => m.fieldName === editingField);

    let updatedMappings: TemplateFieldMapping[];
    if (existingIndex >= 0) {
      // Update existing
      updatedMappings = [...fieldMappings];
      updatedMappings[existingIndex] = newMapping;
    } else {
      // Add new
      updatedMappings = [...fieldMappings, newMapping];
    }

    onMappingsChange(updatedMappings);
    handleCloseDialog();
  };

  // Handle delete mapping
  const handleDeleteMapping = (fieldName: string) => {
    const updatedMappings = fieldMappings.filter(m => m.fieldName !== fieldName);
    onMappingsChange(updatedMappings);
  };

  // Handle close dialog
  const handleCloseDialog = () => {
    setShowBrowser(false);
    setEditingField(null);
    setCurrentMapping({});
  };

  // Auto-suggest mapping based on field name
  const handleAutoMap = () => {
    const schema = getSchemaForCollection(primaryCollection);
    if (!schema) return;

    const newMappings: TemplateFieldMapping[] = [...fieldMappings];

    formFields.forEach(field => {
      // Skip if already mapped
      if (isFieldMapped(field.name)) return;

      // Try to find matching field in schema
      const fieldNameLower = field.name.toLowerCase().replace(/[-_\s]/g, '');

      const matchingField = schema.fields.find(schemaField => {
        const schemaFieldLower = schemaField.path.toLowerCase().replace(/[-_\s]/g, '');
        return schemaFieldLower === fieldNameLower || schemaFieldLower.includes(fieldNameLower);
      });

      if (matchingField) {
        newMappings.push({
          fieldName: field.name,
          sourceCollection: primaryCollection,
          sourceField: matchingField.path,
          isRequired: field.isRequired || false,
          fieldType: mapDataTypeToFieldType(matchingField.type),
          uiLabel: matchingField.label,
          dataPath: `${primaryCollection}.${matchingField.path}`,
        });
      }
    });

    onMappingsChange(newMappings);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Field Mappings
              </CardTitle>
              <CardDescription>
                Map form fields to database fields
              </CardDescription>
            </div>
            <Badge variant="outline">
              {mappedCount} / {formFields.length} mapped
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search form fields..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleAutoMap}>
                <Plus className="h-4 w-4 mr-2" />
                Auto-map
              </Button>
            </div>

            {formFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No form fields found</p>
                <p className="text-sm">Add fields to your PDF using the Form Designer</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                <div className="space-y-2 pb-4">
                  {filteredFields.map(field => {
                    const mapping = getMappingForField(field.name);
                    const isMapped = !!mapping;
                    const isSelected = selectedFieldId === field.name;

                    return (
                      <div
                        key={field.name}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                            : isMapped 
                              ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                              : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => onFieldSelect?.(field.name)}
                      >
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              {isMapped ? (
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                              )}
                              <span className="font-mono text-sm font-medium truncate max-w-[180px]" title={field.name}>
                                {field.name}
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] px-1 h-5">
                                  {field.type}
                                </Badge>
                                {field.isRequired && (
                                  <Badge variant="destructive" className="text-[10px] px-1 h-5">
                                    Req
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {isMapped && mapping && (
                              <div className="text-xs text-muted-foreground ml-6 break-all">
                                <span className="font-mono">
                                  {mapping.dataPath || `${mapping.sourceCollection}.${mapping.sourceField}`}
                                </span>
                              </div>
                            )}

                            {!isMapped && (
                              <div className="text-xs text-yellow-700 ml-6">
                                Not mapped
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1 shrink-0 bg-background/50 backdrop-blur-sm rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMapping(field);
                              }}
                            >
                              {isMapped ? (
                                <Edit className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                            {isMapped && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMapping(field.name);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapping Dialog - Now Inline */}
      {showBrowser && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-background border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                 <div>
                    <h3 className="text-lg font-semibold">Map Field: {editingField}</h3>
                    <p className="text-sm text-muted-foreground">Select a database field to map to this form field</p>
                 </div>
                 <Button variant="ghost" size="icon" onClick={handleCloseDialog}>
                    <X className="h-4 w-4" />
                 </Button>
              </div>
              
              <div className="flex-1 overflow-hidden p-4">
                 <div className="grid grid-cols-2 gap-4 h-full">
                    {/* Left side: Current mapping configuration */}
                    <div className="space-y-4 overflow-y-auto pr-2">
                       <div>
                          <Label>Form Field Name</Label>
                          <Input value={editingField || ''} disabled className="font-mono" />
                       </div>

                       <div>
                          <Label>Data Source Collection</Label>
                          <Input value={currentMapping.sourceCollection || primaryCollection} disabled />
                       </div>

                       <div>
                          <Label>Mapped Field</Label>
                          <Input
                             value={currentMapping.dataPath || currentMapping.sourceField || 'Not selected'}
                             disabled
                             className="font-mono"
                          />
                       </div>

                       <div>
                          <Label>Field Type</Label>
                          <Select
                             value={currentMapping.fieldType || 'text'}
                             onValueChange={value =>
                                setCurrentMapping(prev => ({
                                   ...prev,
                                   fieldType: value as TemplateFieldMapping['fieldType'],
                                }))
                             }
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
                       </div>

                       <div>
                          <Label>Default Value (Optional)</Label>
                          <Input
                             value={currentMapping.defaultValue || ''}
                             onChange={e =>
                                setCurrentMapping(prev => ({ ...prev, defaultValue: e.target.value }))
                             }
                             placeholder="Default value if field is empty"
                          />
                       </div>
                    </div>

                    {/* Right side: Field browser */}
                    <div className="border rounded-md overflow-hidden flex flex-col">
                       <div className="bg-muted/30 p-2 border-b">
                          <Label>Available Fields</Label>
                       </div>
                       <div className="flex-1 overflow-hidden">
                          <DataFieldBrowser
                             selectedCollection={primaryCollection}
                             onFieldSelect={handleFieldSelect}
                             showSearch={true}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-4 border-t flex justify-end gap-2">
                 <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                 </Button>
                 <Button onClick={handleSaveMapping} disabled={!currentMapping.sourceField}>
                    <Check className="h-4 w-4 mr-2" />
                    Save Mapping
                 </Button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
