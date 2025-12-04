"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Eye, Filter, Calendar, Loader2, XCircle, Building2, FolderKanban, FileCheck, Sparkles, ArrowLeft } from "lucide-react";
import type { VisualTemplate } from "@/types/template-designer";
import type { PdfTemplate, Department, Project, Contract } from "@/types";
import { ReportTemplatesGallery } from "@/components/reports/ReportTemplatesGallery";
import type { ReportTemplate } from "@/lib/report-templates";

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  projectId?: string;
  contractId?: string;
  status?: string;
}

interface ReportsClientPageProps {
  departments: Department[];
  projects: Project[];
  contracts: Contract[];
}

export function ReportsClientPage({ departments, projects, contracts }: ReportsClientPageProps) {
  const { secureRequest, isLoading: authLoading } = useAuth() as any;
  const [visualTemplates, setVisualTemplates] = useState<VisualTemplate[]>([]);
  const [pdfTemplates, setPdfTemplates] = useState<PdfTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | PdfTemplate | null>(null);
  const [templateSource, setTemplateSource] = useState<"pdf" | "visual">("visual");
  const [dataSource, setDataSource] = useState<string>("");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReportTemplate, setSelectedReportTemplate] = useState<ReportTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'templates' | 'custom' | 'configure'>('templates');

  // Available data sources
  const dataSources = [
    { value: "invoices", label: "Invoices" },
    { value: "timesheets", label: "Timesheets" },
    { value: "projects", label: "Projects" },
    { value: "departments", label: "Departments" },
    { value: "employees", label: "Employees" },
    { value: "contracts", label: "Contracts" },
  ];

  // Filter projects by department if department is selected
  const filteredProjects = useMemo(() => {
    if (!filters.departmentId) return projects;
    return projects.filter(p => p.departmentId === filters.departmentId);
  }, [projects, filters.departmentId]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.departmentId) count++;
    if (filters.projectId) count++;
    if (filters.contractId) count++;
    if (filters.status) count++;
    return count;
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
  };

  useEffect(() => {
    if (!authLoading) {
      loadTemplates();
    }
  }, [authLoading]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const [visualRes, pdfRes] = await Promise.all([
        secureRequest('/api/visual-templates'),
        secureRequest('/api/pdf-templates')
      ]);

      if (visualRes.ok) {
        const data = await visualRes.json();
        setVisualTemplates(data.items || []);
      }

      if (pdfRes.ok) {
        const data = await pdfRes.json();
        setPdfTemplates(data.items || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templateSource === 'visual'
      ? visualTemplates.find(t => t.id === templateId)
      : pdfTemplates.find(t => t.id === templateId);

    setSelectedTemplate(template || null);
  };

  const handleGenerateReport = async (preview: boolean = false) => {
    if (!selectedTemplate || !dataSource) {
      alert('Please select a template and data source');
      return;
    }

    setGenerating(true);

    try {
      const response = await secureRequest('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          templateSource,
          dataSource,
          filters,
          preview,
          reportTemplateId: selectedReportTemplate?.id,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        if (preview) {
          window.open(url, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${selectedTemplate.id}-${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } else {
        const error = await response.json();
        alert(`Failed to generate report: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const availableTemplates = templateSource === 'visual' ? visualTemplates : pdfTemplates;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Handle pre-built template selection
  const handleSelectReportTemplate = (template: ReportTemplate) => {
    setSelectedReportTemplate(template);
    setViewMode('configure');
    setTemplateSource('visual');

    // Auto-select a compatible visual template
    const compatibleTemplate = visualTemplates.find(t => t.type === 'report') || visualTemplates[0];
    if (compatibleTemplate) {
      setSelectedTemplate(compatibleTemplate);
    }

    // Auto-set data source based on template requirements
    if (template.requiredDataSources.length > 0) {
      setDataSource(template.requiredDataSources[0]);
    }

    // Clear filters and set required ones
    setFilters({});
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate custom reports from your templates and data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'templates' || viewMode === 'configure' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('templates');
              setSelectedReportTemplate(null);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Pre-built Reports
          </Button>
          <Button
            variant={viewMode === 'custom' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('custom');
              setSelectedReportTemplate(null);
              setDataSource("");
              setFilters({});
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Custom Reports
          </Button>
        </div>
      </div>

      {viewMode === 'templates' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ReportTemplatesGallery onSelectTemplate={handleSelectReportTemplate} />
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">About Pre-built Reports</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>
                  Pre-built reports are professionally designed templates that provide
                  instant insights into your business operations.
                </p>
                <p>
                  Each report automatically fetches the right data and applies the
                  appropriate calculations and formatting.
                </p>
                <p className="font-medium text-foreground mt-4">Categories:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Financial - Revenue, payments, profitability</li>
                  <li>Labor - Utilization, hours, costs</li>
                  <li>Project - Status, budgets, completion</li>
                  <li>Compliance - MWBE, DBE, certifications</li>
                  <li>Executive - KPIs, trends, dashboards</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Template Selection */}
          <div className="lg:col-span-2 space-y-6">
          {/* Template Source Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedReportTemplate ? `Configure ${selectedReportTemplate.name}` : "Select Template"}
                  </CardTitle>
                  <CardDescription>
                    {selectedReportTemplate 
                      ? selectedReportTemplate.description 
                      : "Choose a template to generate your report"}
                  </CardDescription>
                </div>
                {viewMode === 'configure' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setViewMode('templates');
                      setSelectedReportTemplate(null);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Gallery
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedReportTemplate && (
                <div className="space-y-2">
                  <Label>Template Source</Label>
                  <Select value={templateSource} onValueChange={(value: "pdf" | "visual") => {
                    setTemplateSource(value);
                    setSelectedTemplate(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual">Visual Templates (Designer)</SelectItem>
                      <SelectItem value="pdf">PDF Templates (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{selectedReportTemplate ? "Select Layout Template" : "Template"}</Label>
                <Select
                  value={selectedTemplate?.id || ""}
                  onValueChange={handleTemplateSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2">
                        No templates available
                      </div>
                    ) : (
                      availableTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {(template as any).name || (template as any).templateName || 'Unnamed Template'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedReportTemplate && (
                   <p className="text-xs text-muted-foreground">
                     Select a visual layout to render this report.
                   </p>
                )}
              </div>

              {selectedTemplate && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Template Type</span>
                        <Badge variant="outline">
                          {(selectedTemplate as any).type || (selectedTemplate as any).templateType}
                        </Badge>
                      </div>
                      {templateSource === 'visual' && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Elements</span>
                            <span className="text-sm text-muted-foreground">
                              {(selectedTemplate as VisualTemplate).elements?.length || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Page Size</span>
                            <span className="text-sm text-muted-foreground">
                              {(selectedTemplate as VisualTemplate).pageSize} / {(selectedTemplate as VisualTemplate).orientation}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Data Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Data Source & Filters
              </CardTitle>
              <CardDescription>
                Choose where to get the data and apply filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select 
                  value={dataSource} 
                  onValueChange={setDataSource}
                  disabled={!!selectedReportTemplate && selectedReportTemplate.requiredDataSources.length > 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedReportTemplate && selectedReportTemplate.requiredDataSources.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Data source is determined by the selected report type.
                  </p>
                )}
              </div>

              {dataSource && (
                <>
                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom" className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Date From
                      </Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={filters.dateFrom || ""}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateTo" className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Date To
                      </Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={filters.dateTo || ""}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Department Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="department" className="flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      Department
                    </Label>
                    <Select
                      value={filters.departmentId || "ALL"}
                      onValueChange={(value) => setFilters({ ...filters, departmentId: value === "ALL" ? undefined : value })}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.departmentName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="project" className="flex items-center gap-2">
                      <FolderKanban className="h-3 w-3" />
                      Project
                    </Label>
                    <Select
                      value={filters.projectId || "ALL"}
                      onValueChange={(value) => setFilters({ ...filters, projectId: value === "ALL" ? undefined : value })}
                    >
                      <SelectTrigger id="project">
                        <SelectValue placeholder="All Projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Projects</SelectItem>
                        {filteredProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.projectName} ({project.poNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contract Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="contract" className="flex items-center gap-2">
                      <FileCheck className="h-3 w-3" />
                      Contract
                    </Label>
                    <Select
                      value={filters.contractId || "ALL"}
                      onValueChange={(value) => setFilters({ ...filters, contractId: value === "ALL" ? undefined : value })}
                    >
                      <SelectTrigger id="contract">
                        <SelectValue placeholder="All Contracts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Contracts</SelectItem>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.contractNumber} - {contract.contractName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter (context-aware based on data source) */}
                  {(dataSource === 'invoices' || dataSource === 'projects') && (
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={filters.status || "ALL"}
                        onValueChange={(value) => setFilters({ ...filters, status: value === "ALL" ? undefined : value })}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Statuses</SelectItem>
                          {dataSource === 'invoices' && (
                            <>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </>
                          )}
                          {dataSource === 'projects' && (
                            <>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on-hold">On Hold</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Active Filters Summary */}
                  {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Active filters:</span>
                      {filters.dateFrom && (
                        <Badge variant="secondary" className="text-xs">
                          From: {filters.dateFrom}
                        </Badge>
                      )}
                      {filters.dateTo && (
                        <Badge variant="secondary" className="text-xs">
                          To: {filters.dateTo}
                        </Badge>
                      )}
                      {filters.departmentId && (
                        <Badge variant="secondary" className="text-xs">
                          Dept: {departments.find(d => d.id === filters.departmentId)?.departmentName}
                        </Badge>
                      )}
                      {filters.projectId && (
                        <Badge variant="secondary" className="text-xs">
                          Project: {projects.find(p => p.id === filters.projectId)?.projectName}
                        </Badge>
                      )}
                      {filters.contractId && (
                        <Badge variant="secondary" className="text-xs">
                          Contract: {contracts.find(c => c.id === filters.contractId)?.contractNumber}
                        </Badge>
                      )}
                      {filters.status && (
                        <Badge variant="secondary" className="text-xs">
                          Status: {filters.status}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={clearFilters}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>
                Preview or download your report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="outline"
                disabled={!selectedTemplate || !dataSource || generating}
                onClick={() => handleGenerateReport(true)}
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Preview PDF
              </Button>

              <Button
                className="w-full"
                disabled={!selectedTemplate || !dataSource || generating}
                onClick={() => handleGenerateReport(false)}
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <p>1. Select a template from your available templates</p>
              <p>2. Choose which data collection to use</p>
              <p>3. Apply date filters if needed</p>
              <p>4. Preview or download your PDF report</p>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
