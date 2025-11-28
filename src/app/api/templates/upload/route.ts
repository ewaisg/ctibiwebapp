import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      templateName,
      templateType,
      description,
      version,
      base64Data,
      fileName,
      fileSize,
      detectedFields,
      fieldMappings,
    } = body;

    // Validate required fields
    if (!templateName || !templateType || !base64Data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create template document
    const templateData = {
      templateName,
      templateType,
      description: description || '',
      version: version || '1.0.0',
      base64Data,
      fileName: fileName || 'template.pdf',
      fileSize: fileSize || 0,
      detectedFields: detectedFields || [],
      fieldMappings: fieldMappings || [],
      isActive: true,
      createdAt: Timestamp.now(),
      createdBy: 'system', // TODO: Get from auth context
      createdByName: 'System', // TODO: Get from auth context
    };

    const docRef = await adminDb.collection('pdfTemplates').add(templateData);

    return NextResponse.json({
      id: docRef.id,
      ...templateData,
    });
  } catch (error) {
    console.error('Error uploading template:', error);
    return NextResponse.json(
      { error: 'Failed to upload template' },
      { status: 500 }
    );
  }
}
