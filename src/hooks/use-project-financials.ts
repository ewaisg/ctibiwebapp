import { useMemo } from "react";
import type { Project } from "@/types";

export interface ProjectFinancialSummary {
  originalPoAmount: number;
  changeOrderAmount: number;
  newPoAmount: number;
  previouslyInvoicedAmount: number;
  remainingPoAmount: number;
  budgetedHours: number;
  usedHours: number;
  remainingHours: number;
}

export function useProjectFinancials(project: Project | null | undefined) {
  const summary = useMemo<ProjectFinancialSummary>(() => {
    const originalPoAmount = Number(project?.originalPoAmount ?? 0);
    const changeOrderAmount = Number(project?.changeOrderAmount ?? 0);
    const newPoAmount = originalPoAmount + changeOrderAmount;
    const previouslyInvoicedAmount = Number(project?.previouslyInvoicedAmount ?? 0);
    const remainingPoAmount = Math.max(0, newPoAmount - previouslyInvoicedAmount);

    const budgetedHours = Number(project?.budgetedHours ?? 0);
    const usedHours = Number(project?.usedHours ?? 0);
    const remainingHours = Math.max(0, budgetedHours - usedHours);

    return {
      originalPoAmount,
      changeOrderAmount,
      newPoAmount,
      previouslyInvoicedAmount,
      remainingPoAmount,
      budgetedHours,
      usedHours,
      remainingHours,
    };
  }, [project?.originalPoAmount, project?.changeOrderAmount, project?.previouslyInvoicedAmount, project?.budgetedHours, project?.usedHours]);

  return summary;
}
