"use client";

import React, { useState } from "react";
import { Plus, Upload, MoreVertical, Edit, Trash2, Building } from "lucide-react";
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
import { DivisionForm } from "@/components/division-form";
import type { Division } from "@/types";
import { toast } from "react-hot-toast";

interface DivisionManagementProps {
  divisions: Division[];
}

export function DivisionManagement({ divisions: initialDivisions }: DivisionManagementProps) {
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions);
  const [showDivisionForm, setShowDivisionForm] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);

  const handleDivisionCreated = (newDivision: Division) => {
    setDivisions(prev => [...prev, newDivision]);
    setShowDivisionForm(false);
    toast.success("Division created successfully");
  };

  const handleDivisionUpdated = (updatedDivision: Division) => {
    setDivisions(prev => prev.map(d => d.id === updatedDivision.id ? updatedDivision : d));
    setEditingDivision(null);
    toast.success("Division updated successfully");
  };

  const getStatusBadge = (division: Division) => {
    return division.isInactive ? 
      <Badge variant="secondary">Inactive</Badge> : 
      <Badge variant="default">Active</Badge>;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Division Management</h4>
          <p className="text-muted-foreground">
            Manage organizational divisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowDivisionForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Division
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Divisions</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{divisions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Divisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {divisions.filter(d => !d.isInactive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Divisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {divisions.filter(d => d.isInactive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Divisions</CardTitle>
          <CardDescription>
            {divisions.length === 0 
              ? "No divisions found. Add divisions to organize your departments."
              : `Showing ${divisions.length} divisions`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {divisions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Division Name</TableHead>
                  <TableHead>Division Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisions.map((division) => (
                  <TableRow key={division.id}>
                    <TableCell className="font-medium">{division.divisionName}</TableCell>
                    <TableCell>{division.divisionCode}</TableCell>
                    <TableCell>
                      {getStatusBadge(division)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDivision(division)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Division
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Division
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
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No divisions found</h3>
              <p className="text-muted-foreground mb-4">
                Create divisions to organize your departments and projects.
              </p>
              <Button onClick={() => setShowDivisionForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Division
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDivisionForm} onOpenChange={setShowDivisionForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Division</DialogTitle>
          </DialogHeader>
          <DivisionForm 
            onDivisionCreated={handleDivisionCreated}
            onCancel={() => setShowDivisionForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDivision} onOpenChange={() => setEditingDivision(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
          </DialogHeader>
          {editingDivision && (
            <DivisionForm 
              division={editingDivision}
              onDivisionCreated={handleDivisionUpdated}
              onCancel={() => setEditingDivision(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}