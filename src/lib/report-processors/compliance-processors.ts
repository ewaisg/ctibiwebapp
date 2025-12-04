/**
 * Compliance Report Processors
 * Process data for compliance and certification reports
 */

import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { Timestamp } from 'firebase-admin/firestore';
import type { Invoice, Project, Company, Contract, CtiTimesheet, Employee } from '@/types';
import type { ReportFilters } from '../report-templates/types';

/**
 * Process MWBE Compliance Report
 */
export async function processMWBECompliance(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch invoices, companies, projects, contracts
    let invoicesQuery: any = adminDb.collection('invoices')
      .where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const [invoicesSnapshot, companiesSnapshot, projectsSnapshot, contractsSnapshot] = await Promise.all([
      invoicesQuery.get(),
      adminDb.collection('companies').get(),
      adminDb.collection('projects').get(),
      adminDb.collection('contracts').get(),
    ]);

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    const companies = companiesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Company[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const contracts = contractsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Contract[];

    const companyMap = new Map(companies.map(c => [c.id, c]));
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const contractMap = new Map(contracts.map(c => [c.id, c]));

    // Track MWBE participation by contract
    const contractParticipation = new Map<string, {
      contract: Contract;
      totalAmount: number;
      mwbeAmount: number;
      wbeAmount: number;
      sbeAmount: number;
      nonMWBEAmount: number;
      mwbeGoal: number;
      invoiceCount: number;
      companiesByType: Map<string, { company: Company; amount: number }>;
    }>();

    // Process invoices
    invoices.forEach(invoice => {
      const projectId = extractId(invoice.projectId);
      if (!projectId) return;

      const project = projectMap.get(projectId);
      if (!project) return;

      // Apply filters
      if (filters.departmentId) {
        const deptId = extractId(project.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      if (filters.projectId && projectId !== filters.projectId) return;

      if (filters.contractId) {
        const contractId = extractId(project.contractId);
        if (contractId !== filters.contractId) return;
      }

      const contractId = extractId(project.contractId);
      if (!contractId) return;

      const contract = contractMap.get(contractId);
      if (!contract) return;

      // Initialize contract participation if not exists
      if (!contractParticipation.has(contractId)) {
        contractParticipation.set(contractId, {
          contract,
          totalAmount: 0,
          mwbeAmount: 0,
          wbeAmount: 0,
          sbeAmount: 0,
          nonMWBEAmount: 0,
          mwbeGoal: contract.mwbeGoalPercent || 0,
          invoiceCount: 0,
          companiesByType: new Map(),
        });
      }

      const data = contractParticipation.get(contractId)!;
      const invoiceAmount = invoice.invoiceTotal || 0;
      data.totalAmount += invoiceAmount;
      data.invoiceCount++;

      // Determine company from submitter
      const companyId = extractId(invoice.submitterCompanyId);
      if (companyId) {
        const company = companyMap.get(companyId);
        if (company) {
          // Track by certification type
          const certification = company.diversityCertification;

          if (certification === 'MWBE') {
            data.mwbeAmount += invoiceAmount;
          } else if (certification === 'WBE') {
            data.wbeAmount += invoiceAmount;
          } else if (certification === 'SBE') {
            data.sbeAmount += invoiceAmount;
          } else {
            data.nonMWBEAmount += invoiceAmount;
          }

          // Track company totals
          const companyKey = `${certification || 'None'}-${company.companyName}`;
          const existing = data.companiesByType.get(companyKey) || { company, amount: 0 };
          existing.amount += invoiceAmount;
          data.companiesByType.set(companyKey, existing);
        }
      }
    });

    // Convert to results
    const results = Array.from(contractParticipation.values())
      .map(item => {
        // MWBE includes both MWBE and WBE certifications
        const totalMWBE = item.mwbeAmount + item.wbeAmount;
        const mwbePercent = item.totalAmount > 0 ? (totalMWBE / item.totalAmount) * 100 : 0;
        const sbePercent = item.totalAmount > 0 ? (item.sbeAmount / item.totalAmount) * 100 : 0;
        const goalMet = mwbePercent >= item.mwbeGoal;

        // Company breakdown
        const companyBreakdown = Array.from(item.companiesByType.values())
          .map(comp => ({
            companyName: comp.company.companyName,
            certification: comp.company.diversityCertification || 'None',
            amount: comp.amount,
            percent: item.totalAmount > 0 ? (comp.amount / item.totalAmount) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        return {
          contractNumber: item.contract.contractNumber,
          contractName: item.contract.contractName,
          totalAmount: item.totalAmount,
          mwbeAmount: totalMWBE,
          mwbePercent,
          sbeAmount: item.sbeAmount,
          sbePercent,
          nonMWBEAmount: item.nonMWBEAmount,
          mwbeGoal: item.mwbeGoal,
          goalMet,
          variance: mwbePercent - item.mwbeGoal,
          invoiceCount: item.invoiceCount,
          companyBreakdown,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totals = {
      totalAmount: results.reduce((sum, r) => sum + r.totalAmount, 0),
      totalMWBE: results.reduce((sum, r) => sum + r.mwbeAmount, 0),
      totalSBE: results.reduce((sum, r) => sum + r.sbeAmount, 0),
      averageMWBEPercent: results.length > 0
        ? results.reduce((sum, r) => sum + r.mwbePercent, 0) / results.length
        : 0,
      contractsMeetingGoal: results.filter(r => r.goalMet).length,
      contractsNotMeetingGoal: results.filter(r => !r.goalMet).length,
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
    console.error('[Compliance Processor] Error in processMWBECompliance:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Sub-Consultant Breakdown Report
 */
export async function processSubConsultantBreakdown(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch invoices and companies
    let invoicesQuery: any = adminDb.collection('invoices')
      .where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const [invoicesSnapshot, companiesSnapshot, projectsSnapshot] = await Promise.all([
      invoicesQuery.get(),
      adminDb.collection('companies').where('isSubconsultant', '==', true).get(),
      adminDb.collection('projects').get(),
    ]);

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    const subConsultants = companiesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Company[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const companyMap = new Map(subConsultants.map(c => [c.id, c]));
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Track sub-consultant utilization
    const subConsultantData = new Map<string, {
      company: Company;
      totalAmount: number;
      invoiceCount: number;
      projectCount: Set<string>;
      projectBreakdown: Map<string, { projectName: string; amount: number }>;
    }>();

    // Initialize sub-consultants
    subConsultants.forEach(company => {
      subConsultantData.set(company.id, {
        company,
        totalAmount: 0,
        invoiceCount: 0,
        projectCount: new Set(),
        projectBreakdown: new Map(),
      });
    });

    // Process invoices
    invoices.forEach(invoice => {
      const companyId = extractId(invoice.submitterCompanyId);
      if (!companyId) return;

      const data = subConsultantData.get(companyId);
      if (!data) return; // Not a sub-consultant

      const projectId = extractId(invoice.projectId);
      if (!projectId) return;

      const project = projectMap.get(projectId);
      if (!project) return;

      // Apply filters
      if (filters.departmentId) {
        const deptId = extractId(project.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      if (filters.projectId && projectId !== filters.projectId) return;

      if (filters.contractId) {
        const contractId = extractId(project.contractId);
        if (contractId !== filters.contractId) return;
      }

      const invoiceAmount = invoice.invoiceTotal || 0;
      data.totalAmount += invoiceAmount;
      data.invoiceCount++;
      data.projectCount.add(projectId);

      // Track by project
      const existing = data.projectBreakdown.get(projectId) || {
        projectName: project.projectName,
        amount: 0,
      };
      existing.amount += invoiceAmount;
      data.projectBreakdown.set(projectId, existing);
    });

    // Convert to results
    const results = Array.from(subConsultantData.values())
      .filter(item => item.totalAmount > 0)
      .map(item => {
        const projectBreakdown = Array.from(item.projectBreakdown.values())
          .sort((a, b) => b.amount - a.amount);

        return {
          companyName: item.company.companyName,
          companyCode: item.company.companyCode,
          certification: item.company.diversityCertification || 'None',
          totalAmount: item.totalAmount,
          invoiceCount: item.invoiceCount,
          projectCount: item.projectCount.size,
          projectBreakdown,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totals = {
      totalAmount: results.reduce((sum, r) => sum + r.totalAmount, 0),
      totalInvoices: results.reduce((sum, r) => sum + r.invoiceCount, 0),
      totalSubConsultants: results.length,
      mwbeCertifiedCount: results.filter(r => r.certification === 'MWBE' || r.certification === 'WBE').length,
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
    console.error('[Compliance Processor] Error in processSubConsultantBreakdown:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process DBE Participation Report
 */
export async function processDBEParticipation(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch invoices, companies, projects, contracts
    let invoicesQuery: any = adminDb.collection('invoices')
      .where('createdAt', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
      .where('createdAt', '<=', Timestamp.fromDate(new Date(filters.dateTo)));

    const [invoicesSnapshot, companiesSnapshot, projectsSnapshot, contractsSnapshot] = await Promise.all([
      invoicesQuery.get(),
      adminDb.collection('companies').get(),
      adminDb.collection('projects').get(),
      adminDb.collection('contracts').get(),
    ]);

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    const companies = companiesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Company[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const contracts = contractsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Contract[];

    const companyMap = new Map(companies.map(c => [c.id, c]));
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const contractMap = new Map(contracts.map(c => [c.id, c]));

    // Track DBE participation (SBE certified companies) by contract
    const contractDBE = new Map<string, {
      contract: Contract;
      totalAmount: number;
      dbeAmount: number;
      dbePercent: number;
      dbeCompanies: Map<string, { company: Company; amount: number }>;
    }>();

    // Process invoices
    invoices.forEach(invoice => {
      const projectId = extractId(invoice.projectId);
      if (!projectId) return;

      const project = projectMap.get(projectId);
      if (!project) return;

      // Apply filters
      if (filters.departmentId) {
        const deptId = extractId(project.departmentId);
        if (deptId !== filters.departmentId) return;
      }

      if (filters.projectId && projectId !== filters.projectId) return;

      if (filters.contractId) {
        const contractId = extractId(project.contractId);
        if (contractId !== filters.contractId) return;
      }

      const contractId = extractId(project.contractId);
      if (!contractId) return;

      const contract = contractMap.get(contractId);
      if (!contract) return;

      // Initialize contract DBE tracking
      if (!contractDBE.has(contractId)) {
        contractDBE.set(contractId, {
          contract,
          totalAmount: 0,
          dbeAmount: 0,
          dbePercent: 0,
          dbeCompanies: new Map(),
        });
      }

      const data = contractDBE.get(contractId)!;
      const invoiceAmount = invoice.invoiceTotal || 0;
      data.totalAmount += invoiceAmount;

      // Check if company is DBE (SBE certified)
      const companyId = extractId(invoice.submitterCompanyId);
      if (companyId) {
        const company = companyMap.get(companyId);
        if (company && company.diversityCertification === 'SBE') {
          data.dbeAmount += invoiceAmount;

          const existing = data.dbeCompanies.get(companyId) || { company, amount: 0 };
          existing.amount += invoiceAmount;
          data.dbeCompanies.set(companyId, existing);
        }
      }
    });

    // Calculate percentages and convert to results
    const results = Array.from(contractDBE.values())
      .map(item => {
        const dbePercent = item.totalAmount > 0 ? (item.dbeAmount / item.totalAmount) * 100 : 0;

        const dbeCompanies = Array.from(item.dbeCompanies.values())
          .map(comp => ({
            companyName: comp.company.companyName,
            amount: comp.amount,
            percent: item.totalAmount > 0 ? (comp.amount / item.totalAmount) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        return {
          contractNumber: item.contract.contractNumber,
          contractName: item.contract.contractName,
          totalAmount: item.totalAmount,
          dbeAmount: item.dbeAmount,
          dbePercent,
          nonDBEAmount: item.totalAmount - item.dbeAmount,
          dbeCompanies,
          dbeCompanyCount: dbeCompanies.length,
        };
      })
      .sort((a, b) => b.dbePercent - a.dbePercent);

    const totals = {
      totalAmount: results.reduce((sum, r) => sum + r.totalAmount, 0),
      totalDBE: results.reduce((sum, r) => sum + r.dbeAmount, 0),
      averageDBEPercent: results.length > 0
        ? results.reduce((sum, r) => sum + r.dbePercent, 0) / results.length
        : 0,
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
    console.error('[Compliance Processor] Error in processDBEParticipation:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Certified Payroll Report
 */
export async function processCertifiedPayroll(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch timesheets, employees, projects
    const [timesheetsSnapshot, employeesSnapshot, projectsSnapshot] = await Promise.all([
      adminDb.collection('cti_timesheets')
        .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
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

    // Process by project or employee
    if (filters.projectId) {
      // Group by employee for specific project
      const employeeHours = new Map<string, {
        employee: Employee;
        regularHours: number;
        overtimeHours: number;
        totalHours: number;
        workDates: Set<string>;
      }>();

      timesheets.forEach(timesheet => {
        // Extract project from labor codes
        const labors = timesheet.labors || [];
        const projectLabor = labors.find((l: any) =>
          l.laborTitle === 'Project/Job' || l.laborTitle === 'Project/Categories'
        );

        if (!projectLabor) return;

        // Find project by poNumber
        const projectCode = projectLabor.laborValue;
        const project = projects.find(p => p.poNumber === projectCode && p.id === filters.projectId);
        if (!project) return;

        const empId = String(timesheet.employeeId);
        const employee = employeeMap.get(empId);
        if (!employee) return;

        // Initialize employee data
        if (!employeeHours.has(empId)) {
          employeeHours.set(empId, {
            employee,
            regularHours: 0,
            overtimeHours: 0,
            totalHours: 0,
            workDates: new Set(),
          });
        }

        const data = employeeHours.get(empId)!;
        const totalHours = timesheet.totalHoursActual || 0;
        data.totalHours += totalHours;

        // Track work dates
        const timecardDate = timesheet.timecardDate?.toDate?.()
          ? timesheet.timecardDate.toDate()
          : (timesheet.timecardDate as any);
        const dateStr = timecardDate instanceof Date
          ? timecardDate.toISOString().split('T')[0]
          : new Date(timecardDate).toISOString().split('T')[0];
        data.workDates.add(dateStr);

        // Categorize hours
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

      const results = Array.from(employeeHours.values())
        .map(item => ({
          employeeId: item.employee.employeeId,
          employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
          employeeNumber: item.employee.employeeNumber,
          companyName: item.employee.companyName,
          regularHours: item.regularHours,
          overtimeHours: item.overtimeHours,
          totalHours: item.totalHours,
          daysWorked: item.workDates.size,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

      const totals = {
        totalRegularHours: results.reduce((sum, r) => sum + r.regularHours, 0),
        totalOvertimeHours: results.reduce((sum, r) => sum + r.overtimeHours, 0),
        totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
        employeeCount: results.length,
      };

      return {
        success: true,
        data: {
          results,
          totals,
          filters,
          hasData: results.length > 0,
          reportType: 'by-project',
        },
      };
    } else {
      // General certified payroll summary by project
      const projectHours = new Map<string, {
        project: Project;
        regularHours: number;
        overtimeHours: number;
        totalHours: number;
        employeeCount: Set<string>;
      }>();

      // Initialize projects
      projects.forEach(project => {
        if (filters.departmentId) {
          const deptId = extractId(project.departmentId);
          if (deptId !== filters.departmentId) return;
        }

        projectHours.set(project.poNumber, {
          project,
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          employeeCount: new Set(),
        });
      });

      timesheets.forEach(timesheet => {
        // Extract project from labor codes
        const labors = timesheet.labors || [];
        const projectLabor = labors.find((l: any) =>
          l.laborTitle === 'Project/Job' || l.laborTitle === 'Project/Categories'
        );

        if (!projectLabor) return;

        const projectCode = projectLabor.laborValue;
        const data = projectHours.get(projectCode);
        if (!data) return;

        const totalHours = timesheet.totalHoursActual || 0;
        data.totalHours += totalHours;
        data.employeeCount.add(String(timesheet.employeeId));

        // Categorize hours
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

      const results = Array.from(projectHours.values())
        .filter(item => item.totalHours > 0)
        .map(item => ({
          poNumber: item.project.poNumber,
          projectName: item.project.projectName,
          regularHours: item.regularHours,
          overtimeHours: item.overtimeHours,
          totalHours: item.totalHours,
          employeeCount: item.employeeCount.size,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

      const totals = {
        totalRegularHours: results.reduce((sum, r) => sum + r.regularHours, 0),
        totalOvertimeHours: results.reduce((sum, r) => sum + r.overtimeHours, 0),
        totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
        projectCount: results.length,
      };

      return {
        success: true,
        data: {
          results,
          totals,
          filters,
          hasData: results.length > 0,
          reportType: 'summary',
        },
      };
    }
  } catch (error) {
    console.error('[Compliance Processor] Error in processCertifiedPayroll:', error);
    return { success: false, error: String(error), data: null };
  }
}
