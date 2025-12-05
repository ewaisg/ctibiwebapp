"use client";

import React, { useState } from "react";
import { Plus, Upload, MoreVertical, Edit, Trash2, FolderOpen, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/project-form";
import { ProjectImport } from "@/components/project-import";
import { ProjectTeamManagement } from "@/components/project-team-management";
import type { Project, Contract, Company, Department, Division, Service, Employee } from "@/types";
import { toast } from "react-hot-toast";
import { updateProject } from "@/app/(authenticated)/admin/actions";
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

L10n.load({
    'en-US': {
        'pager': {
            'currentPageInfo': '',
            'totalItemsInfo': '{1} to {2} of {0}',
        }
    }
});


interface ProjectManagementProps {
  projects: Project[];
  contracts: Contract[];
  companies: Company[];
  departments: Department[];
  divisions: Division[];
  services: Service[];
  employees: Employee[];
}

export function ProjectManagement({ 
  projects: initialProjects, 
  contracts, 
  companies, 
  departments,
  divisions,
  services,
  employees 
}: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showProjectImport, setShowProjectImport] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [managingTeamProject, setManagingTeamProject] = useState<Project | null>(null);

  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => [...prev, newProject]);
    setShowProjectForm(false);
    toast.success("Project created successfully");
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setEditingProject(null);
    toast.success("Project updated successfully");
  };

  const handleTeamUpdate = async (updatedProject: Project) => {
    try {
      const result = await updateProject(updatedProject.id, {
        assignedCompanies: updatedProject.assignedCompanies
      });
      
      if (result.success && result.project) {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? result.project! : p));
        setManagingTeamProject(result.project);
        toast.success("Team assignments saved successfully");
      } else {
        toast.error(result.message || "Failed to save team assignments");
      }
    } catch (error) {
      console.error('Error updating team assignments:', error);
      toast.error("Failed to save team assignments");
    }
  };

  const handleProjectsImported = (importedProjects: Project[]) => {
    setProjects(prev => [...prev, ...importedProjects]);
    setShowProjectImport(false);
    toast.success(`${importedProjects.length} projects imported successfully`);
  };

  const getStatusBadge = (project: Project) => {
    if (project.isComplete) return <Badge variant="secondary">Complete</Badge>;
    if (project.isInactive) return <Badge variant="destructive">Inactive</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDepartmentName = (project: Project) => {
    // First try departmentCode (denormalized)
    if (project.departmentCode) {
      const department = departments.find(d => d.departmentCode === project.departmentCode);
      return department?.departmentName || project.departmentCode;
    }
    
    // Then try departmentId (DocumentReference)
    if (project.departmentId) {
      const departmentId = typeof project.departmentId === 'string' ? project.departmentId : project.departmentId.id;
      const department = departments.find(d => d.id === departmentId);
      return department?.departmentName || 'Unknown Department';
    }
    
    return 'N/A';
  };

  const getContractName = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.contractName || 'Unknown Contract';
  };

  const totalOriginalAmount = projects.reduce((sum, project) => sum + (project.originalPoAmount || 0), 0);
  const totalRemainingAmount = projects.reduce((sum, project) => sum + (project.remainingPoAmount || 0), 0);

  const filterSettings: FilterSettingsModel = { type: 'Excel' };
  const toolbar: ToolbarItems[] = ['Search'];
  const editSettings: EditSettingsModel = { allowEditing: false, allowAdding: false, allowDeleting: false };

  const statusTemplate = (props: any) => {
    return getStatusBadge(props);
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
          <DropdownMenuItem onClick={() => setEditingProject(props)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setManagingTeamProject(props)}>
            <Plus className="h-4 w-4 mr-2" />
            Manage Team
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const currencyTemplate = (props: any) => {
    return formatCurrency(props.originalPoAmount);
  };
  
  const contractTemplate = (props: any) => {
      return getContractName(props.contractId as string);
  }

  const departmentTemplate = (props: any) => {
      return getDepartmentName(props);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Project Management</h3>
          <p className="text-muted-foreground">
            Manage project assignments and tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowProjectImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Projects
          </Button>
          <Button onClick={() => setShowProjectForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {projects.filter(p => !p.isInactive && !p.isComplete).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PO Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOriginalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalRemainingAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            {projects.length === 0 
              ? "No projects found. Add projects manually or import from a file."
              : `Showing ${projects.length} projects`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <GridComponent dataSource={projects} locale='en-US' allowPaging={true} allowSorting={true} allowFiltering={true} filterSettings={filterSettings} toolbar={toolbar} editSettings={editSettings} height={365} pageSettings={{ pageCount: 4, pageSizes: true }}>
              <ColumnsDirective>
                <ColumnDirective field='projectName' headerText='Project Name' width='200'></ColumnDirective>
                <ColumnDirective field='poNumber' headerText='PO Number' width='150'></ColumnDirective>
                <ColumnDirective field='contractId' headerText='Contract' width='150' template={contractTemplate}></ColumnDirective>
                <ColumnDirective field='departmentId' headerText='Department' width='150' template={departmentTemplate}></ColumnDirective>
                <ColumnDirective field='originalPoAmount' headerText='PO Amount' width='150' template={currencyTemplate} textAlign='Right'></ColumnDirective>
                <ColumnDirective field='status' headerText='Status' width='120' template={statusTemplate}></ColumnDirective>
                <ColumnDirective headerText='Actions' width='100' template={actionsTemplate} textAlign='Center'></ColumnDirective>
              </ColumnsDirective>
              <Inject services={[Page, Sort, Toolbar, Filter, GridEdit]} />
            </GridComponent>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first project or importing from a file.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowProjectImport(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Projects
                </Button>
                <Button onClick={() => setShowProjectForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm 
            contracts={contracts}
            companies={companies}
            departments={departments}
            divisions={divisions}
            services={services}
            onProjectCreated={handleProjectCreated}
            onCancel={() => setShowProjectForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <ProjectForm 
              contracts={contracts}
              companies={companies}
              departments={departments}
              divisions={divisions}
              services={services}
              project={editingProject}
              onProjectCreated={handleProjectUpdated}
              onCancel={() => setEditingProject(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectImport} onOpenChange={setShowProjectImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Projects</DialogTitle>
          </DialogHeader>
          <ProjectImport 
            contracts={contracts}
            departments={departments}
            services={services}
            onProjectsImported={handleProjectsImported}
            onCancel={() => setShowProjectImport(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingTeamProject} onOpenChange={() => setManagingTeamProject(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Team - {managingTeamProject?.projectName}</DialogTitle>
          </DialogHeader>
          {managingTeamProject && (
            <ProjectTeamManagement
              project={managingTeamProject}
              companies={companies}
              employees={employees}
              services={services}
              onUpdate={handleTeamUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}