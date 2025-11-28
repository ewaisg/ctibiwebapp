import React, { memo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, FileText, HelpCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Employee, Service, InvoiceItemForm } from '@/types';

interface InvoiceItemsTableProps {
  items: InvoiceItemForm[];
  employees: Employee[];
  services: Service[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof InvoiceItemForm, value: string | number) => void;
  error?: string;
  timesheetCount?: number;
  itemErrors?: Record<number, Record<string, string>>;
}

function InvoiceItemsTableBase({ items, employees, services, isReadOnly, onAdd, onRemove, onUpdate, error, timesheetCount, itemErrors }: InvoiceItemsTableProps) {
  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v || 0);

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
            <CardTitle>Invoice Items</CardTitle>
            <CardDescription>Labor hours and services provided</CardDescription>
          </div>
          <Button onClick={onAdd} size="sm" disabled={isReadOnly} aria-disabled={isReadOnly}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <>
            {/* Desktop Table View - hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee/Company</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Markdown %
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Percentage discount applied to the calculated amount (Hours × Rate)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const rowErrors = itemErrors?.[index] || {};
                    return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="space-y-1">
                          <Select
                            value={typeof item.employeeId === 'string' ? item.employeeId : String(item.employeeId)}
                            onValueChange={(value) => onUpdate(index, 'employeeId', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className={`w-40 ${rowErrors.employeeId ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.formalName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {rowErrors.employeeId && <p className="text-xs text-destructive">{rowErrors.employeeId}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Select
                            value={typeof item.serviceId === 'string' ? item.serviceId : String(item.serviceId)}
                            onValueChange={(value) => onUpdate(index, 'serviceId', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className={`w-40 ${rowErrors.serviceId ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.serviceName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {rowErrors.serviceId && <p className="text-xs text-destructive">{rowErrors.serviceId}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            className={`w-20 ${rowErrors.hours ? 'border-destructive' : ''}`}
                            value={item.hours}
                            onChange={(e) => onUpdate(index, 'hours', parseFloat(e.target.value) || 0)}
                            disabled={isReadOnly}
                          />
                          {rowErrors.hours && <p className="text-xs text-destructive">{rowErrors.hours}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`w-24 ${rowErrors.billingRate ? 'border-destructive' : ''}`}
                            value={item.billingRate}
                            onChange={(e) => onUpdate(index, 'billingRate', parseFloat(e.target.value) || 0)}
                            disabled={isReadOnly}
                          />
                          {rowErrors.billingRate && <p className="text-xs text-destructive">{rowErrors.billingRate}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          value={item.markdown}
                          onChange={(e) => onUpdate(index, 'markdown', parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="Notes"
                          className="w-32"
                          value={item.notes}
                          onChange={(e) => onUpdate(index, 'notes', e.target.value)}
                          disabled={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(index)} disabled={isReadOnly}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View - visible only on mobile */}
            <div className="md:hidden space-y-4">
              {items.map((item, index) => {
                const rowErrors = itemErrors?.[index] || {};
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Item #{index + 1}</span>
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
                      <label className="text-sm font-medium">Employee</label>
                      <Select
                        value={typeof item.employeeId === 'string' ? item.employeeId : String(item.employeeId)}
                        onValueChange={(value) => onUpdate(index, 'employeeId', value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className={`w-full ${rowErrors.employeeId ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.formalName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rowErrors.employeeId && <p className="text-xs text-destructive">{rowErrors.employeeId}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Service</label>
                      <Select
                        value={typeof item.serviceId === 'string' ? item.serviceId : String(item.serviceId)}
                        onValueChange={(value) => onUpdate(index, 'serviceId', value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className={`w-full ${rowErrors.serviceId ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.serviceName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rowErrors.serviceId && <p className="text-xs text-destructive">{rowErrors.serviceId}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Hours</label>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          className={rowErrors.hours ? 'border-destructive' : ''}
                          value={item.hours}
                          onChange={(e) => onUpdate(index, 'hours', parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                        />
                        {rowErrors.hours && <p className="text-xs text-destructive">{rowErrors.hours}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rate</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className={rowErrors.billingRate ? 'border-destructive' : ''}
                          value={item.billingRate}
                          onChange={(e) => onUpdate(index, 'billingRate', parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                        />
                        {rowErrors.billingRate && <p className="text-xs text-destructive">{rowErrors.billingRate}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <label className="text-sm font-medium">Markdown %</label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Percentage discount applied to the calculated amount</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          type="number"
                          step="0.1"
                          value={item.markdown}
                          onChange={(e) => onUpdate(index, 'markdown', parseFloat(e.target.value) || 0)}
                          disabled={isReadOnly}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <Input
                        placeholder="Optional notes"
                        value={item.notes}
                        onChange={(e) => onUpdate(index, 'notes', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No invoice items added</h3>
            <p className="text-sm mb-4">
              {timesheetCount && timesheetCount > 0
                ? "Timesheet data was found but couldn't be automatically processed. Add items manually."
                : "Add labor hours and services to create your invoice"}
            </p>
            <Button onClick={onAdd} disabled={isReadOnly}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Item
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, index: null })}
        title="Delete Invoice Item"
        description="Are you sure you want to delete this invoice item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Card>
  );
}

export const InvoiceItemsTable = memo(InvoiceItemsTableBase);
export default InvoiceItemsTable;
