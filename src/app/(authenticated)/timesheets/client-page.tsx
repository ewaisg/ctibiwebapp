"use client";

import React, {useState, useEffect, useMemo, useTransition} from "react";
import {toast} from "@/hooks/use-toast";
import {subDays, startOfDay} from "date-fns";
import Link from "next/link";
import {
    ChevronDown,
    ChevronRight,
    Trash2,
    X,
    MoreVertical,
    AlertTriangle,
    Upload,
    Clock,
    TrendingUp,
    Users
} from "lucide-react";
import { TimesheetUploadDialog } from "@/components/timesheet-upload-dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Checkbox} from "@/components/ui/checkbox";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import type {
    Project,
    Department,
    Employee,
    CtiTimesheet as TimesheetEntry} from "@/types";
import {deleteTimesheetEntries, deleteAllTimesheets} from "./actions";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

const BILLABLE_CODES = ['HRLY', 'OVT15', 'SalaryHrs', '1099COMP'];
const PTO_CODES = ['PTO', 'HOL', 'FLTHOL', 'BER', 'JURY'];
const NON_BILLABLE_DEPT_CODES = ['100', '500', '900', '905', '910', '915', '920'];

interface TimesheetClientPageProps {
    projects: Project[];
    employees: Employee[];
    departments: Department[];
    initialEntries: TimesheetEntry[];
    allEntries: TimesheetEntry[];
}

// Helper to determine the work context from a timesheet entry
const getWorkContext = (entry: TimesheetEntry, projects: Project[]) => {
    if (entry.labors && entry.labors.length > 0) {
        // Support both 'Project/Job' and 'Project/Categories' labor title formats
        const projectLabor = entry.labors.find(
            (l) => l.laborTitle === "Project/Job" || l.laborTitle === "Project/Categories"
        );
        if (projectLabor) {
            const project = projects.find(
                (p) => p.poNumber === projectLabor.laborValue
            );
            return project
                ? project.projectName
                : `Project: ${projectLabor.laborValue}`;
        }

        const deptLabor = entry.labors.find((l) => l.laborTitle === "Department");
        if (deptLabor) return `Dept: ${deptLabor.laborValue}`;
    }
    if (entry.payItems && entry.payItems.length > 0) {
        return entry.payItems[0].payItemName;
    }
    return "General";
};

// Helper to get project ID from a timesheet entry
const getProjectIdFromEntry = (entry: TimesheetEntry, projects: Project[]): string | null => {
    if (entry.labors && entry.labors.length > 0) {
        // Support both 'Project/Job' and 'Project/Categories' labor title formats
        const projectLabor = entry.labors.find(l => l.laborTitle === "Project/Job" || l.laborTitle === "Project/Categories");
        if (projectLabor) {
            const project = projects.find(p => p.poNumber === projectLabor.laborValue);
            return project ? project.id : null;
        }
    }
    return null;
}

