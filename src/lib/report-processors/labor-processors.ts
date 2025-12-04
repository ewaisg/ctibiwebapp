/**
 * Labor Report Processors
 * Process data for labor and timesheet reports
 */

import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { Timestamp } from 'firebase-admin/firestore';
import type { CtiTimesheet, Employee, Project, Company } from '@/types';
import type { ReportFilters } from '../report-templates/types';

// Pay item classifications
const BILLABLE_CODES = ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP'];
const NON_BILLABLE_CODES = ['SAL', 'CTI_REG', 'CTI_OVT'];
const PTO_CODES = ['PTO', 'HOL', 'FLTHOL', 'BER', 'JURY', 'LV_UNPD', 'MIL'];
const NON_BILLABLE_DEPT_CODES = ['100', '500', '900', '905', '910', '915', '920'];

/**
 * Process Direct Labor Hours Report
 */
export async function processDirectLaborHours(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch timesheets with date filters (required)
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    let timesheetsQuery: any = adminDb.collection('cti_timesheets')
      .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const timesheetsSnapshot = await timesheetsQuery.get();
    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    // Fetch employees
    const employeesSnapshot = await adminDb.collection('employees').get();
    const employees = employeesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];
    const employeeMap = new Map(employees.map(e => [String(e.employeeId), e]));

    // Fetch projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Process timesheets
    const employeeHoursMap = new Map<string, {
      employee: Employee;
      totalHours: number;
      billableHours: number;
      nonBillableHours: number;
      ptoHours: number;
      projectBreakdown: Map<string, number>;
    }>();

    timesheets.forEach(timesheet => {
      const empId = String(timesheet.employeeId);
      const employee = employeeMap.get(empId);
      if (!employee) return;

      // Apply department filter
      if (filters.departmentId) {
        const deptId = extractId(employee.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      // Initialize employee data if not exists
      if (!employeeHoursMap.has(empId)) {
        employeeHoursMap.set(empId, {
          employee,
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          ptoHours: 0,
          projectBreakdown: new Map(),
        });
      }

      const data = employeeHoursMap.get(empId)!;
      const totalHours = timesheet.totalHoursActual || 0;
      data.totalHours += totalHours;

      // Categorize hours by pay item codes
      const payItems = timesheet.payItems || [];
      payItems.forEach((item: any) => {
        const hours = item.payItemHours || 0;
        const code = item.payItemCode;

        if (BILLABLE_CODES.includes(code)) {
          data.billableHours += hours;
        } else if (PTO_CODES.includes(code)) {
          data.ptoHours += hours;
        } else {
          data.nonBillableHours += hours;
        }
      });

      // Extract project from labor codes
      const labors = timesheet.labors || [];
      const projectLabor = labors.find((l: any) =>
        l.laborTitle === 'Project/Job' || l.laborTitle === 'Project/Categories'
      );

      if (projectLabor) {
        const projectCode = projectLabor.laborValue;
        const existing = data.projectBreakdown.get(projectCode) || 0;
        data.projectBreakdown.set(projectCode, existing + totalHours);
      }
    });

    // Convert to results array
    const results = Array.from(employeeHoursMap.values())
      .map(item => ({
        employeeId: item.employee.employeeId,
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        companyName: item.employee.companyName,
        departmentCode: item.employee.departmentCode,
        totalHours: item.totalHours,
        billableHours: item.billableHours,
        nonBillableHours: item.nonBillableHours,
        ptoHours: item.ptoHours,
        billablePercent: item.totalHours > 0 ? (item.billableHours / item.totalHours) * 100 : 0,
        projectCount: item.projectBreakdown.size,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const totals = {
      totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
      totalBillable: results.reduce((sum, r) => sum + r.billableHours, 0),
      totalNonBillable: results.reduce((sum, r) => sum + r.nonBillableHours, 0),
      totalPTO: results.reduce((sum, r) => sum + r.ptoHours, 0),
      employeeCount: results.length,
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Labor Processor] Error in processDirectLaborHours:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Employee Utilization Report
 */
export async function processEmployeeUtilization(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    const timesheetsQuery = adminDb.collection('cti_timesheets')
      .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const [timesheetsSnapshot, employeesSnapshot] = await Promise.all([
      timesheetsQuery.get(),
      adminDb.collection('employees').where('employmentStatus', '==', 'Active').get(),
    ]);

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    const employees = employeesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];

    const employeeMap = new Map(employees.map(e => [String(e.employeeId), e]));

    // Calculate date range in weeks
    const startDate = new Date(filters.dateFrom);
    const endDate = new Date(filters.dateTo);
    const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Process utilization
    const utilizationMap = new Map<string, {
      employee: Employee;
      totalHours: number;
      billableHours: number;
      capacityHours: number;
      utilizationRate: number;
    }>();

    // Initialize all active employees
    employees.forEach(emp => {
      if (filters.departmentId) {
        const deptId = extractId(emp.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      const capacityHours = emp.weeklyCapacityHours * weeks;
      utilizationMap.set(String(emp.employeeId), {
        employee: emp,
        totalHours: 0,
        billableHours: 0,
        capacityHours,
        utilizationRate: 0,
      });
    });

    // Aggregate timesheet hours
    timesheets.forEach(timesheet => {
      const empId = String(timesheet.employeeId);
      const data = utilizationMap.get(empId);
      if (!data) return;

      const totalHours = timesheet.totalHoursActual || 0;
      data.totalHours += totalHours;

      // Calculate billable hours
      const payItems = timesheet.payItems || [];
      payItems.forEach((item: any) => {
        const code = item.payItemCode;
        if (BILLABLE_CODES.includes(code)) {
          data.billableHours += item.payItemHours || 0;
        }
      });
    });

    // Calculate utilization rates
    utilizationMap.forEach(data => {
      if (data.capacityHours > 0) {
        data.utilizationRate = (data.billableHours / data.capacityHours) * 100;
      }
    });

    // Convert to results
    const results = Array.from(utilizationMap.values())
      .map(item => ({
        employeeId: item.employee.employeeId,
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        companyName: item.employee.companyName,
        departmentCode: item.employee.departmentCode,
        weeklyCapacity: item.employee.weeklyCapacityHours,
        totalCapacity: item.capacityHours,
        totalHours: item.totalHours,
        billableHours: item.billableHours,
        utilizationRate: item.utilizationRate,
        isUnderUtilized: item.utilizationRate < 70,
        isOverUtilized: item.utilizationRate > 110,
      }))
      .sort((a, b) => b.utilizationRate - a.utilizationRate);

    const totals = {
      totalCapacity: results.reduce((sum, r) => sum + r.totalCapacity, 0),
      totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
      totalBillable: results.reduce((sum, r) => sum + r.billableHours, 0),
      averageUtilization: results.length > 0
        ? results.reduce((sum, r) => sum + r.utilizationRate, 0) / results.length
        : 0,
      underUtilizedCount: results.filter(r => r.isUnderUtilized).length,
      overUtilizedCount: results.filter(r => r.isOverUtilized).length,
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Labor Processor] Error in processEmployeeUtilization:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Billable vs Non-Billable Hours Report
 */
export async function processBillableVsNonBillable(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    const timesheetsQuery = adminDb.collection('cti_timesheets')
      .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const [timesheetsSnapshot, employeesSnapshot, companiesSnapshot] = await Promise.all([
      timesheetsQuery.get(),
      adminDb.collection('employees').get(),
      adminDb.collection('companies').get(),
    ]);

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    const employees = employeesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];

    const companies = companiesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Company[];

    const employeeMap = new Map(employees.map(e => [String(e.employeeId), e]));
    const companyMap = new Map(companies.map(c => [c.id, c]));

    // Aggregate by company
    const companyBreakdown = new Map<string, {
      company: Company;
      billableHours: number;
      nonBillableHours: number;
      ptoHours: number;
      totalHours: number;
    }>();

    // Initialize companies
    companies.forEach(company => {
      companyBreakdown.set(company.id, {
        company,
        billableHours: 0,
        nonBillableHours: 0,
        ptoHours: 0,
        totalHours: 0,
      });
    });

    // Process timesheets
    timesheets.forEach(timesheet => {
      const empId = String(timesheet.employeeId);
      const employee = employeeMap.get(empId);
      if (!employee) return;

      // Apply department filter
      if (filters.departmentId) {
        const deptId = extractId(employee.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      const companyId = extractId(employee.companyId);
      if (!companyId) return;

      const data = companyBreakdown.get(companyId);
      if (!data) return;

      const totalHours = timesheet.totalHoursActual || 0;
      data.totalHours += totalHours;

      // Categorize hours
      const payItems = timesheet.payItems || [];
      payItems.forEach((item: any) => {
        const hours = item.payItemHours || 0;
        const code = item.payItemCode;

        if (BILLABLE_CODES.includes(code)) {
          // Check if it's a non-billable department
          const deptLabor = (timesheet.labors || []).find((l: any) => l.laborTitle === 'Department');
          const isNonBillableDept = deptLabor && NON_BILLABLE_DEPT_CODES.includes(deptLabor.laborValue);

          if (isNonBillableDept) {
            data.nonBillableHours += hours;
          } else {
            data.billableHours += hours;
          }
        } else if (PTO_CODES.includes(code)) {
          data.ptoHours += hours;
        } else {
          data.nonBillableHours += hours;
        }
      });
    });

    // Convert to results
    const results = Array.from(companyBreakdown.values())
      .filter(item => item.totalHours > 0)
      .map(item => ({
        companyName: item.company.companyName,
        companyCode: item.company.companyCode,
        isSubconsultant: item.company.isSubconsultant,
        billableHours: item.billableHours,
        nonBillableHours: item.nonBillableHours,
        ptoHours: item.ptoHours,
        totalHours: item.totalHours,
        billablePercent: item.totalHours > 0 ? (item.billableHours / item.totalHours) * 100 : 0,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const totals = {
      totalBillable: results.reduce((sum, r) => sum + r.billableHours, 0),
      totalNonBillable: results.reduce((sum, r) => sum + r.nonBillableHours, 0),
      totalPTO: results.reduce((sum, r) => sum + r.ptoHours, 0),
      totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
      billablePercent: 0,
    };

    if (totals.totalHours > 0) {
      totals.billablePercent = (totals.totalBillable / totals.totalHours) * 100;
    }

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Labor Processor] Error in processBillableVsNonBillable:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Overtime Analysis Report
 */
export async function processOvertimeAnalysis(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    const timesheetsQuery = adminDb.collection('cti_timesheets')
      .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const [timesheetsSnapshot, employeesSnapshot] = await Promise.all([
      timesheetsQuery.get(),
      adminDb.collection('employees').get(),
    ]);

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    const employees = employeesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];

    const employeeMap = new Map(employees.map(e => [String(e.employeeId), e]));

    // Process overtime
    const overtimeMap = new Map<string, {
      employee: Employee;
      regularHours: number;
      overtimeHours: number;
      totalHours: number;
      overtimePercent: number;
    }>();

    timesheets.forEach(timesheet => {
      const empId = String(timesheet.employeeId);
      const employee = employeeMap.get(empId);
      if (!employee) return;

      // Apply department filter
      if (filters.departmentId) {
        const deptId = extractId(employee.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      // Initialize if not exists
      if (!overtimeMap.has(empId)) {
        overtimeMap.set(empId, {
          employee,
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          overtimePercent: 0,
        });
      }

      const data = overtimeMap.get(empId)!;
      const totalHours = timesheet.totalHoursActual || 0;
      data.totalHours += totalHours;

      // Categorize hours as regular or overtime
      const payItems = timesheet.payItems || [];
      payItems.forEach((item: any) => {
        const hours = item.payItemHours || 0;
        const code = item.payItemCode;

        if (code === 'OVT15' || code === 'OVT20') {
          data.overtimeHours += hours;
        } else if (code === 'HRLY' || code === 'SalaryHrs') {
          data.regularHours += hours;
        }
      });
    });

    // Calculate percentages
    overtimeMap.forEach(data => {
      if (data.totalHours > 0) {
        data.overtimePercent = (data.overtimeHours / data.totalHours) * 100;
      }
    });

    // Convert to results - only show employees with overtime
    const results = Array.from(overtimeMap.values())
      .filter(item => item.overtimeHours > 0)
      .map(item => ({
        employeeId: item.employee.employeeId,
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        companyName: item.employee.companyName,
        departmentCode: item.employee.departmentCode,
        regularHours: item.regularHours,
        overtimeHours: item.overtimeHours,
        totalHours: item.totalHours,
        overtimePercent: item.overtimePercent,
      }))
      .sort((a, b) => b.overtimeHours - a.overtimeHours);

    const totals = {
      totalRegular: results.reduce((sum, r) => sum + r.regularHours, 0),
      totalOvertime: results.reduce((sum, r) => sum + r.overtimeHours, 0),
      totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
      employeesWithOT: results.length,
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Labor Processor] Error in processOvertimeAnalysis:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Labor Cost Analysis Report
 */
export async function processLaborCostAnalysis(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    const timesheetsQuery = adminDb.collection('cti_timesheets')
      .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const [timesheetsSnapshot, employeesSnapshot, projectsSnapshot] = await Promise.all([
      timesheetsQuery.get(),
      adminDb.collection('employees').get(),
      adminDb.collection('projects').get(),
    ]);

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    const employees = employeesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const employeeMap = new Map(employees.map(e => [String(e.employeeId), e]));

    // Estimate labor cost by project (using average rate)
    const AVERAGE_HOURLY_RATE = 75; // Baseline rate

    const projectCosts = new Map<string, {
      project: Project;
      totalHours: number;
      estimatedCost: number;
      employeeCount: Set<string>;
    }>();

    // Initialize projects
    projects.forEach(project => {
      if (filters.departmentId) {
        const deptId = extractId(project.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      if (filters.projectId && project.id !== filters.projectId) return;

      if (filters.contractId) {
        const contractId = extractId(project.contractId);
        if (contractId !== filters.contractId) return;
      }

      projectCosts.set(project.poNumber, {
        project,
        totalHours: 0,
        estimatedCost: 0,
        employeeCount: new Set(),
      });
    });

    // Aggregate timesheet hours
    timesheets.forEach(timesheet => {
      const empId = String(timesheet.employeeId);
      const employee = employeeMap.get(empId);
      if (!employee) return;

      // Extract project from labor codes
      const labors = timesheet.labors || [];
      const projectLabor = labors.find((l: any) =>
        l.laborTitle === 'Project/Job' || l.laborTitle === 'Project/Categories'
      );

      if (!projectLabor) return;

      const projectCode = projectLabor.laborValue;
      const data = projectCosts.get(projectCode);
      if (!data) return;

      const hours = timesheet.totalHoursActual || 0;
      data.totalHours += hours;
      data.estimatedCost += hours * AVERAGE_HOURLY_RATE;
      data.employeeCount.add(empId);
    });

    // Convert to results
    const results = Array.from(projectCosts.values())
      .filter(item => item.totalHours > 0)
      .map(item => ({
        poNumber: item.project.poNumber,
        projectName: item.project.projectName,
        totalHours: item.totalHours,
        estimatedCost: item.estimatedCost,
        employeeCount: item.employeeCount.size,
        averageCostPerHour: item.totalHours > 0 ? item.estimatedCost / item.totalHours : 0,
      }))
      .sort((a, b) => b.estimatedCost - a.estimatedCost);

    const totals = {
      totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
      totalCost: results.reduce((sum, r) => sum + r.estimatedCost, 0),
      projectCount: results.length,
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
        note: 'Labor costs are estimated using average hourly rate. For accurate costs, integrate actual payroll data.',
      },
    };
  } catch (error) {
    console.error('[Labor Processor] Error in processLaborCostAnalysis:', error);
    return { success: false, error: String(error), data: null };
  }
}
