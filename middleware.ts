import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger as rootLogger, createLogger } from '@/lib/logger';

const log = createLogger('middleware');

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in production, use secure session storage)
const csrfTokens = new Map<string, { token: string; expires: number }>();

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const path = request.nextUrl.pathname;
  const method = request.method;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Add security headers
  addSecurityHeaders(response);
  log.debug('security headers applied', { path });

  // Handle CSRF protection for state-changing requests
  if (isStateChangingRequest(request)) {
    const csrfResult = validateCSRFToken(request);
    if (!csrfResult.valid) {
      log.warn('csrf validation failed', { path, method, clientIP });
      return new NextResponse('CSRF token validation failed', { status: 403 });
    }
  }

  // Apply rate limiting for authentication routes
  if (isAuthRoute(request)) {
    const rateLimitResult = checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      log.warn('rate limit exceeded', { path, method, clientIP, retryAfter: rateLimitResult.retryAfter });
      return new NextResponse('Too many requests', {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter.toString()
        }
      });
    }
  }

  // Server-side route protection
  if (isProtectedRoute(request)) {
    const authResult = validateAuthentication(request);
    if (!authResult.valid) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      log.info('unauthenticated, redirect to login', { path, clientIP });
      return NextResponse.redirect(loginUrl);
    }
    log.debug('authenticated access granted', { path });
  }

  return response;
}

function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;"
  );

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

function isStateChangingRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;

  // Only apply CSRF protection to API routes (not page routes)
  // Page routes are protected by session cookies and Next.js built-in CSRF protection
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  // Exclude auth endpoints from CSRF check as they handle their own security
  if (pathname.startsWith('/api/auth/')) {
    return false;
  }

  // Exempt token-authenticated upload endpoint (protected by server auth + rate limiting).
  if (pathname === '/api/timesheet-upload') {
    return false;
  }

  // CSRF protection is only relevant for cookie-based auth (browser auto-attaches cookies).
  // If there's no session cookie, skip CSRF validation.
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    return false;
  }

  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
}

function validateCSRFToken(request: NextRequest): { valid: boolean } {
  const token = request.headers.get('X-CSRF-Token') || request.cookies.get('csrf-token')?.value;

  if (!token) return { valid: false };

  const sessionId = request.cookies.get('session-id')?.value;
  if (!sessionId) return { valid: false };

  const storedData = csrfTokens.get(sessionId);
  if (!storedData || storedData.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return { valid: false };
  }

  return { valid: storedData.token === token };
}

function isAuthRoute(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/api/auth');
}

function checkRateLimit(request: NextRequest): { allowed: boolean; retryAfter: number } {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const key = `auth_${clientIP}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 100; // Increased from 5 to 100 to prevent blocking during testing

  const current = rateLimitStore.get(key);

  if (!current || current.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= maxAttempts) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  current.count++;
  return { allowed: true, retryAfter: 0 };
}

function isProtectedRoute(request: NextRequest): boolean {
  const protectedPaths = ['/dashboard', '/projects', '/invoices', '/timesheets', '/invoicing', '/admin', '/api'];
  const pathname = request.nextUrl.pathname;

  // Exclude auth endpoints from protection as they handle their own authentication
  if (pathname.startsWith('/api/auth')) {
    return false;
  }

  return protectedPaths.some(path => pathname.startsWith(path));
}

function validateAuthentication(request: NextRequest): { valid: boolean } {
  // Check for Firebase Auth token in cookies or headers
  const authToken = request.cookies.get('__session')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!authToken) return { valid: false };

  // Placeholder: verify Firebase token server-side in a future iteration
  return { valid: authToken.length > 0 };
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};