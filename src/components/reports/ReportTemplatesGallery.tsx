"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  Clock,
  FolderKanban,
  ShieldCheck,
  LayoutDashboard,
  Search,
  FileText,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
  Award,
  Activity,
  LineChart,
  Calculator,
  FileEdit,
  CreditCard,
  FileCheck,
  AlertCircle,
  Building2,
  Receipt,
  ClipboardList,
} from "lucide-react";
import {
  allReportTemplates,
  getReportsByCategory,
  type ReportTemplate,
} from "@/lib/report-templates";
import type { PdfTemplate } from "@/types";

const iconMap: Record<string, any> = {
  DollarSign,
  Clock,
  FolderKanban,
  ShieldCheck,
  LayoutDashboard,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
  Award,
  Activity,
  LineChart,
  Calculator,
  FileEdit,
  CreditCard,
  FileCheck,
  AlertCircle,
  FileText,
  Building2,
  Receipt,
  ClipboardList,
};

const colorMap: Record<string, string> = {
  green: 'bg-green-50 text-green-600 border-green-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
};

interface ReportTemplatesGalleryProps {
  onSelectTemplate: (template: ReportTemplate) => void;
  customTemplates?: PdfTemplate[];
  onSelectCustomTemplate?: (template: PdfTemplate) => void;
}

export function ReportTemplatesGallery({ onSelectTemplate, customTemplates = [], onSelectCustomTemplate }: ReportTemplatesGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTemplates = allReportTemplates.filter(template => {
    const matchesSearch = searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "all" || 
                            selectedCategory === "custom" || // Custom handled separately
                            template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const filteredCustomTemplates = customTemplates.filter(template => {
    const matchesSearch = searchQuery === "" ||
      template.templateName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
                            selectedCategory === "custom" ||
                            template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCustomCountByCategory = (category: string) => {
    return customTemplates.filter(t => t.category === category).length;
  };

  const categories = [
    { value: "all", label: "All Reports", count: allReportTemplates.length + customTemplates.length },
    { value: "custom", label: "My Templates", count: customTemplates.length },
    { value: "Financial", label: "Financial", count: getReportsByCategory("Financial").length + getCustomCountByCategory("Financial") },
    { value: "Labor", label: "Labor", count: getReportsByCategory("Labor").length + getCustomCountByCategory("Labor") },
    { value: "Project", label: "Project", count: getReportsByCategory("Project").length + getCustomCountByCategory("Project") },
    { value: "Compliance", label: "Compliance", count: getReportsByCategory("Compliance").length + getCustomCountByCategory("Compliance") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Report Templates
        </CardTitle>
        <CardDescription>
          Choose from your custom templates or pre-built reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {categories.map((category) => (
              <TabsTrigger key={category.value} value={category.value} className="gap-2">
                {category.label}
                <Badge variant="secondary" className="text-xs">
                  {category.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-3 mt-4">
            {/* Custom Templates Section */}
            {filteredCustomTemplates.length > 0 && (
              <div className="mb-6">
                {(selectedCategory !== 'custom') && (
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">My Templates</h3>
                )}
                <div className="grid gap-3">
                  {filteredCustomTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="hover:border-primary transition-colors cursor-pointer"
                      onClick={() => onSelectCustomTemplate?.(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg border bg-blue-50 text-blue-600 border-blue-200">
                            <FileCheck className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-sm">{template.templateName}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {template.templateType}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost">
                                Use
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                PDF Template
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Pre-built Templates Section */}
            {(selectedCategory !== 'custom') && (
              <>
                {(selectedCategory === 'all' && filteredCustomTemplates.length > 0) && (
                   <h3 className="text-sm font-medium text-muted-foreground mb-3">Pre-built Reports</h3>
                )}
                {filteredTemplates.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No reports found matching your search
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredTemplates.map((template) => {
                      const Icon = iconMap[template.icon || 'FileText'];
                      const colorClass = colorMap[template.color || 'blue'];

                      return (
                        <Card
                          key={template.id}
                          className="hover:border-primary transition-colors cursor-pointer"
                          onClick={() => onSelectTemplate(template)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg border ${colorClass}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold text-sm">{template.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {template.description}
                                    </p>
                                  </div>
                                  <Button size="sm" variant="ghost">
                                    Use
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {template.category}
                                  </Badge>
                                  {template.requiredFilters && template.requiredFilters.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      Requires: {template.requiredFilters.join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
