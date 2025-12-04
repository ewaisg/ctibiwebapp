"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronDown, Copy, Check, Database, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface FirestoreDataBrowserProps {
  onFieldSelect: (fieldPath: string) => void;
}

interface CollectionStructure {
  name: string;
  fields: FieldStructure[];
  sampleData?: any;
}

interface FieldStructure {
  name: string;
  type: string;
  value?: any;
  children?: FieldStructure[];
}

export function FirestoreDataBrowser({ onFieldSelect }: FirestoreDataBrowserProps) {
  const { secureRequest } = useAuth() as any;
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [structure, setStructure] = useState<CollectionStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load available collections
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      // List of common collections - could be fetched from API
      const commonCollections = [
        'invoices',
        'projects',
        'employees',
        'timesheets',
        'contracts',
        'departments',
      ];
      setCollections(commonCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadCollectionStructure = async (collectionName: string) => {
    setLoading(true);
    try {
      const response = await secureRequest(`/api/firestore/structure?collection=${collectionName}`);
      if (response.ok) {
        const data = await response.json();
        setStructure(data);
      }
    } catch (error) {
      console.error('Error loading collection structure:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collection structure',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionChange = (collectionName: string) => {
    setSelectedCollection(collectionName);
    loadCollectionStructure(collectionName);
  };

  const handleFieldClick = (fieldPath: string) => {
    onFieldSelect(fieldPath);
    setCopiedField(fieldPath);
    toast({
      title: 'Field Selected',
      description: `{{${fieldPath}}} inserted`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filterFields = (fields: FieldStructure[], term: string): FieldStructure[] => {
    if (!term) return fields;

    return fields.filter(field =>
      field.name.toLowerCase().includes(term.toLowerCase()) ||
      (field.children && filterFields(field.children, term).length > 0)
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Browse Firestore Data
        </h3>
        <p className="text-xs text-muted-foreground">
          Select a collection and click on fields to insert them
        </p>
      </div>

      {/* Helpful Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-900 mb-1">💡 Better Way!</p>
        <p className="text-xs text-blue-800">
          Select an element first, then use the Properties panel (right side) for a smarter,
          guided data mapping experience with relationship support!
        </p>
      </div>

      <Separator />

      {/* Collection Selector */}
      <div className="space-y-2">
        <Label className="text-xs">Select Collection</Label>
        <Select value={selectedCollection} onValueChange={handleCollectionChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a collection..." />
          </SelectTrigger>
          <SelectContent>
            {collections.map((collection) => (
              <SelectItem key={collection} value={collection}>
                {collection}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      {selectedCollection && (
        <div className="space-y-2">
          <Label className="text-xs">Search Fields</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search field names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      <Separator />

      {/* Field Structure */}
      {loading && (
        <div className="text-center text-muted-foreground py-8">
          Loading collection structure...
        </div>
      )}

      {!loading && !selectedCollection && (
        <div className="text-center text-muted-foreground py-8">
          <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a collection to browse fields</p>
        </div>
      )}

      {!loading && structure && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filterFields(structure.fields, searchTerm).map((field) => (
            <FieldItem
              key={field.name}
              field={field}
              path={field.name}
              onSelect={handleFieldClick}
              copiedField={copiedField}
            />
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
          Quick Tips
        </h4>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>• Click any field to insert it into your template</p>
          <p>• Fields are wrapped in {'{'}{'{'} {'}'}{'}'}  automatically</p>
          <p>• Use nested fields for related data</p>
          <p>• Arrays work great with table elements</p>
        </div>
      </div>
    </div>
  );
}

interface FieldItemProps {
  field: FieldStructure;
  path: string;
  onSelect: (path: string) => void;
  copiedField: string | null;
  depth?: number;
}

function FieldItem({ field, path, onSelect, copiedField, depth = 0 }: FieldItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const hasChildren = field.children && field.children.length > 0;
  const isCopied = copiedField === path;

  return (
    <div style={{ marginLeft: `${depth * 12}px` }}>
      <Card
        className={`p-2 transition-colors ${
          hasChildren
            ? 'cursor-pointer hover:bg-accent'
            : 'cursor-pointer hover:bg-primary/10'
        }`}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          } else {
            onSelect(path);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
              )
            ) : (
              <div className="w-3" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{field.name}</span>
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {field.type}
                </span>
              </div>
              {field.value !== undefined && (
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  Example: {String(field.value)}
                </div>
              )}
            </div>
          </div>

          {!hasChildren && (
            <div className="flex-shrink-0">
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </Card>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {field.children!.map((child) => (
            <FieldItem
              key={child.name}
              field={child}
              path={`${path}.${child.name}`}
              onSelect={onSelect}
              copiedField={copiedField}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
