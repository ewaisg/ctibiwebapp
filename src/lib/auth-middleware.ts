import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { logAccessDenied, logSecurityEvent, AuditEventType, AuditSeverity } from '@/lib/audit-logger';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string;
    role?: string;
    companyId?: string;
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
        authenticatedReq.user = { uid: 'dev', email: 'dev@example.com', role: 'Admin', companyId: undefined };
        return handler(authenticatedReq);
      }

      // Extract token from Authorization header or cookie
      const authHeader = req.headers.get('Authorization');
      const sessionCookie = req.cookies.get('__session')?.value;

      let decodedToken;

      if (authHeader?.startsWith('Bearer ')) {
        // Verify ID token from Authorization header
        const idToken = authHeader.substring(7);
        decodedToken = await getAuth().verifyIdToken(idToken);
      } else if (sessionCookie) {
        // Verify session cookie
        decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Compute effective role and companyId: prefer custom claim, fallback to Firestore users
      let effectiveRole: string | undefined = (decodedToken as any).role;
      let effectiveCompanyId: string | undefined = (decodedToken as any).companyId;

      if ((!effectiveRole || !effectiveCompanyId) && adminDb) {
        try {
          const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
          const userData = userDoc.data();
          if (!effectiveRole) effectiveRole = userData?.role;
          if (!effectiveCompanyId) effectiveCompanyId = userData?.companyId;
        } catch (e) {
          console.warn('Failed to read user data from Firestore:', e);
        }
      }

      // Attach user info to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: effectiveRole,
        companyId: effectiveCompanyId,
      };

      // Check role if required
      if (options.requiredRole && effectiveRole !== options.requiredRole) {
        // Log access denied for audit
        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        await logAccessDenied(
          decodedToken.uid,
          effectiveRole,
          options.requiredRole,
          req.nextUrl.pathname,
          ipAddress
        );

        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(authenticatedReq);
    } catch (error) {
      console.error('Authentication error:', error);

      // Log authentication failure for audit
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      await logSecurityEvent(
        AuditEventType.LOGIN_FAILURE,
        AuditSeverity.WARNING,
        undefined,
        ipAddress,
        req.nextUrl.pathname,
        { error: String(error) }
      );

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
      // Log rate limit exceeded for audit
      await logSecurityEvent(
        AuditEventType.RATE_LIMIT_EXCEEDED,
        AuditSeverity.WARNING,
        undefined,
        clientIP,
        req.nextUrl.pathname,
        {
          maxRequests,
          windowMs,
          requestCount: clientData.count,
        }
      );

      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    clientData.count++;
    return handler(req);
  };
}