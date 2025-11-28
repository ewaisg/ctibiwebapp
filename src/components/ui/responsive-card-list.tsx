"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/**
 * Responsive card component for mobile-friendly list views
 * Shows as table on desktop, cards on mobile
 */

interface CardField {
  label: string;
  value: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

interface ResponsiveCardProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  status?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  fields: CardField[];
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ResponsiveCard({
  title,
  subtitle,
  status,
  fields,
  actions,
  onClick,
  className,
}: ResponsiveCardProps) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {status && (
            <Badge variant={status.variant || "default"} className="shrink-0">
              {status.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between text-sm",
                field.fullWidth && "flex-col items-start gap-1"
              )}
            >
              <span className="text-muted-foreground font-medium">
                {field.label}
              </span>
              <span className={cn("font-normal", field.className)}>
                {field.value}
              </span>
            </div>
          ))}
        </div>
        {actions && (
          <div className="flex gap-2 mt-4 pt-4 border-t">{actions}</div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Invoice-specific responsive card
 */
interface InvoiceCardProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    projectName?: string;
    companyName?: string;
    invoiceTotal: number;
    status: string;
    paymentStatus?: string;
    createdAt: string;
  };
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  actions?: ReactNode;
}

export function InvoiceCard({
  invoice,
  onView,
  onEdit,
  onDelete,
  actions,
}: InvoiceCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "text-green-600 dark:text-green-400";
      case "partial":
        return "text-amber-600 dark:text-amber-400";
      case "overdue":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <ResponsiveCard
      title={invoice.invoiceNumber}
      subtitle={invoice.projectName}
      status={{
        label: invoice.status,
        variant: getStatusVariant(invoice.status),
      }}
      fields={[
        {
          label: "Company",
          value: invoice.companyName || "N/A",
        },
        {
          label: "Amount",
          value: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(invoice.invoiceTotal),
          className: "font-semibold",
        },
        {
          label: "Payment",
          value: invoice.paymentStatus || "Pending",
          className: getPaymentStatusColor(invoice.paymentStatus),
        },
        {
          label: "Created",
          value: new Date(invoice.createdAt).toLocaleDateString(),
        },
      ]}
      actions={
        actions || (
          <>
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(invoice.id);
                }}
                className="flex-1"
              >
                View
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(invoice.id);
                }}
                className="flex-1"
              >
                Edit
              </Button>
            )}
          </>
        )
      }
    />
  );
}

/**
 * Project-specific responsive card
 */
interface ProjectCardProps {
  project: {
    id: string;
    projectName: string;
    contractNumber?: string;
    companyName?: string;
    status: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
  };
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  actions?: ReactNode;
}

export function ProjectCard({
  project,
  onView,
  onEdit,
  actions,
}: ProjectCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "on hold":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <ResponsiveCard
      title={project.projectName}
      subtitle={project.contractNumber}
      status={{
        label: project.status,
        variant: getStatusVariant(project.status),
      }}
      fields={[
        {
          label: "Company",
          value: project.companyName || "N/A",
        },
        ...(project.startDate
          ? [
              {
                label: "Start Date",
                value: new Date(project.startDate).toLocaleDateString(),
              },
            ]
          : []),
        ...(project.endDate
          ? [
              {
                label: "End Date",
                value: new Date(project.endDate).toLocaleDateString(),
              },
            ]
          : []),
        ...(project.budget
          ? [
              {
                label: "Budget",
                value: new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(project.budget),
                className: "font-semibold",
              },
            ]
          : []),
      ]}
      actions={
        actions || (
          <>
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(project.id);
                }}
                className="flex-1"
              >
                View
              </Button>
            )}
            {onEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project.id);
                }}
                className="flex-1"
              >
                Edit
              </Button>
            )}
          </>
        )
      }
    />
  );
}

/**
 * Container for responsive card lists
 */
interface ResponsiveCardListProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveCardList({
  children,
  className,
}: ResponsiveCardListProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </div>
  );
}