export function TimesheetClientPage({
                                        projects,
                                        employees,
                                        departments,
                                        initialEntries,
                                        allEntries,
                                    }: TimesheetClientPageProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();
    const [isFiltering, startFilterTransition] = useTransition();
    const router = useRouter();

    // Selection state
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

    // Confirm dialogs
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

    const initialFilters = {
        timePeriod: '30d',
        employee: 'all',
        department: 'all',
        project: 'all',
        context: 'all',
    };
    const [filters, setFilters] = useState(initialFilters);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Clear selections and reset pagination when filters change
    useEffect(() => {
        setSelectedEmployeeIds(new Set());
        setSelectedEntryIds(new Set());
        setCurrentPage(1);
    }, [filters]);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        startFilterTransition(() => {
            setFilters(prev => ({ ...prev, [filterName]: value }));
        });
    };

    const clearFilters = () => setFilters({
        ...initialFilters,
        timePeriod: filters.timePeriod, // Keep the time period filter
    });

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'timePeriod' && value !== 'all');

    const toggleRow = (employeeId: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    // Compute filtered entries first, then build map per employee
    const filteredEntries = useMemo(() => {
        const base = filters.timePeriod === '30d' ? initialEntries : allEntries;
        let timeFilteredEntries = base;
        if (filters.timePeriod !== '30d') {
            if (filters.timePeriod !== 'all') {
                const days = parseInt(filters.timePeriod.replace('d', ''), 10);
                const cutoffDate = subDays(new Date(), days);
                timeFilteredEntries = allEntries.filter(t => {
                    const dateValue = t.timecardDate;
                    let date: Date;
                    if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
                        date = dateValue.toDate();
                    } else if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
                        date = new Date((dateValue as any).seconds * 1000);
                    } else {
                        date = new Date(dateValue as string);
                    }
                    return !isNaN(date.getTime()) && date >= startOfDay(cutoffDate);
                });
            } else {
                timeFilteredEntries = allEntries;
            }
        }

        const visibleEmployees = employees.filter(e => {
            if (filters.employee !== 'all' && e.id !== filters.employee) return false;
            if (filters.department !== 'all' && e.departmentCode !== filters.department) return false;
            return true;
        });
        const visibleEmployeeIds = new Set(visibleEmployees.map(e => e.id));

        return timeFilteredEntries.filter(entry => {
            if (!visibleEmployeeIds.has(entry.employeeId.toString())) return false;

            const entryProjectId = getProjectIdFromEntry(entry, projects);
            if (filters.project !== 'all' && entryProjectId !== filters.project) return false;

            if (filters.context !== 'all' && getWorkContext(entry, projects) !== filters.context) return false;
            return true;
        });
    }, [initialEntries, allEntries, employees, projects, filters]);

    // Helper to get visible entries per employee
    const entriesByEmployee: Record<string, TimesheetEntry[]> = useMemo(() => {
        const map: Record<string, TimesheetEntry[]> = {};
        employees.forEach(e => {
            map[e.id] = [];
        });
        filteredEntries.forEach(entry => {
            if (!map[entry.employeeId.toString()]) map[entry.employeeId.toString()] = [];
            map[entry.employeeId.toString()].push(entry);
        });
        return map;
    }, [filteredEntries, employees]);

    const toggleEmployeeSelection = (employeeId: string, checked: boolean) => {
        setSelectedEmployeeIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(employeeId); else next.delete(employeeId);
            return next;
        });
        // Add/remove that employee's visible entries
        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            const employeeEntries = entriesByEmployee[employeeId] || [];
            if (checked) {
                employeeEntries.forEach(e => next.add(e.id));
            } else {
                employeeEntries.forEach(e => next.delete(e.id));
            }
            return next;
        });
    };

    const toggleEntrySelection = (entryId: string, employeeId: string, checked: boolean) => {
        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(entryId); else next.delete(entryId);
            return next;
        });
        // If all entries of an employee are selected, mark employee selected; otherwise unselect
        const employeeEntries = entriesByEmployee[employeeId] || [];
        setSelectedEmployeeIds(prev => {
            const next = new Set(prev);
            const allSelected = employeeEntries.length > 0 && employeeEntries.every(e => {
                const entrySelected = checked ? (e.id === entryId || prev.has(e.id)) : (e.id !== entryId && prev.has(e.id));
                return entrySelected;
            });
            if (allSelected) {
                next.add(employeeId);
            } else {
                next.delete(employeeId);
            }
            return next;
        });
    };

    const handleDeleteSelected = () => {
        if (selectedEntryIds.size === 0) {
            toast({
                title: "No entries selected",
                description: "Please select entries to delete.",
                variant: "destructive",
            });
            return;
        }
        setConfirmDeleteOpen(true);
    };

    const handleDeleteAll = () => {
        setConfirmDeleteAllOpen(true);
    };

    const confirmDelete = () => {
        startTransition(async () => {
            try {
                const entryIds = Array.from(selectedEntryIds);
                await deleteTimesheetEntries(entryIds);
                toast({
                    title: "Success",
                    description: `Deleted ${entryIds.length} timesheet entries.`,
                });
                setSelectedEntryIds(new Set());
                setSelectedEmployeeIds(new Set());
                router.refresh();
            } catch {
                toast({
                    title: "Error",
                    description: "Failed to delete timesheet entries.",
                    variant: "destructive",
                });
            } finally {
                setConfirmDeleteOpen(false);
            }
        });
    };

    const confirmDeleteAll = () => {
        startTransition(async () => {
            try {
                await deleteAllTimesheets();
                toast({
                    title: "Success",
                    description: "All timesheet entries have been deleted.",
                });
                setSelectedEntryIds(new Set());
                setSelectedEmployeeIds(new Set());
                router.refresh();
            } catch {
                toast({
                    title: "Error",
                    description: "Failed to delete all timesheet entries.",
                    variant: "destructive",
                });
            } finally {
                setConfirmDeleteAllOpen(false);
            }
        });
    };

    const uniqueContexts = useMemo(() => {
        const contexts = new Set<string>();
        filteredEntries.forEach(entry => {
            const context = getWorkContext(entry, projects);
            if (context && typeof context === 'string') {
                contexts.add(context.trim());
            }
        });
        return Array.from(contexts).sort();
    }, [filteredEntries, projects]);

    const uniqueProjects = useMemo(() => {
        return projects.filter(p => p.id && p.projectName).map(p => ({
            id: p.id,
            name: p.projectName
        }));
    }, [projects]);

    const uniqueDepartments = useMemo(() => {
        return departments.filter(d => d.departmentCode && d.departmentName).map(d => ({
            code: d.departmentCode,
            name: d.departmentName
        }));
    }, [departments]);

    const visibleEmployees = useMemo(() => {
        return employees.filter(employee => {
            const hasEntries = entriesByEmployee[employee.id]?.length > 0;
            return hasEntries;
        });
    }, [employees, entriesByEmployee]);

    // Pagination logic
    const totalPages = Math.ceil(visibleEmployees.length / itemsPerPage);
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return visibleEmployees.slice(startIndex, endIndex);
    }, [visibleEmployees, currentPage, itemsPerPage]);

    // Count total entries on current page
    const currentPageEntryIds = useMemo(() => {
        const ids = new Set<string>();
        paginatedEmployees.forEach(emp => {
            entriesByEmployee[emp.id]?.forEach(entry => ids.add(entry.id));
        });
        return ids;
    }, [paginatedEmployees, entriesByEmployee]);

    const metrics = useMemo(() => {
        const totalHours = filteredEntries.reduce((sum, entry) => sum + (entry.totalHoursActual || 0), 0);
        
        let billableHours = 0;
        let ptoHours = 0;
        let nonBillableHours = 0;
        let unpaidLeaveHours = 0;
        
        // Unpaid leave codes
        const UNPAID_LEAVE_CODES = ['LV_UNPD', 'MIL'];
        
        filteredEntries.forEach(entry => {
            const customerCode = entry.labors?.find(l => l.laborTitle === 'Customer')?.laborValue;
            const isDeptNonBillable = customerCode && NON_BILLABLE_DEPT_CODES.includes(customerCode);
            
            entry.payItems?.forEach(payItem => {
                if (UNPAID_LEAVE_CODES.includes(payItem.payItemCode)) {
                    unpaidLeaveHours += payItem.payItemHours;
                } else if (BILLABLE_CODES.includes(payItem.payItemCode) && !isDeptNonBillable) {
                    billableHours += payItem.payItemHours;
                } else if (PTO_CODES.includes(payItem.payItemCode)) {
                    ptoHours += payItem.payItemHours;
                } else {
                    nonBillableHours += payItem.payItemHours;
                }
            });
        });
        
        const utilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
        
        return { totalHours, billableHours, ptoHours, nonBillableHours, unpaidLeaveHours, utilization };
    }, [filteredEntries]);

    const chartData = useMemo(() => {
        console.log('📊 Generating chart data for', filteredEntries.length, 'entries');
        const dailyData = new Map();
        
        filteredEntries.forEach((entry, index) => {
            console.log(`📈 Processing entry ${index + 1}:`, {
                employeeId: entry.employeeId,
                timecardDate: entry.timecardDate,
                payItems: entry.payItems
            });
            // Convert to proper Date object first
            let dateObj: Date | null = null;
            
            console.log('🗓️ Processing date:', entry.timecardDate, typeof entry.timecardDate);
            
            if (entry.timecardDate) {
                if (typeof entry.timecardDate === 'object') {
                    if ('toDate' in entry.timecardDate && typeof entry.timecardDate.toDate === 'function') {
                        dateObj = entry.timecardDate.toDate();
                        console.log('✅ Used toDate():', dateObj);
                    } else if ('seconds' in entry.timecardDate) {
                        dateObj = new Date((entry.timecardDate as any).seconds * 1000);
                        console.log('✅ Used seconds:', dateObj);
                    } else if ('_seconds' in entry.timecardDate) {
                        dateObj = new Date((entry.timecardDate as any)._seconds * 1000);
                        console.log('✅ Used _seconds:', dateObj);
                    } else {
                        console.log('❌ Unknown object format:', entry.timecardDate);
                    }
                } else if (typeof entry.timecardDate === 'string') {
                    dateObj = new Date(entry.timecardDate);
                    console.log('✅ Used string parsing:', dateObj);
                }
            }
            
            // Skip invalid or null dates
            if (!dateObj || isNaN(dateObj.getTime())) {
                console.log('❌ Skipping entry - invalid date:', dateObj);
                return;
            }
            
            console.log('✅ Valid date found:', dateObj);
            
            // Format as YYYY-MM-DD for consistent sorting and display
            const _dateKey = dateObj.toISOString().split('T')[0];
            // Format for display (MM/DD)
            const displayDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
            
            if (!dailyData.has(_dateKey)) {
                dailyData.set(_dateKey, { date: displayDate, dateKey: _dateKey, billable: 0, nonBillable: 0 });
            }
            
            const dayData = dailyData.get(_dateKey);
            const customerCode = entry.labors?.find(l => l.laborTitle === 'Customer')?.laborValue;
            const isDeptNonBillable = customerCode && NON_BILLABLE_DEPT_CODES.includes(customerCode);
            
            console.log(`📊 Entry analysis:`, {
                dateKey: _dateKey,
                displayDate,
                customerCode,
                isDeptNonBillable,
                payItems: entry.payItems
            });
            
            entry.payItems?.forEach(payItem => {
                const isBillable = BILLABLE_CODES.includes(payItem.payItemCode) && !isDeptNonBillable;
                console.log(`💰 PayItem:`, {
                    code: payItem.payItemCode,
                    hours: payItem.payItemHours,
                    isBillable,
                    billableCodes: BILLABLE_CODES,
                    nonBillableDepts: NON_BILLABLE_DEPT_CODES
                });
                
                if (isBillable) {
                    dayData.billable += payItem.payItemHours;
                } else {
                    dayData.nonBillable += payItem.payItemHours;
                }
            });
        });
        
        // Sort by dateKey (YYYY-MM-DD) and take last 14 days
        const finalData = Array.from(dailyData.values())
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
            .slice(-14)
            .map(({ dateKey: _dk, ...rest }) => rest); // Remove dateKey from final output
            
        console.log('📊 Final chart data:', finalData);
        return finalData;
    }, [filteredEntries]);

    return (
        <>
            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[{ label: "Timesheets" }]}
                className="mb-4"
            />

            <div id="main-content" className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
                    <p className="text-muted-foreground">
                        Manage and review employee timesheet entries
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedEntryIds.size > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            disabled={isPending}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {selectedEntryIds.size === 1
                                ? 'Delete'
                                : selectedEntryIds.size === filteredEntries.length
                                ? `Delete All (${selectedEntryIds.size})`
                                : `Delete (${selectedEntryIds.size})`
                            }
                        </Button>
                    )}
                    <Button onClick={() => setUploadDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Timesheets
                    </Button>
                </div>
            </div>

            <Card className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border overflow-visible">
                <CardContent className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Time Period - compact tabs */}
                        <div className="flex items-center gap-2">
                            <label className="sr-only">Time Period</label>
                            <Tabs value={filters.timePeriod} onValueChange={(value) => handleFilterChange('timePeriod', value)}>
                                <TabsList aria-label="Select time period" className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1 h-9">
                                    <TabsTrigger
                                        value="30d"
                                        className="px-3 py-1.5 rounded-md text-xs md:text-sm bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                    >
                                        30d
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="60d"
                                        className="px-3 py-1.5 rounded-md text-xs md:text-sm bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                    >
                                        60d
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="90d"
                                        className="px-3 py-1.5 rounded-md text-xs md:text-sm bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                    >
                                        90d
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="all"
                                        className="px-3 py-1.5 rounded-md text-xs md:text-sm bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                    >
                                        All
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Employee */}
                        <div>
                            <label className="sr-only">Employee</label>
                            <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                                <SelectTrigger className="h-9 w-[220px]">
                                    <SelectValue placeholder="Employee" />
                                </SelectTrigger>
                                <SelectContent className="z-50 max-h-64">
                                    <SelectItem value="all">All employees</SelectItem>
                                    {employees.map((employee) => (
                                        <SelectItem key={employee.id} value={employee.id}>
                                            {employee.firstName} {employee.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Department */}
                        <div>
                            <label className="sr-only">Department</label>
                            <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                                <SelectTrigger className="h-9 w-[200px]">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent className="z-50 max-h-64">
                                    <SelectItem value="all">All departments</SelectItem>
                                    {uniqueDepartments.map((dept) => (
                                        <SelectItem key={dept.code} value={dept.code}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Project */}
                        <div>
                            <label className="sr-only">Project</label>
                            <Select value={filters.project} onValueChange={(value) => handleFilterChange('project', value)}>
                                <SelectTrigger className="h-9 w-[220px]">
                                    <SelectValue placeholder="Project" />
                                </SelectTrigger>
                                <SelectContent className="z-50 max-h-64">
                                    <SelectItem value="all">All projects</SelectItem>
                                    {uniqueProjects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Work Context */}
                        <div>
                            <label className="sr-only">Work Context</label>
                            <Select value={filters.context} onValueChange={(value) => handleFilterChange('context', value)}>
                                <SelectTrigger className="h-9 w-[220px]">
                                    <SelectValue placeholder="Work Context" />
                                </SelectTrigger>
                                <SelectContent className="z-50 max-h-64">
                                    <SelectItem value="all">All contexts</SelectItem>
                                    {uniqueContexts.map((context) => (
                                        <SelectItem key={context} value={context}>
                                            {context}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Clear Filters */}
                        <div className="ml-auto">
                            {hasActiveFilters ? (
                                <Button variant="outline" size="sm" onClick={clearFilters} type="button">
                                    Clear Filters
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            {isFiltering ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4" />
                          </CardHeader>
                          <CardContent>
                            <Skeleton className="h-8 w-28" />
                            <Skeleton className="h-3 w-32 mt-2" />
                          </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.totalHours.toFixed(1)}</div>
                            <p className="text-xs text-muted-foreground">{filteredEntries.length} entries</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{metrics.billableHours.toFixed(1)}</div>
                            <p className="text-xs text-muted-foreground">{metrics.utilization.toFixed(1)}% utilization</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">PTO Hours</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{metrics.ptoHours.toFixed(1)}</div>
                            <p className="text-xs text-muted-foreground">{((metrics.ptoHours / metrics.totalHours) * 100).toFixed(1)}% of total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Non-Billable Hours</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{metrics.nonBillableHours.toFixed(1)}</div>
                            <p className="text-xs text-muted-foreground">{((metrics.nonBillableHours / metrics.totalHours) * 100).toFixed(1)}% of total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unpaid Leave</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{metrics.unpaidLeaveHours.toFixed(1)}</div>
                            <p className="text-xs text-muted-foreground">{((metrics.unpaidLeaveHours / metrics.totalHours) * 100).toFixed(1)}% of total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{metrics.utilization.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground">billable vs total hours</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Hours Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Hours Trend (Last 14 Days)</CardTitle>
                    <CardDescription>Daily breakdown of billable vs non-billable hours</CardDescription>
                </CardHeader>
                <CardContent>
                    {isFiltering ? (
                        <Skeleton className="h-[300px] w-full" />
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="billable" stroke="#22c55e" strokeWidth={2} name="Billable Hours" />
                                <Line type="monotone" dataKey="nonBillable" stroke="#ef4444" strokeWidth={2} name="Non-Billable Hours" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Timesheet Entries Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Timesheet Entries</CardTitle>
                    <CardDescription>
                        {filteredEntries.length === 0
                            ? "No timesheet entries found for the selected filters."
                            : `Showing ${filteredEntries.length} entries across ${visibleEmployees.length} employees`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isFiltering && (
                        <div className="space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="grid grid-cols-9 gap-2 items-center">
                              <Skeleton className="h-5 w-4" />
                              <Skeleton className="h-5 w-48 col-span-3" />
                              <Skeleton className="h-5 w-24" />
                              <Skeleton className="h-5 w-24" />
                              <Skeleton className="h-5 w-24" />
                              <Skeleton className="h-5 w-40" />
                              <Skeleton className="h-5 w-16" />
                              <Skeleton className="h-5 w-8" />
                            </div>
                          ))}
                        </div>
                    )}

                    {!isFiltering && visibleEmployees.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={paginatedEmployees.length > 0 && paginatedEmployees.every(e => selectedEmployeeIds.has(e.id))}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    // Select all employees on current page
                                                    const newSelectedEmployees = new Set(selectedEmployeeIds);
                                                    paginatedEmployees.forEach(emp => newSelectedEmployees.add(emp.id));
                                                    setSelectedEmployeeIds(newSelectedEmployees);

                                                    // Select all entries on current page
                                                    const newSelectedEntries = new Set(selectedEntryIds);
                                                    paginatedEmployees.forEach(emp => {
                                                        entriesByEmployee[emp.id]?.forEach(entry => newSelectedEntries.add(entry.id));
                                                    });
                                                    setSelectedEntryIds(newSelectedEntries);
                                                } else {
                                                    // Deselect all employees on current page
                                                    const newSelectedEmployees = new Set(selectedEmployeeIds);
                                                    paginatedEmployees.forEach(emp => newSelectedEmployees.delete(emp.id));
                                                    setSelectedEmployeeIds(newSelectedEmployees);

                                                    // Deselect all entries on current page
                                                    const newSelectedEntries = new Set(selectedEntryIds);
                                                    paginatedEmployees.forEach(emp => {
                                                        entriesByEmployee[emp.id]?.forEach(entry => newSelectedEntries.delete(entry.id));
                                                    });
                                                    setSelectedEntryIds(newSelectedEntries);
                                                }
                                            }}
                                        />
                                    </TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Day</TableHead>
                                    <TableHead>Start Time</TableHead>
                                    <TableHead>End Time</TableHead>
                                    <TableHead>Pay Items</TableHead>
                                    <TableHead>Hours</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedEmployees.map((employee) => {
                                    const employeeEntries = entriesByEmployee[employee.id] || [];
                                    const totalHours = employeeEntries.reduce((sum, entry) => sum + (entry.totalHoursActual || 0), 0);
                                    const isExpanded = expandedRows.has(employee.id);
                                    const isSelected = selectedEmployeeIds.has(employee.id);

                                    return (
                                        <React.Fragment key={employee.id}>
                                            <TableRow className={isSelected ? "bg-muted/50" : ""}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => toggleEmployeeSelection(employee.id, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium" colSpan={6}>
                                                    {employee.firstName} {employee.lastName} ({employeeEntries.length} entries, {totalHours.toFixed(2)} hours)
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleRow(employee.id)}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && employeeEntries.map((entry) => {
                                                const entrySelected = selectedEntryIds.has(entry.id);
                                                let dateObj: Date | null = null;
                                                if (entry.timecardDate) {
                                                    if (typeof entry.timecardDate === 'object') {
                                                        if ('toDate' in entry.timecardDate && typeof entry.timecardDate.toDate === 'function') {
                                                            dateObj = entry.timecardDate.toDate();
                                                        } else if ('seconds' in entry.timecardDate) {
                                                            dateObj = new Date((entry.timecardDate as any).seconds * 1000);
                                                        } else if ('_seconds' in entry.timecardDate) {
                                                            dateObj = new Date((entry.timecardDate as any)._seconds * 1000);
                                                        }
                                                    } else if (typeof entry.timecardDate === 'string') {
                                                        dateObj = new Date(entry.timecardDate);
                                                    }
                                                }
                                                const entryDate = (!dateObj || isNaN(dateObj.getTime()))
                                                    ? 'Invalid Date'
                                                    : dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

                                                return (
                                                    <TableRow key={entry.id} className={`${entrySelected ? "bg-muted/30" : ""} border-l-4 border-l-muted ml-4`}>
                                                        <TableCell className="pl-8">
                                                            <Checkbox
                                                                checked={entrySelected}
                                                                onCheckedChange={(checked) => toggleEntrySelection(entry.id, employee.id, !!checked)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="pl-8 text-sm text-muted-foreground">
                                                            {employee.firstName} {employee.lastName}
                                                        </TableCell>
                                                        <TableCell className="text-sm">{entryDate}</TableCell>
                                                        <TableCell className="text-sm">{entry.day || "N/A"}</TableCell>
                                                        <TableCell className="text-sm">{entry.startTime || "N/A"}</TableCell>
                                                        <TableCell className="text-sm">{entry.endTime || "N/A"}</TableCell>
                                                        <TableCell className="text-sm">{entry.payItems?.map(pi => pi.payItemName).join(", ") || "N/A"}</TableCell>
                                                        <TableCell className="text-sm font-mono">{entry.totalHoursActual?.toFixed(2) || "0.00"}</TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setSelectedEntryIds(new Set([entry.id]));
                                                                            setConfirmDeleteOpen(true);
                                                                        }}
                                                                        className="text-destructive"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Delete Entry
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination Controls */}
                    {!isFiltering && visibleEmployees.length > 0 && (
                        <div className="flex items-center justify-between py-4 border-t">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Items per page:</span>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={(value) => {
                                        setItemsPerPage(Number(value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-muted-foreground">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, visibleEmployees.length)} of {visibleEmployees.length} employees
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                >
                                    First
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                >
                                    Last
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isFiltering && visibleEmployees.length === 0 && (
                        <div className="text-center py-8">
                            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No timesheet entries found</h3>
                            <p className="text-muted-foreground mb-4">
                                {hasActiveFilters
                                    ? "Try adjusting your filters to see more results."
                                    : "No timesheet entries have been uploaded yet."}
                            </p>
                            <div className="flex justify-center gap-2">
                                {hasActiveFilters && (
                                    <Button variant="outline" onClick={clearFilters}>
                                        Clear Filters
                                    </Button>
                                )}
                                <Button onClick={() => setUploadDialogOpen(true)}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Timesheets
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Entries</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedEntryIds.size} timesheet entries?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isPending}
                        >
                            {isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmDeleteAllOpen} onOpenChange={setConfirmDeleteAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete All Timesheets</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete ALL timesheet entries?
                            This will permanently remove {filteredEntries.length} entries and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteAll}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isPending}
                        >
                            {isPending ? "Deleting..." : "Delete All"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <TimesheetUploadDialog
                isOpen={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                onSuccess={() => router.refresh()}
            />
        </>
    );
}