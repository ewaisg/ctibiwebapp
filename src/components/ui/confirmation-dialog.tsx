import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { AlertTriangle, Trash2, AlertCircle, Info } from "lucide-react";

export type ConfirmationVariant = "default" | "destructive" | "warning" | "info";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  isLoading?: boolean;
}

/**
 * Reusable confirmation dialog for user actions
 * Supports different variants for different types of confirmations
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <Trash2 className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getActionClassName = () => {
    switch (variant) {
      case "destructive":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "warning":
        return "bg-amber-500 text-white hover:bg-amber-600";
      default:
        return "";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={getActionClassName()}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Pre-configured delete confirmation dialog
 */
interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  itemName: string;
  isLoading?: boolean;
  additionalWarning?: string;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isLoading = false,
  additionalWarning,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={`Delete ${itemName}`}
      description={
        <span>
          Are you sure you want to delete this {itemName.toLowerCase()}? This action cannot be undone.
          {additionalWarning && (
            <>
              <br />
              <br />
              <strong>Warning:</strong> {additionalWarning}
            </>
          )}
        </span>
      }
      confirmText={`Delete ${itemName}`}
      variant="destructive"
      isLoading={isLoading}
    />
  );
}

/**
 * Pre-configured discard changes confirmation dialog
 */
interface DiscardChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function DiscardChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: DiscardChangesDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Discard changes"
      description="You have unsaved changes. Are you sure you want to discard them?"
      confirmText="Discard"
      variant="warning"
      isLoading={isLoading}
    />
  );
}

/**
 * Hook for managing confirmation dialog state
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

  const confirm = (action: () => void | Promise<void>) => {
    setPendingAction(() => action);
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    setIsLoading(true);
    try {
      await pendingAction();
    } finally {
      setIsLoading(false);
      setOpen(false);
      setPendingAction(null);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setPendingAction(null);
  };

  return {
    open,
    isLoading,
    confirm,
    handleConfirm,
    handleCancel,
    setOpen,
  };
}

// Import useState for the hook
import { useState } from "react";
