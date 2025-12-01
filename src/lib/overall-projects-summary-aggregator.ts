import { getFirestore, collection, query, where, getDocs, DocumentReference } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  OverallProjectsSummaryReport,
  ProjectSummaryEntry,
  ContractGroup,
  MWBECompanySummary,
  SubConsultantSummary
} from './overall-projects-summary-pdf';
import { extractId } from './document-reference-utils';
import type { Project, Invoice, Company, Contract } from '@/types';

// ============================================================================
// DATA AGGREGATION FUNCTIONS
// ============================================================================

export interface AggregationFilters {
  departmentId?: string;
  contractId?: string;
  fromDate?: Date;
  toDate?: Date;
  includeInactiveProjects?: boolean;
  useAdminSdk?: boolean; // Use Firebase Admin SDK (server-side) vs client SDK
}

/**
 * Main aggregation function to generate the complete report data
 */
export async function aggregateOverallProjectsSummary(
  filters: AggregationFilters
): Promise<OverallProjectsSummaryReport> {
  try {
    const useAdmin = filters.useAdminSdk !== false; // Default to Admin SDK

    // Step 1: Fetch all necessary data
    const [projects, invoices, companies, contracts] = await Promise.all([
      fetchProjects(filters, useAdmin),
      fetchInvoices(filters, useAdmin),
      fetchCompanies(useAdmin),
      fetchContracts(useAdmin)
    ]);

    // Step 2: Build contract groups with project summaries
    const contractGroups = buildContractGroups(projects, contracts);

    // Step 3: Calculate grand totals
    const grandTotals = calculateGrandTotals(contractGroups, filters.includeInactiveProjects || false);

    // Step 4: Calculate MWBE compliance
    const mwbeData = calculateMWBECompliance(invoices, companies, contracts, filters);

    // Step 5: Calculate sub-consultant breakdown
    const subConsultantData = calculateSubConsultantBreakdown(invoices, companies, projects);

    // Step 6: Get department and contract names
    const departmentName = await getDepartmentName(filters.departmentId, useAdmin);
    const contractName = filters.contractId ? contracts.find(c => extractId(c.id) === filters.contractId)?.contractName : undefined;

    // Step 7: Assemble report
    const report: OverallProjectsSummaryReport = {
      departmentName: departmentName || 'All Departments',
      contractName,
      reportingPeriod: formatReportingPeriod(filters.fromDate, filters.toDate),
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      includeInactiveProjects: filters.includeInactiveProjects || false,
      contractGroups,
      grandTotals,
      mwbeData,
      subConsultants: subConsultantData.subConsultants,
      subConsultantTotals: subConsultantData.totals
    };

    return report;

  } catch (error) {
    console.error('Error aggregating overall projects summary:', error);
    throw new Error(`Failed to aggregate overall projects summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchProjects(filters: AggregationFilters, useAdmin: boolean): Promise<Project[]> {
  try {
    if (useAdmin) {
      if (!adminDb) throw new Error('Firebase Admin not initialized');
      let projectsQuery = adminDb.collection('projects');

      if (filters.departmentId) {
        projectsQuery = projectsQuery.where('departmentId', '==', filters.departmentId) as any;
      }

      if (filters.contractId) {
        projectsQuery = projectsQuery.where('contractId', '==', filters.contractId) as any;
      }

      if (!filters.includeInactiveProjects) {
        projectsQuery = projectsQuery.where('isInactive', '==', false) as any;
      }

      const snapshot = await projectsQuery.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } else {
      // Client SDK
      const db = getFirestore();
      let projectsQuery = query(collection(db, 'projects'));

      const conditions = [];
      if (filters.departmentId) {
        conditions.push(where('departmentId', '==', filters.departmentId));
      }
      if (filters.contractId) {
        conditions.push(where('contractId', '==', filters.contractId));
      }
      if (!filters.includeInactiveProjects) {
        conditions.push(where('isInactive', '==', false));
      }

      if (conditions.length > 0) {
        projectsQuery = query(collection(db, 'projects'), ...conditions);
      }

      const snapshot = await getDocs(projectsQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

async function fetchInvoices(filters: AggregationFilters, useAdmin: boolean): Promise<Invoice[]> {
  try {
    if (useAdmin) {
      if (!adminDb) throw new Error('Firebase Admin not initialized');
      let invoicesQuery = adminDb.collection('invoices').where('status', '==', 'approved');

      if (filters.fromDate) {
        invoicesQuery = invoicesQuery.where('fromDate', '>=', filters.fromDate) as any;
      }

      if (filters.toDate) {
        invoicesQuery = invoicesQuery.where('toDate', '<=', filters.toDate) as any;
      }

      const snapshot = await invoicesQuery.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    } else {
      // Client SDK
      const db = getFirestore();
      const conditions = [where('status', '==', 'approved')];

      if (filters.fromDate) {
        conditions.push(where('fromDate', '>=', filters.fromDate));
      }

      if (filters.toDate) {
        conditions.push(where('toDate', '<=', filters.toDate));
      }

      const invoicesQuery = query(collection(db, 'invoices'), ...conditions);
      const snapshot = await getDocs(invoicesQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    }
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

async function fetchCompanies(useAdmin: boolean): Promise<Company[]> {
  try {
    if (useAdmin) {
      if (!adminDb) throw new Error('Firebase Admin not initialized');
      const snapshot = await adminDb.collection('companies').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    } else {
      const db = getFirestore();
      const snapshot = await getDocs(collection(db, 'companies'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    }
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
}

async function fetchContracts(useAdmin: boolean): Promise<Contract[]> {
  try {
    if (useAdmin) {
      if (!adminDb) throw new Error('Firebase Admin not initialized');
      const snapshot = await adminDb.collection('contracts').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
    } else {
      const db = getFirestore();
      const snapshot = await getDocs(collection(db, 'contracts'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
    }
  } catch (error) {
    console.error('Error fetching contracts:', error);
    throw error;
  }
}

async function getDepartmentName(departmentId: string | undefined, useAdmin: boolean): Promise<string | null> {
  if (!departmentId) return null;

  try {
    if (useAdmin) {
      if (!adminDb) throw new Error('Firebase Admin not initialized');
      const doc = await adminDb.collection('departments').doc(departmentId).get();
      return doc.exists ? (doc.data()?.departmentName || null) : null;
    } else {
      const db = getFirestore();
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'departments', departmentId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data()?.departmentName || null) : null;
    }
  } catch (error) {
    console.error('Error fetching department name:', error);
    return null;
  }
}

// ============================================================================
// AGGREGATION LOGIC
// ============================================================================

function buildContractGroups(projects: Project[], contracts: Contract[]): ContractGroup[] {
  // Group projects by contract
  const contractMap = new Map<string, ProjectSummaryEntry[]>();

  projects.forEach(project => {
    const contractId = extractId(project.contractId);
    if (!contractId) return;

    const projectEntry: ProjectSummaryEntry = {
      poNumber: project.poNumber,
      projectName: project.projectName,
      projectManager: project.projectManager || '',
      approvingSupervisor: project.approvingSupervisor || '',
      ipmssiStaff: project.ipmssiStaff || '',
      originalPoAmount: project.originalPoAmount || 0,
      changeOrderAmount: project.changeOrderAmount || 0,
      newPoAmount: project.newPoAmount || 0,
      previouslyInvoiced: project.previouslyInvoicedAmount || 0,
      remainingPoAmount: project.remainingPoAmount || 0,
      contractId,
      contractName: '',
      contractNumber: '',
      isInactive: project.isInactive
    };

    if (!contractMap.has(contractId)) {
      contractMap.set(contractId, []);
    }
    contractMap.get(contractId)!.push(projectEntry);
  });

  // Build contract groups
  const contractGroups: ContractGroup[] = [];

  contractMap.forEach((projects, contractId) => {
    const contract = contracts.find(c => extractId(c.id) === contractId);

    // Calculate contract totals
    const totals = {
      originalPoAmount: projects.reduce((sum, p) => sum + p.originalPoAmount, 0),
      changeOrderAmount: projects.reduce((sum, p) => sum + p.changeOrderAmount, 0),
      newPoAmount: projects.reduce((sum, p) => sum + p.newPoAmount, 0),
      previouslyInvoiced: projects.reduce((sum, p) => sum + p.previouslyInvoiced, 0),
      remainingPoAmount: projects.reduce((sum, p) => sum + p.remainingPoAmount, 0)
    };

    // Update project entries with contract info
    projects.forEach(p => {
      p.contractName = contract?.contractName || 'Unknown Contract';
      p.contractNumber = contract?.contractNumber?.toString() || 'N/A';
    });

    contractGroups.push({
      contractId,
      contractName: contract?.contractName || 'Unknown Contract',
      contractNumber: contract?.contractNumber?.toString() || 'N/A',
      projects,
      totals
    });
  });

  // Sort by contract number
  contractGroups.sort((a, b) => {
    const numA = parseInt(a.contractNumber) || 0;
    const numB = parseInt(b.contractNumber) || 0;
    return numA - numB;
  });

  return contractGroups;
}

function calculateGrandTotals(contractGroups: ContractGroup[], includeInactive: boolean) {
  let totalProjects = 0;
  let totalActiveProjects = 0;
  let totalInactiveProjects = 0;

  contractGroups.forEach(group => {
    totalProjects += group.projects.length;
    group.projects.forEach(p => {
      if (p.isInactive) {
        totalInactiveProjects++;
      } else {
        totalActiveProjects++;
      }
    });
  });

  return {
    totalContracts: contractGroups.length,
    totalProjects,
    totalActiveProjects,
    totalInactiveProjects,
    originalPoAmount: contractGroups.reduce((sum, g) => sum + g.totals.originalPoAmount, 0),
    changeOrderAmount: contractGroups.reduce((sum, g) => sum + g.totals.changeOrderAmount, 0),
    newPoAmount: contractGroups.reduce((sum, g) => sum + g.totals.newPoAmount, 0),
    previouslyInvoiced: contractGroups.reduce((sum, g) => sum + g.totals.previouslyInvoiced, 0),
    remainingPoAmount: contractGroups.reduce((sum, g) => sum + g.totals.remainingPoAmount, 0)
  };
}

function calculateMWBECompliance(
  invoices: Invoice[],
  companies: Company[],
  contracts: Contract[],
  filters: AggregationFilters
) {
  // Get MWBE goal from contract (if single contract) or use highest goal
  let contractMwbeGoal = 0;
  if (filters.contractId) {
    const contract = contracts.find(c => extractId(c.id) === filters.contractId);
    contractMwbeGoal = contract?.mwbeGoalPercent || 0;
  } else {
    // Use highest MWBE goal across contracts
    contractMwbeGoal = Math.max(...contracts.map(c => c.mwbeGoalPercent || 0), 0);
  }

  // Aggregate invoiced amounts by company
  const companyInvoicedMap = new Map<string, number>();

  invoices.forEach(invoice => {
    // Sum invoice items by company
    invoice.invoiceItems?.forEach(item => {
      const companyId = extractId(item.companyId);
      if (!companyId) return;

      const current = companyInvoicedMap.get(companyId) || 0;
      companyInvoicedMap.set(companyId, current + (item.amount || 0));
    });

    // Add reimbursable expenses by company
    invoice.reimbursableExpenses?.forEach(expense => {
      const companyId = extractId(expense.companyId);
      if (!companyId) return;

      const current = companyInvoicedMap.get(companyId) || 0;
      companyInvoicedMap.set(companyId, current + (expense.amount || 0));
    });
  });

  // Calculate total invoiced
  const totalInvoiced = Array.from(companyInvoicedMap.values()).reduce((sum, amount) => sum + amount, 0);

  // Build MWBE company summaries
  const mwbeCompanies: MWBECompanySummary[] = [];
  let totalMwbeInvoiced = 0;
  let totalNonMwbeInvoiced = 0;

  companyInvoicedMap.forEach((amount, companyId) => {
    const company = companies.find(c => extractId(c.id) === companyId);
    if (!company) return;

    const isMwbe = company.diversityCertification && company.diversityCertification !== 'None';

    if (isMwbe) {
      totalMwbeInvoiced += amount;
      mwbeCompanies.push({
        companyCode: company.companyCode,
        companyName: company.companyName,
        diversityCertification: company.diversityCertification as 'MWBE' | 'WBE' | 'SBE' | 'None',
        totalInvoiced: amount,
        percentOfTotal: totalInvoiced > 0 ? (amount / totalInvoiced) * 100 : 0
      });
    } else {
      totalNonMwbeInvoiced += amount;
    }
  });

  // Sort MWBE companies by total invoiced (descending)
  mwbeCompanies.sort((a, b) => b.totalInvoiced - a.totalInvoiced);

  // Calculate MWBE percentage achieved
  const mwbePercentAchieved = totalInvoiced > 0 ? (totalMwbeInvoiced / totalInvoiced) * 100 : 0;

  // DSBO participation (for now, same as MWBE - can be refined)
  const dsboParticipation = mwbePercentAchieved;

  return {
    contractMwbeGoal,
    mwbeCompanies,
    totalMwbeInvoiced,
    totalNonMwbeInvoiced,
    mwbePercentAchieved,
    dsboParticipation
  };
}

function calculateSubConsultantBreakdown(
  invoices: Invoice[],
  companies: Company[],
  projects: Project[]
) {
  // Get all sub-consultants
  const subConsultants = companies.filter(c => c.isSubconsultant);

  // Aggregate invoiced and paid amounts by sub-consultant
  const subDataMap = new Map<string, { invoiced: number; paid: number }>();

  invoices.forEach(invoice => {
    invoice.invoiceItems?.forEach(item => {
      const companyId = extractId(item.companyId);
      if (!companyId) return;

      const company = companies.find(c => extractId(c.id) === companyId);
      if (!company || !company.isSubconsultant) return;

      const current = subDataMap.get(companyId) || { invoiced: 0, paid: 0 };
      current.invoiced += item.amount || 0;

      // For paid amount, check if invoice has payment tracking (simplified)
      // In reality, you'd need to query payment_tracking collection
      // For now, we'll assume paid = 0 (payment tracking to be added later)

      subDataMap.set(companyId, current);
    });

    invoice.reimbursableExpenses?.forEach(expense => {
      const companyId = extractId(expense.companyId);
      if (!companyId) return;

      const company = companies.find(c => extractId(c.id) === companyId);
      if (!company || !company.isSubconsultant) return;

      const current = subDataMap.get(companyId) || { invoiced: 0, paid: 0 };
      current.invoiced += expense.amount || 0;

      subDataMap.set(companyId, current);
    });
  });

  // Calculate commitment amounts from project assignments
  const subCommitmentMap = new Map<string, number>();

  projects.forEach(project => {
    project.assignedCompanies?.forEach(assignment => {
      const companyId = extractId(assignment.companyId);
      if (!companyId) return;

      const company = companies.find(c => extractId(c.id) === companyId);
      if (!company || !company.isSubconsultant) return;

      // Calculate commitment based on services assigned
      let commitment = 0;
      assignment.assignedServices?.forEach(service => {
        // Simplified: use project's new PO amount proportionally
        // In reality, commitment calculation may be more complex
        commitment += (project.newPoAmount || 0) / (project.assignedCompanies?.length || 1);
      });

      const current = subCommitmentMap.get(companyId) || 0;
      subCommitmentMap.set(companyId, current + commitment);
    });
  });

  // Build sub-consultant summaries
  const subConsultantSummaries: SubConsultantSummary[] = [];
  let totalCommitment = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalRemainingCommitted = 0;

  subConsultants.forEach(sub => {
    const companyId = extractId(sub.id);
    if (!companyId) return;

    const data = subDataMap.get(companyId) || { invoiced: 0, paid: 0 };
    const commitment = subCommitmentMap.get(companyId) || 0;
    const remaining = commitment - data.invoiced;
    const percentInvoiced = commitment > 0 ? (data.invoiced / commitment) * 100 : 0;

    // Only include subs with actual data
    if (commitment > 0 || data.invoiced > 0) {
      subConsultantSummaries.push({
        companyCode: sub.companyCode,
        companyName: sub.companyName,
        totalCommitment: commitment,
        totalInvoiced: data.invoiced,
        totalPaid: data.paid,
        remainingCommitted: remaining,
        percentInvoiced
      });

      totalCommitment += commitment;
      totalInvoiced += data.invoiced;
      totalPaid += data.paid;
      totalRemainingCommitted += remaining;
    }
  });

  // Sort by total invoiced (descending)
  subConsultantSummaries.sort((a, b) => b.totalInvoiced - a.totalInvoiced);

  return {
    subConsultants: subConsultantSummaries,
    totals: {
      totalCommitment,
      totalInvoiced,
      totalPaid,
      remainingCommitted: totalRemainingCommitted
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatReportingPeriod(fromDate?: Date, toDate?: Date): string {
  if (fromDate && toDate) {
    return `${fromDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }
  if (fromDate) {
    return `From ${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  if (toDate) {
    return `Through ${toDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  return 'All Time';
}
