import { useState, useCallback } from 'react';
import type { InvoiceItemForm } from '@/types';

interface InvoiceFormData {
  projectId: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
  dueDate: Date | undefined;
  invoiceNumber: string;
  invoiceItems: InvoiceItemForm[];
}

export function useInvoiceValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, Record<string, string>>>({});

  const validateField = useCallback((fieldName: string, value: any, formData: InvoiceFormData) => {
    const newFieldErrors = { ...fieldErrors };

    switch (fieldName) {
      case 'fromDate':
        if (!value) {
          newFieldErrors.fromDate = "From date is required";
        } else if (formData.toDate && value > formData.toDate) {
          newFieldErrors.fromDate = "From date must be before To date";
        } else {
          delete newFieldErrors.fromDate;
        }
        break;

      case 'toDate':
        if (!value) {
          newFieldErrors.toDate = "To date is required";
        } else if (formData.fromDate && value < formData.fromDate) {
          newFieldErrors.toDate = "To date must be after From date";
        } else {
          delete newFieldErrors.toDate;
          // Clear fromDate error if it was about date range
          if (fieldErrors.fromDate?.includes("before To date")) {
            delete newFieldErrors.fromDate;
          }
        }
        break;

      case 'dueDate':
        if (!value) {
          newFieldErrors.dueDate = "Due date is required";
        } else if (formData.toDate && value < formData.toDate) {
          newFieldErrors.dueDate = "Due date should be after To date";
        } else {
          delete newFieldErrors.dueDate;
        }
        break;

      case 'invoiceNumber':
        // Optional field, but if provided should not be empty string
        if (value && String(value).trim() === '') {
          newFieldErrors.invoiceNumber = "Invoice number cannot be empty";
        } else {
          delete newFieldErrors.invoiceNumber;
        }
        break;

      default:
        break;
    }

    setFieldErrors(newFieldErrors);
    return Object.keys(newFieldErrors).length === 0;
  }, [fieldErrors]);

  const validateInvoiceItem = useCallback((
    index: number,
    field: keyof InvoiceItemForm,
    value: string | number,
  ) => {
    const newItemErrors = { ...itemErrors };
    if (!newItemErrors[index]) {
      newItemErrors[index] = {};
    }

    switch (field) {
      case 'employeeId':
        if (!value || String(value).trim() === '') {
          newItemErrors[index].employeeId = "Employee required";
        } else {
          delete newItemErrors[index].employeeId;
        }
        break;

      case 'serviceId':
        if (!value || String(value).trim() === '') {
          newItemErrors[index].serviceId = "Service required";
        } else {
          delete newItemErrors[index].serviceId;
        }
        break;

      case 'hours':
        if (!value || Number(value) <= 0) {
          newItemErrors[index].hours = "Hours must be > 0";
        } else {
          delete newItemErrors[index].hours;
        }
        break;

      case 'billingRate':
        if (!value || Number(value) <= 0) {
          newItemErrors[index].billingRate = "Rate must be > 0";
        } else {
          delete newItemErrors[index].billingRate;
        }
        break;

      default:
        break;
    }

    // Clean up empty error objects
    if (Object.keys(newItemErrors[index]).length === 0) {
      delete newItemErrors[index];
    }

    setItemErrors(newItemErrors);
  }, [itemErrors]);

  const validateForm = useCallback((formData: InvoiceFormData) => {
    const newErrors: Record<string, string> = {};
    const newItemErrors: Record<number, Record<string, string>> = {};

    if (!formData.projectId) newErrors.projectId = "Project is required";
    if (!formData.fromDate) newErrors.fromDate = "From date is required";
    if (!formData.toDate) newErrors.toDate = "To date is required";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";
    if (formData.invoiceItems.length === 0) newErrors.invoiceItems = "At least one invoice item is required";

    // Validate date ranges
    if (formData.fromDate && formData.toDate && formData.fromDate > formData.toDate) {
      newErrors.fromDate = "From date must be before To date";
    }
    if (formData.toDate && formData.dueDate && formData.dueDate < formData.toDate) {
      newErrors.dueDate = "Due date should be after To date";
    }

    // Validate each invoice item
    formData.invoiceItems.forEach((item, index) => {
      const rowErrors: Record<string, string> = {};

      if (!item.employeeId || String(item.employeeId).trim() === '') {
        rowErrors.employeeId = "Employee required";
      }
      if (!item.serviceId || String(item.serviceId).trim() === '') {
        rowErrors.serviceId = "Service required";
      }
      if (!item.hours || Number(item.hours) <= 0) {
        rowErrors.hours = "Hours must be > 0";
      }
      if (!item.billingRate || Number(item.billingRate) <= 0) {
        rowErrors.billingRate = "Rate must be > 0";
      }

      if (Object.keys(rowErrors).length > 0) {
        newItemErrors[index] = rowErrors;
      }
    });

    setErrors(newErrors);
    setFieldErrors(newErrors);
    setItemErrors(newItemErrors);

    return Object.keys(newErrors).length === 0 && Object.keys(newItemErrors).length === 0;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setFieldErrors({});
    setItemErrors({});
  }, []);

  return {
    errors,
    fieldErrors,
    itemErrors,
    setErrors,
    validateField,
    validateInvoiceItem,
    validateForm,
    clearErrors,
  };
}
