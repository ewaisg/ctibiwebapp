'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Department {
  id: string;
  departmentName: string;
}

interface Contract {
  id: string;
  contractName: string;
  contractNumber: number;
}

interface OverallProjectsSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  contracts: Contract[];
}

export function OverallProjectsSummaryDialog({
  open,
  onOpenChange,
  departments,
  contracts
}: OverallProjectsSummaryDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [contractId, setContractId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const handleGenerate = async () => {
    // Validation
    if (!departmentId) {
      toast({
        title: 'Department Required',
        description: 'Please select a department to generate the report.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      const requestBody = {
        departmentId,
        contractId: contractId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        includeInactiveProjects: includeInactive
      };

      console.log('[Dialog] Sending request:', requestBody);

      const response = await fetch('/api/overall-projects-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate report: ${response.statusText}`);
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header or use default
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      const filename = filenameMatch?.[1]?.replace(/['"]/g, '') || `Overall-Projects-Summary-${new Date().toISOString().split('T')[0]}.pdf`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Generated',
        description: 'Your Overall Projects Summary report has been generated successfully.',
      });

      // Close dialog
      onOpenChange(false);

      // Reset form
      setDepartmentId('');
      setContractId('');
      setFromDate('');
      setToDate('');
      setIncludeInactive(false);

    } catch (error: any) {
      console.error('Error generating overall projects summary:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate the report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Overall Projects Summary</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Info box */}
          <div className="rounded-md border p-4 text-sm text-muted-foreground bg-muted/50">
            <div className="font-medium text-foreground/90 mb-2">Report Package Contents</div>
            <p className="text-xs mb-3">Generates 3 professional PDF reports delivered as a ZIP package:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <span className="font-medium">1. PO Budget Summary</span>
                <div className="text-xs mt-0.5">Budget tracking and utilization across all projects grouped by contract</div>
              </li>
              <li>
                <span className="font-medium">2. MWBE Compliance Report</span>
                <div className="text-xs mt-0.5">Diversity goal achievement with certification breakdown and company details</div>
              </li>
              <li>
                <span className="font-medium">3. Sub-Consultant Breakdown</span>
                <div className="text-xs mt-0.5">Sub-consultant financial engagement, payment status, and commitments</div>
              </li>
            </ul>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            {/* Department (Required) */}
            <div className="space-y-2">
              <Label>
                Department <span className="text-destructive">*</span>
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contract (Optional) */}
            <div className="space-y-2">
              <Label>Contract (Optional)</Label>
              <div className="flex gap-2">
                <Select value={contractId} onValueChange={setContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All contracts" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts
                      .sort((a, b) => a.contractNumber - b.contractNumber)
                      .map(contract => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.contractNumber} - {contract.contractName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {contractId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContractId('')}
                    className="shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Filter report by a specific contract, or leave blank for all contracts
              </p>
            </div>

            {/* Date Range (Optional) */}
            <div className="space-y-2">
              <Label>Invoice Date Range (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="From date"
                  />
                  <p className="text-xs text-muted-foreground">From date</p>
                </div>
                <div className="space-y-1">
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="To date"
                  />
                  <p className="text-xs text-muted-foreground">To date</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Filter invoices for MWBE and sub-consultant calculations. Leave blank for all invoices.
              </p>
            </div>

            {/* Include Inactive Projects */}
            <div className="flex items-center justify-between border rounded-md p-4">
              <div>
                <div className="font-medium text-sm">Include inactive projects</div>
                <div className="text-xs text-muted-foreground">
                  Include projects marked as inactive in the budget summary
                </div>
              </div>
              <Switch
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !departmentId}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
