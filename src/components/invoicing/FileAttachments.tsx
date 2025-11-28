import React, { memo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Trash2, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ExistingFile { fileName: string; fileUrl: string }

export interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface FileAttachmentsProps {
  isEditing: boolean;
  isReadOnly: boolean;
  existingFiles: ExistingFile[];
  newFiles: File[];
  uploadingFiles?: FileUploadState[];
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveNew: (index: number) => void;
  onOpenExisting: (file: ExistingFile) => void;
  onRemoveExisting?: (index: number) => void;
}

function FileAttachmentsBase({ isEditing, isReadOnly, existingFiles, newFiles, uploadingFiles = [], onUpload, onRemoveNew, onOpenExisting, onRemoveExisting }: FileAttachmentsProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; index: number | null; type: 'new' | 'existing' | null }>({
    open: false,
    index: null,
    type: null,
  });

  const handleDeleteClick = (index: number, type: 'new' | 'existing') => {
    setDeleteConfirm({ open: true, index, type });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.index !== null) {
      if (deleteConfirm.type === 'new') {
        onRemoveNew(deleteConfirm.index);
      } else if (deleteConfirm.type === 'existing' && onRemoveExisting) {
        onRemoveExisting(deleteConfirm.index);
      }
    }
    setDeleteConfirm({ open: false, index: null, type: null });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="mr-2 h-5 w-5" />
          File Attachments
        </CardTitle>
        <CardDescription>Upload supporting documents for this invoice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing && existingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Previously Attached Files:</h4>
            {existingFiles.map((file, index) => (
              <div key={`${file.fileName}-${index}`} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm truncate max-w-[60%]" title={file.fileName}>{file.fileName}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenExisting(file)}>
                    <Download className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                  {onRemoveExisting && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(index, 'existing')} disabled={isReadOnly} aria-disabled={isReadOnly}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <Input type="file" multiple onChange={onUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" disabled={isReadOnly} aria-disabled={isReadOnly} />
          <p className="text-sm text-muted-foreground mt-1">Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
        </div>

        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploading Files:</h4>
            {uploadingFiles.map((uploadState, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {uploadState.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                    )}
                    {uploadState.status === 'complete' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    {uploadState.status === 'error' && (
                      <Trash2 className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="text-sm truncate" title={uploadState.file.name}>
                      {uploadState.file.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {uploadState.status === 'complete' ? 'Complete' : `${uploadState.progress}%`}
                  </span>
                </div>
                {uploadState.status === 'uploading' && (
                  <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                )}
                {uploadState.status === 'error' && uploadState.error && (
                  <p className="text-xs text-destructive px-2">{uploadState.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {newFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Newly Attached Files:</h4>
            {newFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm truncate max-w-[60%]" title={file.name}>{file.name}</span>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(index, 'new')} disabled={isReadOnly} aria-disabled={isReadOnly}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, index: null, type: null })}
        title="Remove File Attachment"
        description={
          deleteConfirm.type === 'existing'
            ? "Are you sure you want to remove this file attachment? This action cannot be undone."
            : "Are you sure you want to remove this file? It has not been saved yet."
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  );
}

export const FileAttachments = memo(FileAttachmentsBase);
export default FileAttachments;
