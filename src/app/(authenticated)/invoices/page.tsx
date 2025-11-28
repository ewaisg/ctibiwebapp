import { getProjects, getDepartments, getInvoices, getEmployees, getCompanies, getUsers, getContracts } from "@/lib/firestore";
import { InvoicesClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";
import { Invoice, Project, Department, Employee, Company, User, Contract } from "@/types";

// Force dynamic rendering to avoid build-time Firestore authentication errors
export const dynamic = 'force-dynamic';

// Helper function to serialize Firestore data for client components
function serializeFirestoreData(data: unknown): unknown {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Convert Firestore Timestamps to ISO strings
    if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
      return new Date(value.seconds * 1000).toISOString();
    }
    // Convert DocumentReferences to just their ID strings
    if (value && typeof value === 'object' && value.id && value.path) {
      return value.id;
    }
    return value;
  }));
}

export default async function InvoicesPage() {
  try {
    const [invoices, projects, departments, employees, companies, users, contracts] = await Promise.all([
      getInvoices(),
      getProjects(),
      getDepartments(),
      getEmployees(),
      getCompanies(),
      getUsers(),
      getContracts(),
    ]);

    // Get payment aggregates on the server and merge into invoices
    const { getPaymentAggregatesForInvoices } = await import("@/lib/payment-tracking");
    const aggregates = await getPaymentAggregatesForInvoices(invoices as Invoice[]);
    const invoicesWithPayment = (invoices as any[]).map((inv) => {
      const agg = aggregates[(inv as any).id] || { paidAmount: 0, outstandingAmount: inv.invoiceTotal || 0, paymentStatus: 'pending' };
      return { ...inv, paidAmount: agg.paidAmount, outstandingAmount: agg.outstandingAmount, paymentStatus: agg.paymentStatus };
    });

    // Serialize the data to avoid client component issues
    const serializedInvoices = serializeFirestoreData(invoicesWithPayment) as Invoice[];
    const serializedProjects = serializeFirestoreData(projects) as Project[];
    const serializedDepartments = serializeFirestoreData(departments) as Department[];
    const serializedEmployees = serializeFirestoreData(employees) as Employee[];
    const serializedCompanies = serializeFirestoreData(companies) as Company[];
    const serializedUsers = serializeFirestoreData(users) as User[];
    const serializedContracts = serializeFirestoreData(contracts) as Contract[];

    return (
      <ProtectedRoute requiredPermission="canAccessInvoices">
        <InvoicesClientPage
          initialInvoices={serializedInvoices}
          projects={serializedProjects}
          departments={serializedDepartments}
          employees={serializedEmployees}
          companies={serializedCompanies}
          users={serializedUsers}
          contracts={serializedContracts}
        />
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error loading invoices page:', error);
    return (
      <ProtectedRoute requiredPermission="canAccessInvoices">
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center max-w-md">
            <div className="rounded-full bg-destructive/10 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Unable to load invoices</h2>
            <p className="text-muted-foreground mb-6">
              We encountered an error while loading your invoices. This might be a temporary issue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }
}
