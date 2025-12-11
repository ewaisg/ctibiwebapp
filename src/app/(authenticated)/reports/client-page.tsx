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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { FileText, Download, Eye, Filter, Calendar, Loader2, XCircle, Building2, FolderKanban, FileCheck, ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import type { PdfTemplate, Department, Project, Contract } from "@/types";
import { ReportTemplatesGallery } from "@/components/reports/ReportTemplatesGallery";
import type { ReportTemplate } from "@/lib/report-templates";
import toast from "react-hot-toast";

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string | string[]; // Support single or multiple
  projectId?: string | string[]; // Support single or multiple
  contractId?: string | string[]; // Support single or multiple
  companyId?: string | string[]; // Support single or multiple
  employeeId?: string | string[]; // Support single or multiple
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
  const [dateRangeMode, setDateRangeMode] = useState<'allTime' | 'dateRange'>('allTime');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [openDepartmentPopover, setOpenDepartmentPopover] = useState(false);
  const [openProjectPopover, setOpenProjectPopover] = useState(false);
  const [openContractPopover, setOpenContractPopover] = useState(false);

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
    setDateRangeMode('allTime');
    setSelectedDepartments([]);
    setSelectedProjects([]);
    setSelectedContracts([]);
  };

  // Sync multi-select state with filters
  useEffect(() => {
    const newFilters: ReportFilters = { ...filters };

    // Sync date range
    if (dateRangeMode === 'allTime') {
      delete newFilters.dateFrom;
      delete newFilters.dateTo;
    }

    // Sync departments
    if (selectedDepartments.length > 0) {
      newFilters.departmentId = selectedDepartments.length === 1 ? selectedDepartments[0] : selectedDepartments;
    } else {
      delete newFilters.departmentId;
    }

    // Sync projects
    if (selectedProjects.length > 0) {
      newFilters.projectId = selectedProjects.length === 1 ? selectedProjects[0] : selectedProjects;
    } else {
      delete newFilters.projectId;
    }

    // Sync contracts
    if (selectedContracts.length > 0) {
      newFilters.contractId = selectedContracts.length === 1 ? selectedContracts[0] : selectedContracts;
    } else {
      delete newFilters.contractId;
    }

    setFilters(newFilters);
  }, [dateRangeMode, selectedDepartments, selectedProjects, selectedContracts]);

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
    setDateRangeMode('allTime');
    setSelectedDepartments([]);
    setSelectedProjects([]);
    setSelectedContracts([]);
    setViewMode('configure');
  };

  const handleSelectCustom = (template: PdfTemplate) => {
    setSelectedCustomTemplate(template);
    setSelectedPrebuiltTemplate(null);
    setFilters({});
    setDateRangeMode('allTime');
    setSelectedDepartments([]);
    setSelectedProjects([]);
    setSelectedContracts([]);
    setViewMode('configure');
  };

  const handleGenerateReport = async (preview: boolean = false) => {
    if (!selectedPrebuiltTemplate && !selectedCustomTemplate) {
      toast.error('Please select a template');
      return;
    }

    // Validation for Date Range - if date range mode is selected, both dates must be provided
    if (dateRangeMode === 'dateRange') {
      if (!filters.dateFrom || !filters.dateTo) {
        toast.error('Please select both From and To dates');
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
                  <li>Financial - Billing and payment reports</li>
                  <li>Labor - Direct, indirect, and utilization reports</li>
                  <li>Project - Budget, hours, and summary reports</li>
                  <li>Compliance - MWBE and sub-consultant reports</li>
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

                  {/* Date Range Mode Selection - All reports support this */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Time Period
                    </Label>
                    <RadioGroup value={dateRangeMode} onValueChange={(value) => setDateRangeMode(value as 'allTime' | 'dateRange')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="allTime" id="allTime" />
                        <Label htmlFor="allTime" className="font-normal cursor-pointer">All Time</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dateRange" id="dateRange" />
                        <Label htmlFor="dateRange" className="font-normal cursor-pointer">Date Range</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Date Range Inputs - Only show when Date Range is selected */}
                  {dateRangeMode === 'dateRange' && (
                    <div className="grid gap-4 md:grid-cols-2 pl-6 border-l-2 border-muted">
                      <div className="space-y-2">
                        <Label htmlFor="dateFrom" className="text-xs">
                          From Date
                        </Label>
                        <Input
                          id="dateFrom"
                          type="date"
                          value={filters.dateFrom || ""}
                          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateTo" className="text-xs">
                          To Date
                        </Label>
                        <Input
                          id="dateTo"
                          type="date"
                          value={filters.dateTo || ""}
                          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Additional Filters - Only show relevant filters based on report template */}
                  <div className="space-y-4">
                    {/* Department Multi-Select - Show only if report supports it */}
                    {selectedPrebuiltTemplate?.optionalFilters?.includes('departmentId') && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          Departments
                        </Label>
                        <Popover open={openDepartmentPopover} onOpenChange={setOpenDepartmentPopover}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openDepartmentPopover}
                              className="w-full justify-between font-normal"
                            >
                              {selectedDepartments.length === 0
                                ? "All Departments"
                                : selectedDepartments.length === 1
                                ? departments.find(d => d.id === selectedDepartments[0])?.departmentName
                                : `${selectedDepartments.length} departments selected`}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search departments..." />
                              <CommandEmpty>No department found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                <CommandItem
                                  onSelect={() => {
                                    setSelectedDepartments([]);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${selectedDepartments.length === 0 ? "opacity-100" : "opacity-0"}`}
                                  />
                                  All Departments
                                </CommandItem>
                                {departments.map((dept) => (
                                  <CommandItem
                                    key={dept.id}
                                    onSelect={() => {
                                      setSelectedDepartments(prev =>
                                        prev.includes(dept.id)
                                          ? prev.filter(id => id !== dept.id)
                                          : [...prev, dept.id]
                                      );
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${selectedDepartments.includes(dept.id) ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {dept.departmentName}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          Click items to select multiple departments or choose "All Departments"
                        </p>
                      </div>
                    )}

                    {/* Project Multi-Select - Show only if report supports it */}
                    {selectedPrebuiltTemplate?.optionalFilters?.includes('projectId') && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <FolderKanban className="h-3 w-3" />
                          Projects
                        </Label>
                        <Popover open={openProjectPopover} onOpenChange={setOpenProjectPopover}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openProjectPopover}
                              className="w-full justify-between font-normal"
                            >
                              {selectedProjects.length === 0
                                ? "All Projects"
                                : selectedProjects.length === 1
                                ? projects.find(p => p.id === selectedProjects[0])?.projectName
                                : `${selectedProjects.length} projects selected`}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search projects..." />
                              <CommandEmpty>No project found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                <CommandItem
                                  onSelect={() => {
                                    setSelectedProjects([]);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${selectedProjects.length === 0 ? "opacity-100" : "opacity-0"}`}
                                  />
                                  All Projects
                                </CommandItem>
                                {filteredProjects.map((project) => (
                                  <CommandItem
                                    key={project.id}
                                    onSelect={() => {
                                      setSelectedProjects(prev =>
                                        prev.includes(project.id)
                                          ? prev.filter(id => id !== project.id)
                                          : [...prev, project.id]
                                      );
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${selectedProjects.includes(project.id) ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {project.projectName} ({project.poNumber})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          Click items to select multiple projects or choose "All Projects"
                        </p>
                      </div>
                    )}

                    {/* Contract Multi-Select - Show only if report supports it */}
                    {selectedPrebuiltTemplate?.optionalFilters?.includes('contractId') && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <FileCheck className="h-3 w-3" />
                          Contracts
                        </Label>
                        <Popover open={openContractPopover} onOpenChange={setOpenContractPopover}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openContractPopover}
                              className="w-full justify-between font-normal"
                            >
                              {selectedContracts.length === 0
                                ? "All Contracts"
                                : selectedContracts.length === 1
                                ? contracts.find(c => c.id === selectedContracts[0])?.contractName
                                : `${selectedContracts.length} contracts selected`}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search contracts..." />
                              <CommandEmpty>No contract found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                <CommandItem
                                  onSelect={() => {
                                    setSelectedContracts([]);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${selectedContracts.length === 0 ? "opacity-100" : "opacity-0"}`}
                                  />
                                  All Contracts
                                </CommandItem>
                                {contracts.map((contract) => (
                                  <CommandItem
                                    key={contract.id}
                                    onSelect={() => {
                                      setSelectedContracts(prev =>
                                        prev.includes(contract.id)
                                          ? prev.filter(id => id !== contract.id)
                                          : [...prev, contract.id]
                                      );
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${selectedContracts.includes(contract.id) ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {contract.contractNumber} - {contract.contractName}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          Click items to select multiple contracts or choose "All Contracts"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Active Filters Summary */}
                  {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <span className="text-xs text-muted-foreground">
                        {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
                      </span>
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
