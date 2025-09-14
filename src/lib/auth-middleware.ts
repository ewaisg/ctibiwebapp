import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
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
      // Fallback to ADC or emulator; avoids throwing at build time
      initializeApp();
    }
  } catch (e) {
    console.error('Firebase Admin initialization skipped/fallback due to config:', e);
  }
}

const adminDb = getApps().length > 0 ? getAdminFirestore() : null;

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string;
    role?: string;
  };
}

export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: { requiredRole?: string } = {}
) {
  return async (req: NextRequest) => {
    try {
      // Optional dev bypass
      if (process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === 'true') {
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = { uid: 'dev', email: 'dev@example.com', role: 'Admin' };
        return handler(authenticatedReq);
      }

      // Extract token from Authorization header or cookie
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.cookies.get('__session')?.value;

      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify Firebase token
      const decodedToken = await getAuth().verifyIdToken(token);

      // Compute effective role: prefer custom claim, fallback to Firestore users.role
      let effectiveRole: string | undefined = (decodedToken as any).role;
      if (!effectiveRole && adminDb) {
        try {
          const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
          effectiveRole = (userDoc.data() as any)?.role;
        } catch (e) {
          console.warn('Failed to read user role from Firestore:', e);
        }
      }

      // Attach user info to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: effectiveRole,
      };

      // Check role if required
      if (options.requiredRole && effectiveRole !== options.requiredRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(authenticatedReq);
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
  };
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { maxRequests?: number; windowMs?: number } = {}
) {
  const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (req: NextRequest) => {
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();

    const clientData = requests.get(clientIP);

    if (!clientData || clientData.resetTime < now) {
      requests.set(clientIP, { count: 1, resetTime: now + windowMs });
      return handler(req);
    }

    if (clientData.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    clientData.count++;
    return handler(req);
  };
}