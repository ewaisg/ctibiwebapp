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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.companyName}</TableCell>
                    <TableCell>{company.companyCode}</TableCell>
                    <TableCell>
                      {company.isSubconsultant ? "Subconsultant" : "Prime/Internal"}
                    </TableCell>
                    <TableCell>
                      {getDiversityBadge(company.diversityCertification)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(company)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCompany(company)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Company
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Company
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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