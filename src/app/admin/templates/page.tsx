import { Suspense } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { TemplateManagerClient } from './client-page';
import { adminDb } from '@/lib/firebase-admin';

async function getTemplatesData() {
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }
    const templatesSnapshot = await adminDb.collection('pdfTemplates').get();
    const assignmentsSnapshot = await adminDb.collection('templateAssignments').get();

    const templates = templatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    const assignments = assignmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return { templates, assignments };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { templates: [], assignments: [] };
  }
}

export default async function TemplatesPage() {
  const data = await getTemplatesData();

  return (
    <ProtectedRoute requiredPermission="canAccessAdmin">
      <main className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">PDF Template Manager</h2>
            <p className="text-muted-foreground">
              Upload, configure, and manage PDF templates for invoices and reports
            </p>
          </div>
        </div>

        <Suspense fallback={<div>Loading templates...</div>}>
          <TemplateManagerClient
            initialTemplates={data.templates}
            initialAssignments={data.assignments}
          />
        </Suspense>
      </main>
    </ProtectedRoute>
  );
}
