# Copilot Processing

Date: 2025-09-16

## User Request Details
- Redesign and replace current `/dashboard` which is not appealing or fully functional.
- Build an advanced, high-level, storytelling and decision-making dashboard for stakeholders, managers, owners, etc.
- Include attractive, responsive visuals: cards, charts, and varied data visualizations.
- Review and understand current database structure, files, logic, code, relations, and data mapping across the following routes/modules to ensure consistency with shadcn/ui, database collections, fields, and types:
  - `/projects`
  - `/invoices`
  - `/invoicing`
  - `/subconsultant-dashboard`
  - `/timesheets`
  - `/manpower`
  - `/utilization`
  - `/admin`
- After completing `/dashboard`, do the same for `/subconsultant-dashboard`.
- Currently `/dashboard` and `/subconsultant-dashboard` share code; changes to `/dashboard` appear in `/subconsultant-dashboard`. This must be stopped; the subconsultant dashboard needs isolated, role-specific content and behavior.
- Ensure permission logic and conditions are always applied to components and functionality.
- Consider better approaches to fully isolate the subconsultant dashboard and their own invoice submissions, tracking, resubmitting, etc.
- Note: Role source of truth is `users.role` with values: `Admin | Prime | Subconsultant`. Timesheets collection name is `cti_timesheets`.

## Action Plan

1) Baseline and Consistency
- Unify Firestore access layer to `src/lib/firestore.ts` (deprecate `src/services/firestore.ts`).
- Standardize timesheets collection name to `cti_timesheets` in all usages.
- Ensure all data access conforms to `src/types/index.ts` (source of truth for fields and relations).
- Verify invoice creation persists `submitterCompanyId` (fallback to signer’s `user.companyId` if missing).

2) Server-side Authorization & Scoping
- Add role-aware data scoping in `/api/dashboard-data` so Subconsultants only see their data:
  - Invoices: filter by `submitterCompanyId` (fallback `userId`).
  - Projects: restrict to those with `assignedCompanies.companyId` = user.companyId.
  - Timesheets: restrict to employees with `companyId` = user.companyId.
- Create dedicated `/api/subconsultant-dashboard-data` returning only subconsultant-relevant metrics.
- Keep `ProtectedRoute` for UX; rely on server checks for security.

3) Prime/Internal Dashboard (Storytelling)
- Information Architecture:
  - Executive KPI bar: Total Invoiced, Paid, Outstanding, Utilization, Trends.
  - Narrative highlights: risks/opportunities (e.g., projects nearing capacity, AR aging alerts).
  - Visuals: Revenue/cash trend, AR aging, Project health matrix, Utilization snapshots, Top contributors.
  - Filters: time range, project, department, company; saved views; export.
- Components (shadcn/ui + Recharts):
  - `ExecutiveKpis`, `ArAging`, `CashTrend`, `ProjectHealthMatrix`, `UtilizationOverview`, `TopContributors`.
- Page:
  - Replace `/app/dashboard/dashboard-client.tsx` with new IA, tabs, and loaders.

4) Subconsultant Dashboard (Isolated)
- Do not reuse prime dashboard components.
- Components:
  - `MyInvoiceKpis`, `SubmissionSteps`, `MyInvoicesTable`, `NotificationsPanel`.
- Data source:
  - Use `/api/subconsultant-dashboard-data` and invoices APIs scoped to company/user.
- Flows:
  - Submit, track, resubmit invoices; inline status and file checks.

5) UI/UX and Performance
- Consistent shadcn/ui styling, responsive grid, skeleton loaders.
- Accessibility: labels, ARIA for charts, contrast.
- Performance: memoization, pagination, server components where possible.

6) Implementation Roadmap
- Phase A: Consistency + API scoping
  - Standardize `cti_timesheets` across code.
  - Remove `src/services/firestore.ts` usage; consolidate to `src/lib/firestore.ts`.
  - Harden `/api/dashboard-data`; add `/api/subconsultant-dashboard-data`.
- Phase B: Prime Dashboard
  - Build components and integrate with API; replace existing client page.
- Phase C: Subconsultant Dashboard
  - Build isolated components and page; wire to scoped API.
- Phase D: Polish
  - Exports, saved views, accessibility, docs.

## Task Tracker

- [ ] A1. Standardize collection names (use `cti_timesheets`) in all data access functions and pages.
  - Depends on: none
- [ ] A2. Consolidate Firestore access to `src/lib/firestore.ts` and remove divergent `src/services/firestore.ts` usages.
  - Depends on: A1
- [ ] A3. Ensure invoice creation sets `submitterCompanyId` (fallback to `user.companyId`).
  - Depends on: none
- [ ] B1. Add role-aware scoping to `/api/dashboard-data` for Subconsultants (invoices, projects, timesheets).
  - Depends on: A2
- [ ] B2. Implement `/api/subconsultant-dashboard-data` with minimal KPIs and lists for subconsultants.
  - Depends on: B1
- [ ] C1. Build Prime components: `ExecutiveKpis`, `ArAging`, `CashTrend`, `ProjectHealthMatrix`, `UtilizationOverview`, `TopContributors`.
  - Depends on: B1
- [ ] C2. Replace `/dashboard` client with new IA and tabs; integrate filters/export.
  - Depends on: C1
- [ ] D1. Build Subconsultant components: `MyInvoiceKpis`, `SubmissionSteps`, `MyInvoicesTable`, `NotificationsPanel`.
  - Depends on: B2
- [ ] D2. Update `/subconsultant-dashboard` to use isolated components and API.
  - Depends on: D1
- [ ] E1. Polish: responsiveness, accessibility, performance, docs.
  - Depends on: C2, D2
