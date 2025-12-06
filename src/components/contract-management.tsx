"use client";

import React, { useState } from "react";
import { Plus, Upload, MoreVertical, Edit, Trash2, FileText, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContractForm } from "@/components/contract-form";
import { ContractImport } from "@/components/contract-import";
import type { Contract, Company } from "@/types";
import { toast } from "react-hot-toast";
import { L10n } from '@syncfusion/ej2-base';
import { 
  GridComponent, 
  ColumnsDirective, 
  ColumnDirective, 
  Page, 
  Inject, 
  Sort, 
  Toolbar, 
  Filter, 
  Edit as GridEdit, 
  FilterSettingsModel, 
  EditSettingsModel, 
  ToolbarItems 
} from '@syncfusion/ej2-react-grids';

interface ContractManagementProps {
  contracts: Contract[];
  companies: Company[];
}

export function ContractManagement({ contracts: initialContracts, companies }: ContractManagementProps) {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showContractImport, setShowContractImport] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const handleContractCreated = (newContract: Contract) => {
    setContracts(prev => [...prev, newContract]);
    setShowContractForm(false);
    toast.success("Contract created successfully");
  };

  const handleContractUpdated = (updatedContract: Contract) => {
    setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
    setEditingContract(null);
    toast.success("Contract updated successfully");
  };

  const handleContractsImported = (importedContracts: Contract[]) => {
    setContracts(prev => [...prev, ...importedContracts]);
    setShowContractImport(false);
    toast.success(`${importedContracts.length} contracts imported successfully`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const totalCapacity = contracts.reduce((sum, contract) => sum + (contract.contractCapacity || 0), 0);
  const totalMWBE = contracts.reduce((sum, contract) => sum + (contract.mwbeGoalPercent || 0), 0) / contracts.length;

  const filterSettings: FilterSettingsModel = { type: 'Excel' };
  const toolbar: ToolbarItems[] = ['Search'];
  const editSettings: EditSettingsModel = { allowEditing: false, allowAdding: false, allowDeleting: false };

  const currencyTemplate = (props: any) => {
    return formatCurrency(props.contractCapacity);
  };

  const dateTemplate = (props: any) => {
    return formatDate(
      typeof props.contractEffectiveDate === 'object' && 'seconds' in props.contractEffectiveDate 
        ? new Date(props.contractEffectiveDate.seconds * 1000).toISOString() 
        : props.contractEffectiveDate as string
    );
  };

  const mwbeTemplate = (props: any) => {
    return <Badge variant="outline">{props.mwbeGoalPercent}%</Badge>;
  };

  const actionsTemplate = (props: any) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditingContract(props)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Contract
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Contract
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Contract Management</h3>
          <p className="text-muted-foreground">
            Manage client contracts and project agreements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowContractImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Contracts
          </Button>
          <Button onClick={() => setShowContractForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contract
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCapacity)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {contracts.filter(c => {
                const effectiveDate = typeof c.contractEffectiveDate === 'object' && 'seconds' in c.contractEffectiveDate 
                  ? new Date(c.contractEffectiveDate.seconds * 1000) 
                  : new Date(c.contractEffectiveDate as string);
                return effectiveDate <= new Date();
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg MWBE Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalMWBE.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
          <CardDescription>
            {contracts.length === 0 
              ? "No contracts found. Add contracts manually or import from a file."
              : `Showing ${contracts.length} contracts`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length > 0 ? (
            <GridComponent dataSource={contracts} locale='en-US' allowPaging={true} allowSorting={true} allowFiltering={true} filterSettings={filterSettings} toolbar={toolbar} editSettings={editSettings} height={365} pageSettings={{ pageCount: 4, pageSizes: true }}>
              <ColumnsDirective>
                <ColumnDirective field='contractName' headerText='Contract Name' width='200'></ColumnDirective>
                <ColumnDirective field='contractNumber' headerText='Number' width='150'></ColumnDirective>
                <ColumnDirective field='clientName' headerText='Client' width='200'></ColumnDirective>
                <ColumnDirective field='contractCapacity' headerText='Capacity' width='150' template={currencyTemplate} textAlign='Right'></ColumnDirective>
                <ColumnDirective field='contractEffectiveDate' headerText='Effective Date' width='150' template={dateTemplate}></ColumnDirective>
                <ColumnDirective field='mwbeGoalPercent' headerText='MWBE Goal' width='120' template={mwbeTemplate}></ColumnDirective>
                <ColumnDirective headerText='Actions' width='100' template={actionsTemplate} textAlign='Center'></ColumnDirective>
              </ColumnsDirective>
              <Inject services={[Page, Sort, Toolbar, Filter, GridEdit]} />
            </GridComponent>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first contract or importing from a file.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowContractImport(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Contracts
                </Button>
                <Button onClick={() => setShowContractForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contract
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showContractForm} onOpenChange={setShowContractForm}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Contract</DialogTitle>
          </DialogHeader>
          <ContractForm 
            onContractCreated={handleContractCreated}
            onCancel={() => setShowContractForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingContract} onOpenChange={() => setEditingContract(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
          </DialogHeader>
          {editingContract && (
            <ContractForm 
              contract={editingContract}
              onContractCreated={handleContractUpdated}
              onCancel={() => setEditingContract(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showContractImport} onOpenChange={setShowContractImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Contracts</DialogTitle>
          </DialogHeader>
          <ContractImport 
            onContractsImported={handleContractsImported}
            onCancel={() => setShowContractImport(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}