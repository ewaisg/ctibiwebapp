import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle } from 'lucide-react';
import type { Project } from '@/types';

interface Props {
  projects: Project[];
  onSelect: (projectId: string) => void;
  onBack: () => void;
}

function ProjectSelectionStepBase({ projects, onSelect, onBack }: Props) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Select Project</h2>
            <p className="text-muted-foreground">Choose a project to create an invoice for</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onSelect(project.id)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{project.projectName}</CardTitle>
                    <CardDescription>PO: {project.poNumber}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">{project.pmisNumber}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Project Manager:</span>
                  <span className="font-medium">{project.projectManager || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining PO:</span>
                  <span className="font-medium">{formatCurrency(project.remainingPoAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining Hours:</span>
                  <span className="font-medium">{project.remainingHours || 0} hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Projects Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No active projects found in the selected department. Please contact your administrator or select a different department.
            </p>
            <Button onClick={onBack} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default memo(ProjectSelectionStepBase);
