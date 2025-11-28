import { adminDb } from '@/lib/firebase-admin';
import { extractId } from '@/lib/document-reference-utils';
import { sanitizeForLog, validateTemplateFieldName, sanitizeTemplateValue } from '@/lib/security-utils';
import type { PdfTemplate, TemplateAssignment } from '@/types';

export type TemplateCategory = 'Invoice' | 'CoverPage' | 'Report' | 'Custom';

export async function resolveTemplate(
  category: TemplateCategory,
  projectId?: string,
  contractId?: string,
  departmentId?: string
): Promise<PdfTemplate | null> {
  const db = adminDb;
  if (!db) {
    console.error('Firebase Admin SDK not initialized');
    return null;
  }

  try {
    const queries: FirebaseFirestore.Query[] = [];

    // Helper to push both string-id and reference-id queries for a scope
    const pushScopedQueries = (
      scope: 'Project' | 'Department' | 'Contract',
      id?: string
    ) => {
      if (!id) return;
      const collection = scope === 'Project' ? 'projects' : scope === 'Department' ? 'departments' : 'contracts';
      const base = db
        .collection('templateAssignments')
        .where('assignmentType', '==', scope)
        .where('templateType', '==', category)
        .where('isActive', '==', true)
        .limit(1);
      // Match string ID
      queries.push(base.where('assignmentId', '==', id));
      // Match DocumentReference ID
      queries.push(base.where('assignmentId', '==', db.doc(`${collection}/${id}`)));
    };

    // Fallback chain priority: Project > Department > Contract > Global
    pushScopedQueries('Project', projectId);
    pushScopedQueries('Department', departmentId);
    pushScopedQueries('Contract', contractId);

    // Global default (only one form)
    queries.push(
      db
        .collection('templateAssignments')
        .where('assignmentType', '==', 'Global')
        .where('templateType', '==', category)
        .where('isActive', '==', true)
        .limit(1)
    );

    for (const query of queries) {
      const snapshot = await query.get();
      if (!snapshot.empty) {
        const assignment = snapshot.docs[0].data() as TemplateAssignment;
        // Extract template id from FlexibleReference or path-like string
        let templateId: string | undefined;
        if (typeof (assignment as any).templateId === 'string') {
          const raw = (assignment as any).templateId as string;
          templateId = raw.includes('/') ? raw.split('/').pop() : raw;
        } else {
          templateId = extractId((assignment as any).templateId);
        }
        if (templateId) {
          const templateDoc = await db.collection('pdfTemplates').doc(templateId).get();
          if (templateDoc.exists) {
            return { id: templateDoc.id, ...templateDoc.data() } as PdfTemplate;
          }
        }
      }
    }

    console.warn('No template found for provided scope/category');
    return null;
  } catch (error) {
    console.error('Error resolving template:', sanitizeForLog(error));
    return null;
  }
}

// Backward-compatible wrapper for existing callers
export async function resolveInvoiceTemplate(
  projectId: string,
  contractId: string,
  departmentId?: string
): Promise<PdfTemplate | null> {
  return resolveTemplate('Invoice', projectId, contractId, departmentId);
}

export function mapTemplateData(
  template: PdfTemplate,
  invoiceData: any,
  projectData: any,
  contractData: any,
  userContext?: any,
  manualData?: Record<string, any>
): Record<string, string> {
  const mappedData: Record<string, string> = {};
  
  template.fieldMappings.forEach(mapping => {
    let value = '';
    
    try {
      // Validate field name to prevent injection
      if (!validateTemplateFieldName(mapping.fieldName)) {
        console.warn('Invalid template field name, skipping');
        return;
      }

      // Determine source/field from either legacy dataPath or new sourceCollection/sourceField
      let source = '' as string;
      let field = '' as string;
      if ((mapping as any).dataPath && typeof (mapping as any).dataPath === 'string') {
        const parts = (mapping as any).dataPath.split('.');
        source = parts[0] || '';
        field = parts[1] || '';
      } else {
        source = (mapping as any).sourceCollection || '';
        field = (mapping as any).sourceField || '';
      }

      if (!source) {
        value = sanitizeTemplateValue((mapping as any).defaultValue) || '';
        mappedData[mapping.fieldName] = value;
        return;
      }
      
      switch (source) {
        case 'invoice': {
          value = getFieldValue(invoiceData, field);
          // Aliases for common fields in cover page contexts
          if (!value && field === 'fromDate') value = getFieldValue(invoiceData, 'billingFrom');
          if (!value && field === 'toDate') value = getFieldValue(invoiceData, 'billingTo');
          if (!value && field === 'periodLabel') value = getFieldValue(invoiceData, 'periodLabel');
          break;
        }
        case 'project': {
          value = getFieldValue(projectData, field);
          break;
        }
        case 'contract': {
          value = getFieldValue(contractData, field);
          break;
        }
        case 'department': {
          // For cover pages we pass department info via invoiceData
          value = getFieldValue(invoiceData, field);
          break;
        }
        case 'generated': {
          value = getGeneratedValue(field, userContext);
          break;
        }
        case 'manual': {
          value = getFieldValue(manualData, field);
          break;
        }
        default: {
          value = '';
        }
      }
      
      // Apply formatting based on field type
      if ((mapping as any).fieldType === 'currency' && value) {
        const num = parseFloat(value);
        value = isNaN(num) ? '0.00' : num.toFixed(2);
      } else if ((mapping as any).fieldType === 'date' && value) {
        value = formatDate(value);
      }
      
      // Required check
      if ((mapping as any).isRequired && !value) {
        console.warn(`Required mapping '${mapping.fieldName}' resolved empty`);
      }
    } catch (error) {
      console.warn('Error mapping template field:', sanitizeForLog(error));
      value = sanitizeTemplateValue((mapping as any).defaultValue) || '';
    }
    
    mappedData[mapping.fieldName] = sanitizeTemplateValue(value) || sanitizeTemplateValue((mapping as any).defaultValue) || '';
  });
  
  return mappedData;
}

function getFieldValue(data: any, field: string): string {
  if (!data || !field) return '';
  const value = data[field];
  if (value === null || value === undefined) return '';
  return String(value);
}

function getGeneratedValue(field: string, userContext?: any): string {
  switch (field) {
    case 'currentDate':
      return new Date().toLocaleDateString();
    case 'currentTime':
      return new Date().toLocaleTimeString();
    case 'currentUser':
      return userContext?.displayName || userContext?.name || '';
    case 'currentUserEmail':
      return userContext?.email || '';
    case 'staticText':
      return '';
    default:
      return '';
  }
}

function formatDate(dateValue: any): string {
  if (!dateValue) return '';
  let date: Date;
  if (dateValue && typeof dateValue === 'object' && (dateValue as any).seconds) {
    date = new Date((dateValue as any).seconds * 1000);
    } else {
    date = new Date(dateValue);
  }
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}