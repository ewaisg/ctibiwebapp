import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in production, use secure session storage)
const csrfTokens = new Map<string, { token: string; expires: number }>();

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers
  addSecurityHeaders(response);
  
  // Handle CSRF protection for state-changing requests
  if (isStateChangingRequest(request)) {
    const csrfResult = validateCSRFToken(request);
    if (!csrfResult.valid) {
      return new NextResponse('CSRF token validation failed', { status: 403 });
    }
  }
  
  // Apply rate limiting for authentication routes
  if (isAuthRoute(request)) {
    const rateLimitResult = checkRateLimit(request);
    if (!rateLimitResult.allowed) {
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
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com;"
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
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
}

function validateCSRFToken(request: NextRequest): { valid: boolean } {
  const token = request.headers.get('X-CSRF-Token') || 
                request.cookies.get('csrf-token')?.value;
  
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
  return request.nextUrl.pathname.startsWith('/login') ||
         request.nextUrl.pathname.startsWith('/api/auth');
}

function checkRateLimit(request: NextRequest): { allowed: boolean; retryAfter: number } {
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 'unknown';
  const key = `auth_${clientIP}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
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
  const protectedPaths = [
    '/dashboard',
    '/projects',
    '/invoices',
    '/timesheets',
    '/invoicing',
    '/subconsultant-dashboard',
    '/admin',
    '/api'
  ];
  
  return protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
}

function validateAuthentication(request: NextRequest): { valid: boolean } {
  // Check for Firebase Auth token in cookies or headers
  const authToken = request.cookies.get('__session')?.value ||
                   request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!authToken) return { valid: false };
  
  // In a real implementation, verify the Firebase token server-side
  // For now, just check if token exists (placeholder)
  return { valid: authToken.length > 0 };
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};