import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, FileText, CheckCircle, XCircle, RefreshCw, Download, History } from 'lucide-react';

interface WorkflowActionsProps {
  isEditing: boolean;
  isReadOnly: boolean;
  isAdminOrPrime: boolean;
  canSubmit: boolean;
  canResubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canGeneratePdf: boolean;
  canRestorePdf: boolean;
  invStatus: 'draft'|'submitted'|'approved'|'rejected'|'resubmitted'|'revision_requested';
  actionLoading: boolean;
  existingInvoice?: { id?: string; pdfUrl?: string } | null;
  onSaveChanges: () => void;
  onSubmitForReview: () => void;
  onApprove: () => void;
  onOpenReject: () => void;
  onGeneratePdf: () => void;
  onOpenRestore: () => void;
  onCreateSubmitted: () => void;
  onCreateDraft: () => void;
}

function WorkflowActionsBase({
  isEditing,
  isReadOnly,
  isAdminOrPrime,
  canSubmit,
  canResubmit,
  canApprove,
  canReject,
  canGeneratePdf,
  canRestorePdf,
  invStatus,
  actionLoading,
  existingInvoice,
  onSaveChanges,
  onSubmitForReview,
  onApprove,
  onOpenReject,
  onGeneratePdf,
  onOpenRestore,
  onCreateSubmitted,
  onCreateDraft,
}: WorkflowActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isEditing && existingInvoice?.id ? (
          <div className="space-y-2">
            {!isReadOnly && (
              <Button onClick={onSaveChanges} variant="secondary" className="w-full" disabled={actionLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            )}

            {(canSubmit || canResubmit) && (
              <Button onClick={onSubmitForReview} className="w-full" disabled={actionLoading}>
                <FileText className="mr-2 h-4 w-4" />
                {invStatus === 'rejected' || invStatus === 'revision_requested' ? 'Resubmit for Review' : 'Submit for Review'}
              </Button>
            )}

            {canApprove && (
              <Button onClick={onApprove} className="w-full" disabled={actionLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            )}
            {canReject && (
              <Button onClick={onOpenReject} variant="outline" className="w-full" disabled={actionLoading}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject...
              </Button>
            )}

            {canGeneratePdf && (
              <Button onClick={onGeneratePdf} variant="secondary" className="w-full" disabled={actionLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate/Refresh PDF
              </Button>
            )}
            {isAdminOrPrime && existingInvoice?.pdfUrl && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const sanitizedUrl = (existingInvoice.pdfUrl || '').replace(/[<>"']/g, '');
                  if (sanitizedUrl) window.open(sanitizedUrl, '_blank');
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
            {canRestorePdf && (
              <Button onClick={onOpenRestore} variant="outline" className="w-full" disabled={actionLoading}>
                <History className="mr-2 h-4 w-4" />
                Restore PDF Version...
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Button onClick={onCreateSubmitted} className="w-full" disabled={actionLoading}>
              <FileText className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
            <Button variant="outline" className="w-full" disabled={actionLoading} onClick={onCreateDraft}>
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const WorkflowActions = memo(WorkflowActionsBase);
export default WorkflowActions;