import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getAdminStorage } from '@/lib/firebase-admin';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const handler = withRateLimit(
    await withAuth(async (_req) => {
      try {
        if (!adminDb) {
          return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }

        // Fetch the template
        const templateDoc = await adminDb.collection('pdfTemplates').doc(id).get();
        
        if (!templateDoc.exists) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const templateData = templateDoc.data();
        
        if (!templateData) {
          return NextResponse.json({ error: 'Template data not found' }, { status: 404 });
        }

        let pdfBuffer: Buffer;

        // Check if template is stored in Firebase Storage or as base64
        if (templateData.storageUrl && templateData.storageUrl.startsWith('gs://')) {
          try {
            // Get from Firebase Storage
            const storage = getAdminStorage();
            const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
            if (!bucketName) {
              throw new Error('Storage bucket not configured');
            }

            const bucket = storage.bucket(bucketName);
            // Use the full relative path for the GCS object
            const relativePath = templateData.storageUrl.replace(`gs://${bucketName}/`, '');
            const file = bucket.file(relativePath);
            
            const [fileBuffer] = await file.download();
            pdfBuffer = fileBuffer;
          } catch (error) {
            console.error('Error downloading from storage:', error);
            return NextResponse.json({ error: 'Failed to retrieve template from storage' }, { status: 500 });
          }
        } else if (templateData.base64Data) {
          // Get from base64 data
          try {
            pdfBuffer = Buffer.from(templateData.base64Data, 'base64');
          } catch (error) {
            console.error('Error decoding base64:', error);
            return NextResponse.json({ error: 'Failed to decode template data' }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: 'Template file data not available' }, { status: 404 });
        }

        // Return the PDF for preview as NextResponse
        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${(templateData.templateName || 'template').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (error) {
        console.error('Error previewing template:', error);
        return NextResponse.json({ error: 'Failed to preview template' }, { status: 500 });
      }
    }, { requiredRole: 'Admin' })
  );

  return handler(request);
}
