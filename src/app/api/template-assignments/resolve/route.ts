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

      const template = await resolveTemplate(category, projectId, contractId, departmentId);
      if (!template) {
        return NextResponse.json({ template: null });
      }
      return NextResponse.json({ template: { id: template.id, templateName: template.templateName } });
    } catch (error) {
      return handleApiError(error);
    }
  });

  const limited = withRateLimit(authed);
  return limited(request);
}
