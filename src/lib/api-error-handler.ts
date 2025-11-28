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

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  field?: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
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
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: error.message,
        field: error.field,
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    );
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: error.message,
        code: 'AUTHENTICATION_ERROR'
      },
      { status: 401 }
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: error.message,
        code: 'AUTHORIZATION_ERROR'
      },
      { status: 403 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
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
        return NextResponse.json<ApiErrorResponse>(
          { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' },
          { status: 403 }
        );
      case 'not-found':
        return NextResponse.json<ApiErrorResponse>(
          { success: false, error: 'Resource not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      case 'already-exists':
        return NextResponse.json<ApiErrorResponse>(
          { success: false, error: 'Resource already exists', code: 'ALREADY_EXISTS' },
          { status: 409 }
        );
      case 'invalid-argument':
        return NextResponse.json<ApiErrorResponse>(
          { success: false, error: 'Invalid request data', code: 'INVALID_ARGUMENT' },
          { status: 400 }
        );
      case 'unauthenticated':
        return NextResponse.json<ApiErrorResponse>(
          { success: false, error: 'Authentication required', code: 'UNAUTHENTICATED' },
          { status: 401 }
        );
    }
  }

  // Generic server error
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data
    },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  code: string,
  status: number = 500,
  field?: string
): NextResponse {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error,
      code,
      ...(field && { field })
    },
    { status }
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
 * Note: Rate limiting is handled by withRateLimit middleware in auth-middleware.ts
 * This provides consistent rate limiting across all API routes with proper configuration.
 */