/**
 * API endpoint to extract form fields from uploaded PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { withAuth } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/api-error-handler';
import type { PdfFieldInfo } from '@/types/pdf-field-mapper';

export async function POST(request: NextRequest) {
  const authed = await withAuth(async (_req) => {
    try {
      const formData = await request.formData();
      const file = formData.get('pdf') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No PDF file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.includes('pdf')) {
        return NextResponse.json(
          { error: 'File must be a PDF' },
          { status: 400 }
        );
      }

      // Read file as buffer
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Extract form fields
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      const pages = pdfDoc.getPages();

      const extractedFields: PdfFieldInfo[] = [];

    for (const field of fields) {
      const fieldName = field.getName();
      const fieldType = getFieldType(field);

      // Get field position (if available)
      let rect;
      let page = 0;

      try {
        const widgets = (field as any).acroField.getWidgets();
        if (widgets && widgets.length > 0) {
          const widget = widgets[0];
          const rectArray = widget.getRectangle();

          // Find which page this widget is on
          for (let i = 0; i < pages.length; i++) {
            const pageAnnots = pages[i].node.Annots();
            if (pageAnnots) {
              const annots = pageAnnots.asArray();
              for (const annot of annots) {
                if (annot === widget.dict) {
                  page = i;
                  break;
                }
              }
            }
          }

          rect = {
            x: rectArray.x,
            y: rectArray.y,
            width: rectArray.width,
            height: rectArray.height,
          };
        }
      } catch (e) {
        // Field position extraction failed, continue without it
        console.warn(`Could not extract position for field ${fieldName}`);
      }

      // Get field properties
      const fieldInfo: PdfFieldInfo = {
        name: fieldName,
        type: fieldType,
        page,
        rect,
      };

      // Extract additional properties based on field type
      try {
        if (fieldType === 'text') {
          const textField = form.getTextField(fieldName);
          fieldInfo.maxLength = (textField as any).acroField.getMaxLength() || undefined;
          fieldInfo.multiline = (textField as any).acroField.isMultiline() || false;
          fieldInfo.defaultValue = textField.getText() || undefined;
        } else if (fieldType === 'checkbox') {
          const checkBox = form.getCheckBox(fieldName);
          fieldInfo.defaultValue = checkBox.isChecked() ? 'true' : 'false';
        } else if (fieldType === 'dropdown') {
          const dropdown = form.getDropdown(fieldName);
          fieldInfo.options = dropdown.getOptions();
          fieldInfo.defaultValue = dropdown.getSelected()[0];
        } else if (fieldType === 'radio') {
          const radioGroup = form.getRadioGroup(fieldName);
          fieldInfo.options = radioGroup.getOptions();
          fieldInfo.defaultValue = radioGroup.getSelected();
        }

        // Check if required/readonly
        fieldInfo.required = (field as any).acroField.isRequired?.() || false;
        fieldInfo.readOnly = (field as any).acroField.isReadOnly?.() || false;
      } catch (e) {
        // Property extraction failed, continue without it
        console.warn(`Could not extract properties for field ${fieldName}`);
      }

      extractedFields.push(fieldInfo);
    }

    // Get PDF metadata
    const pageCount = pdfDoc.getPageCount();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

      return NextResponse.json({
        fields: extractedFields,
        metadata: {
          pageCount,
          pageSize: { width, height },
          totalFields: extractedFields.length,
        },
      });
    } catch (error) {
      console.error('Error extracting PDF fields:', error);
      return handleApiError(error);
    }
  }, { requiredRole: 'Admin' });

  return authed(request);
}

/**
 * Determine field type from pdf-lib field object
 */
function getFieldType(field: any): PdfFieldInfo['type'] {
  const fieldType = field.constructor.name;

  switch (fieldType) {
    case 'PDFTextField':
      return 'text';
    case 'PDFCheckBox':
      return 'checkbox';
    case 'PDFRadioGroup':
      return 'radio';
    case 'PDFDropdown':
      return 'dropdown';
    case 'PDFButton':
      return 'button';
    case 'PDFSignature':
      return 'signature';
    default:
      return 'text'; // Default fallback
  }
}
