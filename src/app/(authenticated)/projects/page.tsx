import { getProjects, getDepartments } from "@/lib/firestore";
import { ProjectsClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";
import type { Project, Department } from "@/types";

// Force dynamic rendering to avoid build-time Firestore authentication errors
export const dynamic = 'force-dynamic';

// Helper function to serialize Firestore data for client components
function serializeFirestoreData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Convert Firestore Timestamps to ISO strings
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      const v = value as { seconds: number; nanoseconds: number };
      return new Date(v.seconds * 1000).toISOString();
    }
    // Convert DocumentReferences to just their ID strings
    if (value && typeof value === 'object' && 'id' in value && 'path' in value) {
      const v = value as { id: string; path: string };
      return v.id;
    }
    return value;
  })) as T;
}

export default async function ProjectsPage() {
  try {
    const [projects, departments] = await Promise.all([
      getProjects(),
      getDepartments(),
    ]);

    // Serialize the data to avoid client component issues
    const serializedProjects = serializeFirestoreData<Project[]>(projects);
    const serializedDepartments = serializeFirestoreData<Department[]>(departments);

    return (
      <ProtectedRoute requiredPermission="canAccessProjects">
        <ProjectsClientPage
          initialProjects={serializedProjects}
          departments={serializedDepartments}
        />
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error loading projects page:', error);

    return (
      <ProtectedRoute requiredPermission="canAccessProjects">
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center max-w-md">
            <div className="rounded-full bg-destructive/10 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Unable to load projects</h2>
            <p className="text-muted-foreground mb-6">
              We encountered an error while loading your projects. This might be a temporary issue.
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
