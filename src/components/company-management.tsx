"use client";

import React, { useState } from "react";
import { Plus, Upload, MoreVertical, Edit, Trash2, Building2 } from "lucide-react";
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
import { CompanyForm } from "@/components/company-form";
import { CompanyImport } from "@/components/company-import";
import type { Company, Department } from "@/types";
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

interface CompanyManagementProps {
  companies: Company[];
  departments: Department[];
}

export function CompanyManagement({ companies: initialCompanies, departments }: CompanyManagementProps) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showCompanyImport, setShowCompanyImport] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const handleCompanyCreated = (newCompany: Company) => {
    setCompanies(prev => [...prev, newCompany]);
    setShowCompanyForm(false);
    toast.success("Company created successfully");
  };

  const handleCompanyUpdated = (updatedCompany: Company) => {
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
    setEditingCompany(null);
    toast.success("Company updated successfully");
  };

  const handleCompaniesImported = (importedCompanies: Company[]) => {
    setCompanies(prev => [...prev, ...importedCompanies]);
    setShowCompanyImport(false);
    toast.success(`${importedCompanies.length} companies imported successfully`);
  };

  const getStatusBadge = (company: Company) => {
    if (company.isInactive) return <Badge variant="secondary">Inactive</Badge>;
    if (company.isSubconsultant) return <Badge variant="outline">Subconsultant</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  const getDiversityBadge = (certification?: string) => {
    if (!certification || certification === 'None') return null;
    return <Badge variant="secondary">{certification}</Badge>;
  };

  const filterSettings: FilterSettingsModel = { type: 'Excel' };
  const toolbar: ToolbarItems[] = ['Search'];
  const editSettings: EditSettingsModel = { allowEditing: false, allowAdding: false, allowDeleting: false };

  const statusTemplate = (props: any) => {
    return getStatusBadge(props);
  };

  const diversityTemplate = (props: any) => {
    return getDiversityBadge(props.diversityCertification);
  };

  const typeTemplate = (props: any) => {
    return props.isSubconsultant ? "Subconsultant" : "Prime/Internal";
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
          <DropdownMenuItem onClick={() => setEditingCompany(props)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Company
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Company
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Company Management</h3>
          <p className="text-muted-foreground">
            Manage company information and organizational structure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCompanyImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Companies
          </Button>
          <Button onClick={() => setShowCompanyForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {companies.filter(c => !c.isInactive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subconsultants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {companies.filter(c => c.isSubconsultant).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {companies.filter(c => c.diversityCertification && c.diversityCertification !== 'None').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            {companies.length === 0 
              ? "No companies found. Add companies manually or import from a file."
              : `Showing ${companies.length} companies`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length > 0 ? (
            <GridComponent dataSource={companies} locale='en-US' allowPaging={true} allowSorting={true} allowFiltering={true} filterSettings={filterSettings} toolbar={toolbar} editSettings={editSettings} height={365} pageSettings={{ pageCount: 4, pageSizes: true }}>
              <ColumnsDirective>
                <ColumnDirective field='companyName' headerText='Company Name' width='200'></ColumnDirective>
                <ColumnDirective field='companyCode' headerText='Code' width='100'></ColumnDirective>
                <ColumnDirective field='isSubconsultant' headerText='Type' width='150' template={typeTemplate}></ColumnDirective>
                <ColumnDirective field='diversityCertification' headerText='Certification' width='150' template={diversityTemplate}></ColumnDirective>
                <ColumnDirective field='isInactive' headerText='Status' width='120' template={statusTemplate}></ColumnDirective>
                <ColumnDirective headerText='Actions' width='100' template={actionsTemplate} textAlign='Center'></ColumnDirective>
              </ColumnsDirective>
              <Inject services={[Page, Sort, Toolbar, Filter, GridEdit]} />
            </GridComponent>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No companies found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first company or importing from a file.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowCompanyImport(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Companies
                </Button>
                <Button onClick={() => setShowCompanyForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCompanyForm} onOpenChange={setShowCompanyForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
          </DialogHeader>
          <CompanyForm 
            onCompanyCreated={handleCompanyCreated}
            onCancel={() => setShowCompanyForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCompany} onOpenChange={() => setEditingCompany(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          {editingCompany && (
            <CompanyForm 
              company={editingCompany}
              onCompanyCreated={handleCompanyUpdated}
              onCancel={() => setEditingCompany(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCompanyImport} onOpenChange={setShowCompanyImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Companies</DialogTitle>
          </DialogHeader>
          <CompanyImport 
            onCompaniesImported={handleCompaniesImported}
            onCancel={() => setShowCompanyImport(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}