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

// Import Syncfusion styles
import '@syncfusion/ej2-base/styles/tailwind.css';
import '@syncfusion/ej2-buttons/styles/tailwind.css';
import '@syncfusion/ej2-popups/styles/tailwind.css';
import '@syncfusion/ej2-navigations/styles/tailwind.css';
import '@syncfusion/ej2-inputs/styles/tailwind.css';
import '@syncfusion/ej2-lists/styles/tailwind.css';
import '@syncfusion/ej2-dropdowns/styles/tailwind.css';
import '@syncfusion/ej2-splitbuttons/styles/tailwind.css';
import '@syncfusion/ej2-notifications/styles/tailwind.css';
import '@syncfusion/ej2-react-pdfviewer/styles/tailwind.css';

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
  const [reportType, setReportType] = useState<'General' | 'DateRange'>(
    existingTemplate?.reportType || 'General'
  );
  const [category, setCategory] = useState(existingTemplate?.category || 'Financial');
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
  const [currentTab, setCurrentTab] = useState<'mapping' | 'settings'>('mapping');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Load PDF when base64 data changes
  useEffect(() => {
    if (pdfBase64 && viewerRef.current) {
      const base64WithPrefix = pdfBase64.startsWith('data:')
        ? pdfBase64
        : `data:application/pdf;base64,${pdfBase64}`;

      viewerRef.current.load(base64WithPrefix, '');
    }
  }, [pdfBase64]);

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
      setPdfLoaded(false);

      toast.success('PDF uploaded successfully');
    };
    reader.readAsDataURL(file);
  }, []);

  // Extract form fields from PDF
  const extractFormFields = useCallback(() => {
    if (!viewerRef.current) return;

    // Use a timeout to ensure the viewer has fully processed the document
    setTimeout(() => {
       if (!viewerRef.current) return;
       const formFieldCollection = viewerRef.current.formFieldCollections;
       const extracted: SyncfusionFormField[] = [];
   
       if (formFieldCollection) {
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
       }
   
       setFormFields(extracted);
    }, 500);
  }, []);

  // Handle document load
  const handleDocumentLoad = useCallback(() => {
    if (!viewerRef.current) return;

    setPdfLoaded(true);
    setPageCount(viewerRef.current.pageCount);

    // Attempt to restore fields if PDF is empty but template has fields
    // This handles legacy templates where fields weren't burned into PDF
    setTimeout(() => {
       if (!viewerRef.current) return;
       
       const viewer = viewerRef.current;
       const currentFields = viewer.formFieldCollections;
       
       // If viewer has no fields, but we have saved fields in metadata, restore them
       if ((!currentFields || currentFields.length === 0) && existingTemplate?.syncfusionFormFields && existingTemplate.syncfusionFormFields.length > 0) {
          console.log('Restoring fields from metadata...', existingTemplate.syncfusionFormFields.length);
          
          existingTemplate.syncfusionFormFields.forEach(field => {
             try {
                // @ts-ignore
                if (viewer.formDesignerModule) {
                   const props = {
                      name: field.name,
                      bounds: { 
                         X: field.bounds.X || 0, 
                         Y: field.bounds.Y || 0, 
                         Width: field.bounds.Width || 100, 
                         Height: field.bounds.Height || 20 
                      },
                      pageNumber: field.pageNumber > 0 ? field.pageNumber : 1,
                      isRequired: field.isRequired,
                      isReadOnly: field.isReadOnly,
                      value: field.defaultValue,
                      maxLength: field.maxLength,
                   };
                   
                   // Map internal types to Syncfusion types
                   let fieldType = field.type as string;
                   if (fieldType === 'Checkbox') fieldType = 'CheckBox';
                   if (fieldType === 'Dropdown') fieldType = 'DropDown';
                   if (fieldType === 'Listbox') fieldType = 'ListBox';
                   if (fieldType === 'Password') fieldType = 'PasswordField';
                   if (fieldType === 'Signature') fieldType = 'SignatureField';

                   // @ts-ignore
                   viewer.formDesignerModule.addFormField(fieldType, props);
                   console.log('Restored field:', field.name, fieldType);
                } else {
                   console.warn('FormDesignerModule not available');
                }
             } catch (e) {
                console.error('Error restoring field:', field.name, e);
             }
          });
       }
       
       // Extract fields after potential restoration
       extractFormFields();
    }, 1500);

    toast.success('PDF loaded successfully');
  }, [existingTemplate, extractFormFields]);

  // Update viewer container on resize/layout change
  useEffect(() => {
     if (pdfLoaded && viewerRef.current) {
        setTimeout(() => {
           viewerRef.current?.updateViewerContainer();
        }, 200);
     }
  }, [pdfLoaded, currentTab]);

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

  // Handle form field selection
  const handleFormFieldSelect = useCallback((args: any) => {
    if (args.field && args.field.name) {
      console.log('Field selected:', args.field.name);
      setSelectedFieldId(args.field.name);
      // Switch to mapping tab if not already
      setCurrentTab('mapping');
    }
  }, []);

  // Handle manual restore
  const handleManualRestore = () => {
    if (!viewerRef.current || !existingTemplate?.syncfusionFormFields) return;
    
    const viewer = viewerRef.current;
    console.log('Manually restoring fields...');
    
    existingTemplate.syncfusionFormFields.forEach(field => {
       try {
          // @ts-ignore
          if (viewer.formDesignerModule) {
             const props = {
                name: field.name,
                bounds: { 
                   X: field.bounds.X || 0, 
                   Y: field.bounds.Y || 0, 
                   Width: field.bounds.Width || 100, 
                   Height: field.bounds.Height || 20 
                },
                pageNumber: field.pageNumber > 0 ? field.pageNumber : 1,
                isRequired: field.isRequired,
                isReadOnly: field.isReadOnly,
                value: field.defaultValue,
                maxLength: field.maxLength,
             };
             
             // Map internal types to Syncfusion types
             let fieldType = field.type as string;
             if (fieldType === 'Checkbox') fieldType = 'CheckBox';
             if (fieldType === 'Dropdown') fieldType = 'DropDown';
             if (fieldType === 'Listbox') fieldType = 'ListBox';
             if (fieldType === 'Password') fieldType = 'PasswordField';
             if (fieldType === 'Signature') fieldType = 'SignatureField';

             // @ts-ignore
             viewer.formDesignerModule.addFormField(fieldType, props);
             console.log('Restored field:', field.name, fieldType);
          }
       } catch (e) {
          console.error('Error restoring field:', field.name, e);
       }
    });
    
    setTimeout(extractFormFields, 500);
    toast.success('Fields restored');
  };

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
      // Save the current PDF state including form fields
      let savedPdfBase64 = pdfBase64;
      if (viewerRef.current) {
         // Force save to get the latest PDF with fields
         const blob = await viewerRef.current.saveAsBlob();
         savedPdfBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
               const base64 = (reader.result as string).split(',')[1];
               resolve(base64);
            };
            reader.readAsDataURL(blob);
         });
      }

      const template: ExtendedPdfTemplate = {
        id: templateId || existingTemplate?.id || '',
        templateName,
        templateType,
        reportType,
        category,
        base64Data: savedPdfBase64,
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
    reportType,
    category,
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
            <Label htmlFor="reportType" className="text-xs">
              Report Type
            </Label>
            <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
              <SelectTrigger id="reportType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General (No Date)</SelectItem>
                <SelectItem value="DateRange">Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label htmlFor="category" className="text-xs">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Project">Project</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
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
          {!pdfBase64 ? (
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
                formFieldSelect={handleFormFieldSelect}
                enableFormFieldsValidation={true}
                enableFormDesigner={true}
                enableFormFields={true}
                toolbarSettings={{
                  showTooltip: true,
                  toolbarItems: [
                    'OpenOption',
                    'PageNavigationTool',
                    'MagnificationTool',
                    'PanTool',
                    'SelectionTool',
                    'SearchOption',
                    'PrintOption',
                    'DownloadOption',
                    'UndoRedoTool',
                    'AnnotationEditTool',
                    'FormDesignerEditTool',
                  ]
                }}
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

              {/* Stats overlay - Moved to header */}
            </div>
          )}
        </div>

        {/* Right Panel - Configuration */}
        {pdfLoaded && (
          <div className="w-[450px] border-l bg-muted/20 overflow-y-auto overflow-x-hidden flex flex-col shrink-0">
            <div className="bg-background border-b p-2 flex justify-between items-center text-xs text-muted-foreground">
               <div className="flex gap-3">
                  <span><FileText className="h-3 w-3 inline mr-1" />{pageCount} pgs</span>
                  <span><Link2 className="h-3 w-3 inline mr-1" />{formFields.length} fields</span>
               </div>
               <div>
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
            <Tabs value={currentTab} onValueChange={(v: any) => setCurrentTab(v)} className="flex-1 flex flex-col">
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

              <TabsContent value="mapping" className="p-4 m-0 flex-1 overflow-y-auto">
                <FieldMappingPanel
                  formFields={formFields}
                  fieldMappings={fieldMappings}
                  primaryCollection={primaryCollection}
                  onMappingsChange={setFieldMappings}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={(fieldId) => {
                    setSelectedFieldId(fieldId);
                    // Select in viewer if possible
                    if (viewerRef.current) {
                       // @ts-ignore
                       const field = viewerRef.current.formFieldCollections.find((f: any) => f.name === fieldId);
                       if (field) {
                          // @ts-ignore
                          viewerRef.current.formDesignerModule.selectFormField(field);
                       }
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="settings" className="p-4 m-0 flex-1 overflow-y-auto">
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
                    
                    <div className="pt-4 border-t">
                      <Label className="mb-2 block">Troubleshooting</Label>
                      <Button variant="outline" size="sm" onClick={handleManualRestore} className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        Force Restore Fields
                      </Button>
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
