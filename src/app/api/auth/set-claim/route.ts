import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin for server-side operations (tolerant to missing envs)
if (!getApps().length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const adminDb = getAdminFirestore();

async function handle(request: NextRequest) {
  try {
    // Safety: only allow in non-production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SET_CLAIM !== 'true') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : request.cookies.get('__session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    // Read role from Firestore users/{uid}
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    const role = (userDoc.data() as any)?.role;
    if (!role) {
      return NextResponse.json({ error: 'User role missing in profile' }, { status: 400 });
    }

    // Set custom claims
    await getAuth().setCustomUserClaims(uid, { role });
    // Force token refresh on next getIdToken(true)
    await getAuth().revokeRefreshTokens(uid);

    return NextResponse.json({ success: true, role, message: 'Custom claim set. Call getIdToken(true) or sign out/in to refresh.' });
  } catch (error: any) {
    console.error('Set-claim error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to set claim' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  // Convenience for dev: allow GET as well
  return handle(request);
}
