import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import {
  getVisualTemplate,
  deleteVisualTemplate,
  duplicateVisualTemplate,
} from '@/lib/visual-template-firestore';

/**
 * GET /api/visual-templates/[templateId]
 * Get a specific visual template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  const handler = await withAuth(async (req) => {
    try {
      const template = await getVisualTemplate(templateId);

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json(template);
    } catch (error) {
      console.error('Error fetching visual template:', error);
      return NextResponse.json(
        { error: 'Failed to fetch template' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}

/**
 * DELETE /api/visual-templates/[templateId]
 * Delete a visual template (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  const handler = await withAuth(async (req) => {
    try {
      await deleteVisualTemplate(templateId);

      return NextResponse.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting visual template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}

/**
 * POST /api/visual-templates/[templateId]/duplicate
 * Duplicate a visual template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  const handler = await withAuth(async (req) => {
    try {
      const userId = req.user?.uid || '';
      const { searchParams } = new URL(req.url);
      const action = searchParams.get('action');

      if (action === 'duplicate') {
        const newTemplateId = await duplicateVisualTemplate(templateId, userId);
        return NextResponse.json({
          success: true,
          templateId: newTemplateId,
          message: 'Template duplicated successfully',
        });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
      console.error('Error processing template action:', error);
      return NextResponse.json(
        { error: 'Failed to process action' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}
