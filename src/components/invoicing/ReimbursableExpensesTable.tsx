import React, { memo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Company } from '@/types';

interface ExpenseForm {
  amount: string;
  companyId: string;
  companyName?: string;
  date: Date | null;
  description: string;
}

interface ReimbursableExpensesTableProps {
  expenses: ExpenseForm[];
  companies: Company[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ExpenseForm, value: string | number | Date | null | undefined) => void;
}

function ReimbursableExpensesTableBase({ expenses, companies, isReadOnly, onAdd, onRemove, onUpdate }: ReimbursableExpensesTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  });

  const handleDeleteClick = (index: number) => {
    setDeleteConfirm({ open: true, index });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.index !== null) {
      onRemove(deleteConfirm.index);
    }
    setDeleteConfirm({ open: false, index: null });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reimbursable Expenses</CardTitle>
            <CardDescription>Add expenses to be reimbursed</CardDescription>
          </div>
          <Button onClick={onAdd} size="sm" variant="outline" disabled={isReadOnly} aria-disabled={isReadOnly}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length > 0 ? (
          <>
            {/* Desktop Table View - hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={expense.companyId}
                          onValueChange={(value) => onUpdate(index, 'companyId', value)}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger className="w-60">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-60 justify-start text-left font-normal',
                                !expense.date && 'text-muted-foreground'
                              )}
                              disabled={isReadOnly}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {expense.date instanceof Date && !isNaN(expense.date.getTime()) ? expense.date.toDateString() : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3">
                            <Calendar
                              mode="single"
                              selected={expense.date instanceof Date && !isNaN(expense.date.getTime()) ? expense.date : undefined}
                              onSelect={isReadOnly ? undefined : (date) => onUpdate(index, 'date', date)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Expense description"
                          value={expense.description}
                          onChange={(e) => onUpdate(index, 'description', e.target.value)}
                          disabled={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-24"
                          value={expense.amount}
                          onChange={(e) => onUpdate(index, 'amount', e.target.value)}
                          disabled={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(index)}
                          disabled={isReadOnly}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View - visible only on mobile */}
            <div className="md:hidden space-y-4">
              {expenses.map((expense, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Expense #{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(index)}
                      disabled={isReadOnly}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company</label>
                    <Select
                      value={expense.companyId}
                      onValueChange={(value) => onUpdate(index, 'companyId', value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !expense.date && 'text-muted-foreground'
                          )}
                          disabled={isReadOnly}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expense.date instanceof Date && !isNaN(expense.date.getTime()) ? expense.date.toDateString() : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3">
                        <Calendar
                          mode="single"
                          selected={expense.date instanceof Date && !isNaN(expense.date.getTime()) ? expense.date : undefined}
                          onSelect={isReadOnly ? undefined : (date) => onUpdate(index, 'date', date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      placeholder="Expense description"
                      value={expense.description}
                      onChange={(e) => onUpdate(index, 'description', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={expense.amount}
                      onChange={(e) => onUpdate(index, 'amount', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No reimbursable expenses added</p>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, index: null })}
        title="Delete Expense"
        description="Are you sure you want to delete this reimbursable expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  );
}

export const ReimbursableExpensesTable = memo(ReimbursableExpensesTableBase);
export default ReimbursableExpensesTable;
