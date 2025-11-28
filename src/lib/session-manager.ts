import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface SessionData {
  uid: string;
  email: string;
  role: string;
  isActive: boolean;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

// In production, use Redis or database for session storage
const activeSessions = new Map<string, SessionData>();

export class SessionManager {
  static async createSession(userData: {
    uid: string;
    email: string;
    role: string;
    isActive: boolean;
  }): Promise<{ sessionToken: string; sessionId: string }> {
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    const sessionData: SessionData = {
      ...userData,
      sessionId,
      createdAt: now,
      expiresAt,
    };

    // Store session
    activeSessions.set(sessionId, sessionData);

    // Create JWT token
    const sessionToken = await new SignJWT({ sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return { sessionToken, sessionId };
  }

  static async validateSession(sessionToken: string): Promise<SessionData | null> {
    try {
      // Verify JWT
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
      const sessionId = payload.sessionId as string;

      // Get session data
      const sessionData = activeSessions.get(sessionId);
      if (!sessionData) return null;

      // Check expiration
      if (sessionData.expiresAt < Date.now()) {
        activeSessions.delete(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  static async refreshSession(sessionId: string): Promise<string | null> {
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData) return null;

    // Extend expiration
    sessionData.expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    activeSessions.set(sessionId, sessionData);

    // Create new JWT
    const sessionToken = await new SignJWT({ sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return sessionToken;
  }

  static async destroySession(sessionId: string): Promise<void> {
    activeSessions.delete(sessionId);
  }

  static async destroyAllUserSessions(uid: string): Promise<void> {
    for (const [sessionId, sessionData] of activeSessions.entries()) {
      if (sessionData.uid === uid) {
        activeSessions.delete(sessionId);
      }
    }
  }

  static getActiveSessionCount(uid: string): number {
    let count = 0;
    for (const sessionData of activeSessions.values()) {
      if (sessionData.uid === uid) count++;
    }
    return count;
  }

  static setSessionCookie(response: NextResponse, sessionToken: string): void {
    response.cookies.set('__session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });
  }

  static clearSessionCookie(response: NextResponse): void {
    response.cookies.delete('__session');
  }
}