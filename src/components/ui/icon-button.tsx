import { forwardRef } from "react";
import { Button, buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import { Loader2, type LucideIcon } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

interface IconButtonProps extends Omit<React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>, "children"> {
  icon: LucideIcon;
  label: string; // Required for accessibility
  loading?: boolean;
  iconClassName?: string;
  /**
   * Show tooltip on hover
   * @default false
   */
  showTooltip?: boolean;
}

/**
 * Icon-only button with proper ARIA labels for accessibility
 * Always includes aria-label for screen readers
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      label,
      loading = false,
      iconClassName,
      showTooltip = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <Button
        ref={ref}
        aria-label={label}
        title={showTooltip ? label : undefined}
        disabled={isDisabled}
        className={cn("h-9 w-9 p-0", className)}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", iconClassName)} />
        ) : (
          <Icon className={cn("h-4 w-4", iconClassName)} />
        )}
        <span className="sr-only">{label}</span>
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

/**
 * Pre-configured icon buttons for common actions
 */
import {
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Plus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  Save,
  Copy,
  ExternalLink,
  Settings,
} from "lucide-react";

export const EditButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Edit}
    label={props.label || "Edit"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
EditButton.displayName = "EditButton";

export const DeleteButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Trash2}
    label={props.label || "Delete"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
DeleteButton.displayName = "DeleteButton";

export const ViewButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Eye}
    label={props.label || "View"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
ViewButton.displayName = "ViewButton";

export const DownloadButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Download}
    label={props.label || "Download"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
DownloadButton.displayName = "DownloadButton";

export const UploadButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Upload}
    label={props.label || "Upload"}
    variant="outline"
    showTooltip
    {...props}
  />
));
UploadButton.displayName = "UploadButton";

export const AddButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Plus}
    label={props.label || "Add"}
    variant="default"
    showTooltip
    {...props}
  />
));
AddButton.displayName = "AddButton";

export const CloseButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={X}
    label={props.label || "Close"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
CloseButton.displayName = "CloseButton";

export const SaveButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Save}
    label={props.label || "Save"}
    variant="default"
    showTooltip
    {...props}
  />
));
SaveButton.displayName = "SaveButton";

export const RefreshButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={RefreshCw}
    label={props.label || "Refresh"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
RefreshButton.displayName = "RefreshButton";

export const CopyButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Copy}
    label={props.label || "Copy"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
CopyButton.displayName = "CopyButton";

export const MoreButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={MoreHorizontal}
    label={props.label || "More options"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
MoreButton.displayName = "MoreButton";

export const SettingsButton = forwardRef<
  HTMLButtonElement,
  Omit<IconButtonProps, "icon" | "label"> & { label?: string }
>((props, ref) => (
  <IconButton
    ref={ref}
    icon={Settings}
    label={props.label || "Settings"}
    variant="ghost"
    showTooltip
    {...props}
  />
));
SettingsButton.displayName = "SettingsButton";
