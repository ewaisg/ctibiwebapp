'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  PdfViewerComponent,
  Toolbar,
  Magnification,
  Navigation,
  LinkAnnotation,
  BookmarkView,
  ThumbnailView,
  Print,
  TextSelection,
  TextSearch,
  Annotation,
  FormFields,
  FormDesigner,
  PageOrganizer,
  Inject,
  type TextFieldSettings,
  type CheckBoxFieldSettings,
  type RadioButtonFieldSettings,
  type DropdownFieldSettings,
  type ListBoxFieldSettings,
  type SignatureFieldSettings,
  type PasswordFieldSettings,
  type InitialFieldSettings,
} from '@syncfusion/ej2-react-pdfviewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Save,
  Eye,
  X,
  FileText,
  Link2,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ExtendedPdfTemplate, SyncfusionFormField, TemplateFieldMapping } from '@/types';
import { FieldMappingPanel } from './FieldMappingPanel';

interface SyncfusionFormDesignerProps {
  templateId?: string;
  existingTemplate?: ExtendedPdfTemplate;
  onSave: (template: ExtendedPdfTemplate) => void;
  onCancel: () => void;
}

export function SyncfusionFormDesigner({
  templateId,
  existingTemplate,
  onSave,
  onCancel,
}: SyncfusionFormDesignerProps) {
  const viewerRef = useRef<PdfViewerComponent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template state
  const [templateName, setTemplateName] = useState(existingTemplate?.templateName || '');
  const [templateType, setTemplateType] = useState<'Invoice' | 'CoverPage' | 'Report' | 'Custom'>(
    existingTemplate?.templateType || 'Custom'
  );
  const [primaryCollection, setPrimaryCollection] = useState(
    existingTemplate?.dataSourceConfig?.primaryCollection || 'invoices'
  );

  // PDF state
  const [pdfBase64, setPdfBase64] = useState(existingTemplate?.base64Data || '');
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pageCount, setPageCount] = useState(existingTemplate?.pageCount || 0);

  // Form fields state
  const [formFields, setFormFields] = useState<SyncfusionFormField[]>(
    existingTemplate?.syncfusionFormFields || []
  );
  const [fieldMappings, setFieldMappings] = useState<TemplateFieldMapping[]>(
    existingTemplate?.fieldMappings || []
  );

  // UI state
  const [currentTab, setCurrentTab] = useState<'designer' | 'mapping' | 'settings'>('designer');
  const [isSaving, setIsSaving] = useState(false);

  // Load existing PDF if editing
  useEffect(() => {
    if (existingTemplate?.base64Data && viewerRef.current) {
      const base64WithPrefix = existingTemplate.base64Data.startsWith('data:')
        ? existingTemplate.base64Data
        : `data:application/pdf;base64,${existingTemplate.base64Data}`;

      viewerRef.current.load(base64WithPrefix, '');
    }
  }, [existingTemplate]);

  // Handle PDF upload
  const handlePdfUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1]; // Remove data:application/pdf;base64, prefix

      setPdfBase64(base64);

      // Load into viewer
      if (viewerRef.current) {
        viewerRef.current.load(result, '');
      }

      toast.success('PDF uploaded successfully');
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle document load
  const handleDocumentLoad = useCallback(() => {
    if (!viewerRef.current) return;

    setPdfLoaded(true);
    setPageCount(viewerRef.current.pageCount);

    // Extract existing form fields
    extractFormFields();

    toast.success('PDF loaded successfully');
  }, []);

  // Extract form fields from PDF
  const extractFormFields = useCallback(() => {
    if (!viewerRef.current) return;

    const formFieldCollection = viewerRef.current.formFieldCollections;
    const extracted: SyncfusionFormField[] = [];

    formFieldCollection.forEach((field: any) => {
      extracted.push({
        name: field.name,
        type: field.type as SyncfusionFormField['type'],
        bounds: {
          X: field.bounds.X,
          Y: field.bounds.Y,
          Width: field.bounds.Width,
          Height: field.bounds.Height,
        },
        pageNumber: field.pageNumber,
        isRequired: field.isRequired,
        isReadOnly: field.isReadOnly,
        defaultValue: field.value,
        maxLength: field.maxLength,
        options: field.options || undefined,
      });
    });

    setFormFields(extracted);
  }, []);

  // Handle form field added
  const handleFormFieldAdd = useCallback(() => {
    // Re-extract fields when a new one is added
    setTimeout(() => {
      extractFormFields();
    }, 100);
  }, [extractFormFields]);

  // Handle form field updated
  const handleFormFieldUpdate = useCallback(() => {
    // Re-extract fields when one is updated
    setTimeout(() => {
      extractFormFields();
    }, 100);
  }, [extractFormFields]);

  // Handle form field removed
  const handleFormFieldRemove = useCallback(() => {
    // Re-extract fields when one is removed
    setTimeout(() => {
      extractFormFields();
    }, 100);
  }, [extractFormFields]);

  // Handle save template
  const handleSave = useCallback(async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!pdfBase64) {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsSaving(true);

    try {
      const template: ExtendedPdfTemplate = {
        id: templateId || existingTemplate?.id || '',
        templateName,
        templateType,
        base64Data: pdfBase64,
        syncfusionFormFields: formFields,
        fieldMappings,
        dataSourceConfig: {
          primaryCollection,
        },
        pageCount,
        isActive: true,
        createdAt: existingTemplate?.createdAt || ('' as any),
        updatedAt: ('' as any), // Will be set by Firestore
        createdBy: existingTemplate?.createdBy || ('' as any),
        createdByName: existingTemplate?.createdByName || '',
        version: (existingTemplate?.version || 0) + 1,
      };

      await onSave(template);
      toast.success('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  }, [
    templateName,
    templateType,
    primaryCollection,
    pdfBase64,
    formFields,
    fieldMappings,
    pageCount,
    templateId,
    existingTemplate,
    onSave,
  ]);

  // Validation
  const canSave = templateName.trim() && pdfBase64 && formFields.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1 max-w-md">
            <Label htmlFor="templateName" className="text-xs">
              Template Name
            </Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              className="mt-1"
            />
          </div>

          <div className="w-48">
            <Label htmlFor="templateType" className="text-xs">
              Template Type
            </Label>
            <Select value={templateType} onValueChange={(v: any) => setTemplateType(v)}>
              <SelectTrigger id="templateType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Invoice">Invoice</SelectItem>
                <SelectItem value="CoverPage">Cover Page</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label htmlFor="primaryCollection" className="text-xs">
              Data Source
            </Label>
            <Select value={primaryCollection} onValueChange={setPrimaryCollection}>
              <SelectTrigger id="primaryCollection" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
                <SelectItem value="contracts">Contracts</SelectItem>
                <SelectItem value="departments">Departments</SelectItem>
                <SelectItem value="employees">Employees</SelectItem>
                <SelectItem value="cti_timesheets">Timesheets</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - PDF Viewer */}
        <div className="flex-1 flex flex-col">
          {!pdfLoaded ? (
            <Card className="m-4">
              <CardHeader>
                <CardTitle>Upload PDF Template</CardTitle>
                <CardDescription>
                  Upload a PDF file to start designing your form
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-accent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Click to upload PDF</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex-1 relative">
              <PdfViewerComponent
                ref={viewerRef}
                id="pdfviewer"
                serviceUrl=""
                resourceUrl="https://cdn.syncfusion.com/ej2/23.2.6/dist/ej2-pdfviewer-lib"
                documentLoad={handleDocumentLoad}
                formFieldAdd={handleFormFieldAdd}
                formFieldPropertiesChange={handleFormFieldUpdate}
                formFieldRemove={handleFormFieldRemove}
                enableFormFieldsValidation={true}
                style={{ height: '100%', width: '100%' }}
              >
                <Inject
                  services={[
                    Toolbar,
                    Magnification,
                    Navigation,
                    LinkAnnotation,
                    BookmarkView,
                    ThumbnailView,
                    Print,
                    TextSelection,
                    TextSearch,
                    Annotation,
                    FormFields,
                    FormDesigner,
                    PageOrganizer,
                  ]}
                />
              </PdfViewerComponent>

              {/* Stats overlay */}
              <div className="absolute top-4 right-4 bg-background/90 backdrop-blur rounded-lg shadow-lg p-3 space-y-1">
                <div className="text-xs font-medium">
                  <FileText className="h-3 w-3 inline mr-1" />
                  {pageCount} pages
                </div>
                <div className="text-xs font-medium">
                  <Link2 className="h-3 w-3 inline mr-1" />
                  {formFields.length} fields
                </div>
                <div className="text-xs font-medium">
                  {fieldMappings.length === formFields.length ? (
                    <span className="text-green-600">✓ All mapped</span>
                  ) : (
                    <span className="text-yellow-600">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {fieldMappings.length}/{formFields.length} mapped
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Configuration */}
        {pdfLoaded && (
          <div className="w-96 border-l bg-muted/20 overflow-y-auto">
            <Tabs value={currentTab} onValueChange={(v: any) => setCurrentTab(v)} className="h-full">
              <div className="border-b bg-background p-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mapping" className="text-xs">
                    <Link2 className="h-3 w-3 mr-1" />
                    Mapping
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="mapping" className="p-4 m-0">
                <FieldMappingPanel
                  formFields={formFields}
                  fieldMappings={fieldMappings}
                  primaryCollection={primaryCollection}
                  onMappingsChange={setFieldMappings}
                />
              </TabsContent>

              <TabsContent value="settings" className="p-4 m-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Template Settings</CardTitle>
                    <CardDescription>Configure template options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Version</Label>
                      <Input value={existingTemplate?.version || 1} disabled />
                    </div>
                    <div>
                      <Label>Pages</Label>
                      <Input value={pageCount} disabled />
                    </div>
                    <div>
                      <Label>Form Fields</Label>
                      <Input value={formFields.length} disabled />
                    </div>
                    <div>
                      <Label>Mapped Fields</Label>
                      <Input value={fieldMappings.length} disabled />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
