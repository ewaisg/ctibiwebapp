
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { 
  addWeeks, 
  addMonths,
  addQuarters,
  addYears,
  startOfWeek, 
  startOfMonth,
  startOfQuarter,
  startOfYear,
  format,
  getQuarter,
} from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WorkloadPlanner } from "@/components/manpower/workload-planner";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Assignment, TimelineView, Employee, Project, Department, CtiTimesheet, Service } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
    addAssignmentAction,
    updateAssignmentAction,
    deleteAssignmentAction,
    deleteProjectAssignmentsAction,
    updateAssignmentRoleAction,
    switchProjectAssignmentsAction,
} from "./actions";

interface ManPowerClientPageProps {
  initialEmployees: Employee[];
  initialProjects: Project[];
  initialDepartments: Department[];
  initialAssignments: Assignment[];
  initialTimesheetEntries: CtiTimesheet[];
  initialServices: Service[];
}

const DateRangeDisplay = ({ timePeriods, timelineView, onReset }: { timePeriods: Date[], timelineView: TimelineView, onReset: () => void }) => {
    const label = useMemo(() => {
        if (!timePeriods || timePeriods.length === 0) {
            return "Today";
        }

        const startDate = timePeriods[0];
        const endDate = timePeriods[timePeriods.length - 1];

        switch (timelineView) {
            case 'week':
                const endOfWeekDate = addWeeks(startDate, timePeriods.length - 1);
                return `${format(startDate, 'MMM d')} - ${format(endOfWeekDate, 'MMM d, yyyy')}`;
            case 'month':
                 if (startDate.getFullYear() === endDate.getFullYear()) {
                    return `${format(startDate, 'MMM')} - ${format(endDate, 'MMM yyyy')}`;
                }
                return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
            case 'quarter':
                return `Q${getQuarter(startDate)} ${format(startDate, 'yyyy')} - Q${getQuarter(endDate)} ${format(endDate, 'yyyy')}`;
            case 'year':
                return `${format(startDate, 'yyyy')} - ${format(endDate, 'yyyy')}`;
            default:
                return "Today";
        }
    }, [timePeriods, timelineView]);

    return (
        <Button variant="outline" onClick={onReset} className="w-full sm:w-auto text-center">
            {label}
        </Button>
    );
};


