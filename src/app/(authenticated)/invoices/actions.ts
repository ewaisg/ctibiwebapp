'use server';

import {
  deleteInvoice as _deleteInvoice,
  deleteMultipleInvoices as _deleteMultipleInvoices,
  getInvoiceByIdOrNumber as _getInvoiceByIdOrNumber,
  createHistoricalInvoice as _createHistoricalInvoice,
} from '../invoicing/invoice-crud-actions';

import {
  submitInvoiceForReview as _submitInvoiceForReview,
  approveInvoice as _approveInvoice,
  rejectInvoice as _rejectInvoice,
} from '../invoicing/invoice-workflow-actions';

import {
  generateInvoicePdf as _generateInvoicePdf,
  restoreInvoicePdfVersion as _restoreInvoicePdfVersion,
} from '../invoicing/invoice-pdf-actions';


export async function deleteInvoice(...args: Parameters<typeof _deleteInvoice>): Promise<ReturnType<typeof _deleteInvoice> extends Promise<infer R> ? R : never> {
  return _deleteInvoice(...args) as any;
}

export async function deleteMultipleInvoices(...args: Parameters<typeof _deleteMultipleInvoices>): Promise<ReturnType<typeof _deleteMultipleInvoices> extends Promise<infer R> ? R : never> {
  return _deleteMultipleInvoices(...args) as any;
}

export async function submitInvoiceForReview(...args: Parameters<typeof _submitInvoiceForReview>): Promise<ReturnType<typeof _submitInvoiceForReview> extends Promise<infer R> ? R : never> {
  return _submitInvoiceForReview(...args) as any;
}

export async function approveInvoice(...args: Parameters<typeof _approveInvoice>): Promise<ReturnType<typeof _approveInvoice> extends Promise<infer R> ? R : never> {
  return _approveInvoice(...args) as any;
}

export async function rejectInvoice(...args: Parameters<typeof _rejectInvoice>): Promise<ReturnType<typeof _rejectInvoice> extends Promise<infer R> ? R : never> {
  return _rejectInvoice(...args) as any;
}

export async function generateInvoicePdf(...args: Parameters<typeof _generateInvoicePdf>): Promise<ReturnType<typeof _generateInvoicePdf> extends Promise<infer R> ? R : never> {
  return _generateInvoicePdf(...args) as any;
}

export async function restoreInvoicePdfVersion(...args: Parameters<typeof _restoreInvoicePdfVersion>): Promise<ReturnType<typeof _restoreInvoicePdfVersion> extends Promise<infer R> ? R : never> {
  return _restoreInvoicePdfVersion(...args) as any;
}

export async function getInvoiceByIdOrNumber(...args: Parameters<typeof _getInvoiceByIdOrNumber>): Promise<ReturnType<typeof _getInvoiceByIdOrNumber> extends Promise<infer R> ? R : never> {
  return _getInvoiceByIdOrNumber(...args) as any;
}

export async function createHistoricalInvoice(...args: Parameters<typeof _createHistoricalInvoice>): Promise<ReturnType<typeof _createHistoricalInvoice> extends Promise<infer R> ? R : never> {
  return _createHistoricalInvoice(...args) as any;
}
