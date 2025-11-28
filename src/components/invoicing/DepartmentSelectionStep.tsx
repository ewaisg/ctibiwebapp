import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, AlertCircle } from 'lucide-react';
import type { Department } from '@/types';

interface Props {
  departments: Department[];
  onSelect: (departmentId: string) => void;
  onBack: () => void;
}

function DepartmentSelectionStepBase({ departments, onSelect, onBack }: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Select Department</h2>
            <p className="text-muted-foreground">Choose the department for this invoice</p>
          </div>
        </div>
      </div>

      {departments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <Card
              key={department.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelect(department.id)}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{department.departmentName}</CardTitle>
                    <CardDescription>{department.departmentCode}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Click to view projects in this department</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Departments Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              There are no departments assigned to you. Please contact your administrator to get access to departments.
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

export default memo(DepartmentSelectionStepBase);
