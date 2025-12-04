"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Eye, Filter, Calendar, Loader2 } from "lucide-react";
import type { VisualTemplate } from "@/types/template-designer";
import type { PdfTemplate } from "@/types";

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  projectId?: string;
  contractId?: string;
  status?: string;
}

export function ReportsClientPage() {
  const { secureRequest, isLoading: authLoading } = useAuth() as any;
  const [visualTemplates, setVisualTemplates] = useState<VisualTemplate[]>([]);
  const [pdfTemplates, setPdfTemplates] = useState<PdfTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<VisualTemplate | PdfTemplate | null>(null);
  const [templateSource, setTemplateSource] = useState<"pdf" | "visual">("visual");
  const [dataSource, setDataSource] = useState<string>("");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Available data sources
  const dataSources = [
    { value: "invoices", label: "Invoices" },
    { value: "timesheets", label: "Timesheets" },
    { value: "projects", label: "Projects" },
    { value: "departments", label: "Departments" },
    { value: "employees", label: "Employees" },
    { value: "contracts", label: "Contracts" },
  ];

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate custom reports from your templates and data
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Template Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Template
              </CardTitle>
              <CardDescription>
                Choose a template to generate your report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label>Template</Label>
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
                <Select value={dataSource} onValueChange={setDataSource}>
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

                  <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-3">
                    <strong>Note:</strong> Additional filters coming soon. You can currently filter by date range.
                  </div>
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
    </div>
  );
}
