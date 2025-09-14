"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, Building2 } from "lucide-react";
import type { Project, Company, Employee, Service } from "@/types";

interface ProjectTeamManagementProps {
  project: Project;
  companies: Company[];
  employees: Employee[];
  services: Service[];
  onUpdate: (updatedProject: Project) => Promise<void>;
}

export function ProjectTeamManagement({
  project,
  companies,
  employees,
  services,
  onUpdate,
}: ProjectTeamManagementProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (updatedProject: Project) => {
    setIsUpdating(true);
    try {
      await onUpdate(updatedProject);
    } finally {
      setIsUpdating(false);
    }
  };

  const addCompany = () => {
    if (!selectedCompanyId) return;
    
    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) return;

    const newAssignedCompany = {
      companyId: selectedCompanyId,
      companyName: company.companyName,
      assignedEmployees: [],
      assignedServices: [],
    };

    const updatedProject = {
      ...project,
      assignedCompanies: [...(project.assignedCompanies || []), newAssignedCompany],
    };

    onUpdate(updatedProject);
    setSelectedCompanyId("");
  };

  const removeCompany = (companyIndex: number) => {
    const updatedProject = {
      ...project,
      assignedCompanies: project.assignedCompanies?.filter((_, i) => i !== companyIndex) || [],
    };
    handleUpdate(updatedProject);
  };

  const addEmployee = (companyIndex: number, employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const updatedAssignedCompanies = [...(project.assignedCompanies || [])];
    updatedAssignedCompanies[companyIndex].assignedEmployees = [
      ...(updatedAssignedCompanies[companyIndex].assignedEmployees || []),
      {
        employeeId: employee.id,
        employeeName: employee.formalName,
      },
    ];

    handleUpdate({ ...project, assignedCompanies: updatedAssignedCompanies });
  };

  const removeEmployee = (companyIndex: number, employeeIndex: number) => {
    const updatedAssignedCompanies = [...(project.assignedCompanies || [])];
    updatedAssignedCompanies[companyIndex].assignedEmployees = 
      updatedAssignedCompanies[companyIndex].assignedEmployees?.filter((_, i) => i !== employeeIndex) || [];

    handleUpdate({ ...project, assignedCompanies: updatedAssignedCompanies });
  };

  const addService = (companyIndex: number, serviceId: string, billingRate: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const updatedAssignedCompanies = [...(project.assignedCompanies || [])];
    updatedAssignedCompanies[companyIndex].assignedServices = [
      ...(updatedAssignedCompanies[companyIndex].assignedServices || []),
      {
        serviceId: service.id,
        serviceName: service.serviceName,
        billingRate,
        description: "",
        isActive: true,
      },
    ];

    handleUpdate({ ...project, assignedCompanies: updatedAssignedCompanies });
  };

  const updateServiceRate = (companyIndex: number, serviceIndex: number, billingRate: number) => {
    const updatedAssignedCompanies = [...(project.assignedCompanies || [])];
    updatedAssignedCompanies[companyIndex].assignedServices![serviceIndex].billingRate = billingRate;

    handleUpdate({ ...project, assignedCompanies: updatedAssignedCompanies });
  };

  const removeService = (companyIndex: number, serviceIndex: number) => {
    const updatedAssignedCompanies = [...(project.assignedCompanies || [])];
    updatedAssignedCompanies[companyIndex].assignedServices = 
      updatedAssignedCompanies[companyIndex].assignedServices?.filter((_, i) => i !== serviceIndex) || [];

    handleUpdate({ ...project, assignedCompanies: updatedAssignedCompanies });
  };

  const getAvailableCompanies = () => {
    if (!companies || !Array.isArray(companies)) return [];
    
    const assignedCompanyIds = project.assignedCompanies?.map(ac => 
      typeof ac.companyId === 'object' ? ac.companyId.id : ac.companyId
    ) || [];
    return companies.filter(c => !assignedCompanyIds.includes(c.id));
  };

  const getAvailableEmployees = (companyId: string) => {
    if (!employees || !Array.isArray(employees)) return [];
    
    const company = project.assignedCompanies?.find(ac => 
      (typeof ac.companyId === 'object' ? ac.companyId.id : ac.companyId) === companyId
    );
    const assignedEmployeeIds = company?.assignedEmployees?.map(ae => 
      typeof ae.employeeId === 'object' ? ae.employeeId.id : ae.employeeId
    ) || [];
    
    return employees.filter(e => {
      const empCompanyId = typeof e.companyId === 'object' ? e.companyId.id : e.companyId;
      return empCompanyId === companyId && !assignedEmployeeIds.includes(e.id) && e.employmentStatus === 'Active';
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Project Team Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-6">
            <div className="flex-1">
              <Label>Add Company</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company to add" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCompanies().map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addCompany} disabled={!selectedCompanyId || isUpdating}>
              <Plus className="mr-2 h-4 w-4" />
              {isUpdating ? "Saving..." : "Add Company"}
            </Button>
          </div>

          {project.assignedCompanies?.map((assignedCompany, companyIndex) => (
            <Card key={companyIndex} className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    <CardTitle className="text-lg">{assignedCompany.companyName}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCompany(companyIndex)}
                    disabled={isUpdating}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Employees Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Assigned Employees</h4>
                    <EmployeeSelector
                      companyId={typeof assignedCompany.companyId === 'object' ? assignedCompany.companyId.id : assignedCompany.companyId}
                      availableEmployees={getAvailableEmployees(typeof assignedCompany.companyId === 'object' ? assignedCompany.companyId.id : assignedCompany.companyId)}
                      onAdd={(employeeId) => addEmployee(companyIndex, employeeId)}
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assignedCompany.assignedEmployees?.map((employee, employeeIndex) => (
                      <Badge key={employeeIndex} variant="secondary" className="flex items-center gap-1">
                        {employee.employeeName}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeEmployee(companyIndex, employeeIndex)}
                          disabled={isUpdating}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Services Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Services & Rates</h4>
                    <ServiceSelector
                      assignedServices={assignedCompany.assignedServices || []}
                      availableServices={services}
                      onAdd={(serviceId, billingRate) => addService(companyIndex, serviceId, billingRate)}
                      disabled={isUpdating}
                    />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Billing Rate</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedCompany.assignedServices?.map((service, serviceIndex) => (
                        <TableRow key={serviceIndex}>
                          <TableCell>{service.serviceName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={service.billingRate}
                              onChange={(e) => updateServiceRate(companyIndex, serviceIndex, parseFloat(e.target.value) || 0)}
                              className="w-24"
                              disabled={isUpdating}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(companyIndex, serviceIndex)}
                              disabled={isUpdating}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeSelector({ 
  availableEmployees, 
  onAdd,
  disabled 
}: { 
  companyId: string;
  availableEmployees: Employee[];
  onAdd: (employeeId: string) => void;
  disabled?: boolean;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const handleAdd = () => {
    if (selectedEmployeeId) {
      onAdd(selectedEmployeeId);
      setSelectedEmployeeId("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={disabled}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select employee" />
        </SelectTrigger>
        <SelectContent>
          {(availableEmployees || []).map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.formalName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleAdd} disabled={!selectedEmployeeId || disabled}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ServiceSelector({ 
  assignedServices, 
  availableServices, 
  onAdd,
  disabled 
}: { 
  assignedServices: any[];
  availableServices: Service[];
  onAdd: (serviceId: string, billingRate: number) => void;
  disabled?: boolean;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [billingRate, setBillingRate] = useState("");

  const handleAdd = () => {
    if (selectedServiceId && billingRate) {
      onAdd(selectedServiceId, parseFloat(billingRate));
      setSelectedServiceId("");
      setBillingRate("");
    }
  };

  const assignedServiceIds = (assignedServices || []).map(as => 
    typeof as.serviceId === 'object' ? as.serviceId.id : as.serviceId
  );
  const unassignedServices = (availableServices || []).filter(s => !assignedServiceIds.includes(s.id));

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedServiceId} onValueChange={setSelectedServiceId} disabled={disabled}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select service" />
        </SelectTrigger>
        <SelectContent>
          {unassignedServices.map((service) => (
            <SelectItem key={service.id} value={service.id}>
              {service.serviceName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        step="0.01"
        placeholder="Rate"
        value={billingRate}
        onChange={(e) => setBillingRate(e.target.value)}
        className="w-24"
        disabled={disabled}
      />
      <Button size="sm" onClick={handleAdd} disabled={!selectedServiceId || !billingRate || disabled}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}