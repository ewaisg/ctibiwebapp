import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sanitizeForLog } from '@/lib/security-utils';

/**
 * Audit event types for security monitoring
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',

  // Authorization events
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_ESCALATION = 'PERMISSION_ESCALATION',

  // Data access events
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',

  // Data modification events
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  BULK_DELETE = 'BULK_DELETE',

  // System events
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  INJECTION_ATTEMPT = 'INJECTION_ATTEMPT',
  INVALID_INPUT = 'INVALID_INPUT',
}

/**
 * Severity levels for audit events
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  timestamp: Timestamp;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  status: 'SUCCESS' | 'FAILURE';
  details?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Log an audit event to Firestore
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  try {
    if (!adminDb) {
      console.error('Audit logging failed: Database not initialized');
      return;
    }

    const auditEntry: AuditLogEntry = {
      timestamp: Timestamp.now(),
      ...entry,
      // Sanitize all string values to prevent log injection
      details: entry.details ? sanitizeObjectForLog(entry.details) : undefined,
      errorMessage: entry.errorMessage ? sanitizeForLog(entry.errorMessage) : undefined,
    };

    // Write to audit_logs collection
    await adminDb.collection('audit_logs').add(auditEntry);

    // For critical events, also log to console immediately
    if (entry.severity === AuditSeverity.CRITICAL || entry.severity === AuditSeverity.ERROR) {
      console.error('[AUDIT]', JSON.stringify(auditEntry, null, 2));
    }
  } catch (error) {
    // Don't throw errors from audit logging to avoid disrupting the main application
    console.error('Failed to write audit log:', sanitizeForLog(error));
  }
}

/**
 * Sanitize an object recursively for safe logging
 */
function sanitizeObjectForLog(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeForLog(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObjectForLog(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' ? sanitizeObjectForLog(item) : sanitizeForLog(String(item))
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Helper to log authentication events
 */
export async function logAuthEvent(
  eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILURE | AuditEventType.LOGOUT,
  userId: string | undefined,
  userEmail: string | undefined,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType,
    severity: eventType === AuditEventType.LOGIN_FAILURE ? AuditSeverity.WARNING : AuditSeverity.INFO,
    userId,
    userEmail,
    ipAddress,
    userAgent,
    status: eventType === AuditEventType.LOGIN_FAILURE ? 'FAILURE' : 'SUCCESS',
    details,
  });
}

/**
 * Helper to log data modification events
 */
export async function logDataModification(
  eventType: AuditEventType.DATA_CREATE | AuditEventType.DATA_UPDATE | AuditEventType.DATA_DELETE,
  userId: string,
  userEmail: string | undefined,
  userRole: string | undefined,
  resource: string,
  resourceId: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType,
    severity: eventType === AuditEventType.DATA_DELETE ? AuditSeverity.WARNING : AuditSeverity.INFO,
    userId,
    userEmail,
    userRole,
    resource,
    action: eventType.replace('DATA_', ''),
    status: 'SUCCESS',
    details: {
      resourceId,
      ...details,
    },
  });
}

/**
 * Helper to log security events
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  severity: AuditSeverity,
  userId: string | undefined,
  ipAddress: string | undefined,
  resource: string | undefined,
  details: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    eventType,
    severity,
    userId,
    ipAddress,
    resource,
    status: 'FAILURE',
    details,
  });
}

/**
 * Helper to log access denied events
 */
export async function logAccessDenied(
  userId: string | undefined,
  userRole: string | undefined,
  requiredRole: string,
  resource: string,
  ipAddress: string | undefined
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.ACCESS_DENIED,
    severity: AuditSeverity.WARNING,
    userId,
    userRole,
    ipAddress,
    resource,
    status: 'FAILURE',
    details: {
      requiredRole,
      actualRole: userRole || 'none',
    },
  });
}
