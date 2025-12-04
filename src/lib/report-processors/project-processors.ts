/**
 * Project Report Processors
 * Process data for project management reports
 */

import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { Timestamp } from 'firebase-admin/firestore';
import type { Project, Invoice, CtiTimesheet, Contract } from '@/types';
import type { ReportFilters } from '../report-templates/types';

/**
 * Process Project Status Report
 */
export async function processProjectStatus(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch projects
    let projectsQuery: any = adminDb.collection('projects');

    const projectsSnapshot = await projectsQuery.get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Apply filters
    let filteredProjects = projects;

    if (filters.departmentId) {
      filteredProjects = filteredProjects.filter(p => {
        const deptId = extractId(p.departmentId);
        return deptId === filters.departmentId;
      });
    }

    if (filters.contractId) {
      filteredProjects = filteredProjects.filter(p => {
        const contractId = extractId(p.contractId);
        return contractId === filters.contractId;
      });
    }

    if (filters.projectId) {
      filteredProjects = filteredProjects.filter(p => p.id === filters.projectId);
    }

    // Fetch invoices for each project
    const invoicesSnapshot = await adminDb.collection('invoices').get();
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Group invoices by project
    const invoicesByProject = new Map<string, Invoice[]>();
    invoices.forEach(inv => {
      const projectId = extractId(inv.projectId);
      if (!projectId) return;

      if (!invoicesByProject.has(projectId)) {
        invoicesByProject.set(projectId, []);
      }
      invoicesByProject.get(projectId)!.push(inv);
    });

    // Process project status
    const results = filteredProjects.map(project => {
      const projectInvoices = invoicesByProject.get(project.id) || [];

      // Calculate completion percentage
      const budgetUsed = project.originalPoAmount && project.remainingPoAmount
        ? project.originalPoAmount - project.remainingPoAmount
        : project.previouslyInvoicedAmount || 0;

      const budgetTotal = project.newPoAmount || project.originalPoAmount || 0;
      const completionPercent = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

      // Determine status
      let status: 'Active' | 'On Track' | 'At Risk' | 'Over Budget' | 'Completed' | 'Inactive';

      if (project.isInactive) {
        status = 'Inactive';
      } else if (project.isComplete) {
        status = 'Completed';
      } else if (completionPercent > 100) {
        status = 'Over Budget';
      } else if (completionPercent > 90) {
        status = 'At Risk';
      } else if (completionPercent > 0) {
        status = 'On Track';
      } else {
        status = 'Active';
      }

      return {
        poNumber: project.poNumber,
        projectName: project.projectName,
        projectManager: project.projectManager || 'N/A',
        originalBudget: project.originalPoAmount || 0,
        changeOrders: project.changeOrderAmount || 0,
        currentBudget: budgetTotal,
        invoiced: budgetUsed,
        remaining: project.remainingPoAmount || 0,
        completionPercent,
        status,
        invoiceCount: projectInvoices.length,
        lastInvoiceDate: projectInvoices.length > 0
          ? projectInvoices
              .map(inv => inv.createdAt?.toDate?.() ? inv.createdAt.toDate() : new Date(inv.createdAt as any))
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null,
      };
    }).sort((a, b) => {
      // Sort by status priority then by completion
      const statusPriority: Record<string, number> = {
        'Over Budget': 1,
        'At Risk': 2,
        'On Track': 3,
        'Active': 4,
        'Completed': 5,
        'Inactive': 6,
      };
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return b.completionPercent - a.completionPercent;
    });

    // Calculate summary
    const summary = {
      totalProjects: results.length,
      activeProjects: results.filter(p => p.status !== 'Inactive' && p.status !== 'Completed').length,
      completedProjects: results.filter(p => p.status === 'Completed').length,
      atRiskProjects: results.filter(p => p.status === 'At Risk' || p.status === 'Over Budget').length,
      totalBudget: results.reduce((sum, p) => sum + p.currentBudget, 0),
      totalInvoiced: results.reduce((sum, p) => sum + p.invoiced, 0),
      totalRemaining: results.reduce((sum, p) => sum + p.remaining, 0),
    };

    return {
      success: true,
      data: {
        results,
        summary,
        filters,
        hasData: results.length > 0,
      },
    };
  } catch (error) {
    console.error('[Project Processor] Error in processProjectStatus:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Budget vs Actual Report
 */
export async function processBudgetVsActual(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch projects and invoices
    const [projectsSnapshot, invoicesSnapshot] = await Promise.all([
      adminDb.collection('projects').get(),
      adminDb.collection('invoices').get(),
    ]);

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Filter projects
    let filteredProjects = projects;

    if (filters.departmentId) {
      filteredProjects = filteredProjects.filter(p => {
        const deptId = extractId(p.departmentId);
        return deptId === filters.departmentId;
      });
    }

    if (filters.contractId) {
      filteredProjects = filteredProjects.filter(p => {
        const contractId = extractId(p.contractId);
        return contractId === filters.contractId;
      });
    }

    if (filters.projectId) {
      filteredProjects = filteredProjects.filter(p => p.id === filters.projectId);
    }

    // Filter invoices by date if specified
    let filteredInvoices = invoices;
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filteredInvoices = filteredInvoices.filter(inv => {
        const invDate = inv.createdAt?.toDate?.() ? inv.createdAt.toDate() : new Date(inv.createdAt as any);
        return invDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filteredInvoices = filteredInvoices.filter(inv => {
        const invDate = inv.createdAt?.toDate?.() ? inv.createdAt.toDate() : new Date(inv.createdAt as any);
        return invDate <= toDate;
      });
    }

    // Group invoices by project
    const invoicesByProject = new Map<string, Invoice[]>();
    filteredInvoices.forEach(inv => {
      const projectId = extractId(inv.projectId);
      if (!projectId) return;

      if (!invoicesByProject.has(projectId)) {
        invoicesByProject.set(projectId, []);
      }
      invoicesByProject.get(projectId)!.push(inv);
    });

    // Process budget vs actual
    const results = filteredProjects.map(project => {
      const projectInvoices = invoicesByProject.get(project.id) || [];

      const budgetedAmount = project.newPoAmount || project.originalPoAmount || 0;
      const actualAmount = projectInvoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
      const variance = budgetedAmount - actualAmount;
      const variancePercent = budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

      // Budget health
      let budgetHealth: 'Under Budget' | 'On Budget' | 'Over Budget';
      if (variancePercent < -5) {
        budgetHealth = 'Over Budget';
      } else if (variancePercent > 5) {
        budgetHealth = 'Under Budget';
      } else {
        budgetHealth = 'On Budget';
      }

      return {
        poNumber: project.poNumber,
        projectName: project.projectName,
        originalBudget: project.originalPoAmount || 0,
        changeOrders: project.changeOrderAmount || 0,
        currentBudget: budgetedAmount,
        actualSpent: actualAmount,
        variance,
        variancePercent,
        budgetHealth,
        remainingBudget: project.remainingPoAmount || 0,
      };
    })
    .filter(item => item.currentBudget > 0) // Only show projects with budgets
    .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));

    const totals = {
      totalBudget: results.reduce((sum, r) => sum + r.currentBudget, 0),
      totalActual: results.reduce((sum, r) => sum + r.actualSpent, 0),
      totalVariance: results.reduce((sum, r) => sum + r.variance, 0),
      overBudgetCount: results.filter(r => r.budgetHealth === 'Over Budget').length,
      underBudgetCount: results.filter(r => r.budgetHealth === 'Under Budget').length,
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
    console.error('[Project Processor] Error in processBudgetVsActual:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Change Order Impact Report
 */
export async function processChangeOrderImpact(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Filter projects with change orders
    let filteredProjects = projects.filter(p => (p.changeOrderAmount || 0) !== 0);

    if (filters.departmentId) {
      filteredProjects = filteredProjects.filter(p => {
        const deptId = extractId(p.departmentId);
        return deptId === filters.departmentId;
      });
    }

    if (filters.contractId) {
      filteredProjects = filteredProjects.filter(p => {
        const contractId = extractId(p.contractId);
        return contractId === filters.contractId;
      });
    }

    if (filters.projectId) {
      filteredProjects = filteredProjects.filter(p => p.id === filters.projectId);
    }

    // Process change orders
    const results = filteredProjects.map(project => {
      const originalBudget = project.originalPoAmount || 0;
      const changeOrderAmount = project.changeOrderAmount || 0;
      const newBudget = project.newPoAmount || originalBudget;
      const changePercent = originalBudget > 0 ? (changeOrderAmount / originalBudget) * 100 : 0;

      return {
        poNumber: project.poNumber,
        projectName: project.projectName,
        projectManager: project.projectManager || 'N/A',
        originalBudget,
        changeOrderAmount,
        newBudget,
        changePercent,
        currentSpent: (originalBudget - (project.remainingPoAmount || 0)),
        remainingBudget: project.remainingPoAmount || 0,
        isIncreased: changeOrderAmount > 0,
        isDecreased: changeOrderAmount < 0,
      };
    }).sort((a, b) => Math.abs(b.changeOrderAmount) - Math.abs(a.changeOrderAmount));

    const totals = {
      totalOriginalBudget: results.reduce((sum, r) => sum + r.originalBudget, 0),
      totalChangeOrders: results.reduce((sum, r) => sum + r.changeOrderAmount, 0),
      totalNewBudget: results.reduce((sum, r) => sum + r.newBudget, 0),
      projectsIncreased: results.filter(r => r.isIncreased).length,
      projectsDecreased: results.filter(r => r.isDecreased).length,
      averageChangePercent: results.length > 0
        ? results.reduce((sum, r) => sum + Math.abs(r.changePercent), 0) / results.length
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
    console.error('[Project Processor] Error in processChangeOrderImpact:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Project Forecast Report
 */
export async function processProjectForecast(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    // Fetch projects and recent invoices
    const [projectsSnapshot, invoicesSnapshot] = await Promise.all([
      adminDb.collection('projects').get(),
      adminDb.collection('invoices').get(),
    ]);

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];

    // Filter active projects only
    let filteredProjects = projects.filter(p => !p.isInactive && !p.isComplete);

    if (filters.departmentId) {
      filteredProjects = filteredProjects.filter(p => {
        const deptId = extractId(p.departmentId);
        return deptId === filters.departmentId;
      });
    }

    if (filters.contractId) {
      filteredProjects = filteredProjects.filter(p => {
        const contractId = extractId(p.contractId);
        return contractId === filters.contractId;
      });
    }

    if (filters.projectId) {
      filteredProjects = filteredProjects.filter(p => p.id === filters.projectId);
    }

    // Group invoices by project
    const invoicesByProject = new Map<string, Invoice[]>();
    invoices.forEach(inv => {
      const projectId = extractId(inv.projectId);
      if (!projectId) return;

      if (!invoicesByProject.has(projectId)) {
        invoicesByProject.set(projectId, []);
      }
      invoicesByProject.get(projectId)!.push(inv);
    });

    // Process forecast
    const results = filteredProjects
      .map(project => {
        const projectInvoices = (invoicesByProject.get(project.id) || [])
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate() : new Date(a.createdAt as any);
            const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate() : new Date(b.createdAt as any);
            return dateA.getTime() - dateB.getTime();
          });

        if (projectInvoices.length < 2) {
          // Not enough data for forecast
          return null;
        }

        // Calculate burn rate (average monthly spending)
        const firstInvoiceDate = projectInvoices[0].createdAt?.toDate?.()
          ? projectInvoices[0].createdAt.toDate()
          : new Date(projectInvoices[0].createdAt as any);
        const lastInvoiceDate = projectInvoices[projectInvoices.length - 1].createdAt?.toDate?.()
          ? projectInvoices[projectInvoices.length - 1].createdAt.toDate()
          : new Date(projectInvoices[projectInvoices.length - 1].createdAt as any);

        const monthsElapsed = Math.max(
          (lastInvoiceDate.getTime() - firstInvoiceDate.getTime()) / (30 * 24 * 60 * 60 * 1000),
          1
        );

        const totalSpent = projectInvoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
        const monthlyBurnRate = totalSpent / monthsElapsed;

        const remainingBudget = project.remainingPoAmount || 0;
        const currentBudget = project.newPoAmount || project.originalPoAmount || 0;

        // Forecast completion
        const monthsToCompletion = monthlyBurnRate > 0 ? remainingBudget / monthlyBurnRate : 0;
        const forecastCompletionDate = new Date();
        forecastCompletionDate.setMonth(forecastCompletionDate.getMonth() + Math.ceil(monthsToCompletion));

        // Forecast final cost
        const completionPercent = currentBudget > 0 ? (totalSpent / currentBudget) * 100 : 0;
        const forecastFinalCost = completionPercent > 0 ? (totalSpent / completionPercent) * 100 : currentBudget;

        return {
          poNumber: project.poNumber,
          projectName: project.projectName,
          currentBudget,
          spent: totalSpent,
          remaining: remainingBudget,
          completionPercent,
          monthlyBurnRate,
          monthsToCompletion,
          forecastCompletionDate,
          forecastFinalCost,
          forecastOverrun: forecastFinalCost - currentBudget,
          isOnTrack: forecastFinalCost <= currentBudget,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.forecastOverrun - a.forecastOverrun);

    const totals = {
      totalBudget: results.reduce((sum, r) => sum + r.currentBudget, 0),
      totalSpent: results.reduce((sum, r) => sum + r.spent, 0),
      totalForecast: results.reduce((sum, r) => sum + r.forecastFinalCost, 0),
      totalOverrun: results.reduce((sum, r) => sum + Math.max(0, r.forecastOverrun), 0),
      projectsOnTrack: results.filter(r => r.isOnTrack).length,
      projectsAtRisk: results.filter(r => !r.isOnTrack).length,
    };

    return {
      success: true,
      data: {
        results,
        totals,
        filters,
        hasData: results.length > 0,
        note: 'Forecasts are based on historical burn rates and may vary with actual project progression.',
      },
    };
  } catch (error) {
    console.error('[Project Processor] Error in processProjectForecast:', error);
    return { success: false, error: String(error), data: null };
  }
}

/**
 * Process Project Hours Report
 */
export async function processProjectHours(filters: ReportFilters) {
  if (!adminDb) {
    return { success: false, error: 'Database not initialized', data: null };
  }

  try {
    if (!filters.dateFrom || !filters.dateTo) {
      return { success: false, error: 'Date range required', data: null };
    }

    // Fetch timesheets and projects
    const [timesheetsSnapshot, projectsSnapshot] = await Promise.all([
      adminDb.collection('cti_timesheets')
        .where('timecardDate', '>=', Timestamp.fromDate(new Date(filters.dateFrom)))
        .where('timecardDate', '<=', Timestamp.fromDate(new Date(filters.dateTo)))
        .get(),
      adminDb.collection('projects').get(),
    ]);

    const timesheets = timesheetsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as CtiTimesheet[];

    const projects = projectsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];

    // Filter projects
    let filteredProjects = projects;

    if (filters.departmentId) {
      filteredProjects = filteredProjects.filter(p => {
        const deptId = extractId(p.departmentId);
        return deptId === filters.departmentId;
      });
    }

    if (filters.contractId) {
      filteredProjects = filteredProjects.filter(p => {
        const contractId = extractId(p.contractId);
        return contractId === filters.contractId;
      });
    }

    if (filters.projectId) {
      filteredProjects = filteredProjects.filter(p => p.id === filters.projectId);
    }

    // Aggregate hours by project
    const projectHours = new Map<string, {
      project: Project;
      totalHours: number;
      budgetedHours: number;
      remainingHours: number;
      employeeCount: Set<string>;
    }>();

    // Initialize projects
    filteredProjects.forEach(project => {
      projectHours.set(project.poNumber, {
        project,
        totalHours: 0,
        budgetedHours: project.budgetedHours || 0,
        remainingHours: project.remainingHours || 0,
        employeeCount: new Set(),
      });
    });

    // Aggregate timesheet hours
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

      const hours = timesheet.totalHoursActual || 0;
      data.totalHours += hours;
      data.employeeCount.add(String(timesheet.employeeId));
    });

    // Convert to results
    const results = Array.from(projectHours.values())
      .filter(item => item.totalHours > 0)
      .map(item => {
        const utilizationPercent = item.budgetedHours > 0
          ? (item.totalHours / item.budgetedHours) * 100
          : 0;

        return {
          poNumber: item.project.poNumber,
          projectName: item.project.projectName,
          budgetedHours: item.budgetedHours,
          actualHours: item.totalHours,
          remainingHours: Math.max(0, item.budgetedHours - item.totalHours),
          utilizationPercent,
          employeeCount: item.employeeCount.size,
          isOverBudget: item.totalHours > item.budgetedHours,
        };
      })
      .sort((a, b) => b.actualHours - a.actualHours);

    const totals = {
      totalBudgeted: results.reduce((sum, r) => sum + r.budgetedHours, 0),
      totalActual: results.reduce((sum, r) => sum + r.actualHours, 0),
      totalRemaining: results.reduce((sum, r) => sum + r.remainingHours, 0),
      overBudgetCount: results.filter(r => r.isOverBudget).length,
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
    console.error('[Project Processor] Error in processProjectHours:', error);
    return { success: false, error: String(error), data: null };
  }
}
