import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SummarySidebarProps {
  invoiceItemsTotal: number;
  reimbursableExpensesTotal: number;
  invoiceTotal: number;
}

function SummarySidebarBase({ invoiceItemsTotal, reimbursableExpensesTotal, invoiceTotal }: SummarySidebarProps) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span>Invoice Items Total:</span>
          <span className="font-semibold">{formatCurrency(invoiceItemsTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Reimbursable Expenses:</span>
          <span className="font-semibold">{formatCurrency(reimbursableExpensesTotal)}</span>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount:</span>
            <span>{formatCurrency(invoiceTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const SummarySidebar = memo(SummarySidebarBase);
export default SummarySidebar;