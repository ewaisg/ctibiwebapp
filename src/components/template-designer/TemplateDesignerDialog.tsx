"use client";

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, Eye, Undo, Redo, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { VisualTemplate, TemplateElement, TemplateType, PageSize, PageOrientation } from '@/types/template-designer';
import { createDefaultTemplate, getPageDimensions } from '@/types/template-designer';
import { DesignerCanvas } from './DesignerCanvas';
import { ElementToolbox } from './ElementToolbox';
import { PropertyPanel } from './PropertyPanel';
import { DataBindingPanel } from './DataBindingPanel';

interface TemplateDesignerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateToEdit?: VisualTemplate | null;
  onTemplateSaved?: (template: VisualTemplate) => void;
}

export function TemplateDesignerDialog({
  open,
  onOpenChange,
  templateToEdit,
  onTemplateSaved,
}: TemplateDesignerDialogProps) {
  const { secureRequest } = useAuth() as any;
  const [template, setTemplate] = useState<VisualTemplate>(createDefaultTemplate());
  const [selectedElement, setSelectedElement] = useState<TemplateElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<VisualTemplate[]>([]);

  // Initialize template
  useEffect(() => {
    if (open) {
      const initial = templateToEdit || createDefaultTemplate();
      setTemplate(initial);
      setHistory([initial]);
      setHistoryIndex(0);
      setSelectedElement(null);
    }
  }, [open, templateToEdit]);

  // Add to history
  const addToHistory = useCallback((newTemplate: VisualTemplate) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTemplate);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTemplate(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTemplate(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Update template property
  const updateTemplate = useCallback((updates: Partial<VisualTemplate>) => {
    const updated = { ...template, ...updates, updatedAt: new Date().toISOString() };

    // Handle page size or orientation change
    if (updates.pageSize || updates.orientation) {
      const { width, height } = getPageDimensions(
        updates.pageSize || template.pageSize,
        updates.orientation || template.orientation
      );
      updated.width = width;
      updated.height = height;
    }

    setTemplate(updated);
    addToHistory(updated);
  }, [template, addToHistory]);

  // Add element
  const addElement = useCallback((element: TemplateElement) => {
    const updated = {
      ...template,
      elements: [...template.elements, element],
      updatedAt: new Date().toISOString(),
    };
    setTemplate(updated);
    addToHistory(updated);
    setSelectedElement(element);
  }, [template, addToHistory]);

  // Update element
  const updateElement = useCallback((elementId: string, updates: Partial<TemplateElement>) => {
    const updated = {
      ...template,
      elements: template.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } as TemplateElement : el
      ),
      updatedAt: new Date().toISOString(),
    };
    setTemplate(updated);
    addToHistory(updated);

    // Update selected element if it's the one being updated
    if (selectedElement?.id === elementId) {
      setSelectedElement({ ...selectedElement, ...updates } as TemplateElement);
    }
  }, [template, selectedElement, addToHistory]);

  // Delete element
  const deleteElement = useCallback((elementId: string) => {
    const updated = {
      ...template,
      elements: template.elements.filter(el => el.id !== elementId),
      updatedAt: new Date().toISOString(),
    };
    setTemplate(updated);
    addToHistory(updated);

    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  }, [template, selectedElement, addToHistory]);

  // Save template
  const saveTemplate = async () => {
    if (!template.name || template.name === 'Untitled Template') {
      toast({
        title: 'Template Name Required',
        description: 'Please enter a name for your template',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Save to Firestore via API
      const response = await secureRequest('/api/visual-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      onTemplateSaved?.(template);

      toast({
        title: 'Template Saved',
        description: `Template "${template.name}" has been saved successfully.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Zoom controls
  const zoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const zoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const resetZoom = () => setZoom(1);

  // Preview template
  const previewTemplate = async () => {
    if (!template.id) {
      toast({
        title: 'Preview Unavailable',
        description: 'Please save the template first before previewing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await secureRequest(`/api/visual-templates/${template.id}/generate-pdf`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        throw new Error('Failed to generate preview');
      }
    } catch (error) {
      console.error('Error previewing template:', error);
      toast({
        title: 'Preview Failed',
        description: 'Failed to generate preview. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] h-[98vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col gap-1">
              <Input
                value={template.name}
                onChange={(e) => updateTemplate({ name: e.target.value })}
                className="font-semibold h-8"
                placeholder="Template Name"
              />
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Label className="text-xs">Type:</Label>
                <Select
                  value={template.type}
                  onValueChange={(value) => updateTemplate({ type: value as TemplateType })}
                >
                  <SelectTrigger className="h-6 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="cover-page">Cover Page</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="text-xs ml-2">Page:</Label>
                <Select
                  value={template.pageSize}
                  onValueChange={(value) => updateTemplate({ pageSize: value as PageSize })}
                >
                  <SelectTrigger className="h-6 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="a4">A4</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={template.orientation}
                  onValueChange={(value) => updateTemplate({ orientation: value as PageOrientation })}
                >
                  <SelectTrigger className="h-6 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={historyIndex === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            <Button variant="ghost" size="sm" onClick={zoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={zoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetZoom} title="Reset Zoom">
              100%
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            <Button variant="outline" size="sm" onClick={previewTemplate} title="Preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" onClick={saveTemplate} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Toolbox */}
          <div className="w-64 border-r bg-muted/20 overflow-y-auto">
            <Tabs defaultValue="elements" className="w-full">
              <TabsList className="w-full justify-start rounded-none">
                <TabsTrigger value="elements" className="flex-1">Elements</TabsTrigger>
                <TabsTrigger value="data" className="flex-1">Data</TabsTrigger>
              </TabsList>

              <TabsContent value="elements" className="m-0 p-4">
                <ElementToolbox onAddElement={addElement} />
              </TabsContent>

              <TabsContent value="data" className="m-0 p-4">
                <DataBindingPanel templateType={template.type} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 overflow-auto bg-gray-100">
            <DesignerCanvas
              template={template}
              zoom={zoom}
              showGrid={showGrid}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
            />
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 border-l bg-muted/20 overflow-y-auto">
            <PropertyPanel
              selectedElement={selectedElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
