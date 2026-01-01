import { describe, expect, it } from 'vitest';
import { getInvoiceAccess } from './invoice-utils';

describe('invoice-utils:getInvoiceAccess', () => {
  const author = { uid: 'u1', role: 'Subconsultant' } as any;
  const admin = { uid: 'admin1', role: 'Admin' } as any;

  it('allows author to submit draft invoice', () => {
    const access = getInvoiceAccess(author, { status: 'draft', userId: 'u1' } as any);
    expect(access.canView).toBe(true);
    expect(access.isReadOnly).toBe(false);
    expect(access.canSubmit).toBe(true);
    expect(access.canResubmit).toBe(false);
  });

  it('allows author to resubmit rejected invoice and edit it', () => {
    const access = getInvoiceAccess(author, { status: 'rejected', userId: 'u1' } as any);
    expect(access.canView).toBe(true);
    expect(access.isReadOnly).toBe(false);
    expect(access.canSubmit).toBe(false);
    expect(access.canResubmit).toBe(true);
  });

  it('allows author to resubmit revision_requested invoice and edit it', () => {
    const access = getInvoiceAccess(author, { status: 'revision_requested', userId: 'u1' } as any);
    expect(access.canView).toBe(true);
    expect(access.isReadOnly).toBe(false);
    expect(access.canSubmit).toBe(false);
    expect(access.canResubmit).toBe(true);
  });

  it('allows Admin/Prime to approve submitted/resubmitted invoices', () => {
    const submitted = getInvoiceAccess(admin, { status: 'submitted', userId: 'u1' } as any);
    const resubmitted = getInvoiceAccess(admin, { status: 'resubmitted', userId: 'u1' } as any);
    expect(submitted.canApprove).toBe(true);
    expect(submitted.canReject).toBe(true);
    expect(resubmitted.canApprove).toBe(true);
    expect(resubmitted.canReject).toBe(true);
  });
});
