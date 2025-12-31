'use server';

import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { format, startOfDay, endOfDay, addMonths, endOfMonth } from 'date-fns';
import { createReferenceResolver, toReferenceId } from '@/lib/document-reference-utils';
import { getCollectionData } from './invoice-shared';
import type { CtiTimesheet, Employee, Company, Service, Rate, Project, Department, User } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AutofillInputSchema = z.object({
  projectId: z.string().describe('The ID of the project to generate an invoice for.'),
  fromDate: z.string().describe('The start date for the invoice period in ISO format.'),
  toDate: z.string().describe('The end date for the invoice period in ISO format.'),
});

export type AutofillInput = z.infer<typeof AutofillInputSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AutofillOutputSchema = z.object({
  items: z.array(z.object({
    employeeId: z.string(),
    employeeName: z.string(),
    companyId: z.string(),
    companyName: z.string(),
    serviceId: z.string(),
    serviceName: z.string(),
    hours: z.number(),
    billingRate: z.number(),
    amount: z.number(),
    markdown: z.number(),
    notes: z.string(),
  })),
  entriesFound: z.number(),
  totalHours: z.number(),
  projectData: z.object({
    approvingSupervisor: z.string().optional(),
    contractNumber: z.string().optional(),
    poNumber: z.string().optional(),
    pmisNumber: z.string().optional(),
  }).optional(),
  dueDate: z.string().optional(),
  termOfWeek: z.string().optional(),
});

export type AutofillOutput = z.infer<typeof AutofillOutputSchema>;

const BILLABLE_CODES = new Set(['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP']);

