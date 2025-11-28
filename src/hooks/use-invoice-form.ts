import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { InvoiceItemForm } from "@/types";

export interface ReimbursableExpenseForm {
  amount: string;
  companyId: string;
  companyName?: string;
  date: Date | null;
  description: string;
}

export interface InvoiceFormData {
  departmentId: string;
  projectId: string;
  contractNumber: string;
  poNumber: string;
  pmisNumber: string;
  invoiceNumber: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
  dueDate: Date | undefined;
  termOfWeek: string;
  approvingSupervisor: string;
  invoiceItems: InvoiceItemForm[];
  reimbursableExpenses: ReimbursableExpenseForm[];
  attachedFiles: File[];
  notes: string;
}

const getDefaultFormData = (initial?: Partial<InvoiceFormData>): InvoiceFormData => ({
  departmentId: "",
  projectId: "",
  contractNumber: "",
  poNumber: "",
  pmisNumber: "",
  invoiceNumber: "",
  fromDate: undefined,
  toDate: undefined,
  dueDate: undefined,
  termOfWeek: "",
  approvingSupervisor: "",
  invoiceItems: [],
  reimbursableExpenses: [],
  attachedFiles: [],
  notes: "",
  ...initial,
});

export interface ValidationErrors {
  departmentId?: string;
  projectId?: string;
  invoiceNumber?: string;
  fromDate?: string;
  toDate?: string;
  dueDate?: string;
  invoiceItems?: string;
  [key: string]: string | undefined;
}

export function useInvoiceForm(initial?: Partial<InvoiceFormData>) {
  const [formData, setFormData] = useState<InvoiceFormData>(() => getDefaultFormData(initial));

  // Store initial data for reset and dirty tracking
  const initialDataRef = useRef<InvoiceFormData>(getDefaultFormData(initial));

  // Update initial data ref when initial prop changes
  useEffect(() => {
    if (initial) {
      initialDataRef.current = getDefaultFormData(initial);
    }
  }, [initial]);

  const totals = useMemo(() => {
    const itemsTotal = formData.invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const expensesTotal = formData.reimbursableExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const hoursTotal = formData.invoiceItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
    return { itemsTotal, expensesTotal, hoursTotal, grandTotal: itemsTotal + expensesTotal };
  }, [formData.invoiceItems, formData.reimbursableExpenses]);

  // Dirty tracking: compare current state with initial state
  const isDirty = useMemo(() => {
    const initial = initialDataRef.current;
    return (
      formData.departmentId !== initial.departmentId ||
      formData.projectId !== initial.projectId ||
      formData.contractNumber !== initial.contractNumber ||
      formData.poNumber !== initial.poNumber ||
      formData.pmisNumber !== initial.pmisNumber ||
      formData.invoiceNumber !== initial.invoiceNumber ||
      formData.fromDate?.getTime() !== initial.fromDate?.getTime() ||
      formData.toDate?.getTime() !== initial.toDate?.getTime() ||
      formData.dueDate?.getTime() !== initial.dueDate?.getTime() ||
      formData.termOfWeek !== initial.termOfWeek ||
      formData.approvingSupervisor !== initial.approvingSupervisor ||
      formData.notes !== initial.notes ||
      formData.invoiceItems.length !== initial.invoiceItems.length ||
      formData.reimbursableExpenses.length !== initial.reimbursableExpenses.length ||
      formData.attachedFiles.length !== initial.attachedFiles.length
    );
  }, [formData]);

  const addItem = useCallback((item: InvoiceItemForm) => {
    setFormData(prev => ({ ...prev, invoiceItems: [...prev.invoiceItems, item] }));
  }, []);

  const updateItem = useCallback((index: number, patch: Partial<InvoiceItemForm>) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.filter((_, i) => i !== index),
    }));
  }, []);

  const addExpense = useCallback((exp: ReimbursableExpenseForm) => {
    setFormData(prev => ({ ...prev, reimbursableExpenses: [...prev.reimbursableExpenses, exp] }));
  }, []);

  const updateExpense = useCallback((index: number, patch: Partial<ReimbursableExpenseForm>) => {
    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: prev.reimbursableExpenses.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  }, []);

  const removeExpense = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      reimbursableExpenses: prev.reimbursableExpenses.filter((_, i) => i !== index),
    }));
  }, []);

  // Reset form to initial state
  const reset = useCallback(() => {
    setFormData(initialDataRef.current);
  }, []);

  // Validate form data
  const validate = useCallback((): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    // Required fields
    if (!formData.departmentId || formData.departmentId.trim() === '') {
      errors.departmentId = 'Department is required';
    }

    if (!formData.projectId || formData.projectId.trim() === '') {
      errors.projectId = 'Project is required';
    }

    if (!formData.invoiceNumber || formData.invoiceNumber.trim() === '') {
      errors.invoiceNumber = 'Invoice number is required';
    }

    if (!formData.fromDate) {
      errors.fromDate = 'Start date is required';
    }

    if (!formData.toDate) {
      errors.toDate = 'End date is required';
    }

    // Date validation
    if (formData.fromDate && formData.toDate && formData.fromDate > formData.toDate) {
      errors.toDate = 'End date must be after start date';
    }

    if (formData.dueDate && formData.toDate && formData.dueDate < formData.toDate) {
      errors.dueDate = 'Due date should be after the invoice period end date';
    }

    // Invoice items validation
    if (formData.invoiceItems.length === 0 && formData.reimbursableExpenses.length === 0) {
      errors.invoiceItems = 'At least one invoice item or expense is required';
    }

    const isValid = Object.keys(errors).length === 0;
    return { isValid, errors };
  }, [formData]);

  return {
    formData,
    setFormData,
    totals,
    isDirty,
    reset,
    validate,
    addItem,
    updateItem,
    removeItem,
    addExpense,
    updateExpense,
    removeExpense,
  };
}
