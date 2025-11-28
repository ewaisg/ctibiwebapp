/**
 * Application Constants
 *
 * Centralized constants for magic numbers, strings, and configuration values
 * used throughout the application.
 */

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMITS = {
  // File uploads (resource intensive)
  FILE_UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // PDF generation (resource intensive)
  PDF_GENERATION: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // Departmental compilation (very resource intensive)
  DEPARTMENTAL_COMPILATION: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // System deletion (critical operation)
  SYSTEM_DELETION: {
    maxRequests: 2,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // System export (resource intensive)
  SYSTEM_EXPORT: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // CSRF token generation
  CSRF_TOKEN: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Dashboard data (frequent requests)
  DASHBOARD: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // Default for most endpoints
  DEFAULT: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  // Progress checks (very frequent)
  PROGRESS_CHECK: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Date Range Limits
 */
export const DATE_RANGE_LIMITS = {
  MAX_RANGE_DAYS: 365, // 1 year
  MAX_RANGE_DAYS_COVER_PAGE: 730, // 2 years
  MAX_RANGE_DAYS_DEPARTMENT_PACKET: 730, // 2 years
} as const;

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * File Upload Limits
 */
export const FILE_UPLOAD = {
  MAX_SIZE_PDF: 10 * 1024 * 1024, // 10MB
  MAX_SIZE_EXCEL: 10 * 1024 * 1024, // 10MB
  MAX_SIZE_IMAGE: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Input Validation Limits
 */
export const VALIDATION_LIMITS = {
  MAX_STRING_LENGTH: 500,
  MAX_NOTES_LENGTH: 2000,
  MAX_TEXT_LENGTH: 10000,
} as const;

/**
 * Invoice Status Values
 */
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  RESUBMITTED: 'resubmitted',
  REJECTED: 'rejected',
  APPROVED: 'approved',
} as const;

/**
 * User Roles
 */
export const USER_ROLES = {
  ADMIN: 'Admin',
  PRIME: 'Prime',
  SUBCONSULTANT: 'Subconsultant',
} as const;

/**
 * Template Types
 */
export const TEMPLATE_TYPES = {
  STANDARD: 'Standard',
  MWBE: 'MWBE',
  CUSTOM: 'Custom',
  COVER_PAGE: 'CoverPage',
  INVOICE: 'Invoice',
} as const;

/**
 * Collection Names (Firestore)
 */
export const COLLECTIONS = {
  USERS: 'users',
  INVOICES: 'invoices',
  PROJECTS: 'projects',
  DEPARTMENTS: 'departments',
  CONTRACTS: 'contracts',
  EMPLOYEES: 'employees',
  CTI_TIMESHEETS: 'cti_timesheets',
  PDF_TEMPLATES: 'pdfTemplates',
  TEMPLATE_ASSIGNMENTS: 'templateAssignments',
  AUDIT_LOGS: 'audit_logs',
} as const;

/**
 * Cache Durations (in milliseconds)
 */
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  LONG: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Timeout Values (in milliseconds)
 */
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  PDF_GENERATION: 120000, // 2 minutes
  FILE_UPLOAD: 120000, // 2 minutes
} as const;

/**
 * Excel Date Epoch
 */
export const EXCEL_EPOCH = new Date(1899, 11, 30);

/**
 * Week Configuration
 */
export const WEEK_CONFIG = {
  STARTS_ON: 1, // Monday (0 = Sunday, 1 = Monday)
} as const;

/**
 * Default Values
 */
export const DEFAULTS = {
  INVOICE_DUE_DAYS: 30, // Default invoice due in 30 days
  PAGE_SIZE: 50,
  DEBOUNCE_MS: 300,
} as const;
