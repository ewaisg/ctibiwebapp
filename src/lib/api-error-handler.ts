/**
 * API Error Handling Utilities
 */

import { NextResponse } from 'next/server';
import { sanitizeForLog } from './security-utils';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

/**
 * Handle API errors and return appropriate responses
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', sanitizeForLog(error));

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { 
        error: error.message,
        field: error.field,
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    );
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: 'AUTHENTICATION_ERROR'
      },
      { status: 401 }
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: 'AUTHORIZATION_ERROR'
      },
      { status: 403 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: 'NOT_FOUND_ERROR'
      },
      { status: 404 }
    );
  }

  // Handle known Firebase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as any;
    
    switch (firebaseError.code) {
      case 'permission-denied':
        return NextResponse.json(
          { error: 'Permission denied', code: 'PERMISSION_DENIED' },
          { status: 403 }
        );
      case 'not-found':
        return NextResponse.json(
          { error: 'Resource not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      case 'already-exists':
        return NextResponse.json(
          { error: 'Resource already exists', code: 'ALREADY_EXISTS' },
          { status: 409 }
        );
      case 'invalid-argument':
        return NextResponse.json(
          { error: 'Invalid request data', code: 'INVALID_ARGUMENT' },
          { status: 400 }
        );
      case 'unauthenticated':
        return NextResponse.json(
          { error: 'Authentication required', code: 'UNAUTHENTICATED' },
          { status: 401 }
        );
    }
  }

  // Generic server error
  return NextResponse.json(
    { 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  );
}

/**
 * Validate request body against schema
 */
export function validateRequestBody(body: any, requiredFields: string[]): void {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body is required');
  }

  for (const field of requiredFields) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      throw new ValidationError(`Field '${field}' is required`, field);
    }
  }
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}): void {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = true } = options;

  if (!file) {
    if (required) {
      throw new ValidationError('File is required');
    }
    return;
  }

  if (file.size > maxSize) {
    throw new ValidationError(`File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new ValidationError(`File type '${file.type}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(identifier, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute