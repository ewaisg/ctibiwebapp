import { describe, expect, it } from 'vitest';
import {
  isPendingInvoiceStatus,
  matchesStatusFilter,
  nextSubmissionStatus,
  normalizeInvoiceStatus,
} from './invoice-status';

describe('invoice-status', () => {
  it('normalizes known statuses', () => {
    expect(normalizeInvoiceStatus('DRAFT')).toBe('draft');
    expect(normalizeInvoiceStatus('submitted')).toBe('submitted');
    expect(normalizeInvoiceStatus('resubmitted')).toBe('resubmitted');
    expect(normalizeInvoiceStatus('approved')).toBe('approved');
    expect(normalizeInvoiceStatus('rejected')).toBe('rejected');
    expect(normalizeInvoiceStatus('revision_requested')).toBe('revision_requested');
    expect(normalizeInvoiceStatus('REVISION_REQUESTED')).toBe('revision_requested');
  });

  it('defaults unknown status to draft', () => {
    expect(normalizeInvoiceStatus(undefined)).toBe('draft');
    expect(normalizeInvoiceStatus(null)).toBe('draft');
    expect(normalizeInvoiceStatus('weird_status')).toBe('draft');
  });

  it('treats submitted + resubmitted as pending', () => {
    expect(isPendingInvoiceStatus('submitted')).toBe(true);
    expect(isPendingInvoiceStatus('resubmitted')).toBe(true);
    expect(isPendingInvoiceStatus('draft')).toBe(false);
    expect(isPendingInvoiceStatus('approved')).toBe(false);
  });

  it('maps next submission status correctly', () => {
    expect(nextSubmissionStatus('draft')).toBe('submitted');
    expect(nextSubmissionStatus('rejected')).toBe('resubmitted');
    expect(nextSubmissionStatus('revision_requested')).toBe('resubmitted');
  });

  it('matches status filter semantics', () => {
    expect(matchesStatusFilter('submitted', 'submitted')).toBe(true);
    expect(matchesStatusFilter('resubmitted', 'submitted')).toBe(true);
    expect(matchesStatusFilter('resubmitted', 'resubmitted')).toBe(true);

    expect(matchesStatusFilter('rejected', 'rejected')).toBe(true);
    expect(matchesStatusFilter('revision_requested', 'rejected')).toBe(true);

    expect(matchesStatusFilter('approved', 'submitted')).toBe(false);
    expect(matchesStatusFilter('draft', 'all')).toBe(true);
  });
});
