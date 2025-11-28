/**
 * Security utilities for sanitizing inputs and preventing injection attacks
 */

/**
 * Sanitize log messages to prevent log injection attacks
 */
export function sanitizeLogMessage(message: unknown): string {
  if (message === null || message === undefined) {
    return 'null';
  }
  
  return String(message)
    .replace(/[\r\n\t]/g, ' ')  // Remove newlines and tabs
    .replace(/[^\x20-\x7E]/g, '?')  // Replace non-printable characters
    .substring(0, 1000);  // Limit length
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  return String(input)
    .replace(/[<>\"'&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match] || match;
    });
}

/**
 * Sanitize file paths to prevent path traversal
 */
export function sanitizeFilePath(filePath: string): string {
  const path = require('path');
  return path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Sanitize template values
 */
export function sanitizeTemplateValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/[<>"'&]/g, '');
}

/**
 * Sanitize PDF field names to make them database-safe
 * Converts spaces to underscores, removes special characters
 */
export function sanitizePdfFieldName(fieldName: string): string {
  return fieldName
    .trim()
    // Replace spaces and dots with underscores
    .replace(/[\s.]+/g, '_')
    // Remove any other special characters except alphanumeric, underscore, and hyphen
    .replace(/[^a-zA-Z0-9_-]/g, '')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure it starts with a letter or underscore
    .replace(/^[0-9]/, '_$&');
}

/**
 * Validate template field names (now more lenient to accept sanitized names)
 */
export function validateTemplateFieldName(fieldName: string): boolean {
  // Accept alphanumeric, underscore, hyphen, spaces, and dots
  // These will be sanitized before storage
  return /^[a-zA-Z0-9_\s.-]+$/.test(fieldName) && fieldName.trim().length > 0;
}

/**
 * Validate invoice ID format
 */
export function validateInvoiceId(invoiceId: string): string {
  if (!invoiceId || typeof invoiceId !== 'string') {
    throw new Error('Invalid invoice ID');
  }
  return invoiceId.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Validate contract number format
 */
export function validateContractNumber(contractNumber: string): void {
  if (!contractNumber || typeof contractNumber !== 'string') {
    throw new Error('Invalid contract number');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(contractNumber)) {
    throw new Error('Contract number contains invalid characters');
  }
}

/**
 * Sanitize for logging (alias for backward compatibility)
 */
export const sanitizeForLog = sanitizeLogMessage;

/**
 * Safe console logging that prevents injection
 */
export const safeLog = {
  error: (message: string, data?: unknown) => {
    console.error(sanitizeLogMessage(message), data ? sanitizeLogMessage(JSON.stringify(data)) : '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(sanitizeLogMessage(message), data ? sanitizeLogMessage(JSON.stringify(data)) : '');
  },
  info: (message: string, data?: unknown) => {
    console.info(sanitizeLogMessage(message), data ? sanitizeLogMessage(JSON.stringify(data)) : '');
  },
  log: (message: string, data?: unknown) => {
    console.log(sanitizeLogMessage(message), data ? sanitizeLogMessage(JSON.stringify(data)) : '');
  }
};

/**
 * Validate and sanitize Firestore document ID
 * Prevents NoSQL injection by ensuring ID only contains safe characters
 */
export function sanitizeDocumentId(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  // Firestore document IDs can contain alphanumeric, underscore, hyphen
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length > 0 && sanitized.length <= 1500 ? sanitized : null;
}

/**
 * Validate time range parameter
 * Prevents injection by whitelisting allowed values
 */
export function validateTimeRange(range: string | null | undefined): string | null {
  if (!range) return null;
  const allowedRanges = ['7d', '30d', '90d', 'all'];
  return allowedRanges.includes(range) ? range : null;
}

/**
 * Sanitize employee ID to prevent NoSQL injection
 */
export function sanitizeEmployeeId(employeeId: string | null | undefined): string | null {
  if (!employeeId || typeof employeeId !== 'string') return null;
  // Employee IDs should be alphanumeric with possible hyphens/underscores
  const sanitized = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
}