export async function autofillFromTimesheets(input: AutofillInput) {
  const { projectId, fromDate: fromDateStr, toDate: toDateStr } = input;

  const fromDate = startOfDay(new Date(fromDateStr));
  const toDate = endOfDay(new Date(toDateStr));

  try {
    // Fetch all required data
    const [employees, companies, services, rates, projects, allTimesheets] = await Promise.all([
      getEmployees(),
      getCompanies(),
      getServices(),
      getRates(),
      getProjects(),
      getAllTimesheetEntries()
    ]);

    const employeeResolver = createReferenceResolver(employees, {
      collection: 'employees',
      context: 'autofillFromTimesheets:employee-lookup',
    });
    const companyResolver = createReferenceResolver(companies, {
      collection: 'companies',
      context: 'autofillFromTimesheets:company-lookup',
    });
    const serviceResolver = createReferenceResolver(services, {
      collection: 'services',
      context: 'autofillFromTimesheets:service-lookup',
    });

    const rateLookup = new Map<string, Rate>();
    rates.forEach(rate => {
      const companyId = toReferenceId(rate.companyId);
      const serviceId = toReferenceId(rate.serviceId);
      if (companyId && serviceId) {
        rateLookup.set(`${companyId}::${serviceId}`, rate);
      }
    });

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error(`Project not found for ID: ${projectId}`);
    }

    // Calculate due date (last day of following month)
    const dueDate = endOfMonth(addMonths(toDate, 1));

    // Calculate term of week based on billing period
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeksDiff = Math.ceil(daysDiff / 7);
    const termOfWeek = weeksDiff <= 4 ? "4-Weeks" : "5-Weeks";

    // Filter timesheet entries for project and date range
    const relevantEntries = allTimesheets.filter(entry => {
      let entryDate: Date;

      try {
        if (entry.timecardDate instanceof Date) {
          entryDate = entry.timecardDate;
        } else if (entry.timecardDate && typeof (entry.timecardDate as Timestamp).toDate === 'function') {
          entryDate = (entry.timecardDate as Timestamp).toDate();
        } else {
          entryDate = new Date(entry.timecardDate as unknown as string | number);
        }
      } catch (error) {
        console.error('Error parsing timecard date:', error);
        return false;
      }

      // Check if entry matches project - strict matching only
      const projectLabor = entry.labors?.find(l => {
        if (!l.laborTitle || !l.laborValue) return false;

        // Only match Project/Categories field with PO number for strict validation
        const isProjectLabor = l.laborTitle === 'Project/Categories';

        if (!isProjectLabor) return false;

        // Match only against PO number for accuracy
        const laborValue = l.laborValue.toString().trim();
        return laborValue === project.poNumber;
      });

      const isDateInRange = entryDate >= fromDate && entryDate <= toDate;

      return !!projectLabor && isDateInRange;
    });

    // Aggregate hours by employee with improved billable logic
    const hoursByEmployee: Record<string, { hours: number; entries: typeof relevantEntries }> = {};

    relevantEntries.forEach(entry => {
      // Calculate billable hours with improved logic
      const billableHours = entry.payItems
        ?.filter(p => {
          if (!p.payItemCode || !p.payItemHours || p.payItemHours <= 0) return false;

          // Use billable codes from XLSX import structure
          if (BILLABLE_CODES.has(p.payItemCode)) {
            // Validate against Project/Categories field from XLSX
            const hasValidProject = entry.labors?.some(l =>
              l.laborTitle === 'Project/Categories' &&
              l.laborValue === project.poNumber
            );
            return hasValidProject;
          }

          return false;
        })
        .reduce((sum, p) => sum + (p.payItemHours || 0), 0) || 0;

      if (billableHours > 0) {
        const employeeKey = entry.employeeId.toString();
        if (!hoursByEmployee[employeeKey]) {
          hoursByEmployee[employeeKey] = { hours: 0, entries: [] };
        }
        hoursByEmployee[employeeKey].hours += billableHours;
        hoursByEmployee[employeeKey].entries.push(entry);
      }
    });

    // Validate aggregated hours before processing
    Object.entries(hoursByEmployee).forEach(([employeeIdStr, data]) => {
      if (data.hours > 80) {
        console.warn(`Employee ${employeeIdStr} has ${data.hours} hours - may be duplicate aggregation`);
      }
      if (data.hours <= 0) {
        console.warn(`Employee ${employeeIdStr} has ${data.hours} hours - invalid entry`);
      }
    });

    // Precompute project lookup maps for faster resolution
  type AssignedCompany = NonNullable<Project['assignedCompanies']>[number];
  type AssignedService = NonNullable<AssignedCompany['assignedServices']>[number];

  const assignedCompaniesById = new Map<string, AssignedCompany>();
    project.assignedCompanies?.forEach(assignedCompany => {
      const { id } = companyResolver.resolve(assignedCompany.companyId, 'autofillFromTimesheets:project-assigned-company');
      if (id) {
        assignedCompaniesById.set(id, assignedCompany);
      }
    });

    // Convert to invoice items with improved rate lookup
    let totalAggregatedHours = 0;
    const items = Object.entries(hoursByEmployee)
      .filter(([, data]) => data.hours > 0) // Filter out invalid entries
      .map(([employeeIdStr, data]) => {
      const { hours, entries } = data;

      const { item: employee } = employeeResolver.resolve(employeeIdStr, 'autofillFromTimesheets:employee-hours');
      if (!employee) {
        console.warn(`Employee not found for ID: ${employeeIdStr}`);
        return null;
      }

      totalAggregatedHours += hours;

      const companyResolution = companyResolver.resolve(employee.companyId, `autofillFromTimesheets:employee:${employeeIdStr}:company`);
      const empCompanyId = companyResolution.id;
      const company = companyResolution.item;

      if (!empCompanyId) {
        console.warn(`Company reference missing for employee ${employeeIdStr}`);
        return null;
      }

      // Find service and rate from project's assignedServices
      let service: Service | undefined;
      let billingRate = 0;

      const assignedCompany = assignedCompaniesById.get(empCompanyId);

      if (assignedCompany?.assignedServices?.length) {
        let bestServiceEntry = assignedCompany.assignedServices[0];

        for (const entry of entries) {
          const serviceLabor = entry.labors?.find(l => l.laborTitle === 'Service' || l.laborTitle === 'Category');

          if (serviceLabor?.laborValue) {
            const laborValue = serviceLabor.laborValue.toLowerCase();
            const matchingService = assignedCompany.assignedServices.find((assignment: AssignedService) => {
              const { item: svc } = serviceResolver.resolve(assignment.serviceId, 'autofillFromTimesheets:assigned-service-lookup');
              if (!svc?.serviceName) {
                return false;
              }
              const name = svc.serviceName.toLowerCase();
              return name.includes(laborValue) || laborValue.includes(name);
            });

            if (matchingService) {
              bestServiceEntry = matchingService;
              break;
            }
          }
        }

        const serviceResolution = serviceResolver.resolve(bestServiceEntry.serviceId, 'autofillFromTimesheets:best-service');
        service = serviceResolution.item;
        const bestServiceId = serviceResolution.id;
        billingRate = bestServiceEntry.billingRate || 0;

        if (!billingRate && bestServiceId) {
          const rate = rateLookup.get(`${empCompanyId}::${bestServiceId}`);
          if (rate) {
            billingRate = rate.rate;
          }
        }
      }

      if ((!service || !billingRate) && assignedCompany?.assignedServices?.length) {
        const primaryService = assignedCompany.assignedServices[0];
        const primaryResolution = serviceResolver.resolve(primaryService.serviceId, 'autofillFromTimesheets:primary-assigned-service');
        service = service ?? primaryResolution.item;
        if (!billingRate) {
          billingRate = primaryService.billingRate || 0;
        }
        const primaryServiceId = primaryResolution.id;
        if (!billingRate && primaryServiceId) {
          const rate = rateLookup.get(`${empCompanyId}::${primaryServiceId}`);
          if (rate) {
            billingRate = rate.rate;
          }
        }
      }

      if (!billingRate && service?.id) {
        const fallbackRate = rateLookup.get(`${empCompanyId}::${service.id}`);
        if (fallbackRate) {
          billingRate = fallbackRate.rate;
        }
      }

      if (billingRate <= 0) {
        console.warn(`No billing rate resolved for employee ${employeeIdStr} and company ${empCompanyId}`);
      }

      return {
        employeeId: employee.id,
        employeeName: employee.formalName,
        companyId: empCompanyId,
        companyName: company?.companyName || 'Unknown Company',
        serviceId: service?.id || '',
        serviceName: service?.serviceName || 'General Labor',
        hours,
        billingRate,
        amount: hours * billingRate,
        markdown: 0,
        notes: `Autofilled from ${entries.length} timesheet entries for ${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d, yyyy')}`
      };
    })
    .filter(Boolean);

    return {
      success: true,
      items,
      entriesFound: relevantEntries.length,
      totalHours: totalAggregatedHours,
      projectData: {
        approvingSupervisor: project.approvingSupervisor,
        contractNumber: project.contractNumber?.toString(),
        poNumber: project.poNumber,
        pmisNumber: project.pmisNumber,
      },
      dueDate: dueDate.toISOString(),
      termOfWeek: termOfWeek,
    };

  } catch (error) {
    console.error('Error in autofillFromTimesheets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      items: [],
      entriesFound: 0,
      totalHours: 0
    };
  }
}

