"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateList } from '@/components/templates/TemplateList';
import { TemplateUpload } from '@/components/templates/TemplateUpload';
import { TemplateAssignments } from '@/components/templates/TemplateAssignments';
import { FieldMappingEditor } from '@/components/templates/FieldMappingEditor';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TemplateManagerClientProps {
  initialTemplates: any[];
  initialAssignments: any[];
}

export function TemplateManagerClient({
  initialTemplates,
  initialAssignments,
}: TemplateManagerClientProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const handleTemplateUploaded = (newTemplate: any) => {
    setTemplates(prev => [...prev, newTemplate]);
    setShowUploadDialog(false);
  };

  const handleTemplateDeleted = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Template
            </Button>
          </div>

          <TemplateList
            templates={templates}
            onTemplateSelect={setSelectedTemplate}
            onTemplateDelete={handleTemplateDeleted}
          />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <TemplateAssignments
            templates={templates}
            assignments={assignments}
            onAssignmentChange={(newAssignments) => setAssignments(newAssignments)}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload New Template</DialogTitle>
          </DialogHeader>
          <TemplateUpload onTemplateUploaded={handleTemplateUploaded} />
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template: {selectedTemplate.templateName}</DialogTitle>
            </DialogHeader>
            <FieldMappingEditor
              templateId={selectedTemplate.id}
              initialMappings={selectedTemplate.fieldMappings || []}
              detectedFields={selectedTemplate.detectedFields || []}
              onSave={(mappings) => {
                setTemplates(prev =>
                  prev.map(t =>
                    t.id === selectedTemplate.id
                      ? { ...t, fieldMappings: mappings }
                      : t
                  )
                );
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
