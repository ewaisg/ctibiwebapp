"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Trash2, Plus, Edit, FileEdit, Upload } from "lucide-react";
import { TemplateUploadDialog } from "@/components/template-upload-dialog";
import type { ExtendedPdfTemplate } from "@/types";
import type { VisualTemplate } from "@/types/template-designer";
import type { MappedPdfTemplate } from "@/types/pdf-field-mapper";
import toast from "react-hot-toast";

// Dynamic import for TemplateDesignerDialog to avoid SSR issues with fabric.js
const TemplateDesignerDialog = dynamic(
  () => import("@/components/template-designer/TemplateDesignerDialog").then(mod => ({ default: mod.TemplateDesignerDialog })),
  { ssr: false }
);

// Dynamic import for SyncfusionFormDesigner to avoid SSR issues
const SyncfusionFormDesigner = dynamic(
  () => import("@/components/form-designer/SyncfusionFormDesigner").then(mod => ({ SyncfusionFormDesigner: mod.SyncfusionFormDesigner })).then(mod => mod.SyncfusionFormDesigner),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64">Loading Form Designer...</div> }
);

interface PdfTemplatesClientPageProps {
  showBackButton?: boolean;
  showTitle?: boolean;
}

export function PdfTemplatesClientPage({ showBackButton = false, showTitle = true }: PdfTemplatesClientPageProps) {
  const { user, secureRequest, firebaseUser, isLoading, refreshIdToken } = useAuth() as any;
  const [templates, setTemplates] = useState<ExtendedPdfTemplate[]>([]);
  const [visualTemplates, setVisualTemplates] = useState<VisualTemplate[]>([]);
  const [mappedTemplates, setMappedTemplates] = useState<MappedPdfTemplate[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VisualTemplate | null>(null);

  // NEW: Form Designer state
  const [formDesignerOpen, setFormDesignerOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<ExtendedPdfTemplate | null>(null);

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
        secureRequest('/api/pdf-templates/mapped')
      ] as const);
    };

    try {
      let [templatesRes, visualTemplatesRes, mappedTemplatesRes] = await fetchTriplet();

      // If token not yet valid (e.g., first load race) retry once after refreshing token
      if ((templatesRes.status === 401 || visualTemplatesRes.status === 401 || mappedTemplatesRes.status === 401) && typeof refreshIdToken === 'function') {
        await refreshIdToken();
        ;[templatesRes, visualTemplatesRes, mappedTemplatesRes] = await fetchTriplet();
      }

      if (templatesRes.ok) {
        const raw = await templatesRes.json();
        const list = Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw) ? raw : []);
        setTemplates(list as unknown as ExtendedPdfTemplate[]);
      }

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

  // NEW: Form Designer handlers
  const handleOpenFormDesigner = () => {
    setEditingForm(null);
    setFormDesignerOpen(true);
  };

  const handleEditForm = (template: ExtendedPdfTemplate) => {
    setEditingForm(template);
    setFormDesignerOpen(true);
  };

  const handleFormSave = async (template: ExtendedPdfTemplate) => {
    try {
      const response = await secureRequest('/api/pdf-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        toast.success('Form saved successfully!');
        setFormDesignerOpen(false);
        setEditingForm(null);
        await loadData();
      } else {
        const error = await response.json();
        toast.error(`Failed to save form: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error saving form:', error);
      toast.error('Failed to save form. Please try again.');
    }
  };

  const handleFormCancel = () => {
    setFormDesignerOpen(false);
    setEditingForm(null);
  };

  const deleteForm = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const response = await secureRequest(`/api/pdf-templates/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Form deleted successfully');
        loadData();
      } else {
        toast.error('Failed to delete form');
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    }
  };

  // Form Designer tab shows ALL templates
  const syncfusionForms = templates;

  const handleTemplateUploaded = () => {
    loadData();
  };

  const previewTemplate = (templateId: string) => {
    // Open template preview in a new window
    const previewUrl = `/api/pdf-templates/${templateId}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const handleOpenDesigner = () => {
    setEditingTemplate(null);
    setDesignerOpen(true);
  };

  const handleTemplateSaved = async (template: VisualTemplate) => {
    setVisualTemplates(prev => {
      const index = prev.findIndex(t => t.id === template.id);
      if (index >= 0) {
        const newTemplates = [...prev];
        newTemplates[index] = template;
        return newTemplates;
      }
      return [...prev, template];
    });
  };

  return (
    <>
      {formDesignerOpen ? (
        <div className="fixed inset-0 z-50 bg-background">
          <SyncfusionFormDesigner
            templateId={editingForm?.id}
            existingTemplate={editingForm || undefined}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </div>
      ) : (
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">PDF Templates</h1>
              <p className="text-muted-foreground">
                Manage your PDF templates and forms
              </p>
            </div>
          </div>

          <Tabs defaultValue="forms" className="space-y-4">
            <TabsList>
              <TabsTrigger value="forms" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Forms & Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="forms" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">PDF Forms</h2>
                  <p className="text-sm text-muted-foreground">
                    Create PDF forms with visual field mapping to your database
                  </p>
                </div>
                <div className="flex gap-2">
                  <TemplateUploadDialog onTemplateUploaded={handleTemplateUploaded}>
                    <Button variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDF
                    </Button>
                  </TemplateUploadDialog>
                  <Button onClick={handleOpenFormDesigner}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Form
                  </Button>
                </div>
              </div>

              {syncfusionForms.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileEdit className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Forms Yet</h3>
                    <p className="text-muted-foreground text-center mb-4 max-w-md">
                      Create your first form using Syncfusion Form Designer. Upload a PDF and add form fields with visual database mapping.
                    </p>
                    <div className="flex gap-2">
                      <TemplateUploadDialog onTemplateUploaded={handleTemplateUploaded}>
                        <Button variant="outline">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload PDF
                        </Button>
                      </TemplateUploadDialog>
                      <Button onClick={handleOpenFormDesigner}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Form
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {syncfusionForms.map((form) => (
                    <Card key={form.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{form.templateName}</CardTitle>
                          <div className="flex gap-1">
                            {form.syncfusionFormFields && form.syncfusionFormFields.length > 0 ? (
                              <Badge variant="default" className="bg-green-600">
                                Enhanced
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                No Fields
                              </Badge>
                            )}
                            <Badge variant={form.isActive ? "default" : "secondary"}>
                              {form.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription>
                          {form.templateType} • v{form.version || 1}
                          {form.category && <span className="ml-2">• {form.category}</span>}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditForm(form)}
                          >
                            {form.syncfusionFormFields && form.syncfusionFormFields.length > 0 ? (
                              <>
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-3 w-3" />
                                Add Fields
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewTemplate(form.id)}
                          >
                            <Eye className="mr-2 h-3 w-3" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteForm(form.id)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{form.syncfusionFormFields?.length || 0} form fields</div>
                          <div>{form.fieldMappings?.length || 0} mapped fields</div>
                          <div>{form.pageCount || 0} pages</div>
                          <div>Source: {form.dataSourceConfig?.primaryCollection || 'N/A'}</div>
                          {form.reportType && <div>Type: {form.reportType}</div>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <TemplateDesignerDialog
            open={designerOpen}
            onOpenChange={setDesignerOpen}
            templateToEdit={editingTemplate}
            onTemplateSaved={handleTemplateSaved}
          />
        </div>
      )}
    </>
  );
}
