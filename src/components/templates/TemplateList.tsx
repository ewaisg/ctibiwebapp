"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Edit, Trash2, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TemplateListProps {
  templates: any[];
  onTemplateSelect: (template: any) => void;
  onTemplateDelete: (templateId: string) => void;
}

export function TemplateList({ templates, onTemplateSelect, onTemplateDelete }: TemplateListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; template: any | null }>({
    open: false,
    template: null,
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.templateName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || template.templateType === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (!deleteConfirm.template) return;

    try {
      const response = await fetch('/api/templates/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: deleteConfirm.template.id }),
      });

      if (response.ok) {
        onTemplateDelete(deleteConfirm.template.id);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }

    setDeleteConfirm({ open: false, template: null });
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'Invoice':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'CoverPage':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Report':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Custom':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Invoice">Invoice</SelectItem>
            <SelectItem value="CoverPage">Cover Page</SelectItem>
            <SelectItem value="Report">Report</SelectItem>
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first template to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                  <Badge variant="outline" className={getTemplateTypeColor(template.templateType)}>
                    {template.templateType}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{template.templateName}</CardTitle>
                <CardDescription>
                  {template.description || 'No description provided'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex justify-between">
                    <span>Fields:</span>
                    <span className="font-medium">
                      {template.fieldMappings?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">
                      {template.createdAt?.seconds
                        ? format(new Date(template.createdAt.seconds * 1000), 'MMM d, yyyy')
                        : 'N/A'}
                    </span>
                  </div>
                  {template.version && (
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span className="font-medium">{template.version}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onTemplateSelect(template)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm({ open: true, template })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, template: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.template?.templateName}"? This action cannot be undone.
              All assignments using this template will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