export function ManPowerClientPage({
  initialEmployees,
  initialProjects,
  initialDepartments,
  initialAssignments,
  initialTimesheetEntries,
  initialServices,
}: ManPowerClientPageProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  
  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [timelineView, setTimelineView] = useState<TimelineView>('week');
  const [timelineStartDate, setTimelineStartDate] = useState(new Date());
  const [timePeriods, setTimePeriods] = useState<Date[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [highlightedAssignments, setHighlightedAssignments] = useState<Set<string>>(new Set());
  
  const initialFilters = {
    employee: 'all',
    project: 'all',
    department: 'all',
    role: 'all',
    minCapacity: '',
    maxCapacity: '',
  };

  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    const today = timelineStartDate;
    let periods: Date[] = [];
    const weekStartsOn = 0; // Sunday
    
    switch (timelineView) {
      case 'month':
        const monthStart = startOfMonth(today);
        periods = Array.from({ length: 12 }, (_, i) => addMonths(monthStart, i));
        break;
      case 'quarter':
        const quarterStart = startOfQuarter(today);
        periods = Array.from({ length: 8 }, (_, i) => addQuarters(quarterStart, i));
        break;
      case 'year':
        const yearStart = startOfYear(today);
        periods = Array.from({ length: 5 }, (_, i) => addYears(yearStart, i));
        break;
      case 'week':
      default:
        const weekStart = startOfWeek(today, { weekStartsOn });
        periods = Array.from({ length: 8 }, (_, i) => addWeeks(weekStart, i));
        break;
    }
    setTimePeriods(periods);
  }, [timelineView, timelineStartDate]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setIsSheetOpen(false);
  }

  const allRoles = useMemo(() => [...new Set(initialEmployees.map(e => e.role).filter(Boolean))] as string[], [initialEmployees]);

  const filteredEmployees = useMemo(() => {
    return initialEmployees.filter(employee => {
      const { minCapacity, maxCapacity } = filters;

      if (filters.employee !== 'all' && employee.id !== filters.employee) {
          return false;
      }
      
      if (filters.department !== 'all' && employee.departmentId !== filters.department) {
          return false;
      }

      if (filters.role !== 'all' && employee.role !== filters.role) {
          return false;
      }

      if (minCapacity && employee.weeklyCapacityHours < parseInt(minCapacity, 10)) {
        return false;
      }

      if (maxCapacity && employee.weeklyCapacityHours > parseInt(maxCapacity, 10)) {
        return false;
      }

      return true;
    });
  }, [filters, initialEmployees]);

  const hasAnyFilter = Object.entries(filters).some(([key, value]) => {
    if (key === 'minCapacity' || key === 'maxCapacity') {
      return value !== '';
    }
    return value !== 'all';
  });
  
  const handleAction = (action: () => Promise<any>, successMessage: string) => {
    startTransition(async () => {
        try {
            await action();
            toast({ title: "Success", description: successMessage });
        } catch (error) {
            console.error("Action failed:", error);
            toast({ variant: "destructive", title: "Error", description: `An error occurred. ${error instanceof Error ? error.message : ''}` });
        }
    });
  };

  const handleAddAssignment = (assignment: Omit<Assignment, 'id'>) => {
    handleAction(() => addAssignmentAction(assignment), "Assignment created.");
  }

  const handleUpdateAssignment = (id: string, data: Partial<Omit<Assignment, 'id'>>) => {
    handleAction(() => updateAssignmentAction(id, data), "Assignment updated.");
  }

  const handleDeleteAssignment = (id: string) => {
    handleAction(() => deleteAssignmentAction(id), "Assignment deleted.");
  }
  
  const handleDeleteProjectAssignment = (employeeId: string, projectId: string) => {
    handleAction(() => deleteProjectAssignmentsAction(employeeId, projectId), "Project assignments deleted.");
  };

  const handleRoleChange = (employeeId: string, projectId: string, newRole: string, serviceId: string) => {
    handleAction(() => updateAssignmentRoleAction(employeeId, projectId, newRole, serviceId), "Assignment role updated.");
  }

  const handleProjectSwitch = (employeeId: string, oldProjectId: string, newProjectId: string) => {
    handleAction(() => switchProjectAssignmentsAction(employeeId, oldProjectId, newProjectId), "Project assignments switched successfully.");
  }


  
  const handleTimelineNav = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setTimelineStartDate(new Date());
      return;
    }
    
    const getAmount = () => {
      switch (timelineView) {
        case 'week': return 4;
        case 'month': return 6;
        case 'quarter': return 4;
        case 'year': return 1;
        default: return 1;
      }
    };
    
    const amount = direction === 'prev' ? -getAmount() : getAmount();

    setTimelineStartDate(currentDate => {
      switch (timelineView) {
        case 'week':
          return addWeeks(currentDate, amount);
        case 'month':
          return addMonths(currentDate, amount);
        case 'quarter':
          return addQuarters(currentDate, amount);
        case 'year':
          return addYears(currentDate, amount);
        default:
          return currentDate;
      }
    });
  };

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: "Manpower Planner" }]}
        className="mb-4"
      />

      <div id="main-content" className="flex flex-col md:flex-row items-start justify-between space-y-2 md:space-y-0 md:space-x-4">
        <h1 className="text-3xl font-bold tracking-tight">Manpower Planner</h1>

      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
            <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {initialEmployees.map((e: Employee) => <SelectItem key={e.id} value={e.id}>{e.formalName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.project} onValueChange={(value) => handleFilterChange('project', value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {initialProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setIsSheetOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              More Filters
            </Button>
            {hasAnyFilter && (
                <Button variant="ghost" onClick={clearFilters} className="text-sm">
                    <X className="mr-2 h-4 w-4" />
                    Clear
                </Button>
            )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleTimelineNav('prev')} title="Previous period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DateRangeDisplay timePeriods={timePeriods} timelineView={timelineView} onReset={() => handleTimelineNav('today')} />
          <Button variant="outline" size="icon" onClick={() => handleTimelineNav('next')} title="Next period">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Tabs 
            defaultValue="week" 
            value={timelineView}
            onValueChange={(value) => setTimelineView(value as TimelineView)}
          >
            <TabsList>
              <TabsTrigger value="week">Wk</TabsTrigger>
              <TabsTrigger value="month">Mo</TabsTrigger>
              <TabsTrigger value="quarter">Qtr</TabsTrigger>
              <TabsTrigger value="year">Yr</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <WorkloadPlanner
        employees={filteredEmployees}
        projects={initialProjects}
        departments={initialDepartments}
        services={initialServices}
        assignments={assignments}
        onAddAssignment={handleAddAssignment}
        onUpdateAssignment={handleUpdateAssignment}
        onDeleteAssignment={handleDeleteAssignment}
        onDeleteProjectAssignment={handleDeleteProjectAssignment}
        onRoleChange={handleRoleChange}
        onProjectSwitch={handleProjectSwitch}
        timelineView={timelineView}
        timePeriods={timePeriods}
        activeProjectFilter={filters.project}
        highlightedAssignments={highlightedAssignments}
        isUpdating={isPending}
      />
    </div>

    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>More Filters</SheetTitle>
                <SheetDescription>
                    Apply additional filters to refine your view.
                </SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 py-6">
                <div className="grid gap-2">
                    <Label htmlFor="department-filter">Department</Label>
                    <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                        <SelectTrigger id="department-filter">
                            <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {initialDepartments.map(d => <SelectItem key={d.id} value={d.departmentName}>{d.departmentName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="role-filter">Role</Label>
                    <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                        <SelectTrigger id="role-filter">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="min-capacity">Min Capacity</Label>
                        <Input id="min-capacity" type="number" placeholder="e.g. 20" value={filters.minCapacity} onChange={(e) => handleFilterChange('minCapacity', e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="max-capacity">Max Capacity</Label>
                        <Input id="max-capacity" type="number" placeholder="e.g. 40" value={filters.maxCapacity} onChange={(e) => handleFilterChange('maxCapacity', e.target.value)} />
                    </div>
                </div>
            </div>
            <SheetFooter>
                <Button variant="outline" onClick={clearFilters}>Clear All Filters</Button>
                <Button onClick={() => setIsSheetOpen(false)}>Apply</Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>
    </>
  );
}
