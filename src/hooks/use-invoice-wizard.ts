import { useState, useEffect, useCallback } from 'react';
import type { UserRole } from '@/types';

type WizardStep = 'department' | 'project' | 'form';

interface UseInvoiceWizardOptions {
  isEditing: boolean;
  userRole?: UserRole;
  initialFormData?: {
    projectId?: string;
    departmentId?: string;
  };
}

export function useInvoiceWizard({
  isEditing,
  userRole,
  initialFormData,
}: UseInvoiceWizardOptions) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('department');

  // Determine initial step based on user role and editing mode
  useEffect(() => {
    // If editing existing invoice, go directly to form
    if (isEditing) {
      setCurrentStep('form');
      return;
    }

    // For new invoices without initial form data
    if (!initialFormData) {
      if (userRole === 'Subconsultant') {
        setCurrentStep('project'); // Skip department selection
      } else {
        setCurrentStep('department'); // Admin/Prime start with department
      }
    } else if (initialFormData.projectId) {
      // If we have project data from dialog, skip to form
      setCurrentStep('form');
    }
  }, [userRole, initialFormData, isEditing]);

  const goToDepartmentStep = useCallback(() => {
    setCurrentStep('department');
  }, []);

  const goToProjectStep = useCallback(() => {
    setCurrentStep('project');
  }, []);

  const goToFormStep = useCallback(() => {
    setCurrentStep('form');
  }, []);

  return {
    currentStep,
    goToDepartmentStep,
    goToProjectStep,
    goToFormStep,
    setCurrentStep,
  };
}
