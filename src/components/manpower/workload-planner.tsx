"use client";

import React, { useState, useEffect, Fragment, memo, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import type { Employee, Project, Assignment, TimelineView, Service, Department } from '@/types';
import { 
  format, 
  startOfWeek, 
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  getQuarter,
  isWithinInterval,
  addDays,
} from 'date-fns';
import { ChevronDown, ChevronRight, Loader2, Trash2, TriangleAlert, Edit3, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentForm } from './assignment-form';
import { AddProjectForm } from './add-project-form';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { extractId } from '@/lib/document-reference-utils';

// Helper function to convert UniversalTimestamp to Date
const toJSDate = (value: any): Date => {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date(value);
};

interface WorkloadPlannerProps {
  employees: Employee[];
  projects: Project[];
  services: Service[];
  assignments: Assignment[];
  departments: Department[];
  onAddAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  onUpdateAssignment: (id: string, data: Partial<Omit<Assignment, 'id'>>) => void;
  onDeleteAssignment: (id: string) => void;
  onDeleteProjectAssignment: (employeeId: string, projectId: string) => void;
  onRoleChange: (employeeId: string, projectId: string, newRole: string, serviceId: string) => void;
  onProjectSwitch?: (employeeId: string, oldProjectId: string, newProjectId: string) => void;
  timelineView: TimelineView;
  timePeriods: Date[];
  activeProjectFilter: string;
  highlightedAssignments?: Set<string>;
  isUpdating: boolean;
}

const getUtilizationColor = (utilization: number) => {
  if (utilization > 0.85) return 'bg-green-200/50 text-green-800'; // Optimal and Over-utilized are green
  if (utilization > 0) return 'bg-yellow-200/50 text-yellow-800'; // Under-utilized
  return 'bg-gray-100 dark:bg-gray-800'; // No hours
};

const getHoursForPeriod = (
  employeeAssignments: Assignment[],
  period: Date,
  timelineView: TimelineView
) => {
  let interval;
  const weekStartsOn = 0; // Sunday

  switch (timelineView) {
    case 'month':
      interval = { start: startOfMonth(period), end: endOfMonth(period) };
      break;
    case 'quarter':
      interval = { start: startOfQuarter(period), end: endOfQuarter(period) };
      break;
    case 'year':
      interval = { start: startOfYear(period), end: endOfYear(period) };
      break;
    case 'week':
    default:
      interval = { start: startOfWeek(period, { weekStartsOn }), end: endOfWeek(period, { weekStartsOn }) };
      break;
  }
  return employeeAssignments
    .filter(a => isWithinInterval(toJSDate(a.weekStartDate), interval))
    .reduce((sum, a) => sum + a.scheduledHours, 0);
};

const getCapacityForPeriod = (
  employeeCapacity: number,
  period: Date,
  timelineView: TimelineView
) => {
  switch (timelineView) {
    case 'month':
      return employeeCapacity * 4.33; // Approximation
    case 'quarter':
      return employeeCapacity * 13;
    case 'year':
      return employeeCapacity * 52;
    case 'week':
    default:
      return employeeCapacity;
  }
};


export const WorkloadPlanner = memo(function WorkloadPlanner({ 
  employees, 
  projects, 
  services,
  assignments, 
  departments,
  onAddAssignment, 
  onUpdateAssignment, 
  onDeleteAssignment,
  onDeleteProjectAssignment,
  onRoleChange,
  onProjectSwitch,
  timelineView,
  timePeriods,
  activeProjectFilter,
  highlightedAssignments,
  isUpdating,
}: WorkloadPlannerProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [formContext, setFormContext] = useState<{
    assignment: Assignment | null;
    employeeId: string;
    weekStartDate: Date;
    projectId?: string;
  } | null>(null);

  const [isAddProjectFormOpen, setIsAddProjectFormOpen] = useState(false);
  const [employeeForNewProject, setEmployeeForNewProject] = useState<Employee | null>(null);

  // Project switching state
  const [isProjectSwitchOpen, setIsProjectSwitchOpen] = useState(false);
  const [projectSwitchContext, setProjectSwitchContext] = useState<{
    employeeId: string;
    currentProjectId: string;
    employeeName: string;
    currentProjectName: string;
  } | null>(null);

  // Batch operations state
  const [copyModeActive, setCopyModeActive] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [copiedHours, setCopiedHours] = useState<number | null>(null);

  const weekStartsOn = 0; // Sunday

  // Memoize expensive calculations
  const filteredProjects = useMemo(() => {
    return activeProjectFilter === 'all' 
      ? projects 
      : projects.filter(p => p.id === activeProjectFilter);
  }, [projects, activeProjectFilter]);

  const filteredEmployees = useMemo(() => {
    if (activeProjectFilter === 'all') return employees;
    
    // Only show employees assigned to the filtered project
    const projectAssignments = assignments.filter(a => extractId(a.projectId) === activeProjectFilter);
    const assignedEmployeeIds = new Set<string>(
      projectAssignments
        .map(a => extractId(a.employeeId))
        .filter((id): id is string => !!id)
    );
    return employees.filter(e => assignedEmployeeIds.has(e.id));
  }, [employees, assignments, activeProjectFilter]);

  const handleCellClick = useCallback((employeeId: string, projectId: string, weekStartDate: Date, event?: React.MouseEvent) => {
    if (copyModeActive) {
      const cellKey = `${employeeId}-${projectId}-${weekStartDate.getTime()}`;
      const newSelectedCells = new Set(selectedCells);
      
      if (newSelectedCells.has(cellKey)) {
        newSelectedCells.delete(cellKey);
      } else {
        newSelectedCells.add(cellKey);
      }
      
      setSelectedCells(newSelectedCells);
      return;
    }
    
    if (event?.shiftKey) {
      // Shift+click: Fallback for copy operation
      const assignment = assignments.find(a => 
        extractId(a.employeeId) === employeeId && 
        extractId(a.projectId) === projectId && 
        toJSDate(a.weekStartDate).getTime() === weekStartDate.getTime()
      );
      if (assignment) {
        handleCopyCell(assignment, employeeId, projectId, weekStartDate);
      }
    } else if (event?.ctrlKey) {
      // Ctrl+click: Fallback for delete operation
      const assignment = assignments.find(a => 
        extractId(a.employeeId) === employeeId && 
        extractId(a.projectId) === projectId && 
        toJSDate(a.weekStartDate).getTime() === weekStartDate.getTime()
      );
      if (assignment) {
        handleDeleteCell(assignment);
      }
    } else {
      // Normal click: Open assignment form
      const assignment = assignments.find(a => 
        extractId(a.employeeId) === employeeId && 
        extractId(a.projectId) === projectId && 
        toJSDate(a.weekStartDate).getTime() === weekStartDate.getTime()
      );
      
      setFormContext({
        assignment: assignment || null,
        employeeId,
        weekStartDate,
        projectId
      });
      setIsAssignmentFormOpen(true);
    }
  }, [copyModeActive, selectedCells, assignments]);

  useEffect(() => {
    if (activeProjectFilter !== 'all') {
      // Automatically expand employees who are on the filtered project
      const assignedEmployeeIds = new Set<string>(
        assignments
          .filter(a => extractId(a.projectId) === activeProjectFilter)
          .map(a => extractId(a.employeeId))
          .filter((id): id is string => !!id)
      );
      setExpandedRows(assignedEmployeeIds);
    } else {
      // Optionally clear expansions when filter is cleared
      // setExpandedRows(new Set()); 
    }
  }, [activeProjectFilter, assignments]);

  const toggleRow = (employeeId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) newSet.delete(employeeId);
      else newSet.add(employeeId);
      return newSet;
    });
  };

  const getProjectFromId = (projectId: string): Project | undefined => projects.find(p => p.id === projectId);

  const handleOpenAssignmentForm = (context: { assignment: Assignment | null; employeeId: string; weekStartDate: Date; projectId?: string; }) => {
    setFormContext(context);
    setIsAssignmentFormOpen(true);
  };
  
  const handleSaveAssignment = (data: { projectId?: string; hours: number }) => {
    if (!formContext) return;
    
    const projectId = formContext.projectId || data.projectId;
    if (!projectId) return;

    if (formContext.assignment) {
      onUpdateAssignment(formContext.assignment.id, { scheduledHours: data.hours });
    } else {
      // Find an existing assignment for this employee/project to copy the role from
      const existingAssignments = assignments.filter(a => extractId(a.employeeId) === formContext.employeeId && extractId(a.projectId) === projectId);
      const existingAssignmentWithRole = existingAssignments.find(a => a.serviceId && a.serviceTitle);
      const serviceTitle = existingAssignmentWithRole?.serviceTitle;
      const serviceId = existingAssignmentWithRole?.serviceId;
      
      onAddAssignment({ 
        employeeId: formContext.employeeId, 
        projectId: projectId,
        scheduledHours: data.hours,
        weekStartDate: formContext.weekStartDate,
        serviceTitle,
        serviceId,
      });
    }
    setIsAssignmentFormOpen(false);
    setFormContext(null);
  };

  const handleDeleteAssignmentInForm = () => {
    if (formContext && formContext.assignment) {
      onDeleteAssignment(formContext.assignment.id);
    }
    setIsAssignmentFormOpen(false);
    setFormContext(null);
  };

  const handleOpenAddProjectForm = (employee: Employee) => {
    setEmployeeForNewProject(employee);
    setIsAddProjectFormOpen(true);
  };

  const handleSaveNewProject = (data: { projectId: string }) => {
    if (!employeeForNewProject || !timePeriods.length) return;

    onAddAssignment({
        employeeId: employeeForNewProject.id,
        projectId: data.projectId,
        scheduledHours: 0,
        weekStartDate: startOfWeek(timePeriods[0], { weekStartsOn })
    });
    setExpandedRows(prev => new Set(prev).add(employeeForNewProject.id));
    setIsAddProjectFormOpen(false);
    setEmployeeForNewProject(null);
  };

  const handleOpenProjectSwitch = (employeeId: string, currentProjectId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    const project = projects.find(p => p.id === currentProjectId);
    
    if (employee && project) {
      setProjectSwitchContext({
        employeeId,
        currentProjectId,
        employeeName: employee.formalName,
        currentProjectName: project.projectName
      });
      setIsProjectSwitchOpen(true);
    }
  };

  const handleProjectSwitch = (data: { projectId: string }) => {
    if (!projectSwitchContext || !onProjectSwitch) return;
    
    onProjectSwitch(
      projectSwitchContext.employeeId,
      projectSwitchContext.currentProjectId,
      data.projectId
    );
    setIsProjectSwitchOpen(false);
    setProjectSwitchContext(null);
  };

  // Specific action handlers
  const handleEditCell = (assignment: Assignment | null, employeeId: string, weekStartDate: Date, projectId: string) => {
    handleOpenAssignmentForm({ assignment, employeeId, weekStartDate, projectId });
  };

  const handleCopyCell = (assignment: Assignment, employeeId: string, projectId: string, weekStartDate: Date) => {
    const cellKey = `${employeeId}-${projectId}-${weekStartDate.getTime()}`;
    setCopiedHours(assignment.scheduledHours);
    setCopyModeActive(true);
    setSelectedCells(new Set([cellKey]));
  };

  const handleDeleteCell = (assignment: Assignment) => {
    onDeleteAssignment(assignment.id);
  };

  const handleBatchCopy = () => {
    if (copiedHours === null || selectedCells.size === 0) return;
    
    selectedCells.forEach(cellKey => {
      const [employeeId, projectId, weekStartTimestamp] = cellKey.split('-');
      const weekStartDate = new Date(parseInt(weekStartTimestamp));
      
      // Find existing assignment for this cell
      const assignment = assignments.find(a => 
        extractId(a.employeeId) === employeeId && 
        extractId(a.projectId) === projectId && 
        toJSDate(a.weekStartDate).getTime() === weekStartDate.getTime()
      );
      
      if (assignment) {
        // Update existing assignment
        onUpdateAssignment(assignment.id, { scheduledHours: copiedHours });
      } else {
        // Create new assignment
        onAddAssignment({
          employeeId,
          projectId,
          scheduledHours: copiedHours,
          weekStartDate
        });
      }
    });
    
    // Clear copy mode
    setCopyModeActive(false);
    setSelectedCells(new Set());
    setCopiedHours(null);
  };

  const handleCancelCopy = () => {
    setCopyModeActive(false);
    setSelectedCells(new Set());
    setCopiedHours(null);
  };
  
  return (
    <>
      <Card className="relative">
         {isUpdating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-30">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {/* Instructions Panel */}
        {!copyModeActive && (
          <div className="border-b bg-muted/30 px-4 py-2">
            <div className="text-xs text-muted-foreground flex items-center gap-4">
              <span>💡 <strong>Hover over cells</strong> to see action icons:</span>
              <span className="flex items-center gap-1"><Edit3 className="h-3 w-3" /> Edit</span>
              <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> Copy</span>
              <span className="flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</span>
            </div>
          </div>
        )}
        
        {/* Batch Copy Controls */}
        {copyModeActive && (
          <div className="border-b bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-blue-600" />
                  <div className="text-sm font-medium">
                    Batch Copy Mode: <span className="font-mono">{copiedHours?.toFixed(1)} hours</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedCells.size} {selectedCells.size === 1 ? 'cell' : 'cells'} selected
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleBatchCopy} disabled={selectedCells.size === 0}>
                  Apply to {selectedCells.size} {selectedCells.size === 1 ? 'cell' : 'cells'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelCopy}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              💡 Click cells to select them for batch copying. The copied hours will be applied to all selected cells.
            </div>
          </div>
        )}
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full" style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] sticky left-0 bg-background z-20 p-2">Employee/Project</TableHead>
                  <TableHead className="w-[150px] sticky left-[200px] bg-background z-10 text-center">Capacity/Role</TableHead>
                  {timePeriods.map((period, i) => {
                    let label = '';
                    switch (timelineView) {
                      case 'month':
                        label = format(period, 'MMM yyyy');
                        break;
                      case 'quarter':
                        label = `Q${getQuarter(period)} ${format(period, 'yyyy')}`;
                        break;
                      case 'year':
                        label = format(period, 'yyyy');
                        break;
                      case 'week':
                      default:
                        // Show week ending date (Saturday) which is 6 days after the start (Sunday)
                        const weekEnd = addDays(startOfWeek(period, { weekStartsOn }), 6);
                        label = format(weekEnd, 'MMM d');
                        break;
                    }
                    return <TableHead key={i} className="text-center min-w-[120px]">{label}</TableHead>
                  })}
                  <TableHead className="text-center min-w-[120px] font-bold">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(employee => {
                  const isExpanded = expandedRows.has(employee.id);
                  const employeeAssignments = assignments.filter(a => extractId(a.employeeId) === employee.id);
                  const assignedProjectIds = [...new Set(
                    employeeAssignments
                      .map(a => extractId(a.projectId))
                      .filter((id): id is string => !!id)
                  )];
                  
                  const assignedProjects = assignedProjectIds
                    .map(id => getProjectFromId(id))
                    .filter((p): p is Project => !!p);
                  
                  const employeeTotalHours = timePeriods.reduce((acc, period) => {
                    return acc + getHoursForPeriod(employeeAssignments, period, timelineView);
                  }, 0);

                  return (
                    <Fragment key={employee.id}>
                      <TableRow className="group bg-background hover:bg-muted">
                        <TableCell className="font-medium sticky left-0 bg-inherit z-20 w-[200px] p-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => toggleRow(employee.id)} className="h-8 w-8">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <p className="font-semibold truncate pr-2">{employee.formalName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="sticky left-[200px] bg-inherit z-10 w-[150px] text-center">
                          <div className="font-mono">
                            {employee.weeklyCapacityHours?.toFixed(1) || '40.0'}
                          </div>
                        </TableCell>
                        {timePeriods.map((period, i) => {
                          const scheduledHours = getHoursForPeriod(employeeAssignments, period, timelineView);
                          const periodCapacity = getCapacityForPeriod(employee.weeklyCapacityHours || 40, period, timelineView);
                          const utilization = periodCapacity > 0 ? scheduledHours / periodCapacity : 0;
                          const isOverUtilized = utilization > 1;
                          
                          return (
                            <TableCell key={i} className={cn("text-center font-mono relative", getUtilizationColor(utilization))}>
                              {isOverUtilized && (
                                <TriangleAlert className="absolute top-1 right-1 h-3 w-3 text-destructive" />
                              )}
                              {isExpanded ? scheduledHours.toFixed(1) : `${(utilization * 100).toFixed(0)}%`}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-mono font-semibold">{employeeTotalHours.toFixed(1)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {isExpanded && assignedProjects
                        .filter(project => {
                          if (activeProjectFilter === 'all') {
                            return true;
                          }
                          return project.id === activeProjectFilter;
                        })
                        .map(project => {
                          const projectAssignments = employeeAssignments.filter(a => extractId(a.projectId) === project.id);
                          const currentRole = projectAssignments.find(a => a.serviceTitle)?.serviceTitle;
                          const projectTotalHours = timePeriods.reduce((acc, period) => {
                            return acc + getHoursForPeriod(projectAssignments, period, timelineView);
                          }, 0);

                          return (
                            <TableRow key={`${employee.id}-${project.id}`} className="group bg-muted/30 hover:bg-muted/50">
                              <TableCell className="sticky left-0 bg-inherit z-20 w-[200px] p-2 pl-12">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start p-0 h-auto font-medium text-sm hover:text-primary"
                                  onClick={() => handleOpenProjectSwitch(employee.id, project.id)}
                                  title="Click to switch to a different project"
                                >
                                  <div className="truncate">{project.projectName}</div>
                                </Button>
                              </TableCell>
                              <TableCell className="sticky left-[200px] bg-inherit z-10 w-[150px] text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="w-full text-xs font-normal text-left whitespace-normal h-auto py-1 px-2 justify-center"
                                    >
                                      {currentRole || 'Set Role'}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="max-h-72 overflow-y-auto">
                                    {services.map(service => (
                                      <DropdownMenuItem key={service.id} onSelect={() => onRoleChange(employee.id, project.id, service.serviceName, service.id)}>
                                        {service.serviceName}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              {timePeriods.map((period, i) => {
                                const scheduledHours = getHoursForPeriod(projectAssignments, period, timelineView);
                                
                                if (timelineView !== 'week') {
                                  return (
                                    <TableCell key={i} className="text-center p-1 font-mono text-xs">
                                      {scheduledHours > 0 ? scheduledHours.toFixed(1) : '-'}
                                    </TableCell>
                                  );
                                }
                                
                                const assignment = projectAssignments.find(a => toJSDate(a.weekStartDate).getTime() === startOfWeek(period, { weekStartsOn }).getTime());
                                const isHighlighted = assignment && highlightedAssignments?.has(assignment.id);
                                const cellKey = `${employee.id}-${project.id}-${startOfWeek(period, { weekStartsOn }).getTime()}`;
                                const isSelected = selectedCells.has(cellKey);
                                
                                return (
                                  <TableCell key={i} className={cn(
                                    "text-center p-1 transition-all duration-200 relative group", 
                                    isHighlighted && "bg-primary/20",
                                    isSelected && "bg-blue-200 dark:bg-blue-900 ring-2 ring-blue-400 ring-inset shadow-sm"
                                  )}>
                                    <div className="relative">
                                      {/* Cell content with click handler for copy mode */}
                                      <div 
                                        className={cn(
                                          "w-full h-8 flex items-center justify-center font-mono text-xs cursor-pointer rounded transition-all duration-200",
                                          copyModeActive ? "hover:bg-blue-100 dark:hover:bg-blue-800 hover:ring-1 hover:ring-blue-400" : "hover:bg-muted hover:shadow-sm",
                                          isSelected && "bg-blue-100 dark:bg-blue-800 font-semibold"
                                        )}
                                        onClick={(e) => handleCellClick(employee.id, project.id, startOfWeek(period, { weekStartsOn }), e)}
                                        title={copyModeActive ? "Click to select for batch copy" : "Hover to see actions • Shift+Click to copy • Ctrl+Click to delete"}
                                      >
                                        {assignment ? assignment.scheduledHours.toFixed(1) : '-'}
                                      </div>
                                      
                                      {/* Action Icons - only show when not in copy mode */}
                                      {!copyModeActive && (
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/95 backdrop-blur-sm flex items-center justify-center gap-1 rounded">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-transform"
                                            onClick={() => handleEditCell(assignment || null, employee.id, startOfWeek(period, { weekStartsOn }), project.id)}
                                            title="Edit assignment"
                                          >
                                            <Edit3 className="h-3 w-3" />
                                          </Button>
                                          {assignment && (
                                            <>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 hover:bg-blue-500 hover:text-white hover:scale-110 transition-transform"
                                                onClick={() => handleCopyCell(assignment, employee.id, project.id, startOfWeek(period, { weekStartsOn }))}
                                                title="Copy hours for batch operation"
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground hover:scale-110 transition-transform"
                                                onClick={() => handleDeleteCell(assignment)}
                                                title="Delete this assignment"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center font-mono text-xs">{projectTotalHours.toFixed(1)}</TableCell>
                              <TableCell className="text-right p-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDeleteProjectAssignment(employee.id, project.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      {isExpanded && (
                         <TableRow className="group bg-muted/30 hover:bg-muted/50">
                           <TableCell className="sticky left-0 bg-inherit z-20 w-[200px]">
                             <div className="pl-12 text-sm flex items-center text-muted-foreground">
                               <Button variant="ghost" className="text-xs" onClick={() => handleOpenAddProjectForm(employee)}>
                                 Add Project
                               </Button>
                             </div>
                           </TableCell>
                           <TableCell colSpan={timePeriods.length + 3} className="sticky left-[200px] bg-inherit z-10 w-[150px]"></TableCell>
                         </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {formContext && (
        <AssignmentForm 
          isOpen={isAssignmentFormOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setFormContext(null);
            setIsAssignmentFormOpen(isOpen);
          }}
          onSave={handleSaveAssignment}
          onDelete={formContext.assignment ? handleDeleteAssignmentInForm : undefined}
          projects={projects}
          assignment={formContext.assignment}
          preselectedProjectId={formContext.projectId}
        />
      )}

      {employeeForNewProject && (
        <AddProjectForm
          isOpen={isAddProjectFormOpen}
          onOpenChange={setIsAddProjectFormOpen}
          projects={projects}
          departments={departments}
          assignedProjectIds={[
            ...new Set(
              assignments
                .filter(a => extractId(a.employeeId) === employeeForNewProject.id)
                .map(a => extractId(a.projectId))
                .filter((id): id is string => !!id)
            )
          ]}
          onSave={handleSaveNewProject}
        />
      )}

      {projectSwitchContext && (
        <AddProjectForm
          isOpen={isProjectSwitchOpen}
          onOpenChange={setIsProjectSwitchOpen}
          projects={projects}
          departments={departments}
          assignedProjectIds={[projectSwitchContext.currentProjectId]}
          onSave={handleProjectSwitch}
        />
      )}
    </>
  );
});
