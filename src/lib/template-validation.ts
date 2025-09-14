/**
 * Template validation utilities
 */

import { ValidationError } from './api-error-handler';
import { validateTemplateFieldName, sanitizeTemplateValue } from './security-utils';
import type { PdfTemplate, TemplateFieldMapping, TemplateAssignment } from '@/types';

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate PDF template data
 */
export function validatePdfTemplate(template: Partial<PdfTemplate>): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!template.templateName || typeof template.templateName !== 'string') {
    errors.push('Template name is required');
  } else if (template.templateName.length > 100) {
    errors.push('Template name cannot exceed 100 characters');
  }

  if (!template.templateType || !['Invoice', 'CoverPage', 'Report', 'Custom'].includes(template.templateType)) {
    errors.push('Invalid template type. Must be: Invoice, CoverPage, Report, or Custom');
  }

  // Validate base64 data or storage URL
  if (!template.base64Data && !template.storageUrl) {
    errors.push('Either base64Data or storageUrl is required');
  }

  if (template.base64Data && template.storageUrl) {
    warnings.push('Both base64Data and storageUrl provided. storageUrl will take precedence');
  }

  // Validate base64 data format
  if (template.base64Data) {
    try {
      const buffer = Buffer.from(template.base64Data, 'base64');
      if (buffer.length === 0) {
        errors.push('Invalid base64 data');
      }
      
      // Check if it's a valid PDF (starts with %PDF)
      const pdfHeader = buffer.subarray(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        warnings.push('Base64 data does not appear to be a valid PDF file');
      }
    } catch (error) {
      errors.push('Invalid base64 encoding');
    }
  }

  // Validate field mappings
  if (template.fieldMappings) {
    if (!Array.isArray(template.fieldMappings)) {
      errors.push('Field mappings must be an array');
    } else {
      template.fieldMappings.forEach((mapping, index) => {
        const mappingErrors = validateFieldMapping(mapping);
        mappingErrors.forEach(error => {
          errors.push(`Field mapping ${index + 1}: ${error}`);
        });
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate field mapping
 */
export function validateFieldMapping(mapping: Partial<TemplateFieldMapping>): string[] {
  const errors: string[] = [];

  if (!mapping.fieldName || typeof mapping.fieldName !== 'string') {
    errors.push('Field name is required');
  } else if (!validateTemplateFieldName(mapping.fieldName)) {
    errors.push('Invalid field name format. Only alphanumeric, underscore, and hyphen allowed');
  }

  if (mapping.sourceCollection && typeof mapping.sourceCollection !== 'string') {
    errors.push('Source collection must be a string');
  }

  if (mapping.sourceField && typeof mapping.sourceField !== 'string') {
    errors.push('Source field must be a string');
  }

  if (mapping.fieldType && !['text', 'number', 'date', 'currency'].includes(mapping.fieldType)) {
    errors.push('Invalid field type. Must be: text, number, date, or currency');
  }

  return errors;
}

/**
 * Validate template assignment
 */
export function validateTemplateAssignment(assignment: Partial<TemplateAssignment>): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!assignment.assignmentType || !['Contract', 'Department', 'Project', 'Global'].includes(assignment.assignmentType)) {
    errors.push('Invalid assignment type. Must be: Contract, Department, Project, or Global');
  }

  if (assignment.assignmentType !== 'Global') {
    if (!assignment.assignmentId || typeof assignment.assignmentId !== 'string') {
      errors.push('Assignment ID is required for non-global assignments');
    }
  }

  if (!assignment.templateId || typeof assignment.templateId !== 'string') {
    errors.push('Template ID is required');
  }

  if (!assignment.templateType || !['Invoice', 'CoverPage', 'Report'].includes(assignment.templateType)) {
    errors.push('Invalid template type. Must be: Invoice, CoverPage, or Report');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize template data
 */
export function sanitizeTemplateData(template: any): Partial<PdfTemplate> {
  const templateType = sanitizeTemplateValue(template.templateType);
  const sanitized: Partial<PdfTemplate> = {
    templateName: sanitizeTemplateValue(template.templateName),
    templateType: ['Invoice', 'CoverPage', 'Report', 'Custom'].includes(templateType)
      ? (templateType as 'Invoice' | 'CoverPage' | 'Report' | 'Custom')
      : undefined,
    base64Data: template.base64Data, // Don't sanitize base64 data
    storageUrl: template.storageUrl, // Don't sanitize URLs
    fieldMappings: Array.isArray(template.fieldMappings)
      ? template.fieldMappings.map(sanitizeFieldMapping)
      : [],
    previewImageUrl: sanitizeTemplateValue(template.previewImageUrl),
    isActive: Boolean(template.isActive !== false), // Default to true
    createdBy: sanitizeTemplateValue(template.createdBy),
    createdByName: sanitizeTemplateValue(template.createdByName),
    manualOnly: Boolean(template.manualOnly),
  };
  return stripUndefinedDeep(sanitized);
}

/**
 * Sanitize field mapping
 */
export function sanitizeFieldMapping(mapping: any): TemplateFieldMapping {
  const allowedInputTypes = ['text','textarea','number','currency','date','select','checkbox','signature','image'];
  const inputType = sanitizeTemplateValue(mapping.inputType);
  const options = Array.isArray(mapping.options) ? mapping.options.map(sanitizeTemplateValue).filter(Boolean) : undefined;
  const optionsSource = mapping.optionsSource ? {
    type: mapping.optionsSource.type === 'collection' ? 'collection' as const : 'static' as const,
    staticOptions: Array.isArray(mapping.optionsSource.staticOptions) ? mapping.optionsSource.staticOptions.map(sanitizeTemplateValue).filter(Boolean) : undefined,
    collection: sanitizeTemplateValue(mapping.optionsSource.collection),
    labelField: sanitizeTemplateValue(mapping.optionsSource.labelField),
    valueField: sanitizeTemplateValue(mapping.optionsSource.valueField),
    filterField: sanitizeTemplateValue(mapping.optionsSource.filterField),
    filterValue: sanitizeTemplateValue(mapping.optionsSource.filterValue),
  } : undefined;
  const validation = mapping.validation ? {
    pattern: sanitizeTemplateValue(mapping.validation.pattern),
    min: typeof mapping.validation.min === 'number' ? mapping.validation.min : undefined,
    max: typeof mapping.validation.max === 'number' ? mapping.validation.max : undefined,
    required: typeof mapping.validation.required === 'boolean' ? mapping.validation.required : undefined,
  } : undefined;

  const sanitized: any = {
    fieldName: sanitizeTemplateValue(mapping.fieldName) || '',
    sourceCollection: sanitizeTemplateValue(mapping.sourceCollection) || '',
    sourceField: sanitizeTemplateValue(mapping.sourceField) || '',
    relationshipPath: sanitizeTemplateValue(mapping.relationshipPath),
    isRequired: Boolean(mapping.isRequired),
    defaultValue: sanitizeTemplateValue(mapping.defaultValue),
    fieldType: mapping.fieldType && ['text', 'number', 'date', 'currency'].includes(mapping.fieldType)
      ? mapping.fieldType
      : 'text',
    // Legacy
    dataPath: sanitizeTemplateValue(mapping.dataPath),
    // UI hints
    uiLabel: sanitizeTemplateValue(mapping.uiLabel),
    inputType: allowedInputTypes.includes(inputType) ? (inputType as any) : undefined,
    placeholder: sanitizeTemplateValue(mapping.placeholder),
    helpText: sanitizeTemplateValue(mapping.helpText),
    section: sanitizeTemplateValue(mapping.section),
    order: typeof mapping.order === 'number' ? mapping.order : undefined,
    options,
    optionsSource,
    validation,
  };

  return stripUndefinedDeep(sanitized) as TemplateFieldMapping;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(v => stripUndefinedDeep(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    // Avoid mutating input
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      const cleaned = stripUndefinedDeep(v as any);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Sanitize template assignment data
 */
export function sanitizeAssignmentData(assignment: any): Partial<TemplateAssignment> {
  const assignmentType = sanitizeTemplateValue(assignment.assignmentType);
  const templateType = sanitizeTemplateValue(assignment.templateType);
  return {
    assignmentType: ['Contract', 'Department', 'Project', 'Global'].includes(assignmentType)
      ? assignmentType as 'Contract' | 'Department' | 'Project' | 'Global'
      : undefined,
    assignmentId: sanitizeTemplateValue(assignment.assignmentId),
    assignmentName: sanitizeTemplateValue(assignment.assignmentName),
    templateId: sanitizeTemplateValue(assignment.templateId),
    templateName: sanitizeTemplateValue(assignment.templateName),
    templateType: ['Invoice', 'CoverPage', 'Report'].includes(templateType)
      ? templateType as 'Invoice' | 'CoverPage' | 'Report'
      : undefined,
    isActive: Boolean(assignment.isActive !== false), // Default to true
    createdBy: sanitizeTemplateValue(assignment.createdBy),
    createdByName: sanitizeTemplateValue(assignment.createdByName)
  };
}

/**
 * Validate template compatibility with data structure
 */
export function validateTemplateCompatibility(
  template: PdfTemplate, 
  sampleData: Record<string, any>
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.fieldMappings || template.fieldMappings.length === 0) {
    warnings.push('Template has no field mappings defined');
    return { isValid: true, errors, warnings };
  }

  template.fieldMappings.forEach((mapping) => {
    if (mapping.isRequired && !mapping.defaultValue) {
      const dataPath = mapping.dataPath || `${mapping.sourceCollection}.${mapping.sourceField}`;
      const value = getNestedValue(sampleData, dataPath);
      
      if (value === null || value === undefined || value === '') {
        warnings.push(`Required field '${mapping.fieldName}' may not have data available`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}