"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const paymentStatusColors: { [key: string]: string } = {
  paid: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  unpaid: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  partially_paid: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  write_off: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800",
};

export interface PaymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
}

export function PaymentDrawer({ open, onOpenChange, invoice }: PaymentDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [summaryPaid, setSummaryPaid] = useState<number>(0);
  const [summaryOutstanding, setSummaryOutstanding] = useState<number>(0);
  const [summaryStatus, setSummaryStatus] = useState<'paid' | 'unpaid' | 'pending' | 'partially_paid' | 'write_off' | undefined>(undefined);

  const [entryType, setEntryType] = useState<'payment' | 'write_off' | 'credit' | 'refund'>('payment');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>('');
  const [entryMethod, setEntryMethod] = useState<'Check' | 'ACH' | 'Wire' | 'Credit Card' | ''>('');
  const [entryReference, setEntryReference] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [savingEntry, setSavingEntry] = useState(false);

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editType, setEditType] = useState<'payment' | 'write_off' | 'credit' | 'refund'>('payment');
  const [editDate, setEditDate] = useState<string>('');
  const [editMethod, setEditMethod] = useState<'Check' | 'ACH' | 'Wire' | 'Credit Card' | ''>('');
  const [editReference, setEditReference] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);

  useEffect(() => {
    const loadHistory = async () => {
      if (!open || !invoice?.id) return;
      try {
        const { getPaymentHistory } = await import("@/app/(authenticated)/admin/actions");
        const res = await getPaymentHistory(invoice.id as string);
        const items = res?.success && Array.isArray(res.items) ? res.items : [];
        setPaymentHistory(items);
        const latest = items[0];
        const invoiceTotal = Number(invoice?.invoiceTotal || 0);
        const paid = Number(latest?.paidAmount || 0);
        const outstanding = Number(latest?.outstandingAmount ?? Math.max(0, invoiceTotal - paid));
        const dueDateStr = invoice?.dueDate as string | undefined;
        const dueDate = dueDateStr ? new Date(dueDateStr) : undefined;
        let status: typeof summaryStatus = undefined;
        if (paid >= invoiceTotal && invoiceTotal > 0) status = 'paid';
        else if (paid > 0) status = 'partially_paid';
        else if (dueDate && dueDate.getTime() < Date.now()) status = 'unpaid';
        else status = 'pending';
        setSummaryPaid(paid);
        setSummaryOutstanding(outstanding);
        setSummaryStatus(status);
      } catch {
        setPaymentHistory([]);
        const invoiceTotal = Number(invoice?.invoiceTotal || 0);
        setSummaryPaid(0);
        setSummaryOutstanding(invoiceTotal);
        setSummaryStatus('pending');
      }
    };
    loadHistory();
  }, [open, invoice?.id]);

  const openEdit = (entry: any) => {
    setEditTarget(entry);
    setEditAmount(String(entry.deltaAmount || 0));
    setEditType(entry.entryType || 'payment');
    setEditDate(entry.paymentDate ? entry.paymentDate.slice(0,10) : '');
    setEditMethod(entry.paymentMethod || '');
    setEditReference(entry.paymentReference || '');
    setEditNotes(entry.notes || '');
  };

  const applyEdit = async () => {
    if (!editTarget || !invoice?.id) return;
    const n = Number(editAmount);
    if (!n || isNaN(n) || n <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const { updatePaymentEntry, getPaymentHistory } = await import("@/app/(authenticated)/admin/actions");
      const res = await updatePaymentEntry({
        entryId: editTarget.id,
        invoiceId: invoice.id as string,
        entryType: editType,
        amount: n,
        paymentDate: editDate ? new Date(editDate) : undefined,
        paymentMethod: editType === 'payment' ? (editMethod || undefined) : undefined,
        paymentReference: editReference || undefined,
        notes: editNotes || undefined,
      });
      if (res?.success) {
        toast({ title: 'Entry updated' });
        const hist = await getPaymentHistory(invoice.id as string);
        const items = hist?.success && Array.isArray(hist.items) ? hist.items : [];
        setPaymentHistory(items);
        const latest = items[0];
        const invoiceTotal = Number(invoice?.invoiceTotal || 0);
        const paid = Number(latest?.paidAmount || 0);
        const outstanding = Number(latest?.outstandingAmount ?? Math.max(0, invoiceTotal - paid));
        let status: typeof summaryStatus = undefined;
        if (paid >= invoiceTotal && invoiceTotal > 0) status = 'paid';
        else if (paid > 0) status = 'partially_paid';
        else status = 'pending';
        setSummaryPaid(paid);
        setSummaryOutstanding(outstanding);
        setSummaryStatus(status);
        setEditTarget(null);
        router.refresh();
      } else {
        toast({ title: 'Update failed', description: (res as any)?.message || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const voidEntry = async (entry: any) => {
    if (!entry?.id || !invoice?.id) return;
    try {
      const { voidPaymentEntry, getPaymentHistory } = await import("@/app/(authenticated)/admin/actions");
      const res = await voidPaymentEntry({ entryId: entry.id, invoiceId: invoice.id as string });
      if (res?.success) {
        toast({ title: 'Entry voided' });
        const hist = await getPaymentHistory(invoice.id as string);
        const items = hist?.success && Array.isArray(hist.items) ? hist.items : [];
        setPaymentHistory(items);
        const latest = items[0];
        const invoiceTotal = Number(invoice?.invoiceTotal || 0);
        const paid = Number(latest?.paidAmount || 0);
        const outstanding = Number(latest?.outstandingAmount ?? Math.max(0, invoiceTotal - paid));
        let status: typeof summaryStatus = undefined;
        if (paid >= invoiceTotal && invoiceTotal > 0) status = 'paid';
        else if (paid > 0) status = 'partially_paid';
        else status = 'pending';
        setSummaryPaid(paid);
        setSummaryOutstanding(outstanding);
        setSummaryStatus(status);
        router.refresh();
      } else {
        toast({ title: 'Void failed', description: (res as any)?.message || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Void failed', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const validateEntry = () => {
    const amountNum = Number(entryAmount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return { valid: false, amountNum: 0 };
    }
    return { valid: true, amountNum };
  };

  const handleSaveEntry = async () => {
    if (!user || !invoice?.id) return;

    const { valid, amountNum } = validateEntry();
    if (!valid) return;

    const latest = paymentHistory[0];
    const prevPaid = Number(latest?.paidAmount || 0);
    const prevOutstanding = Number(latest?.outstandingAmount || ((invoice as any).invoiceTotal || 0) - prevPaid);

    if (entryType === 'payment') {
      if (prevOutstanding <= 0) {
        toast({ title: 'Already paid', description: 'Invoice is fully paid. No additional payments allowed.', variant: 'destructive' });
        return;
      }
      if (amountNum > prevOutstanding) {
        toast({ title: 'Amount exceeds outstanding', description: 'Reduce the amount or use Refund/Credit.', variant: 'destructive' });
        return;
      }
    } else if (entryType === 'refund') {
      if (prevPaid <= 0) {
        toast({ title: 'No payments to refund', variant: 'destructive' });
        return;
      }
      if (amountNum > prevPaid) {
        toast({ title: 'Refund exceeds total paid', variant: 'destructive' });
        return;
      }
    } else if (entryType === 'write_off' || entryType === 'credit') {
      if (prevOutstanding <= 0) {
        toast({ title: 'No outstanding to adjust', variant: 'destructive' });
        return;
      }
      if (amountNum > prevOutstanding) {
        toast({ title: 'Adjustment exceeds outstanding', variant: 'destructive' });
        return;
      }
    }

    setSavingEntry(true);
    try {
      const { addPaymentEntry, getPaymentHistory } = await import("@/app/(authenticated)/admin/actions");
      const payload = {
        invoiceId: invoice.id as string,
        invoiceNumber: (invoice as any).invoiceNumber || (invoice as any).id,
        projectId: (invoice as any).projectIdString || (invoice as any).projectId || '',
        projectName: (invoice as any).projectName || '',
        entryType,
        amount: amountNum,
        paymentDate: entryDate ? new Date(entryDate) : undefined,
        paymentMethod: entryType === 'payment' ? (entryMethod || undefined) : undefined,
        paymentReference: entryReference || undefined,
        notes: entryNotes || undefined,
      } as const;

      const res = await addPaymentEntry(payload as any);
      if (res?.success) {
        toast({ title: 'Entry saved' });
        const hist = await getPaymentHistory(invoice.id as string);
        const items = hist?.success && Array.isArray(hist.items) ? hist.items : [];
        setPaymentHistory(items);
        const latest = items[0];
        const invoiceTotal = Number(invoice?.invoiceTotal || 0);
        const paid = Number(latest?.paidAmount || 0);
        const outstanding = Number(latest?.outstandingAmount ?? Math.max(0, invoiceTotal - paid));
        let status: typeof summaryStatus = undefined;
        if (paid >= invoiceTotal && invoiceTotal > 0) status = 'paid';
        else if (paid > 0) status = 'partially_paid';
        else status = summaryStatus;
        setSummaryPaid(paid);
        setSummaryOutstanding(outstanding);
        setSummaryStatus(status);
        setEntryAmount('');
        setEntryDate('');
        setEntryMethod('');
        setEntryReference('');
        setEntryNotes('');
        router.refresh();
      } else {
        toast({ title: 'Failed to save entry', description: (res as any)?.message || 'Unknown error', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Failed to save entry', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setSavingEntry(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Manage Payment</SheetTitle>
          <SheetDescription>
            {invoice ? `Invoice ${invoice.invoiceNumber || invoice.id}` : 'Select an invoice to manage payments.'}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Invoice Total</div>
              <div className="text-sm font-medium">{formatCurrency(invoice?.invoiceTotal || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Paid</div>
              <div className="text-sm font-medium">{formatCurrency(summaryPaid)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Outstanding</div>
              <div className="text-sm font-medium">{formatCurrency(summaryOutstanding)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Payment Status</div>
              <div>
                {summaryStatus ? (
                  <Badge variant="outline" className={paymentStatusColors[summaryStatus] || ''}>
                    {summaryStatus === 'partially_paid' ? 'Partially Paid' : (summaryStatus === 'write_off' ? 'Write-Off' : summaryStatus)}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </div>
            </div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-2">Add Entry</div>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={entryType} onValueChange={(v) => setEntryType(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="write_off">Write-Off</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" placeholder="0.00" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={entryMethod} onValueChange={(v) => setEntryMethod(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="ACH">ACH</SelectItem>
                      <SelectItem value="Wire">Wire</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Reference</Label>
                <Input placeholder="e.g., Check #, Transaction ID" value={entryReference} onChange={(e) => setEntryReference(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea placeholder="Optional" value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="destructive" onClick={async () => {
                  try {
                    const mod = await import("@/app/(authenticated)/admin/actions");
                    const res = await (mod as any).deleteLatestPaymentEntry(invoice!.id as string);
                    if (res?.success) {
                      toast({ title: 'Latest entry deleted' });
                      const hist = await (mod as any).getPaymentHistory(invoice!.id as string);
                      const items = hist?.success && Array.isArray(hist.items) ? hist.items : [];
                      setPaymentHistory(items);
                      const latest = items[0];
                      const invoiceTotal = Number(invoice?.invoiceTotal || 0);
                      const paid = Number(latest?.paidAmount || 0);
                      const outstanding = Number(latest?.outstandingAmount ?? Math.max(0, invoiceTotal - paid));
                      let status: typeof summaryStatus = undefined;
                      if (paid >= invoiceTotal && invoiceTotal > 0) status = 'paid';
                      else if (paid > 0) status = 'partially_paid';
                      else status = 'pending';
                      setSummaryPaid(paid);
                      setSummaryOutstanding(outstanding);
                      setSummaryStatus(status);
                      router.refresh();
                    } else {
                      toast({ title: 'Delete failed', description: (res as any)?.message || 'Unknown error', variant: 'destructive' });
                    }
                  } catch (e: any) {
                    toast({ title: 'Delete failed', description: e?.message || String(e), variant: 'destructive' });
                  }
                }}>Delete Latest Entry</Button>
                <Button onClick={handleSaveEntry} disabled={savingEntry || !entryAmount}>Save Entry</Button>
              </div>
            </div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-sm font-medium mb-2">History</div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {paymentHistory.length ? paymentHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium capitalize flex items-center gap-2">
                      {h.entryType || 'payment'}
                      {h.voided ? <Badge variant="destructive">Voided</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{h.paymentDate || h.createdAt || ''}</div>
                  </div>
                  <div className="text-right">
                    <div>{formatCurrency(h.deltaAmount || h.paidAmount || 0)}</div>
                    <div className="text-xs text-muted-foreground">Paid: {formatCurrency(h.paidAmount || 0)} | Outst: {formatCurrency(h.outstandingAmount || 0)}</div>
                    <div className="flex justify-end gap-2 mt-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(h)} disabled={!!h.voided}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => voidEntry(h)} disabled={!!h.voided}>Void</Button>
                    </div>
                  </div>
                </div>
              )) : <div className="text-xs text-muted-foreground">No entries yet.</div>}
            </div>

            {editTarget ? (
              <div className="mt-3 border-t pt-3 space-y-2">
                <div className="text-xs font-medium">Edit Entry</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={editType} onValueChange={(v) => setEditType(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="write_off">Write-Off</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.00" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Method</Label>
                    <Select value={editMethod} onValueChange={(v) => setEditMethod(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="ACH">ACH</SelectItem>
                        <SelectItem value="Wire">Wire</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input placeholder="e.g., Check #, Transaction ID" value={editReference} onChange={(e) => setEditReference(e.target.value)} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="Optional" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                  <Button onClick={applyEdit} disabled={savingEdit}>Save Changes</Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <SheetFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
