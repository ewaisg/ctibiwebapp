'use server';

import type { DashboardFilters, DashboardStoryPayload } from '@/types/dashboard';
import { buildDashboardStory } from '@/lib/metrics/dashboard-aggregator';

function normalizeFilters(input: Partial<DashboardFilters> | undefined): DashboardFilters {
  return {
    timeRange: input?.timeRange ?? '30d',
    projectId: input?.projectId,
    employeeId: input?.employeeId,
    departmentId: input?.departmentId,
    companyId: input?.companyId,
  };
}

export async function loadDashboardStory(filters?: Partial<DashboardFilters>): Promise<DashboardStoryPayload> {
  const effectiveFilters = normalizeFilters(filters);
  return buildDashboardStory(effectiveFilters);
}
