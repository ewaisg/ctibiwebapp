"use client";

import { CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface ImportStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  error?: string;
}

export interface ImportProgress {
  currentStep: number;
  steps: ImportStep[];
  overallProgress: number;
  summary?: {
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
}

interface ImportProgressIndicatorProps {
  progress: ImportProgress;
  isVisible: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  canCancel?: boolean;
}

export const createImportSteps = (): ImportStep[] => [
  {
    id: 'validate',
    label: 'Validate File',
    description: 'Checking file format and structure',
    status: 'pending'
  },
  {
    id: 'parse',
    label: 'Parse Data',
    description: 'Reading file contents',
    status: 'pending'
  },
  {
    id: 'validate-data',
    label: 'Validate Data',
    description: 'Checking data requirements',
    status: 'pending'
  },
  {
    id: 'save',
    label: 'Save Records',
    description: 'Processing records',
    status: 'pending'
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'Finalizing import',
    status: 'pending'
  }
];

export const updateStepStatus = (
  steps: ImportStep[],
  stepId: string,
  status: ImportStep['status'],
  options?: { description?: string; error?: string }
): ImportStep[] => {
  return steps.map(step => {
    if (step.id === stepId) {
      return {
        ...step,
        status,
        description: options?.description || step.description,
        error: options?.error
      };
    }
    return step;
  });
};

export const calculateOverallProgress = (steps: ImportStep[]): number => {
  const completed = steps.filter(s => s.status === 'completed').length;
  return (completed / steps.length) * 100;
};

export function ImportProgressIndicator({ progress, isVisible }: ImportProgressIndicatorProps) {
  if (!isVisible) return null;
  
  const { steps, overallProgress } = progress;
  const completedSteps = steps.filter(step => step.status === 'completed').length;

  const getStepIcon = (step: ImportStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (step.status === 'error') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (step.status === 'in-progress') {
      return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepTextColor = (step: ImportStep) => {
    if (step.status === 'completed') return 'text-green-600';
    if (step.status === 'error') return 'text-red-600';
    if (step.status === 'in-progress') return 'text-blue-600';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Import Progress</span>
          <span>{completedSteps} of {steps.length} steps completed</span>
        </div>
        <Progress value={overallProgress} className="w-full" />
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            {getStepIcon(step, index)}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${getStepTextColor(step)}`}>
                {step.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {step.description}
              </div>
              {step.error && (
                <div className="text-xs text-red-600 mt-1">
                  {step.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
