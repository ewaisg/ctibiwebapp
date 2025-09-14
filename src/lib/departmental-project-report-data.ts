import { adminDb } from '@/lib/firebase-admin';
import type { Project, Contract, Department } from '@/types';
import type { 
  DepartmentalProjectReportInfo, 
  DepartmentalProjectReportEntry, 
  ContractGroup 
} from './departmental-project-report-pdf';
import { format } from 'date-fns';

interface ProjectWithContract extends Project {
  contract?: Contract;
}

export async function generateDepartmentalProjectReportData(
  departmentId: string,
  startDate: string,
  endDate: string,
  includeInactiveProjects: boolean = false
): Promise<DepartmentalProjectReportInfo> {
  if (!adminDb) {
    throw new Error('Firebase Admin SDK is not initialized');
  }

  console.log(`[Department Report] Generating data for department ${departmentId}, period ${startDate} to ${endDate}, includeInactive: ${includeInactiveProjects}`);

  // Fetch all required data
  const [departmentDoc, projectsSnapshot, contractsSnapshot] = await Promise.all([
    adminDb.collection('departments').doc(departmentId).get(),
    adminDb.collection('projects').where('departmentId', '==', departmentId).get(),
    adminDb.collection('contracts').get()
  ]);

  // Get department info
  const department = departmentDoc.exists 
    ? { id: departmentDoc.id, ...departmentDoc.data() } as Department
    : null;

  if (!department) {
    throw new Error(`Department with ID ${departmentId} not found`);
  }

  // Get all projects for the department
  const allProjects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Project[];

  // Get all contracts
  const contracts = contractsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Contract[];

  console.log(`[Department Report] Found ${allProjects.length} projects and ${contracts.length} contracts`);

  // Filter projects based on inactive status
  const filteredProjects = includeInactiveProjects 
    ? allProjects 
    : allProjects.filter(p => !p.isInactive);
  console.log(`[Department Report] After filtering: ${filteredProjects.length} projects (includeInactive: ${includeInactiveProjects})`);

  // Create a map of contracts for easy lookup
  const contractMap = new Map(contracts.map(c => [c.id, c]));

  // Transform projects into report entries - only include projects with valid contracts
  const projectEntries: DepartmentalProjectReportEntry[] = filteredProjects
    .filter(project => {
      // Only include projects that have a valid contract assignment
      const contractId = typeof project.contractId === 'string' ? project.contractId : project.contractId?.id;
      const contract = contractMap.get(contractId);
      return project.contractId && contract;
    })
    .map(project => {
      const contractId = typeof project.contractId === 'string' ? project.contractId : project.contractId?.id;
      const contract = contractMap.get(contractId);
      
      return {
        poNumber: project.poNumber || 'N/A',
        projectName: project.projectName || 'Unnamed Project',
        projectManager: project.projectManager || 'N/A',
        approvingSupervisor: project.approvingSupervisor || 'N/A',
        ipmssiStaff: project.ipmssiStaff || 'N/A',
        originalPoAmount: project.originalPoAmount || 0,
        changeOrderAmount: project.changeOrderAmount || 0,
        newPoAmount: project.newPoAmount || project.originalPoAmount || 0,
        previouslyInvoiced: project.previouslyInvoicedAmount || 0,
        remainingPoAmount: project.remainingPoAmount || 0,
        contractId: contractId || '',
        contractName: contract?.contractName || 'Contract Name Not Found',
        isInactive: project.isInactive || false
      };
    });

  // Group projects by contract
  const contractGroups = new Map<string, ContractGroup>();

  projectEntries.forEach(project => {
    const contractId = project.contractId;
    const contract = contractMap.get(contractId);
    
    if (!contractGroups.has(contractId)) {
      contractGroups.set(contractId, {
        contractId,
        contractName: project.contractName,
        contractNumber: contract?.contractNumber?.toString() || 'N/A',
        projects: [],
        totals: {
          originalPoAmount: 0,
          changeOrderAmount: 0,
          newPoAmount: 0,
          previouslyInvoiced: 0,
          remainingPoAmount: 0
        }
      });
    }

    const group = contractGroups.get(contractId)!;
    group.projects.push(project);

    // Update contract totals
    group.totals.originalPoAmount += project.originalPoAmount;
    group.totals.changeOrderAmount += project.changeOrderAmount;
    group.totals.newPoAmount += project.newPoAmount;
    group.totals.previouslyInvoiced += project.previouslyInvoiced;
    group.totals.remainingPoAmount += project.remainingPoAmount;
  });

  // Sort contracts by contract number and projects within each contract by PO number
  const sortedContractGroups = Array.from(contractGroups.values())
    .sort((a, b) => {
      const aNum = parseInt(a.contractNumber) || 0;
      const bNum = parseInt(b.contractNumber) || 0;
      return aNum - bNum;
    });

  sortedContractGroups.forEach(group => {
    group.projects.sort((a, b) => a.poNumber.localeCompare(b.poNumber));
  });

  // Calculate grand totals
  const grandTotals = {
    totalContracts: sortedContractGroups.length,
    totalProjects: projectEntries.length,
    totalActiveProjects: projectEntries.filter(p => !p.isInactive).length,
    totalInactiveProjects: projectEntries.filter(p => p.isInactive).length,
    originalPoAmount: projectEntries.reduce((sum, p) => sum + p.originalPoAmount, 0),
    changeOrderAmount: projectEntries.reduce((sum, p) => sum + p.changeOrderAmount, 0),
    newPoAmount: projectEntries.reduce((sum, p) => sum + p.newPoAmount, 0),
    previouslyInvoiced: projectEntries.reduce((sum, p) => sum + p.previouslyInvoiced, 0),
    remainingPoAmount: projectEntries.reduce((sum, p) => sum + p.remainingPoAmount, 0)
  };

  console.log(`[Department Report] Generated report with ${grandTotals.totalContracts} contracts and ${grandTotals.totalProjects} projects`);

  return {
    departmentName: department.departmentName,
    reportingPeriod: `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`,
    generatedDate: format(new Date(), 'MMM dd, yyyy HH:mm'),
    includeInactiveProjects,
    contractGroups: sortedContractGroups,
    grandTotals
  };
}

