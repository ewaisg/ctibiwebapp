import { notFound } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { getProjects, getInvoices } from '@/lib/firestore';
import type { Invoice, Project } from '@/types';
import { ProjectFilesClientPage } from './client-page';

export const dynamic = 'force-dynamic';

function serializeFirestoreData<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
        const v = value as { seconds: number; nanoseconds: number };
        return new Date(v.seconds * 1000).toISOString();
      }
      if (value && typeof value === 'object' && 'id' in value && 'path' in value) {
        const v = value as { id: string; path: string };
        return v.id;
      }
      return value;
    })
  ) as T;
}

interface ProjectFilesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectFilesPage({ params }: ProjectFilesPageProps) {
  const { id } = await params;

  try {
    const [projects, allInvoices] = await Promise.all([getProjects(), getInvoices()]);

    const project = projects.find((p) => p.id === id);
    if (!project) notFound();

    const projectInvoices = allInvoices.filter((invoice) => {
      const invoiceProjectId = typeof invoice.projectId === 'string' ? invoice.projectId : (invoice.projectId as any)?.id;
      return invoiceProjectId === id;
    });

    return (
      <ProtectedRoute requiredPermission="canAccessProjects">
        <ProjectFilesClientPage
          project={serializeFirestoreData<Project>(project)}
          invoices={serializeFirestoreData<Invoice[]>(projectInvoices)}
        />
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error loading project files page:', error);
    notFound();
  }
}
