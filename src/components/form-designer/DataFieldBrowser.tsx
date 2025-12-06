'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Folder,
  Link as LinkIcon,
} from 'lucide-react';
import {
  allSchemas,
  getSchemaForCollection,
  searchFields,
  type DataSourceField,
  type CollectionSchema,
} from '@/lib/data-source-schemas';

interface DataFieldBrowserProps {
  selectedCollection?: string;
  onFieldSelect: (fieldPath: string, fieldLabel: string, fieldType: string) => void;
  showSearch?: boolean;
}

export function DataFieldBrowser({
  selectedCollection,
  onFieldSelect,
  showSearch = true,
}: DataFieldBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  // Get schemas to display
  const schemasToDisplay = useMemo(() => {
    if (selectedCollection) {
      const schema = getSchemaForCollection(selectedCollection);
      return schema ? [schema] : [];
    }
    return Object.values(allSchemas);
  }, [selectedCollection]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchFields(searchQuery);
  }, [searchQuery]);

  // Toggle collection expansion
  const toggleCollection = (collection: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(collection)) {
        next.delete(collection);
      } else {
        next.add(collection);
      }
      return next;
    });
  };

  // Toggle field expansion (for nested fields)
  const toggleField = (fieldPath: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldPath)) {
        next.delete(fieldPath);
      } else {
        next.add(fieldPath);
      }
      return next;
    });
  };

  // Get icon for field type
  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'string':
        return <FileText className="h-3 w-3" />;
      case 'number':
        return <Hash className="h-3 w-3" />;
      case 'date':
        return <Calendar className="h-3 w-3" />;
      case 'boolean':
        return <ToggleLeft className="h-3 w-3" />;
      case 'array':
        return <List className="h-3 w-3" />;
      case 'object':
        return <Folder className="h-3 w-3" />;
      case 'reference':
        return <LinkIcon className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  // Get color for field type badge
  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-blue-100 text-blue-700';
      case 'number':
        return 'bg-green-100 text-green-700';
      case 'date':
        return 'bg-purple-100 text-purple-700';
      case 'boolean':
        return 'bg-yellow-100 text-yellow-700';
      case 'array':
        return 'bg-orange-100 text-orange-700';
      case 'object':
        return 'bg-gray-100 text-gray-700';
      case 'reference':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Render a field
  const renderField = (field: DataSourceField, collectionName: string, level: number = 0) => {
    const hasChildren = field.children && field.children.length > 0;
    const isExpanded = expandedFields.has(`${collectionName}.${field.path}`);
    const indent = level * 16;

    return (
      <div key={field.path} className="border-l border-gray-200">
        <div
          className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer group"
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleField(`${collectionName}.${field.path}`);
            } else if (field.type !== 'object' && field.type !== 'array') {
              onFieldSelect(field.path, field.label, field.type);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : (
            <div className="w-3" />
          )}

          {getFieldIcon(field.type)}

          <span className="text-sm font-mono flex-1">{field.path.split('.').pop()}</span>

          <Badge variant="outline" className={`text-xs ${getFieldTypeColor(field.type)}`}>
            {field.type}
          </Badge>

          {field.referenceCollection && (
            <Badge variant="outline" className="text-xs bg-pink-50 text-pink-700">
              → {field.referenceCollection}
            </Badge>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {field.children!.map(child => renderField(child, collectionName, level + 1))}
          </div>
        )}

        {field.description && isExpanded && (
          <div
            className="text-xs text-muted-foreground ml-6 mb-1"
            style={{ paddingLeft: `${indent}px` }}
          >
            {field.description}
          </div>
        )}
        {field.example && isExpanded && (
          <div
            className="text-xs text-muted-foreground ml-6 mb-1 font-mono"
            style={{ paddingLeft: `${indent}px` }}
          >
            Example: {field.example}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Database Fields
        </CardTitle>
        <CardDescription>
          {selectedCollection
            ? `Browse fields in ${allSchemas[selectedCollection]?.label}`
            : 'Browse all available fields'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {showSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        )}

        <ScrollArea className="h-[500px] pr-4">
          {searchQuery.trim() ? (
            // Search results
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No fields found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                searchResults.map(result => (
                  <div
                    key={`${result.collection}.${result.field.path}`}
                    className="p-2 hover:bg-accent rounded cursor-pointer"
                    onClick={() => {
                      if (result.field.type !== 'object' && result.field.type !== 'array') {
                        onFieldSelect(result.field.path, result.field.label, result.field.type);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {getFieldIcon(result.field.type)}
                      <span className="text-sm font-mono">{result.field.path}</span>
                      <Badge variant="outline" className={`text-xs ${getFieldTypeColor(result.field.type)}`}>
                        {result.field.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground ml-5">
                      in {result.collectionLabel}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Collection browser
            <div className="space-y-2">
              {schemasToDisplay.map(schema => {
                const isExpanded = expandedCollections.has(schema.collection);

                return (
                  <Collapsible
                    key={schema.collection}
                    open={isExpanded}
                    onOpenChange={() => toggleCollection(schema.collection)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start font-semibold"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        <Database className="h-4 w-4 mr-2" />
                        {schema.label}
                        <Badge variant="outline" className="ml-auto text-xs">
                          {schema.fields.length} fields
                        </Badge>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-1">
                      {schema.fields.map(field => renderField(field, schema.collection))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
