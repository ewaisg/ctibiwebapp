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
import { FileText, Download, Eye, Filter, Calendar, Loader2, XCircle, Building2, FolderKanban, FileCheck, ArrowLeft } from "lucide-react";
import type { PdfTemplate, Department, Project, Contract } from "@/types";
import { ReportTemplatesGallery } from "@/components/reports/ReportTemplatesGallery";
import type { ReportTemplate } from "@/lib/report-templates";
import toast from "react-hot-toast";

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
  const [pdfTemplates, setPdfTemplates] = useState<PdfTemplate[]>([]);
  
  // Selection State
  const [selectedPrebuiltTemplate, setSelectedPrebuiltTemplate] = useState<ReportTemplate | null>(null);
  const [selectedCustomTemplate, setSelectedCustomTemplate] = useState<PdfTemplate | null>(null);
  
  const [filters, setFilters] = useState<ReportFilters>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'configure'>('gallery');

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
      const pdfRes = await secureRequest('/api/pdf-templates');
      if (pdfRes.ok) {
        const data = await pdfRes.json();
        setPdfTemplates(data.items || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrebuilt = (template: ReportTemplate) => {
    setSelectedPrebuiltTemplate(template);
    setSelectedCustomTemplate(null);
    setFilters({});
    setViewMode('configure');
  };

  const handleSelectCustom = (template: PdfTemplate) => {
    setSelectedCustomTemplate(template);
    setSelectedPrebuiltTemplate(null);
    setFilters({});
    setViewMode('configure');
  };

  const handleGenerateReport = async (preview: boolean = false) => {
    if (!selectedPrebuiltTemplate && !selectedCustomTemplate) {
      toast.error('Please select a template');
      return;
    }

    // Validation for Date Range reports
    if (selectedCustomTemplate?.reportType === 'DateRange') {
      if (!filters.dateFrom || !filters.dateTo) {
        toast.error('Please select a date range');
        return;
      }
    }

    setGenerating(true);

    try {
      const payload = {
        templateId: selectedCustomTemplate?.id,
        reportTemplateId: selectedPrebuiltTemplate?.id,
        templateSource: selectedCustomTemplate ? 'pdf' : 'prebuilt',
        filters,
        preview,
      };

      const response = await secureRequest('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        if (preview) {
          window.open(url, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${selectedCustomTemplate?.templateName || selectedPrebuiltTemplate?.name}-${Date.now()}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
        toast.success("Report generated successfully");
      } else {
        const error = await response.json();
        toast.error(`Failed to generate report: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeTemplateName = selectedCustomTemplate?.templateName || selectedPrebuiltTemplate?.name;
  const activeTemplateDescription = selectedPrebuiltTemplate?.description || "Custom PDF Report";
  const isDateRangeRequired = selectedCustomTemplate?.reportType === 'DateRange' || 
                              selectedPrebuiltTemplate?.requiredFilters?.includes('dateRange');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate custom reports from your templates and data
          </p>
        </div>
      </div>

      {viewMode === 'gallery' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <ReportTemplatesGallery 
              onSelectTemplate={handleSelectPrebuilt} 
              customTemplates={pdfTemplates}
              onSelectCustomTemplate={handleSelectCustom}
            />
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">About Reports</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>
                  Reports are professionally designed templates that provide
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
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Configure Report
                    </CardTitle>
                    <CardDescription>
                      {activeTemplateName}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setViewMode('gallery');
                      setSelectedPrebuiltTemplate(null);
                      setSelectedCustomTemplate(null);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Gallery
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">{activeTemplateDescription}</p>
                  {selectedCustomTemplate && (
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">{selectedCustomTemplate.category || 'Uncategorized'}</Badge>
                      <Badge variant="outline">{selectedCustomTemplate.reportType || 'General'}</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Report Parameters</h3>
                  
                  {/* Date Range Selection - Show if required or optional */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom" className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Date From {isDateRangeRequired && <span className="text-red-500">*</span>}
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
                        Date To {isDateRangeRequired && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={filters.dateTo || ""}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Additional Filters based on context */}
                  <div className="grid gap-4 md:grid-cols-2">
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
                  </div>

                  {/* Active Filters Summary */}
                  {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <span className="text-xs text-muted-foreground">Active filters:</span>
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
                </div>
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
                  disabled={generating}
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
                  disabled={generating}
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
          </div>
        </div>
      )}
    </div>
  );
}
