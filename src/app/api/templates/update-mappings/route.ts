import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { templateId, fieldMappings } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Update the template document with new field mappings
    await adminDb.collection('pdfTemplates').doc(templateId).update({
      fieldMappings: fieldMappings || [],
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to update field mappings' },
      { status: 500 }
    );
  }
}
