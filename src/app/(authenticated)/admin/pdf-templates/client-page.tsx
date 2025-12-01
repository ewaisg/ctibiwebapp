"use client";

import { useState, useEffect } from "react";
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
import { TemplateDesignerDialog } from "@/components/template-designer/TemplateDesignerDialog";
import type { PdfTemplate, TemplateAssignment } from "@/types";
import type { VisualTemplate } from "@/types/template-designer";

interface PdfTemplatesClientPageProps {
  showBackButton?: boolean;
  showTitle?: boolean;
}

export function PdfTemplatesClientPage({ showBackButton = false, showTitle = true }: PdfTemplatesClientPageProps) {
  const { user, secureRequest, firebaseUser, isLoading, refreshIdToken } = useAuth() as any;
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAssignment, setEditingAssignment] = useState<TemplateAssignment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VisualTemplate | null>(null);

  // Load after auth is ready to ensure Authorization header is present
  useEffect(() => {
    if (isLoading) return; // wait for auth state resolution
    if (!firebaseUser) {
      // Not signed in; stop loading but don't attempt requests without auth
      setLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, isLoading]);

  const loadData = async () => {
    setLoading(true);
    const fetchPair = async () => {
      return Promise.all([
        secureRequest('/api/pdf-templates'),
        secureRequest('/api/template-assignments')
      ] as const);
    };

    try {
      let [templatesRes, assignmentsRes] = await fetchPair();

      // If token not yet valid (e.g., first load race) retry once after refreshing token
      if ((templatesRes.status === 401 || assignmentsRes.status === 401) && typeof refreshIdToken === 'function') {
        await refreshIdToken();
        ;[templatesRes, assignmentsRes] = await fetchPair();
      }

      if (templatesRes.ok) {
        const raw = await templatesRes.json();
        const list = Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw) ? raw : []);
        setTemplates(list as unknown as PdfTemplate[]);
      }
      // Do not clear on transient errors; keep previous data visible

      if (assignmentsRes.ok) {
        const rawA = await assignmentsRes.json();
        const listA = Array.isArray(rawA) ? rawA : (Array.isArray(rawA?.items) ? rawA.items : []);
        setAssignments(listA as unknown as TemplateAssignment[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Keep existing state on error
    } finally {
      setLoading(false);
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
    // TODO: Save to Firestore
    console.log('Template saved:', template);
    loadData();
  };

  if (loading) {
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
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Available Templates</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleOpenDesigner}>
                <Edit className="mr-2 h-4 w-4" />
                Design Template
              </Button>
              <TemplateUploadDialog onTemplateUploaded={handleTemplateUploaded}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Template
                </Button>
              </TemplateUploadDialog>
            </div>
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

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Template Assignments</h3>
            <TemplateAssignmentDialog 
              templates={templates}
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