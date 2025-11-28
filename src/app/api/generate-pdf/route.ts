import { NextRequest, NextResponse } from 'next/server';
import { generateClientSidePdf } from '@/lib/pdf-generator';
import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { validateInvoiceId } from '@/lib/security-utils';

export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const { invoiceId } = await req.json();

      // Validate invoice ID format
      if (!invoiceId || !validateInvoiceId(invoiceId)) {
        return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 });
      }

    // Fetch invoice data using admin SDK
    let invoiceData: any = null;
    
    if (adminDb) {
      try {
        const invoiceDoc = await adminDb.collection('invoices').doc(invoiceId).get();
        if (!invoiceDoc.exists) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }
        invoiceData = invoiceDoc.data();
      } catch (error) {
        console.error('Error fetching invoice with admin SDK:', error);
        return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
      }
    } else {
      // Fallback to client SDK
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const invoiceRef = doc(db, 'invoices', invoiceId);
        const invoiceSnap = await getDoc(invoiceRef);
        
        if (!invoiceSnap.exists()) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }
        
        invoiceData = invoiceSnap.data();
      } catch (error) {
        console.error('Error fetching invoice with client SDK:', error);
        return NextResponse.json({ error: 'Database not available' }, { status: 500 });
      }
    }

    // Build IDs for template resolution
    const projectId = extractId(invoiceData?.projectId) || '';
    const contractId = extractId(invoiceData?.contractId) || '';
    const departmentId = undefined;

    const result = await generateClientSidePdf(invoiceId, {
      category: 'Invoice',
      userContext: { system: 'api-generate-pdf' },
      projectId,
      contractId,
      departmentId,
    });
    
    if (result.success && result.pdfBuffer) {
      return new NextResponse(new Uint8Array(result.pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
        },
      });
    } else {
      return NextResponse.json({ error: result.error || 'PDF generation failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });

  // Add rate limiting: max 5 PDF generations per minute
  return withRateLimit(handler, { maxRequests: 5, windowMs: 60 * 1000 })(request);
}