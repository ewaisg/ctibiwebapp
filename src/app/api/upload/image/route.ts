import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * POST /api/upload/image
 * Upload an image to Firebase Storage
 */
export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const folder = (formData.get('folder') as string) || 'uploads';

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'File must be an image' },
          { status: 400 }
        );
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 5MB' },
          { status: 400 }
        );
      }

      const storage = getAdminStorage();
      if (!storage) {
        return NextResponse.json(
          { error: 'Storage not initialized' },
          { status: 500 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${folder}/${timestamp}-${sanitizedFilename}`;

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Firebase Storage
      const bucket = storage.bucket();
      const fileRef = bucket.file(filename);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
        },
      });

      // Make file publicly accessible
      await fileRef.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}
