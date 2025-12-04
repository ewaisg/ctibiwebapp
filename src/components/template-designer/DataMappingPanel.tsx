"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Database, Link2, Sparkles, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface DataMappingPanelProps {
  currentBinding?: string;
  elementType: 'text' | 'image' | 'table';
  onBindingChange: (binding: string) => void;
}

interface FieldStructure {
  name: string;
  type: string;
  value?: any;
  children?: FieldStructure[];
}

interface CollectionStructure {
  name: string;
  fields: FieldStructure[];
  sampleData?: any;
}

type MappingMode = 'static' | 'direct' | 'relationship';

export function DataMappingPanel({ currentBinding, elementType, onBindingChange }: DataMappingPanelProps) {
  const { secureRequest } = useAuth() as any;
  const [mode, setMode] = useState<MappingMode>('direct');
  const [staticValue, setStaticValue] = useState('');

  // Direct mapping
  const [sourceCollection, setSourceCollection] = useState('');
  const [sourceField, setSourceField] = useState('');

  // Relationship mapping
  const [fromCollection, setFromCollection] = useState('');
  const [usingField, setUsingField] = useState('');
  const [toCollection, setToCollection] = useState('');
  const [showField, setShowField] = useState('');

  const [collections, setCollections] = useState<string[]>([]);
  const [collectionStructure, setCollectionStructure] = useState<CollectionStructure | null>(null);
  const [toCollectionStructure, setToCollectionStructure] = useState<CollectionStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

  // Available collections
  const availableCollections = [
    'invoices',
    'projects',
    'employees',
    'timesheets',
    'contracts',
    'departments',
  ];

  useEffect(() => {
    setCollections(availableCollections);

    // Parse current binding if exists
    if (currentBinding) {
      parseExistingBinding(currentBinding);
    }
  }, [currentBinding]);

  // Parse existing binding to populate fields
  const parseExistingBinding = (binding: string) => {
    if (!binding.includes('{{')) {
      setMode('static');
      setStaticValue(binding);
    } else if (binding.includes('lookup')) {
      setMode('relationship');
      // TODO: Parse relationship binding
    } else {
      setMode('direct');
      const field = binding.replace(/[{}]/g, '');
      setSourceField(field);
    }
  };

  // Load collection structure
  const loadCollectionStructure = async (collectionName: string, isToCollection = false) => {
    setLoading(true);
    try {
      const response = await secureRequest(`/api/firestore/structure?collection=${collectionName}`);
      if (response.ok) {
        const data = await response.json();
        if (isToCollection) {
          setToCollectionStructure(data);
        } else {
          setCollectionStructure(data);
        }
      }
    } catch (error) {
      console.error('Error loading collection structure:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle source collection change
  const handleSourceCollectionChange = (collection: string) => {
    setSourceCollection(collection);
    setSourceField('');
    loadCollectionStructure(collection);
  };

  // Handle from collection change (relationship)
  const handleFromCollectionChange = (collection: string) => {
    setFromCollection(collection);
    setUsingField('');
    loadCollectionStructure(collection);
  };

  // Handle to collection change (relationship)
  const handleToCollectionChange = (collection: string) => {
    setToCollection(collection);
    setShowField('');
    loadCollectionStructure(collection, true);
  };

  // Generate binding based on mode
  const generateBinding = () => {
    let binding = '';

    switch (mode) {
      case 'static':
        binding = staticValue;
        break;

      case 'direct':
        if (sourceField) {
          binding = `{{${sourceField}}}`;
          const preview = collectionStructure?.fields.find(f => f.name === sourceField)?.value;
          setPreview(preview ? String(preview) : '');
        }
        break;

      case 'relationship':
        if (usingField && toCollection && showField) {
          binding = `{{lookup ${toCollection} ${usingField} ${showField}}}`;
          // Preview would require actual data fetch
          setPreview('(Related data will be shown here)');
        }
        break;
    }

    if (binding) {
      onBindingChange(binding);
      toast({
        title: 'Data Mapping Updated',
        description: 'Field binding has been updated successfully',
      });
    }
  };

  // Auto-generate when fields change
  useEffect(() => {
    if (mode === 'direct' && sourceField) {
      generateBinding();
    }
  }, [sourceField, mode]);

  useEffect(() => {
    if (mode === 'relationship' && usingField && toCollection && showField) {
      generateBinding();
    }
  }, [usingField, toCollection, showField, mode]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Database className="h-4 w-4" />
          {elementType === 'text' && 'What should this text show?'}
          {elementType === 'image' && 'Where is the image?'}
          {elementType === 'table' && 'What list should this show?'}
        </h4>
        <p className="text-xs text-muted-foreground">
          Choose how to populate this {elementType} element
        </p>
      </div>

      <Separator />

      {/* Mode Selection */}
      <RadioGroup value={mode} onValueChange={(v) => setMode(v as MappingMode)}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="static" id="static" />
            <Label htmlFor="static" className="text-sm cursor-pointer">
              {elementType === 'text' ? 'Type your own text' : 'Enter URL manually'}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="direct" id="direct" />
            <Label htmlFor="direct" className="text-sm cursor-pointer">
              Pick from my data
            </Label>
          </div>

          {elementType === 'text' && (
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="relationship" id="relationship" />
              <Label htmlFor="relationship" className="text-sm cursor-pointer flex items-center gap-1">
                Show related data
                <Link2 className="h-3 w-3" />
              </Label>
            </div>
          )}
        </div>
      </RadioGroup>

      <Separator />

      {/* Static Mode */}
      {mode === 'static' && (
        <div className="space-y-3">
          <Label className="text-xs">
            {elementType === 'text' ? 'Text Content' : 'Image URL'}
          </Label>
          {elementType === 'text' ? (
            <Input
              value={staticValue}
              onChange={(e) => setStaticValue(e.target.value)}
              placeholder="Enter text here..."
              className="text-sm"
            />
          ) : (
            <Input
              value={staticValue}
              onChange={(e) => setStaticValue(e.target.value)}
              placeholder="https://example.com/image.png"
              className="text-sm"
            />
          )}
          <Button size="sm" onClick={generateBinding} className="w-full">
            Apply
          </Button>
        </div>
      )}

      {/* Direct Mapping Mode */}
      {mode === 'direct' && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Where is this data?
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Collection</Label>
            <Select value={sourceCollection} onValueChange={handleSourceCollectionChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select collection..." />
              </SelectTrigger>
              <SelectContent>
                {collections.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceCollection && collectionStructure && (
            <div className="space-y-2">
              <Label className="text-xs">
                {elementType === 'table' ? 'Array/List Field' : 'Field'}
              </Label>
              <Select value={sourceField} onValueChange={setSourceField}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={elementType === 'table' ? 'Select array field...' : 'Select field...'} />
                </SelectTrigger>
                <SelectContent>
                  {collectionStructure.fields
                    .filter((field) => {
                      // For tables, only show array fields
                      if (elementType === 'table') {
                        return field.type.includes('array');
                      }
                      // For text, show all fields (arrays and non-arrays)
                      if (elementType === 'text') {
                        return true;
                      }
                      // For images, show only non-array fields (URLs, strings)
                      return !field.type.includes('array');
                    })
                    .map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        <div className="flex items-center justify-between w-full">
                          <span>{field.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {field.type}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {elementType === 'table' && (
                <p className="text-xs text-muted-foreground">
                  Tables need an array/list field for dynamic rows
                </p>
              )}
            </div>
          )}

          {sourceField && preview && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="text-sm font-medium mt-1 p-2 bg-muted rounded">
                {preview}
              </div>
            </div>
          )}

          {sourceField && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Binding</Label>
              <code className="text-xs bg-muted p-2 rounded block mt-1">
                {`{{${sourceField}}}`}
              </code>
            </div>
          )}
        </Card>
      )}

      {/* Relationship Mapping Mode */}
      {mode === 'relationship' && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" />
            Connect related data
          </div>

          <div className="space-y-2">
            <Label className="text-xs">From Collection</Label>
            <Select value={fromCollection} onValueChange={handleFromCollectionChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select collection..." />
              </SelectTrigger>
              <SelectContent>
                {collections.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fromCollection && collectionStructure && (
            <div className="space-y-2">
              <Label className="text-xs">Using Field (ID Reference)</Label>
              <Select value={usingField} onValueChange={setUsingField}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select ID field..." />
                </SelectTrigger>
                <SelectContent>
                  {collectionStructure.fields
                    .filter(f => f.name.toLowerCase().includes('id'))
                    .map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {usingField && (
            <div className="space-y-2">
              <Label className="text-xs">Get From Collection</Label>
              <Select value={toCollection} onValueChange={handleToCollectionChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select related collection..." />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {toCollection && toCollectionStructure && (
            <div className="space-y-2">
              <Label className="text-xs">Show Field</Label>
              <Select value={showField} onValueChange={setShowField}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select field to display..." />
                </SelectTrigger>
                <SelectContent>
                  {toCollectionStructure.fields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{field.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {field.type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {usingField && toCollection && showField && (
            <>
              <div className="pt-2 border-t">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div className="text-sm font-medium mt-1 p-2 bg-muted rounded">
                  {preview}
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="text-xs text-muted-foreground">Binding</Label>
                <code className="text-xs bg-muted p-2 rounded block mt-1 break-all">
                  {`{{lookup ${toCollection} ${usingField} ${showField}}}`}
                </code>
              </div>
            </>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
            <strong>How this works:</strong> This will look up the {showField} from the {toCollection} collection
            using the {usingField} as the reference.
          </div>
        </Card>
      )}
    </div>
  );
}
