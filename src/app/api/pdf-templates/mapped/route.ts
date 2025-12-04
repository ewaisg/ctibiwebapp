/**
 * API endpoint for managing mapped PDF templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error-handler';
import type { MappedPdfTemplate } from '@/types/pdf-field-mapper';

const COLLECTION_NAME = 'mappedPdfTemplates';

// GET - List all mapped templates
export async function GET(request: NextRequest) {
  const authed = await withAuth(async (_req) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .get();

      // Filter active templates and sort in memory (avoid needing Firestore index)
      const templates = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }) as MappedPdfTemplate)
        .filter((t) => t.isActive)
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || 0).getTime();
          const bTime = new Date(b.updatedAt || 0).getTime();
          return bTime - aTime;
        });

      return NextResponse.json({ templates });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requiredRole: 'Admin' });

  return authed(request);
}

// POST - Create new mapped template
export async function POST(request: NextRequest) {
  const authed = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const template: MappedPdfTemplate = await request.json();

      // Add metadata
      template.createdBy = req.user?.uid || 'unknown';
      template.createdAt = new Date().toISOString();
      template.updatedAt = new Date().toISOString();
      template.isActive = true;

      // Validate template
      if (!template.templateName) {
        return NextResponse.json(
          { error: 'Template name is required' },
          { status: 400 }
        );
      }

      if (!template.base64Data && !template.storageUrl) {
        return NextResponse.json(
          { error: 'PDF data is required' },
          { status: 400 }
        );
      }

      // Save to Firestore
      const docRef = await adminDb.collection(COLLECTION_NAME).add(template);

      // Update with ID
      await docRef.update({ id: docRef.id });

      return NextResponse.json({
        id: docRef.id,
        ...template,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requiredRole: 'Admin' });

  return authed(request);
}

// PUT - Update existing mapped template
export async function PUT(request: NextRequest) {
  const authed = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const template: MappedPdfTemplate = await request.json();

      if (!template.id) {
        return NextResponse.json(
          { error: 'Template ID is required' },
          { status: 400 }
        );
      }

      // Update metadata
      template.updatedAt = new Date().toISOString();

      // Update in Firestore (exclude id from update data)
      const { id, ...updateData } = template;
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.update(updateData);

      return NextResponse.json(template);
    } catch (error) {
      return handleApiError(error);
    }
  }, { requiredRole: 'Admin' });

  return authed(request);
}

// DELETE - Delete mapped template
export async function DELETE(request: NextRequest) {
  const authed = await withAuth(async (_req) => {
    try {
      if (!adminDb) {
        return NextResponse.json(
          { error: 'Database not initialized' },
          { status: 500 }
        );
      }

      const { searchParams } = new URL(request.url);
      const templateId = searchParams.get('id');

      if (!templateId) {
        return NextResponse.json(
          { error: 'Template ID is required' },
          { status: 400 }
        );
      }

      // Soft delete by marking as inactive
      await adminDb.collection(COLLECTION_NAME).doc(templateId).update({
        isActive: false,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requiredRole: 'Admin' });

  return authed(request);
}
