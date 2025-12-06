"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings, Loader2 } from "lucide-react";
import { extractId } from "@/lib/document-reference-utils";
import type { PdfTemplate, Contract, Department, Project, TemplateAssignment } from "@/types";
import type { VisualTemplate } from "@/types/template-designer";

interface TemplateAssignmentDialogProps {
  children: React.ReactNode;
  templates: PdfTemplate[];
  visualTemplates?: VisualTemplate[];
  onAssignmentCreated: () => void;
  editingAssignment?: TemplateAssignment | null;
  onClose?: () => void;
}

export function TemplateAssignmentDialog({
  children,
  templates,
  visualTemplates = [],
  onAssignmentCreated,
  editingAssignment = null,
  onClose
}: TemplateAssignmentDialogProps) {
  const { user, secureRequest } = useAuth() as any;
  const [open, setOpen] = useState(false);

  // Auto-open dialog when editing assignment is set
  useEffect(() => {
    if (editingAssignment) {
      setOpen(true);
    }
  }, [editingAssignment]);

  // Handle dialog close
  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      onClose?.();
    }
  };
  const [assignmentType, setAssignmentType] = useState<string>("");
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templateType, setTemplateType] = useState<string>("");
  const [templateSource, setTemplateSource] = useState<"pdf" | "visual">("pdf");
  const [assignmentScope, setAssignmentScope] = useState<"all" | "specific">("specific");
  const [isProcessing, setIsProcessing] = useState(false);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (open) {
      loadAssignmentOptions();
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editingAssignment && open) {
      setAssignmentType(editingAssignment.assignmentType);
      setAssignmentId(extractId(editingAssignment.assignmentId) || '');

      // Determine if this is a PDF or Visual template
      const templateIdStr = typeof editingAssignment.templateId === 'string'
        ? editingAssignment.templateId
        : extractId(editingAssignment.templateId) || '';

      const isVisual = templateIdStr.includes('visual_templates/') ||
                       (editingAssignment as any).templateSource === 'visual';

      setTemplateSource(isVisual ? 'visual' : 'pdf');
      setTemplateId(templateIdStr.replace('pdfTemplates/', '').replace('visual_templates/', ''));
      setTemplateType(editingAssignment.templateType);

      // Set scope based on assignmentId
      if (editingAssignment.assignmentId === 'all' || (editingAssignment.assignmentId === 'global' && editingAssignment.assignmentType !== 'Global')) {
        setAssignmentScope('all');
      } else {
        setAssignmentScope('specific');
      }
    } else if (open) {
      // Reset form for new assignment
      setAssignmentType("");
      setAssignmentId("");
      setTemplateId("");
      setTemplateType("");
      setTemplateSource("pdf");
      setAssignmentScope("specific");
    }
  }, [editingAssignment, open]);

  const loadAssignmentOptions = async () => {
    try {
      const [contractsRes, departmentsRes, projectsRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/departments'),
        fetch('/api/projects')
      ]);
      
      if (contractsRes.ok) {
        const contractsData = await contractsRes.json();
        setContracts(contractsData);
      }
      
      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(departmentsData);
      }
      
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error loading assignment options:', error);
    }
  };

  const handleSubmit = async () => {
    if (!assignmentType || !templateId || !templateType || !user) {
      alert('Please fill in all required fields');
      return;
    }

    if (assignmentType !== 'Global' && assignmentScope === 'specific' && !assignmentId) {
      alert('Please select an assignment target');
      return;
    }

    setIsProcessing(true);

    try {
      // Find template from appropriate source
      const template = templateSource === 'visual'
        ? visualTemplates.find(t => t.id === templateId)
        : templates.find(t => t.id === templateId);

      let assignmentName = 'Global Default';
      let finalAssignmentId = assignmentId;

      if (assignmentType === 'Global') {
        finalAssignmentId = 'global';
      } else if (assignmentScope === 'all') {
        finalAssignmentId = 'all';
        assignmentName = `All ${assignmentType}s`;
      } else {
        if (assignmentType === 'Contract') {
          const contract = contracts.find(c => c.id === assignmentId);
          assignmentName = contract?.contractName || 'Unknown Contract';
        } else if (assignmentType === 'Department') {
          const department = departments.find(d => d.id === assignmentId);
          assignmentName = department?.departmentName || 'Unknown Department';
        } else if (assignmentType === 'Project') {
          const project = projects.find(p => p.id === assignmentId);
          assignmentName = project?.projectName || 'Unknown Project';
        }
      }

      const assignmentData = {
        assignmentType,
        assignmentId: finalAssignmentId,
        assignmentName,
        templateId,
        templateName: (template as any)?.templateName || (template as any)?.name || 'Unknown Template',
        templateType,
        templateSource,
        isActive: true,
        ...(editingAssignment
          ? { updatedBy: user.uid, updatedByName: user.displayName }
          : { createdBy: user.uid, createdByName: user.displayName }
        )
      };

      const url = editingAssignment 
        ? `/api/template-assignments/${editingAssignment.id}`
        : '/api/template-assignments';
      
      const method = editingAssignment ? 'PUT' : 'POST';

      const response = await secureRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      });

      if (response.ok) {
        handleDialogClose(false);
        setAssignmentType("");
        setAssignmentId("");
        setTemplateId("");
        setTemplateType("");
        onAssignmentCreated();
      } else {
        const error = await response.json();
        alert(`${editingAssignment ? 'Update' : 'Assignment'} failed: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${editingAssignment ? 'updating' : 'creating'} assignment:`, error);
      alert(`${editingAssignment ? 'Update' : 'Assignment'} failed`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAssignmentOptions = () => {
    switch (assignmentType) {
      case 'Contract':
        return contracts.map(c => ({ value: c.id, label: c.contractName }));
      case 'Department':
        return departments.map(d => ({ value: d.id, label: d.departmentName }));
      case 'Project':
        return projects.map(p => ({ value: p.id, label: p.projectName }));
      default:
        return [];
    }
  };

  // Helper to normalize template types for comparison
  const normalizeType = (type: string): string => {
    const map: Record<string, string> = {
      'Invoice': 'invoice',
      'CoverPage': 'cover-page',
      'Report': 'report',
      'Custom': 'custom',
      'invoice': 'invoice',
      'cover-page': 'cover-page',
      'report': 'report',
      'custom': 'custom'
    };
    return map[type] || type.toLowerCase();
  };

  // Get available templates based on source and type
  const availableTemplates = templateSource === 'visual'
    ? visualTemplates.filter(t => {
        if (!templateType) return true;
        return normalizeType(t.type) === normalizeType(templateType);
      })
    : templates.filter(t => {
        if (!templateType) return true;
        return t.templateType === templateType;
      });

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      {!editingAssignment && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {editingAssignment ? 'Edit Assignment' : 'Assign Template'}
          </DialogTitle>
          <DialogDescription>
            {editingAssignment 
              ? 'Update the template assignment settings.'
              : 'Assign a PDF template to contracts, departments, projects, or set as global default.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Template Source *</Label>
            <Select value={templateSource} onValueChange={(value: "pdf" | "visual") => {
              setTemplateSource(value);
              setTemplateId(""); // Reset template selection when source changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select template source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Templates</SelectItem>
                <SelectItem value="visual">Visual Templates (Designer)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template Type *</Label>
            <Select value={templateType} onValueChange={setTemplateType}>
              <SelectTrigger>
                <SelectValue placeholder="Select template type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Invoice">Invoice</SelectItem>
                <SelectItem value="CoverPage">Cover Page</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {(template as any).templateName || (template as any).name || 'Unnamed Template'}
                  </SelectItem>
                ))}
                {availableTemplates.length === 0 && (
                  <div className="text-sm text-muted-foreground p-2">
                    No templates available for this type
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignment Type *</Label>
            <Select value={assignmentType} onValueChange={setAssignmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Global">Global Default</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Department">Department</SelectItem>
                <SelectItem value="Project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType && assignmentType !== 'Global' && (
            <div className="space-y-2">
              <Label>Assignment Scope *</Label>
              <RadioGroup 
                value={assignmentScope} 
                onValueChange={(v) => setAssignmentScope(v as "all" | "specific")} 
                className="flex gap-4 pt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="cursor-pointer">All {assignmentType}s</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="scope-specific" />
                  <Label htmlFor="scope-specific" className="cursor-pointer">Specific {assignmentType}</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {assignmentType && assignmentType !== 'Global' && assignmentScope === 'specific' && (
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select value={assignmentId} onValueChange={setAssignmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${assignmentType.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {getAssignmentOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!assignmentType || !templateId || !templateType || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingAssignment ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingAssignment ? 'Update Assignment' : 'Create Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}