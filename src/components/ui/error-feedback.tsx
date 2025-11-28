"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

export interface ImportError {
  id: string;
  type: 'validation' | 'processing' | 'duplicate' | 'format';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
  rowIndex?: number;
  columnName?: string;
  suggestedFix?: string;
}

interface ErrorFeedbackProps {
  errors: ImportError[];
  onDismissError?: (errorId: string) => void;
  onRetry?: () => void;
  onDownloadTemplate?: () => void;
  maxDisplayed?: number;
}

export const ErrorCreators = {
  missingHeaders: (required: string[], missing: string[]) => ({
    id: 'missing-headers',
    type: 'validation' as const,
    severity: 'error' as const,
    message: `Missing required headers: ${missing.join(', ')}`,
    details: `Required headers: ${required.join(', ')}`,
    suggestedFix: 'Add the missing headers to your file'
  }),
  dataValidation: (details: Array<{ row: number; message: string }>) => ({
    id: 'data-validation',
    type: 'validation' as const,
    severity: 'error' as const,
    message: `Found ${details.length} validation errors`,
    details: details.map(d => `Row ${d.row}: ${d.message}`).join('\n'),
    suggestedFix: 'Fix the validation errors in your data'
  }),
  processing: (message: string) => ({
    id: 'processing-error',
    type: 'processing' as const,
    severity: 'error' as const,
    message: 'Processing failed',
    details: message,
    suggestedFix: 'Check your file format and try again'
  })
};

export function ErrorFeedback({ 
  errors, 
  onDismissError,
  onRetry,
  onDownloadTemplate,
  maxDisplayed = 10 
}: ErrorFeedbackProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  if (!errors.length) return null;

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const displayedErrors = errors.slice(0, maxDisplayed);
  const hasMore = errors.length > maxDisplayed;

  const toggleErrorExpansion = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const getErrorIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? 
      <AlertTriangle className="h-4 w-4 text-red-500" /> : 
      <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getErrorBgColor = (severity: 'error' | 'warning') => {
    return severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Import Issues ({errorCount} errors, {warningCount} warnings)
        </h4>
        <div className="flex items-center gap-2">
          {onDownloadTemplate && (
            <Button size="sm" variant="outline" onClick={onDownloadTemplate}>Download Template</Button>
          )}
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
          )}
          {hasMore && (
            <p className="text-xs text-muted-foreground">
              Showing {maxDisplayed} of {errors.length} issues
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {displayedErrors.map((error) => (
          <div
            key={error.id}
            className={`border rounded-lg p-3 ${getErrorBgColor(error.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1">
                {getErrorIcon(error.severity)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {error.message}
                    {error.rowIndex && (
                      <span className="text-xs text-gray-500 ml-1">
                        (Row {error.rowIndex + 1})
                      </span>
                    )}
                  </div>
                  {(error.details || error.suggestedFix) && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => toggleErrorExpansion(error.id)}
                        >
                          {expandedErrors.has(error.id) ? 'Hide details' : 'Show details'}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 mt-1">
                        {error.details && (
                          <p className="text-xs text-gray-600">{error.details}</p>
                        )}
                        {error.suggestedFix && (
                          <p className="text-xs text-blue-600">
                            <strong>Suggested fix:</strong> {error.suggestedFix}
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
              {onDismissError && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => onDismissError(error.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
