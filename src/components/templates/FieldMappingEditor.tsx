"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FieldMapping {
  fieldName: string;
  sourceCollection: string;
  sourceField: string;
  isRequired: boolean;
  relationshipPath?: string;
}

interface FieldMappingEditorProps {
  templateId: string;
  initialMappings: FieldMapping[];
  detectedFields: string[];
  onSave: (mappings: FieldMapping[]) => void;
}

// Available data sources
const DATA_SOURCES = {
  invoice: {
    label: 'Invoice',
    fields: [
      'invoiceNumber',
      'contractNumber',
      'poNumber',
      'pmisNumber',
      'fromDate',
      'toDate',
      'dueDate',
      'termOfWeek',
      'approvingSupervisor',
      'subtotal',
      'total',
      'notes',
    ],
  },
  project: {
    label: 'Project',
    fields: [
      'projectName',
      'projectManager',
      'poNumber',
      'pmisNumber',
      'remainingPoAmount',
      'remainingHours',
    ],
  },
  contract: {
    label: 'Contract',
    fields: [
      'contractNumber',
      'contractTitle',
      'effectiveDate',
      'expirationDate',
      'totalValue',
    ],
  },
  department: {
    label: 'Department',
    fields: [
      'departmentName',
      'departmentCode',
    ],
  },
  company: {
    label: 'Company',
    fields: [
      'companyName',
      'address',
      'phone',
      'email',
    ],
  },
  manual: {
    label: 'Manual Entry',
    fields: ['customValue'],
  },
};

export function FieldMappingEditor({
  templateId,
  initialMappings,
  detectedFields,
  onSave,
}: FieldMappingEditorProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings);
  const [isSaving, setIsSaving] = useState(false);

  // Get unmapped fields
  const unmappedFields = detectedFields.filter(
    field => !mappings.some(m => m.fieldName === field)
  );

  const handleAddMapping = (fieldName: string) => {
    setMappings(prev => [
      ...prev,
      {
        fieldName,
        sourceCollection: '',
        sourceField: '',
        isRequired: false,
      },
    ]);
  };

  const handleUpdateMapping = (index: number, updates: Partial<FieldMapping>) => {
    setMappings(prev => {
      const newMappings = [...prev];
      newMappings[index] = { ...newMappings[index], ...updates };
      return newMappings;
    });
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/templates/update-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          fieldMappings: mappings,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Field mappings saved',
          description: 'Your field mappings have been updated successfully',
        });
        onSave(mappings);
      } else {
        toast({
          title: 'Save failed',
          description: 'Failed to save field mappings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: 'Save failed',
        description: 'An error occurred while saving',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Unmapped Fields */}
      {unmappedFields.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-base">Unmapped Fields</CardTitle>
                <CardDescription>
                  These fields were detected in your PDF but haven't been mapped to data sources yet
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unmappedFields.map((field) => (
                <Button
                  key={field}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddMapping(field)}
                  className="font-mono text-xs"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  {field}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapped Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Mappings ({mappings.length})</CardTitle>
              <CardDescription>
                Map PDF form fields to your data sources
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Mappings'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No field mappings yet</p>
              <p className="text-sm mt-2">Add unmapped fields above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* PDF Field Name */}
                      <div className="space-y-2">
                        <Label>PDF Field</Label>
                        <div className="flex items-center h-10 px-3 border rounded-md bg-muted font-mono text-sm">
                          {mapping.fieldName}
                        </div>
                      </div>

                      {/* Source Collection */}
                      <div className="space-y-2">
                        <Label>Data Source</Label>
                        <Select
                          value={mapping.sourceCollection}
                          onValueChange={(value) =>
                            handleUpdateMapping(index, {
                              sourceCollection: value,
                              sourceField: '', // Reset source field when collection changes
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(DATA_SOURCES).map(([key, source]) => (
                              <SelectItem key={key} value={key}>
                                {source.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Source Field */}
                      <div className="space-y-2">
                        <Label>Field</Label>
                        <Select
                          value={mapping.sourceField}
                          onValueChange={(value) =>
                            handleUpdateMapping(index, { sourceField: value })
                          }
                          disabled={!mapping.sourceCollection}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mapping.sourceCollection &&
                              DATA_SOURCES[mapping.sourceCollection as keyof typeof DATA_SOURCES]?.fields.map((field) => (
                                <SelectItem key={field} value={field}>
                                  {field}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Required Toggle & Delete */}
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="flex items-center gap-2 h-10">
                          <div className="flex items-center gap-2 flex-1">
                            <Switch
                              checked={mapping.isRequired}
                              onCheckedChange={(checked) =>
                                handleUpdateMapping(index, { isRequired: checked })
                              }
                            />
                            <span className="text-sm">Required</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMapping(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Relationship Path (for cross-collection lookups) */}
                    {mapping.sourceCollection && mapping.sourceCollection !== 'invoice' && mapping.sourceCollection !== 'manual' && (
                      <div className="mt-4 pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">
                          Relationship Path (auto-resolved via invoice)
                        </Label>
                        <div className="mt-1 text-xs font-mono text-muted-foreground">
                          invoice → {mapping.sourceCollection} → {mapping.sourceField || '...'}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Summary */}
      {mappings.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mapping Summary</span>
              <div className="flex gap-4">
                <Badge variant="outline">
                  {mappings.length} / {detectedFields.length} fields mapped
                </Badge>
                <Badge variant="outline">
                  {mappings.filter(m => m.isRequired).length} required
                </Badge>
                <Badge variant="outline">
                  {mappings.filter(m => m.sourceCollection && m.sourceField).length} complete
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
