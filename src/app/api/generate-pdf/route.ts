import { NextRequest, NextResponse } from 'next/server';
import { generateClientSidePdf } from '@/lib/pdf-generator';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { extractId } from '@/lib/document-reference-utils';

// Initialize Firebase Admin for server-side operations
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const adminDb = getApps().length > 0 ? getAdminFirestore() : null;

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
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
}