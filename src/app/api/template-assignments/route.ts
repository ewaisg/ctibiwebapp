import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sanitizeForLog } from '@/lib/security-utils';
import { handleApiError, validateRequestBody, ValidationError } from '@/lib/api-error-handler';
import { validateTemplateAssignment, sanitizeAssignmentData } from '@/lib/template-validation';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const authed = await withAuth(async (_req) => {
    try {
      if (!adminDb) {
        throw new Error('Database not initialized');
      }

      const snapshot = await adminDb
        .collection('templateAssignments')
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      const assignments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json(assignments);
    } catch (error) {
      return handleApiError(error);
    }
  });

  const limited = withRateLimit(authed);
  return limited(request);
}

export async function POST(request: NextRequest) {
  const authed = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        throw new Error('Database not initialized');
      }

      const body = await req.json();
      validateRequestBody(body, ['assignmentType', 'templateId', 'templateType']);

      // Sanitize and validate assignment data
      const sanitizedData = sanitizeAssignmentData(body);
      const validation = validateTemplateAssignment(sanitizedData);

      if (!validation.isValid) {
        throw new ValidationError(`Assignment validation failed: ${validation.errors.join(', ')}`);
      }

      // Verify template exists (templateId provided from client is raw id)
      const templateIdRaw = sanitizedData.templateId as string;
      const templateSource = (sanitizedData as any).templateSource || 'pdf';
      const collectionName = templateSource === 'visual' ? 'visual_templates' : 'pdfTemplates';

      const templateDoc = await adminDb.collection(collectionName).doc(templateIdRaw).get();
      if (!templateDoc.exists) {
        throw new ValidationError('Referenced template does not exist');
      }

      // Deactivate existing active assignments for same (type, target, templateType)
      const existingQuery = adminDb
        .collection('templateAssignments')
        .where('assignmentType', '==', sanitizedData.assignmentType)
        .where('assignmentId', '==', sanitizedData.assignmentType === 'Global' ? 'global' : sanitizedData.assignmentId)
        .where('templateType', '==', sanitizedData.templateType)
        .where('isActive', '==', true);

      const existingSnapshot = await existingQuery.get();
      const batch = adminDb.batch();
      existingSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isActive: false, updatedAt: Timestamp.now() });
      });

      // Build new assignment with standardized templateId path format
      const assignmentData = {
        ...sanitizedData,
        assignmentId: sanitizedData.assignmentType === 'Global' ? 'global' : sanitizedData.assignmentId,
        templateId: `${collectionName}/${templateIdRaw}`,
        templateSource,
        createdAt: Timestamp.now(),
        isActive: true,
      };

      const newDocRef = adminDb.collection('templateAssignments').doc();
      batch.set(newDocRef, assignmentData);
      await batch.commit();

      return NextResponse.json({ id: newDocRef.id, success: true });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requiredRole: 'Admin' });

  const limited = withRateLimit(authed);
  return limited(request);
}