/**
 * Alternative function that filters projects by invoice submission dates within the reporting period
 * This version considers which projects had invoice activity during the specified date range
 */
export async function generateDepartmentalProjectReportDataByInvoiceActivity(
  departmentId: string,
  startDate: string,
  endDate: string,
  includeInactiveProjects: boolean = false
): Promise<DepartmentalProjectReportInfo> {
  if (!adminDb) {
    throw new Error('Firebase Admin SDK is not initialized');
  }

  console.log(`[Department Report - Invoice Activity] Generating data for department ${departmentId}, period ${startDate} to ${endDate}`);

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Fetch all required data
  const [departmentDoc, projectsSnapshot, contractsSnapshot, invoicesSnapshot] = await Promise.all([
    adminDb.collection('departments').doc(departmentId).get(),
    adminDb.collection('projects').where('departmentId', '==', departmentId).get(),
    adminDb.collection('contracts').get(),
    adminDb.collection('invoices').get() // Get all invoices to filter by date and project
  ]);

  // Get department info
  const department = departmentDoc.exists 
    ? { id: departmentDoc.id, ...departmentDoc.data() } as Department
    : null;

  if (!department) {
    throw new Error(`Department with ID ${departmentId} not found`);
  }

  // Get all projects and contracts
  const allProjects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Project[];

  const contracts = contractsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Contract[];  // Get invoices and filter by invoice period dates
  const allInvoices = invoicesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as any[];

  // Find projects that had invoice activity in the date range
  const activeProjectIds = new Set<string>();

  allInvoices.forEach(invoice => {
    // Filter by invoice period dates (fromDate/toDate) instead of submission dates
    if (!invoice.fromDate || !invoice.toDate) {
      return;
    }

    // Handle Firestore timestamp conversion for fromDate and toDate
    let invoiceFromDate = invoice.fromDate;
    let invoiceToDate = invoice.toDate;
    
    if (invoiceFromDate && typeof invoiceFromDate === 'object' && 'toDate' in invoiceFromDate) {
      invoiceFromDate = (invoiceFromDate as any).toDate();
    } else if (invoiceFromDate && typeof invoiceFromDate === 'object' && 'seconds' in invoiceFromDate) {
      invoiceFromDate = new Date((invoiceFromDate as any).seconds * 1000);
    }
    
    if (invoiceToDate && typeof invoiceToDate === 'object' && 'toDate' in invoiceToDate) {
      invoiceToDate = (invoiceToDate as any).toDate();
    } else if (invoiceToDate && typeof invoiceToDate === 'object' && 'seconds' in invoiceToDate) {
      invoiceToDate = new Date((invoiceToDate as any).seconds * 1000);
    }

    if (!(invoiceFromDate instanceof Date) || !(invoiceToDate instanceof Date)) {
      return;
    }

    // Check if invoice period overlaps with the selected date range
    if (invoiceFromDate <= end && invoiceToDate >= start) {
      activeProjectIds.add(invoice.projectId);
    }
  });

  console.log(`[Department Report - Invoice Activity] Found ${activeProjectIds.size} projects with invoice activity in date range`);

  // Filter projects by activity and inactive status
  let filteredProjects = allProjects.filter(p => activeProjectIds.has(p.id));
  
  if (!includeInactiveProjects) {
    filteredProjects = filteredProjects.filter(p => !p.isInactive);
  }
  console.log(`[Department Report - Invoice Activity] After filtering: ${filteredProjects.length} projects`);

  // Create a map of contracts for easy lookup
  const contractMap = new Map(contracts.map(c => [c.id, c]));

  // Transform projects into report entries - only include projects with valid contracts
  const projectEntries: DepartmentalProjectReportEntry[] = filteredProjects
    .filter(project => {
      // Only include projects that have a valid contract assignment
      const contractId = typeof project.contractId === 'string' ? project.contractId : project.contractId?.id;
      const contract = contractMap.get(contractId);
      return project.contractId && contract;
    })
    .map(project => {
      const contractId = typeof project.contractId === 'string' ? project.contractId : project.contractId?.id;
      const contract = contractMap.get(contractId);
      
      return {
        poNumber: project.poNumber || 'N/A',
        projectName: project.projectName || 'Unnamed Project',
        projectManager: project.projectManager || 'N/A',
        approvingSupervisor: project.approvingSupervisor || 'N/A',
        ipmssiStaff: project.ipmssiStaff || 'N/A',
        originalPoAmount: project.originalPoAmount || 0,
        changeOrderAmount: project.changeOrderAmount || 0,
        newPoAmount: project.newPoAmount || project.originalPoAmount || 0,
        previouslyInvoiced: project.previouslyInvoicedAmount || 0,
        remainingPoAmount: project.remainingPoAmount || 0,
        contractId: contractId || '',
        contractName: contract?.contractName || 'Contract Name Not Found',
        isInactive: project.isInactive || false
      };
    });

  // Group projects by contract
  const contractGroups = new Map<string, ContractGroup>();

  projectEntries.forEach(project => {
    const contractId = project.contractId;
    const contract = contractMap.get(contractId);
    
    if (!contractGroups.has(contractId)) {
      contractGroups.set(contractId, {
        contractId,
        contractName: project.contractName,
        contractNumber: contract?.contractNumber?.toString() || 'N/A',
        projects: [],
        totals: {
          originalPoAmount: 0,
          changeOrderAmount: 0,
          newPoAmount: 0,
          previouslyInvoiced: 0,
          remainingPoAmount: 0
        }
      });
    }

    const group = contractGroups.get(contractId)!;
    group.projects.push(project);

    // Update contract totals
    group.totals.originalPoAmount += project.originalPoAmount;
    group.totals.changeOrderAmount += project.changeOrderAmount;
    group.totals.newPoAmount += project.newPoAmount;
    group.totals.previouslyInvoiced += project.previouslyInvoiced;
    group.totals.remainingPoAmount += project.remainingPoAmount;
  });

  // Sort contracts by contract number and projects within each contract by PO number
  const sortedContractGroups = Array.from(contractGroups.values())
    .sort((a, b) => {
      const aNum = parseInt(a.contractNumber) || 0;
      const bNum = parseInt(b.contractNumber) || 0;
      return aNum - bNum;
    });

  sortedContractGroups.forEach(group => {
    group.projects.sort((a, b) => a.poNumber.localeCompare(b.poNumber));
  });

  // Calculate grand totals
  const grandTotals = {
    totalContracts: sortedContractGroups.length,
    totalProjects: projectEntries.length,
    totalActiveProjects: projectEntries.filter(p => !p.isInactive).length,
    totalInactiveProjects: projectEntries.filter(p => p.isInactive).length,
    originalPoAmount: projectEntries.reduce((sum, p) => sum + p.originalPoAmount, 0),
    changeOrderAmount: projectEntries.reduce((sum, p) => sum + p.changeOrderAmount, 0),
    newPoAmount: projectEntries.reduce((sum, p) => sum + p.newPoAmount, 0),
    previouslyInvoiced: projectEntries.reduce((sum, p) => sum + p.previouslyInvoiced, 0),
    remainingPoAmount: projectEntries.reduce((sum, p) => sum + p.remainingPoAmount, 0)
  };

  console.log(`[Department Report - Invoice Activity] Generated report with ${grandTotals.totalContracts} contracts and ${grandTotals.totalProjects} projects`);

  return {
    departmentName: department.departmentName,
    reportingPeriod: `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')} (Invoice Activity)`,
    generatedDate: format(new Date(), 'MMM dd, yyyy HH:mm'),
    includeInactiveProjects,
    contractGroups: sortedContractGroups,
    grandTotals
  };
}
