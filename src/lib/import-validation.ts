// Lightweight file validation helpers used by admin import dialogs and UI components

export type FileValidationConfig = {
  allowedTypes: string[]; // MIME types
  maxSize: number; // bytes
  allowedExtensions?: string[]; // like ['.csv', '.xlsx']
  namePattern?: RegExp; // optional filename regex
};

export type ImportValidationUIError = {
  type: 'validation' | 'processing' | 'system' | 'warning';
  title: string;
  description: string;
};

export type FileValidationResultInvalid = {
  isValid: false;
  error: string;
  warnings: string[];
  errors: ImportValidationUIError[];
};

export type FileValidationResultValid = {
  isValid: true;
  warnings: string[];
};

export type FileValidationResult = FileValidationResultValid | FileValidationResultInvalid;

// Compatibility type for UI components expecting ImportError from this module
export interface ImportError {
  id: string;
  type: 'validation' | 'processing' | 'system' | 'warning';
  title: string;
  description: string;
  details?: Array<{
    field?: string;
    row?: number;
    value?: string;
    message: string;
    suggestion?: string;
  }>;
  suggestions?: string[];
  actionable?: boolean;
  fixable?: boolean;
}

export const VALIDATION_CONFIGS: Record<string, FileValidationConfig> = {
  projects: {
    allowedTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.csv', '.xls', '.xlsx'],
  },
  services: {
    allowedTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxSize: 10 * 1024 * 1024,
    allowedExtensions: ['.csv', '.xls', '.xlsx'],
  },
  companies: {
    allowedTypes: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 10 * 1024 * 1024,
    allowedExtensions: ['.csv', '.xls', '.xlsx'],
  },
  clients: {
    allowedTypes: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 10 * 1024 * 1024,
    allowedExtensions: ['.csv', '.xls', '.xlsx'],
  },
  contracts: {
    allowedTypes: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 10 * 1024 * 1024,
    allowedExtensions: ['.csv', '.xls', '.xlsx'],
  },
  invoices: {
    allowedTypes: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 10 * 1024 * 1024,
    allowedExtensions: ['.csv', '.xls', '.xlsx'],
  },
  timesheets: {
    allowedTypes: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 15 * 1024 * 1024,
    allowedExtensions: ['.csv', '.xls', '.xlsx'],
  },
};

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size % 1 === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

export function validateFile(file: File, config: FileValidationConfig): FileValidationResult {
  const warnings: string[] = [];

  // Size check
  if (file.size > config.maxSize) {
    const max = formatFileSize(config.maxSize);
    return {
      isValid: false,
      error: `File is too large. Max ${max}.`,
      warnings: warnings,
      errors: [
        {
          type: 'validation',
          title: 'File Too Large',
          description: `The file size (${formatFileSize(file.size)}) exceeds the maximum allowed size (${max}).`
        }
      ]
    };
  }

  // Type/extension check
  const typeOk = config.allowedTypes.includes(file.type);
  const lastDot = file.name.lastIndexOf('.');
  const ext = lastDot >= 0 ? file.name.substring(lastDot).toLowerCase() : '';
  const extOk = (config.allowedExtensions || []).length === 0 || (config.allowedExtensions || []).includes(ext);

  if (!typeOk && !extOk) {
    const allowed = (config.allowedExtensions && config.allowedExtensions.length > 0)
      ? config.allowedExtensions.join(', ')
      : config.allowedTypes.join(', ');
    return {
      isValid: false,
      error: `Unsupported file type. Allowed: ${allowed}`,
      warnings: warnings,
      errors: [
        {
          type: 'validation',
          title: 'Invalid File Format',
          description: `The file "${file.name}" is not in a supported format. Allowed: ${allowed}.`
        }
      ]
    };
  }

  if (!typeOk && extOk) {
    warnings.push('File MIME type is unknown; validating by extension.');
  }

  if (config.namePattern && !config.namePattern.test(file.name)) {
    warnings.push('Filename does not match the recommended pattern.');
  }

  return { isValid: true, warnings };
}
