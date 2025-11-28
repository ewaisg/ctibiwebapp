import { Button } from "./button";
import { Card, CardContent } from "./card";
import {
  FileText,
  FolderOpen,
  Search,
  Clock,
  AlertCircle,
  Package,
  Users,
  FileSpreadsheet,
  type LucideIcon
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {Icon && (
          <div className="rounded-full bg-muted p-3 mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
        {(action || secondaryAction) && (
          <div className="flex gap-3">
            {action && (
              <Button onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for invoice list
 */
interface InvoiceEmptyStateProps {
  onCreateInvoice: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function InvoiceEmptyState({
  onCreateInvoice,
  isFiltered = false,
  onClearFilters
}: InvoiceEmptyStateProps) {
  if (isFiltered) {
    return (
      <EmptyState
        icon={Search}
        title="No invoices found"
        description="No invoices match your current filters. Try adjusting your search criteria or clear the filters to see all invoices."
        action={onClearFilters ? { label: "Clear Filters", onClick: onClearFilters } : undefined}
        secondaryAction={{ label: "Create New Invoice", onClick: onCreateInvoice }}
      />
    );
  }

  return (
    <EmptyState
      icon={FileText}
      title="No invoices yet"
      description="Get started by creating your first invoice. You can track payments, generate PDFs, and manage approvals all in one place."
      action={{ label: "Create First Invoice", onClick: onCreateInvoice }}
    />
  );
}

/**
 * Empty state for project list
 */
interface ProjectEmptyStateProps {
  onCreateProject: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function ProjectEmptyState({
  onCreateProject,
  isFiltered = false,
  onClearFilters
}: ProjectEmptyStateProps) {
  if (isFiltered) {
    return (
      <EmptyState
        icon={Search}
        title="No projects found"
        description="No projects match your current filters. Try adjusting your search criteria or clear the filters to see all projects."
        action={onClearFilters ? { label: "Clear Filters", onClick: onClearFilters } : undefined}
        secondaryAction={{ label: "Create New Project", onClick: onCreateProject }}
      />
    );
  }

  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects yet"
      description="Create your first project to start tracking time, expenses, and deliverables. Projects help you organize work by contract and department."
      action={{ label: "Create First Project", onClick: onCreateProject }}
    />
  );
}

/**
 * Empty state for timesheet list
 */
interface TimesheetEmptyStateProps {
  onUploadTimesheet: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function TimesheetEmptyState({
  onUploadTimesheet,
  isFiltered = false,
  onClearFilters
}: TimesheetEmptyStateProps) {
  if (isFiltered) {
    return (
      <EmptyState
        icon={Search}
        title="No timesheets found"
        description="No timesheets match your current filters. Try adjusting your date range or other criteria to see results."
        action={onClearFilters ? { label: "Clear Filters", onClick: onClearFilters } : undefined}
        secondaryAction={{ label: "Upload Timesheet", onClick: onUploadTimesheet }}
      />
    );
  }

  return (
    <EmptyState
      icon={Clock}
      title="No timesheets yet"
      description="Upload your first timesheet to start tracking employee hours. You can import data from Excel files or your payroll system."
      action={{ label: "Upload First Timesheet", onClick: onUploadTimesheet }}
    />
  );
}

/**
 * Empty state for employee list
 */
interface EmployeeEmptyStateProps {
  onAddEmployee: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function EmployeeEmptyState({
  onAddEmployee,
  isFiltered = false,
  onClearFilters
}: EmployeeEmptyStateProps) {
  if (isFiltered) {
    return (
      <EmptyState
        icon={Search}
        title="No employees found"
        description="No employees match your current search. Try different keywords or clear filters to see all employees."
        action={onClearFilters ? { label: "Clear Filters", onClick: onClearFilters } : undefined}
        secondaryAction={{ label: "Add Employee", onClick: onAddEmployee }}
      />
    );
  }

  return (
    <EmptyState
      icon={Users}
      title="No employees yet"
      description="Add your first employee to start tracking their work hours, projects, and payroll information."
      action={{ label: "Add First Employee", onClick: onAddEmployee }}
    />
  );
}

/**
 * Empty state for dashboard when no data is available
 */
export function DashboardEmptyState() {
  return (
    <EmptyState
      icon={FileSpreadsheet}
      title="No data available"
      description="Start creating projects, uploading timesheets, and generating invoices to see your dashboard analytics."
    />
  );
}

/**
 * Empty state for search results
 */
interface SearchEmptyStateProps {
  searchTerm: string;
  onClearSearch: () => void;
}

export function SearchEmptyState({ searchTerm, onClearSearch }: SearchEmptyStateProps) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${searchTerm}". Try a different search term or clear the search to see all items.`}
      action={{ label: "Clear Search", onClick: onClearSearch }}
    />
  );
}

/**
 * Empty state for generic lists
 */
interface GenericEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function GenericEmptyState({
  title,
  description,
  actionLabel,
  onAction
}: GenericEmptyStateProps) {
  return (
    <EmptyState
      icon={Package}
      title={title}
      description={description}
      action={actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined}
    />
  );
}

/**
 * Empty state with custom icon and styling
 */
interface CustomEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "error" | "warning";
}

export function CustomEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default"
}: CustomEmptyStateProps) {
  const Icon = variant === "error" || variant === "warning" ? AlertCircle : icon;

  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined}
    />
  );
}
