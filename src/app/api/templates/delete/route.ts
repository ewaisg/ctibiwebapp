import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function DELETE(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Delete the template document
    await adminDb.collection('pdfTemplates').doc(templateId).delete();

    // Also delete any assignments using this template
    const assignmentsSnapshot = await adminDb
      .collection('templateAssignments')
      .where('templateId', '==', templateId)
      .get();

    const batch = adminDb.batch();
    assignmentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
