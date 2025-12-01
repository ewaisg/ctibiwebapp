import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import {
  saveVisualTemplate,
  getAllVisualTemplates,
  getVisualTemplatesByType,
} from '@/lib/visual-template-firestore';
import type { VisualTemplate } from '@/types/template-designer';

/**
 * GET /api/visual-templates
 * Get all visual templates or filter by type
 */
export async function GET(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get('type');

      let templates: VisualTemplate[];
      if (type) {
        templates = await getVisualTemplatesByType(type);
      } else {
        templates = await getAllVisualTemplates();
      }

      return NextResponse.json({ items: templates });
    } catch (error) {
      console.error('Error fetching visual templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}

/**
 * POST /api/visual-templates
 * Create or update a visual template
 */
export async function POST(request: NextRequest) {
  const handler = await withAuth(async (req) => {
    try {
      const userId = req.user?.uid || '';
      const template = await req.json() as VisualTemplate;

      // Validate required fields
      if (!template.name || !template.type) {
        return NextResponse.json(
          { error: 'Template name and type are required' },
          { status: 400 }
        );
      }

      await saveVisualTemplate(template, userId);

      return NextResponse.json({
        success: true,
        message: 'Template saved successfully',
      });
    } catch (error) {
      console.error('Error saving visual template:', error);
      return NextResponse.json(
        { error: 'Failed to save template' },
        { status: 500 }
      );
    }
  });

  const limited = withRateLimit(handler);
  return limited(request);
}
