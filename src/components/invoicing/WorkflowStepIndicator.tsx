"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = "department" | "project" | "form";

interface Step {
  id: WorkflowStep;
  name: string;
  description: string;
}

interface WorkflowStepIndicatorProps {
  currentStep: WorkflowStep;
  userRole?: string;
  className?: string;
}

/**
 * Visual indicator showing progress through the invoicing workflow
 * Adapts based on user role (Subconsultants skip department selection)
 */
export function WorkflowStepIndicator({
  currentStep,
  userRole,
  className,
}: WorkflowStepIndicatorProps) {
  const isSubconsultant = userRole === "Subconsultant";

  // Define all steps - department is skipped for subconsultants
  const allSteps: Step[] = [
    {
      id: "department",
      name: "Department",
      description: "Select department",
    },
    {
      id: "project",
      name: "Project",
      description: "Select project",
    },
    {
      id: "form",
      name: "Invoice",
      description: "Create invoice",
    },
  ];

  // Filter steps based on role
  const steps = isSubconsultant
    ? allSteps.filter((step) => step.id !== "department")
    : allSteps;

  // Determine step status
  const getStepStatus = (stepId: WorkflowStep): "complete" | "current" | "upcoming" => {
    const stepOrder: WorkflowStep[] = isSubconsultant
      ? ["project", "form"]
      : ["department", "project", "form"];

    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <nav aria-label="Progress" className={cn("mb-6", className)}>
      <ol className="flex items-center justify-center">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={cn(
                "relative",
                !isLast && "pr-8 sm:pr-20 flex-1"
              )}
            >
              {/* Connector Line */}
              {!isLast && (
                <div
                  className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full transition-colors",
                      status === "complete"
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  />
                </div>
              )}

              {/* Step Circle */}
              <div className="group relative flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    status === "complete" &&
                      "border-primary bg-primary text-primary-foreground",
                    status === "current" &&
                      "border-primary bg-background text-primary ring-4 ring-primary/20",
                    status === "upcoming" &&
                      "border-muted-foreground/25 bg-background text-muted-foreground"
                  )}
                  aria-current={status === "current" ? "step" : undefined}
                >
                  {status === "complete" ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-semibold">
                      {index + 1}
                    </span>
                  )}
                </span>

                {/* Step Label */}
                <div className="mt-2 flex flex-col items-center">
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      status === "current"
                        ? "text-foreground"
                        : status === "complete"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs transition-colors hidden sm:block",
                      status === "current"
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70"
                    )}
                  >
                    {step.description}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Compact mobile-friendly version of the workflow indicator
 */
export function CompactWorkflowIndicator({
  currentStep,
  userRole,
  className,
}: WorkflowStepIndicatorProps) {
  const isSubconsultant = userRole === "Subconsultant";
  const stepOrder: WorkflowStep[] = isSubconsultant
    ? ["project", "form"]
    : ["department", "project", "form"];

  const currentIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length;

  const stepNames: Record<WorkflowStep, string> = {
    department: "Department",
    project: "Project",
    form: "Invoice",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Progress Bar */}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{
            width: `${((currentIndex + 1) / totalSteps) * 100}%`,
          }}
        />
      </div>

      {/* Step Counter */}
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {stepNames[currentStep]} ({currentIndex + 1}/{totalSteps})
      </span>
    </div>
  );
}