// Data fetching functions
export async function getEmployees(): Promise<Employee[]> {
  return await getCollectionData('employees', { context: 'invoicing:getEmployees' }) as Employee[];
}

export async function getCompanies(): Promise<Company[]> {
  return await getCollectionData('companies', { context: 'invoicing:getCompanies' }) as Company[];
}

export async function getServices(): Promise<Service[]> {
  return await getCollectionData('services', { context: 'invoicing:getServices' }) as Service[];
}

export async function getRates(): Promise<Rate[]> {
  return await getCollectionData('rates', { context: 'invoicing:getRates' }) as Rate[];
}

export async function getProjects(): Promise<Project[]> {
  return await getCollectionData('projects', { context: 'invoicing:getProjects' }) as Project[];
}

export async function getAllTimesheetEntries(): Promise<CtiTimesheet[]> {
  return await getCollectionData('cti_timesheets', { context: 'invoicing:getAllTimesheetEntries' }) as CtiTimesheet[];
}

export async function getDepartments(): Promise<Department[]> {
  return await getCollectionData('departments', { context: 'invoicing:getDepartments' }) as Department[];
}

export async function getUsers(): Promise<User[]> {
  const raw = await getCollectionData('users', { context: 'invoicing:getUsers' }) as any[];
  // Ensure uid field exists
  return raw.map(u => ({ uid: u.uid || u.id, ...u })) as unknown as User[];
}
