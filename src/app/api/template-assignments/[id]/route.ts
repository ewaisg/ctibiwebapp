import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { Timestamp } from 'firebase-admin/firestore';
import { validateTemplateAssignment, sanitizeAssignmentData } from '@/lib/template-validation';
import { ValidationError } from '@/lib/api-error-handler';

export async function DELETE(
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

        const assignmentDoc = await adminDb.collection('templateAssignments').doc(id).get();
        if (!assignmentDoc.exists) {
          return NextResponse.json({ error: 'Template assignment not found' }, { status: 404 });
        }

        await adminDb.collection('templateAssignments').doc(id).delete();
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error deleting template assignment:', error);
        return NextResponse.json({ error: 'Failed to delete template assignment' }, { status: 500 });
      }
    }, { requiredRole: 'Admin' })
  );
  return handler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const handler = withRateLimit(
    await withAuth(async (req) => {
      try {
        if (!adminDb) {
          return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }

        const assignmentDoc = await adminDb.collection('templateAssignments').doc(id).get();
        if (!assignmentDoc.exists) {
          return NextResponse.json({ error: 'Template assignment not found' }, { status: 404 });
        }

        const updateData = await req.json();

        // Sanitize and validate update data to prevent injection
        const sanitizedData = sanitizeAssignmentData(updateData);
        const validation = validateTemplateAssignment(sanitizedData);

        if (!validation.isValid) {
          throw new ValidationError(`Assignment validation failed: ${validation.errors.join(', ')}`);
        }

        // Only allow updating specific safe fields
        const allowedFields = ['templateId', 'assignmentType', 'assignmentId', 'templateType', 'isActive'] as const;
        const safeUpdate: Record<string, any> = { updatedAt: Timestamp.now() };

        for (const field of allowedFields) {
          if (field in sanitizedData) {
            safeUpdate[field] = (sanitizedData as any)[field];
          }
        }

        await adminDb.collection('templateAssignments').doc(id).update(safeUpdate);

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error updating template assignment:', error);
        return NextResponse.json({ error: 'Failed to update template assignment' }, { status: 500 });
      }
    }, { requiredRole: 'Admin' })
  );
  return handler(request);
}
