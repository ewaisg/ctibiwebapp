import { Suspense } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { InvoicingClientPage } from "./client-page";
import { InvoicingErrorBoundary } from "@/components/invoicing/InvoicingErrorBoundary";
import { getProjects, getDepartments, getEmployees, getCompanies, getServices, getRates } from './invoice-autofill-actions';
import { getInvoiceByIdOrNumber } from './invoice-crud-actions';
import type {
  Project,
  Department,
  Employee,
  Company,
  Service,
  Rate,
  Invoice
} from "@/types";

async function getInvoicingData() {
  try {
    const [projects, departments, employees, companies, services, rates] = await Promise.all([
      getProjects(),
      getDepartments(),
      getEmployees(),
      getCompanies(),
      getServices(),
      getRates(),
    ]);

    return {
      projects: JSON.parse(JSON.stringify(projects)),
      departments: JSON.parse(JSON.stringify(departments)),
      employees: JSON.parse(JSON.stringify(employees)),
      companies: JSON.parse(JSON.stringify(companies)),
      users: [],
      services: JSON.parse(JSON.stringify(services)),
      rates: JSON.parse(JSON.stringify(rates)),
    };
  } catch (error) {
    console.error("Error fetching invoicing data:", error);
    return { projects: [], departments: [], employees: [], companies: [], users: [], services: [], rates: [] };
  }
}

async function getInvoiceData(invoiceId?: string) {
  if (!invoiceId) return null;
  try {
    return await getInvoiceByIdOrNumber(invoiceId);
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    return null;
  }
}

interface InvoicingPageProps {
  searchParams: Promise<{ 
    id?: string;
    action?: 'autofill' | 'manual';
    projectId?: string;
    fromDate?: string;
    toDate?: string;
    departmentId?: string;
    showLoading?: string;
  }>;
}

export default async function InvoicingPage({ searchParams }: InvoicingPageProps) {
  const data = await getInvoicingData();
  const resolvedSearchParams = await searchParams;
  const existingInvoice = resolvedSearchParams.id ? await getInvoiceData(resolvedSearchParams.id) : null;
  const initialFormData = {
    action: resolvedSearchParams.action,
    projectId: resolvedSearchParams.projectId,
    fromDate: resolvedSearchParams.fromDate ? new Date(resolvedSearchParams.fromDate) : undefined,
    toDate: resolvedSearchParams.toDate ? new Date(resolvedSearchParams.toDate) : undefined,
    departmentId: resolvedSearchParams.departmentId,
    showLoading: resolvedSearchParams.showLoading === 'true',
  };

  return (
    <ProtectedRoute requiredPermission="canAccessInvoices">
      <InvoicingErrorBoundary>
        <main className="flex-1 space-y-6 p-4 pt-0">
          <Suspense fallback={<div>Loading...</div>}>
            <InvoicingClientPage
              {...data}
              existingInvoice={existingInvoice}
              isEditing={!!existingInvoice}
              initialFormData={initialFormData}
            />
          </Suspense>
        </main>
      </InvoicingErrorBoundary>
    </ProtectedRoute>
  );
}
