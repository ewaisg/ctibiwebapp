/**
 * PDF Template Utility
 *
 * This module provides direct access to PDF templates without relying on
 * filesystem access, which may be unavailable in serverless environments.
 */

import { PDFDocument } from 'pdf-lib';
import { getInvoiceTemplateBase64 } from './pdf-template-base64';

/**
 * Gets the invoice PDF template as a Buffer, trying multiple methods
 * to ensure it works in both development and production environments.
 */
export async function getInvoicePdfTemplate(contractNumber: string): Promise<Buffer> {
  // Select the correct base64 template based on contract number
  const base64 = getInvoiceTemplateBase64(contractNumber);
  return Buffer.from(base64, 'base64');
}

/**
 * Creates an empty PDF document that can be used as a fallback
 * if no template is available.
 */
export async function createEmptyPdf(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter size

  page.drawText('Generated Invoice (Template Not Available)', {
    x: 50,
    y: 750,
    size: 24,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}