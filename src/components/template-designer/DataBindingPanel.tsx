"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getDataSchema } from '@/lib/template-data-schemas';
import type { DataField, TemplateType } from '@/types/template-designer';

interface DataBindingPanelProps {
  templateType: TemplateType;
}

export function DataBindingPanel({ templateType }: DataBindingPanelProps) {
  const schema = getDataSchema(templateType);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyFieldPath = (path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
    setCopiedField(path);
    toast({
      title: 'Copied',
      description: `{{${path}}} copied to clipboard`,
    });

    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Data Fields</h3>
        <p className="text-xs text-muted-foreground">
          Available fields for {templateType} templates
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        {schema.fields.map((field) => (
          <DataFieldItem
            key={field.name}
            field={field}
            path={field.name}
            onCopy={copyFieldPath}
            copiedField={copiedField}
          />
        ))}
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
          How to Use
        </h4>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>• Click any field to copy the binding syntax</p>
          <p>• Paste into text content or table columns</p>
          <p>• Example: {'{'}{'{'} invoice.total {'}'}{'}'}  </p>
          <p>• Use array fields with tables for repeating rows</p>
        </div>
      </div>
    </div>
  );
}

interface DataFieldItemProps {
  field: DataField;
  path: string;
  onCopy: (path: string) => void;
  copiedField: string | null;
  depth?: number;
}

function DataFieldItem({
  field,
  path,
  onCopy,
  copiedField,
  depth = 0,
}: DataFieldItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const hasChildren = field.children && field.children.length > 0;
  const isCopied = copiedField === path;

  return (
    <div style={{ marginLeft: `${depth * 12}px` }}>
      <Card
        className={`p-2 transition-colors ${
          hasChildren
            ? 'cursor-pointer hover:bg-accent'
            : 'cursor-default'
        }`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
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
                <span className="text-sm font-medium truncate">{field.label}</span>
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {field.type}
                </span>
              </div>
              {field.example !== undefined && (
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  e.g., {String(field.example)}
                </div>
              )}
            </div>
          </div>

          {!hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(path);
              }}
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </Card>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {field.children!.map((child) => (
            <DataFieldItem
              key={child.name}
              field={child}
              path={`${path}.${child.name}`}
              onCopy={onCopy}
              copiedField={copiedField}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
