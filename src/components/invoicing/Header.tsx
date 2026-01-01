import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock } from 'lucide-react';

const statusColors: Record<'draft'|'submitted'|'approved'|'rejected'|'resubmitted'|'revision_requested', string> = {
  draft: "bg-yellow-500 text-white",
  submitted: "bg-blue-500 text-white",
  approved: "bg-green-500 text-white",
  rejected: "bg-red-500 text-white",
  resubmitted: "bg-blue-500 text-white",
  revision_requested: "bg-yellow-500 text-white",
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  status?: 'draft'|'submitted'|'approved'|'rejected'|'resubmitted'|'revision_requested';
  showBack?: boolean;
  onBack?: () => void;
  isLoadingTimesheet?: boolean;
}

function HeaderBase({ title, subtitle, status, showBack, onBack, isLoadingTimesheet }: HeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {showBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {status && (
          <Badge className={statusColors[status]}>{status}</Badge>
        )}
        {isLoadingTimesheet && (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Loading timesheet...
          </Badge>
        )}
      </div>
    </div>
  );
}

export default memo(HeaderBase);
