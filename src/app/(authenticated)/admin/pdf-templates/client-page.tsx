"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Settings, Eye, Trash2, Plus, ArrowLeft, Edit, MoreHorizontal } from "lucide-react";
import { TemplateUploadDialog } from "@/components/template-upload-dialog";
import { TemplateAssignmentDialog } from "@/components/template-assignment-dialog";
import { PdfFieldMapper } from "@/components/pdf-field-mapper/PdfFieldMapper";
import type { PdfTemplate, TemplateAssignment } from "@/types";
import type { VisualTemplate } from "@/types/template-designer";
import type { MappedPdfTemplate } from "@/types/pdf-field-mapper";

// Dynamic import for TemplateDesignerDialog to avoid SSR issues with fabric.js
const TemplateDesignerDialog = dynamic(
  () => import("@/components/template-designer/TemplateDesignerDialog").then(mod => ({ default: mod.TemplateDesignerDialog })),
  { ssr: false }
);

interface PdfTemplatesClientPageProps {
  showBackButton?: boolean;
  showTitle?: boolean;
}

export function PdfTemplatesClientPage({ showBackButton = false, showTitle = true }: PdfTemplatesClientPageProps) {
  const { user, secureRequest, firebaseUser, isLoading, refreshIdToken } = useAuth() as any;
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [visualTemplates, setVisualTemplates] = useState<VisualTemplate[]>([]);
  const [mappedTemplates, setMappedTemplates] = useState<MappedPdfTemplate[]>([]);
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TemplateAssignment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VisualTemplate | null>(null);
  const [fieldMapperOpen, setFieldMapperOpen] = useState(false);
  const [editingMappedTemplate, setEditingMappedTemplate] = useState<MappedPdfTemplate | null>(null);

  // Load after auth is ready to ensure Authorization header is present
  useEffect(() => {
    if (isLoading) return; // wait for auth state resolution
    if (!firebaseUser) {
      // Not signed in; stop loading but don't attempt requests without auth
      setInitialLoading(false);
      return;
    }
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, isLoading]);

  const loadData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    const fetchTriplet = async () => {
      return Promise.all([
        secureRequest('/api/pdf-templates'),
        secureRequest('/api/visual-templates'),
        secureRequest('/api/pdf-templates/mapped'),
        secureRequest('/api/template-assignments')
      ] as const);
    };

    try {
      let [templatesRes, visualTemplatesRes, mappedTemplatesRes, assignmentsRes] = await fetchTriplet();

      // If token not yet valid (e.g., first load race) retry once after refreshing token
      if ((templatesRes.status === 401 || visualTemplatesRes.status === 401 || mappedTemplatesRes.status === 401 || assignmentsRes.status === 401) && typeof refreshIdToken === 'function') {
        await refreshIdToken();
        ;[templatesRes, visualTemplatesRes, mappedTemplatesRes, assignmentsRes] = await fetchTriplet();
      }

      if (templatesRes.ok) {
        const raw = await templatesRes.json();
        const list = Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw) ? raw : []);
        setTemplates(list as unknown as PdfTemplate[]);
      }
      // Do not clear on transient errors; keep previous data visible

      if (visualTemplatesRes.ok) {
        const rawVT = await visualTemplatesRes.json();
        const listVT = Array.isArray(rawVT?.items) ? rawVT.items : (Array.isArray(rawVT) ? rawVT : []);
        setVisualTemplates(listVT as unknown as VisualTemplate[]);
      }

      if (mappedTemplatesRes.ok) {
        const rawMT = await mappedTemplatesRes.json();
        const listMT = Array.isArray(rawMT?.templates) ? rawMT.templates : (Array.isArray(rawMT) ? rawMT : []);
        setMappedTemplates(listMT as unknown as MappedPdfTemplate[]);
      }

      if (assignmentsRes.ok) {
        const rawA = await assignmentsRes.json();
        const listA = Array.isArray(rawA) ? rawA : (Array.isArray(rawA?.items) ? rawA.items : []);
        setAssignments(listA as unknown as TemplateAssignment[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Keep existing state on error
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const handleTemplateUploaded = () => {
    loadData();
  };

  const handleAssignmentCreated = () => {
    loadData();
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await secureRequest(`/api/pdf-templates/${templateId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const previewTemplate = (templateId: string) => {
    // Open template preview in a new window
    const previewUrl = `/api/pdf-templates/${templateId}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this template assignment?')) return;
    
    try {
      const response = await secureRequest(`/api/template-assignments/${assignmentId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Show success feedback
        console.log('Assignment deleted successfully');
        loadData();
      } else {
        const error = await response.json();
        alert(`Failed to delete assignment: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    }
  };

  const editAssignment = (assignment: TemplateAssignment) => {
    setEditingAssignment(assignment);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditingAssignment(null);
    setEditDialogOpen(false);
  };

  const handleOpenDesigner = () => {
    setEditingTemplate(null);
    setDesignerOpen(true);
  };

  const handleTemplateSaved = async (template: VisualTemplate) => {
    console.log('Template saved:', template);

    // Update the visualTemplates state directly without reloading all data
    // This prevents the designer from closing/reopening
    setVisualTemplates(prev => {
      const existingIndex = prev.findIndex(t => t.id === template.id);
      if (existingIndex >= 0) {
        // Update existing template
        const updated = [...prev];
        updated[existingIndex] = template;
        return updated;
      } else {
        // Add new template
        return [...prev, template];
      }
    });
  };

  const deleteVisualTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this visual template?')) return;

    try {
      const response = await secureRequest(`/api/visual-templates/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      } else {
        const error = await response.json();
        alert(`Failed to delete template: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting visual template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const previewVisualTemplate = async (templateId: string) => {
    try {
      const response = await secureRequest(`/api/visual-templates/${templateId}/generate-pdf`, {
        method: 'GET'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const error = await response.json();
        alert(`Failed to preview template: ${error.error}`);
      }
    } catch (error) {
      console.error('Error previewing visual template:', error);
      alert('Failed to preview template. Please try again.');
    }
  };

  const editVisualTemplate = (template: VisualTemplate) => {
    setEditingTemplate(template);
    setDesignerOpen(true);
  };

  // Mapped template handlers
  const handleOpenFieldMapper = () => {
    setEditingMappedTemplate(null);
    setFieldMapperOpen(true);
  };

  const handleMappedTemplateSaved = (template: MappedPdfTemplate) => {
    console.log('Mapped template saved:', template);
    setFieldMapperOpen(false);
    setEditingMappedTemplate(null);
    loadData();
  };

  const deleteMappedTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this mapped template?')) return;

    try {
      const response = await secureRequest(`/api/pdf-templates/mapped?id=${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      } else {
        const error = await response.json();
        alert(`Failed to delete template: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting mapped template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const editMappedTemplate = (template: MappedPdfTemplate) => {
    setEditingMappedTemplate(template);
    setFieldMapperOpen(true);
  };

  if (initialLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <>
      {(showBackButton || showTitle) && (
        <div className="flex items-center justify-between">
          <div>
            {showBackButton && (
              <Button variant="outline" onClick={() => window.history.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            )}
            {showTitle && (
              <>
                <h2 className="text-3xl font-bold tracking-tight">PDF Templates</h2>
                <p className="text-muted-foreground">
                  Manage PDF templates for invoices, cover pages, and reports
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="field-mapper">Field Mapper</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Visual Templates Section */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Visual Templates</h3>
            <Button variant="outline" onClick={handleOpenDesigner}>
              <Edit className="mr-2 h-4 w-4" />
              Design New Template
            </Button>
          </div>

          {visualTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Edit className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Visual Templates Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Design your first visual template using our drag-and-drop designer.
                </p>
                <Button onClick={handleOpenDesigner}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Visual Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visualTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {template.type} • {template.elements.length} elements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editVisualTemplate(template)}
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewVisualTemplate(template.id)}
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteVisualTemplate(template.id)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {template.pageSize} • {template.orientation}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Legacy PDF Templates Section */}
          <div className="flex justify-between items-center mt-8">
            <h3 className="text-lg font-medium">Uploaded PDF Templates</h3>
            <TemplateUploadDialog onTemplateUploaded={handleTemplateUploaded}>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Upload PDF Template
              </Button>
            </TemplateUploadDialog>
          </div>

          {templates.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Upload your first PDF template to get started with custom invoice generation.
                </p>
                <TemplateUploadDialog onTemplateUploaded={handleTemplateUploaded}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload First Template
                  </Button>
                </TemplateUploadDialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.templateName}</CardTitle>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {template.templateType} • {(template as any).fieldMappings?.length ?? 0} fields mapped
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => previewTemplate(template.id)}
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Created by {template.createdByName || (template as any).createdBy || 'Unknown'}
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="field-mapper" className="space-y-4">
          {fieldMapperOpen ? (
            <PdfFieldMapper
              templateId={editingMappedTemplate?.id}
              onSave={handleMappedTemplateSaved}
              onCancel={() => {
                setFieldMapperOpen(false);
                setEditingMappedTemplate(null);
              }}
            />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Mapped PDF Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload PDF forms and map their fields to your data
                  </p>
                </div>
                <Button onClick={handleOpenFieldMapper}>
                  <Plus className="mr-2 h-4 w-4" />
                  Map New PDF
                </Button>
              </div>

              {mappedTemplates.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Mapped Templates Yet</h3>
                    <p className="text-muted-foreground text-center mb-4 max-w-md">
                      Upload an existing PDF form and map its fields to your data sources.
                      This is much simpler than designing from scratch!
                    </p>
                    <Button onClick={handleOpenFieldMapper}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Mapped Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mappedTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.templateName}</CardTitle>
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription>
                          {template.templateType} • {template.fieldMappings.length} fields mapped
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editMappedTemplate(template)}
                          >
                            <Edit className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMappedTemplate(template.id!)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {template.tableMappings.length} tables • {template.pdfFields.length} total fields
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Template Assignments</h3>
            <TemplateAssignmentDialog
              templates={templates}
              visualTemplates={visualTemplates}
              onAssignmentCreated={handleAssignmentCreated}
            >
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                New Assignment
              </Button>
            </TemplateAssignmentDialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>
                Templates assigned to contracts, departments, and projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mb-3" />
                  <h4 className="font-medium mb-2">No Template Assignments</h4>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Assign templates to contracts, departments, or projects to control which templates are used for invoice generation.
                  </p>
                  <TemplateAssignmentDialog
                    templates={templates}
                    visualTemplates={visualTemplates}
                    onAssignmentCreated={handleAssignmentCreated}
                  >
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Assignment
                    </Button>
                  </TemplateAssignmentDialog>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{assignment.templateName}</div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.assignmentType}: {assignment.assignmentName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{assignment.templateType}</Badge>
                      <Badge variant={assignment.isActive ? "default" : "secondary"}>
                        {assignment.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editAssignment(assignment)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteAssignment(assignment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Assignment Dialog */}
      {editingAssignment && (
        <TemplateAssignmentDialog
          templates={templates}
          visualTemplates={visualTemplates}
          onAssignmentCreated={() => {
            handleAssignmentCreated();
            handleEditDialogClose();
          }}
          editingAssignment={editingAssignment}
          onClose={handleEditDialogClose}
        >
          <div />
        </TemplateAssignmentDialog>
      )}

      {/* Template Designer Dialog */}
      <TemplateDesignerDialog
        open={designerOpen}
        onOpenChange={setDesignerOpen}
        templateToEdit={editingTemplate}
        onTemplateSaved={handleTemplateSaved}
      />
    </>
  );
}