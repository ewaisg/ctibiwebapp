import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getAdminStorage } from '@/lib/firebase-admin';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authedHandler = await withAuth(async (_req: NextRequest) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      const doc = await adminDb.collection('pdfTemplates').doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      const data: any = doc.data();
      // Sanitize response: exclude large/base64 fields
      const result = {
        id: doc.id,
        templateName: data?.templateName || '',
        templateType: data?.templateType || 'Custom',
        isActive: Boolean(data?.isActive),
        manualOnly: Boolean(data?.manualOnly),
        fieldMappings: Array.isArray(data?.fieldMappings) ? data.fieldMappings : [],
        previewImageUrl: data?.previewImageUrl || undefined,
        storageUrl: data?.storageUrl || undefined,
        createdAt: data?.createdAt || undefined,
        updatedAt: data?.updatedAt || undefined,
      };
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
    }
  }, { requiredRole: 'Admin' });

  const handler = withRateLimit(authedHandler);
  return handler(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authedHandler = await withAuth(async (_req: NextRequest) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      // Fetch the template first to check if it has storage file
      const templateDoc = await adminDb.collection('pdfTemplates').doc(id).get();

      if (!templateDoc.exists) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const templateData = templateDoc.data();

      // Delete from Firebase Storage if stored there
      if (templateData?.storageUrl && templateData.storageUrl.startsWith('gs://')) {
        try {
          const storage = getAdminStorage();
          const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
          if (bucketName) {
            const bucket = storage.bucket(bucketName);
            const relativePath = templateData.storageUrl.replace(`gs://${bucketName}/`, '');
            const file = bucket.file(relativePath);
            await file.delete();
          }
        } catch (error) {
          console.warn('Failed to delete storage file:', error);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from Firestore
      await adminDb.collection('pdfTemplates').doc(id).delete();

      // Also delete any template assignments that reference this template (path format)
      const assignmentsSnapshot = await adminDb
        .collection('templateAssignments')
        .where('templateId', '==', `pdfTemplates/${id}`)
        .get();

      const deletionPromises = assignmentsSnapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletionPromises);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
  }, { requiredRole: 'Admin' });

  const handler = withRateLimit(authedHandler);
  return handler(request);
}