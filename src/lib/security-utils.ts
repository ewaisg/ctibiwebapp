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
 * Validate template field names
 */
export function validateTemplateFieldName(fieldName: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(fieldName);
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