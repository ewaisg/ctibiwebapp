import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Load PDF and extract form fields
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Extract field names
    const fieldNames = fields.map(field => field.getName());

    return NextResponse.json({
      fields: fieldNames,
      count: fieldNames.length,
    });
  } catch (error) {
    console.error('Error detecting PDF fields:', error);
    return NextResponse.json(
      { error: 'Failed to detect fields', fields: [] },
      { status: 500 }
    );
  }
}
