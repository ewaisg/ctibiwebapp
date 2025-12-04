import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { resolveTemplate, TemplateCategory } from '@/lib/template-resolver';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  // Allow any authenticated user to resolve templates (no admin-only restriction)
  const authed = await withAuth(async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const category = (searchParams.get('category') || 'Invoice') as TemplateCategory;
      const projectId = searchParams.get('projectId') || undefined;
      const contractId = searchParams.get('contractId') || undefined;
      const departmentId = searchParams.get('departmentId') || undefined;

      const resolved = await resolveTemplate(category, projectId, contractId, departmentId);
      if (!resolved) {
        return NextResponse.json({ template: null, source: null });
      }

      // Extract template name based on source
      const templateName = (resolved.template as any).templateName || (resolved.template as any).name;

      return NextResponse.json({
        template: {
          id: resolved.template.id,
          templateName
        },
        source: resolved.source
      });
    } catch (error) {
      return handleApiError(error);
    }
  });

  const limited = withRateLimit(authed);
  return limited(request);
}
