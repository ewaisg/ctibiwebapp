import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { withRateLimit } from '@/lib/auth-middleware';

// CSRF token generation endpoint
async function getHandler() {
  try {
    // Generate CSRF token
    const csrfToken = randomBytes(32).toString('hex');
    
    // Create response with CSRF token
    const response = NextResponse.json({ csrfToken });
    
    // Set CSRF token in httpOnly cookie
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Rate limit: 10 CSRF tokens per minute to prevent DoS
  return withRateLimit(getHandler, { maxRequests: 10, windowMs: 60 * 1000 })(request);
}