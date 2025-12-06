import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getAdminStorage } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sanitizeForLog } from '@/lib/security-utils';
import { handleApiError, validateFileUpload, ValidationError } from '@/lib/api-error-handler';
import { validatePdfTemplate, sanitizeTemplateData } from '@/lib/template-validation';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req: NextRequest) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status'); // 'active' | 'inactive' | 'all'
      const limit = Number(searchParams.get('limit') || '25');
      const offset = Number(searchParams.get('offset') || '0');

      let query = adminDb.collection('pdfTemplates').orderBy('createdAt', 'desc') as FirebaseFirestore.Query;
      if (status === 'active') {
        query = query.where('isActive', '==', true);
      } else if (status === 'inactive') {
        query = query.where('isActive', '==', false);
      }

      // Basic pagination using offset/limit by fetching and slicing
      const snapshot = await query.get();
      const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const items = all.slice(offset, offset + limit);

      return NextResponse.json({ items, total: all.length, offset, limit });
    } catch (error) {
      console.error('Error fetching templates:', sanitizeForLog(error));
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
  }, { requiredRole: 'Admin' });

  const limited = withRateLimit(handler);
  return limited(request);
}

export async function POST(request: NextRequest) {
  const authed = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        throw new Error('Database not initialized');
      }

      // Validate content type
      const contentType = req.headers.get('content-type');
      if (!contentType || (!contentType.includes('multipart/form-data') && !contentType.includes('application/json'))) {
        throw new ValidationError('Invalid content type');
      }

      let pdfBuffer: Buffer;
      let templateMetadata: any;

      if (contentType?.includes('multipart/form-data')) {
        // Handle file upload
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const metadataRaw = formData.get('metadata');

        if (!file) {
          throw new ValidationError('No file provided');
        }

        // Validate file upload
        validateFileUpload(file, {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['application/pdf'],
          required: true,
        });

        pdfBuffer = Buffer.from(await file.arrayBuffer());

        // Support both consolidated metadata JSON or individual fields in form-data
        if (typeof metadataRaw === 'string' && metadataRaw.length > 0) {
          try {
            templateMetadata = JSON.parse(metadataRaw);
          } catch (parseError) {
            throw new ValidationError('Invalid metadata format');
          }
        } else {
          // Build metadata from discrete fields
          const fieldMappingsStr = formData.get('fieldMappings') as string | null;
          let fieldMappings: any[] = [];
          if (fieldMappingsStr) {
            try {
              fieldMappings = JSON.parse(fieldMappingsStr);
            } catch {
              throw new ValidationError('Invalid fieldMappings JSON');
            }
          }
          templateMetadata = {
            templateName: formData.get('templateName') as string,
            templateType: formData.get('templateType') as string,
            fieldMappings,
            isActive: (formData.get('isActive') as string) !== 'false',
            createdBy: formData.get('createdBy') as string,
            createdByName: (formData.get('createdByName') as string) || '',
            manualOnly: (formData.get('manualOnly') as string) === 'true',
          };
        }
      } else {
        // Handle base64 (legacy)
        const data = await req.json();
        const { base64Data, ...metadata } = data;

        if (!base64Data || typeof base64Data !== 'string') {
          throw new ValidationError('Invalid base64 data');
        }

        try {
          pdfBuffer = Buffer.from(base64Data, 'base64');
        } catch (decodeError) {
          throw new ValidationError('Invalid base64 encoding');
        }

        templateMetadata = metadata;
      }

      // Sanitize and validate template metadata
      const sanitizedMetadata = sanitizeTemplateData(templateMetadata);
      const validation = validatePdfTemplate({ ...sanitizedMetadata, base64Data: pdfBuffer.toString('base64') });

      if (!validation.isValid) {
        throw new ValidationError(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Template validation warnings:', sanitizeForLog(validation.warnings));
      }

      // Store PDF in Firebase Storage if it's large
      let storageUrl = '';
      let base64DataToStore = '';

      if (pdfBuffer.length > 900000) {
        const storage = getAdminStorage();
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        // Prevent path traversal by sanitizing filename
        const path = require('path');
        const safeName = path.basename(templateMetadata.templateName || 'template').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `pdf-templates/${Date.now()}-${safeName}.pdf`;
        const file = bucket.file(fileName);

        await file.save(pdfBuffer, {
          metadata: {
            contentType: 'application/pdf',
          },
        });

        storageUrl = `gs://${bucket.name}/${fileName}`;
      } else {
        // Store as base64 for smaller files
        base64DataToStore = pdfBuffer.toString('base64');
      }

      const templateData = {
        ...sanitizedMetadata,
        base64Data: base64DataToStore,
        storageUrl,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // Extended fields (optional, for Syncfusion Form Designer)
        syncfusionFormFields: sanitizedMetadata.syncfusionFormFields || [],
        tableMappings: sanitizedMetadata.tableMappings || [],
        dataSourceConfig: sanitizedMetadata.dataSourceConfig || null,
        pageCount: sanitizedMetadata.pageCount || 0,
        version: sanitizedMetadata.version || 1,
      };

      // If updating existing template
      if (sanitizedMetadata.id) {
        await adminDb.collection('pdfTemplates').doc(sanitizedMetadata.id).update({
          ...templateData,
          id: sanitizedMetadata.id,
          updatedAt: Timestamp.now(),
        });
        return NextResponse.json({ id: sanitizedMetadata.id, templateId: sanitizedMetadata.id, success: true });
      }

      // Create new template
      const docRef = await adminDb.collection('pdfTemplates').add(templateData);
      await adminDb.collection('pdfTemplates').doc(docRef.id).update({ id: docRef.id });
      return NextResponse.json({ id: docRef.id, templateId: docRef.id, success: true });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requiredRole: 'Admin' });

  const limited = withRateLimit(authed);
  return limited(request);
}