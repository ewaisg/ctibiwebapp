# Copilot Processing

Date: 2025-09-14

## User Request Details

- Harden PDF Templates system; enforce Admin auth and rate limits; secure previews; standardize IDs/timestamps.
- Implement multi-category template resolver with scope fallback (Project > Department > Contract > Global).
- Implement Cover Page generation and Department Packet ZIP; support manual-first data entry.
- Add Reports menu under Invoices; avoid unapproved admin wizards.
- Template upload: multipart, store large files, preview, pagination.
- UI: Modern, responsive, dynamic form rendering using template UI hints (date/select/signature/image/checkbox/etc.).
- Current blocker: date/select/signature fields not rendering as configured because UI hint properties (inputType, uiLabel, options, etc.) are stripped during sanitization. Need to persist these in storage and return them from GET /api/pdf-templates/[id].
- Goal: Ensure manual-data widgets render correctly and end-to-end generation works (Cover Pages; later Department Packet).

## Context Snapshot
- Resolver v2 supports category + scope fallback (Project > Department > Contract > Global) and flexible IDs.
- Admin templates page adapted to paginated API.
- `/invoices/page.tsx` passes serialized contracts to client page for Reports wizards.
- `mapTemplateData` supports new mapping shape and department source, with date/currency handling and generated values.

## Constraints & Acceptance Criteria
- Do not add wizards under Admin; only under `/invoices` Reports.
- Each wizard must:
  - Allow selecting scope (e.g., contract/department) and time window
  - Display resolved template assignment read-only
  - Call appropriate APIs and handle streaming responses
  - Provide loading/error states and success toasts
- Department packet ZIP must include a populated Cover Page when an assignment exists.
- No regression to existing invoice listing and pagination.

## Action Plan
1) Establish dashboard shell
- Create client dashboard with global filters and tabs; mount within protected layout.
2) Implement core visuals
- Build reusable components: TimeAllocationPie, BillableTrendLine, TopEmployeesBar, ProjectHoursStacked, ProjectBudgetRadial using chart wrappers with tooltip/legend.
3) Data layer (temporary then real)
- Provide /api/dashboard-data shape; later wire Firestore and apply canonical constants and filters (time range, project, employee).
4) Integrate visuals in Overview
- Feed visuals from API; compute derived series (paid/unpaid leave, trends, budgets).
5) Populate filters
- Load projects/employees for selects; propagate selections to API and visuals.
6) Validate build/runtime
- Run build/dev, resolve type/runtime issues; ensure accessibilityLayer and light-theme export parity.
7) Exports and consistency
- Add PNG/PDF/XLSX export affordances consistent with Utilization.
8) QA polish
- Empty-state messaging, loading, error surfaces; performance review and memoization; documentation update.

## Task Tracker
- [x] Mount protected dashboard page and client shell
  - Depends on: none
- [x] Add global filters (time tabs, project/employee selects, clear) and page tabs
  - Depends on: dashboard shell
- [x] Create visuals with chart wrappers (pie, line, bars, stacked, radial) with tooltip/legend and empty states
  - Depends on: dashboard shell
- [x] Integrate visuals into Overview and derive datasets from API
  - Depends on: visuals, temporary API
- [x] Use existing /api/dashboard-data and render KPIs via `SectionCards`
  - Depends on: API route present
- [x] Populate project select from Firestore and apply filter to API
  - Depends on: Firestore services available
- [x] Populate employee select from Firestore and apply filter to API
  - Depends on: Firestore services available
- [x] Implement time range filtering server-side for trends and aggregation
  - Depends on: API filter plumbing
- [x] Provide project hours dataset for ProjectHoursStacked
  - Depends on: data source decision
- [ ] Compute Average Invoice ($) accurately from invoices
  - Depends on: invoice count/amounts
- [ ] Add export buttons (PNG/PDF/XLSX) with light-theme capture
  - Depends on: finalized layouts
- [x] Validate build and dev runtime, fix any issues (ignore ESLint during build)
  - Depends on: above integrations
- [ ] QA polish: accessibility, performance, docs
  - Depends on: feature completeness
- [x] Invoicing: Fix service dropdown not updating billing rate on change (employee/service)
  - Implemented in `src/app/invoicing/client-page.tsx` within `updateInvoiceItem`:
    - Resolve rate from `selectedProject.assignedCompanies.assignedServices` for the selected employee's company; fallback to `rates` collection.
    - Keep `companyId` synced to the selected employee's company for consistency.
    - Recalculate `amount` immediately when `billingRate`, `hours`, or `markdown` change.

---

## Examples Inventory (from `/examples`)

Source folders
- tremor: ready-made charts, tables, shells, filters, KPIs, empty states
- shadcn: (currently empty)

Key building blocks and candidates to reuse
- Page shells
  - page-shell-01, 02, 03, 04 — Header + filters + tabs layout scaffolds
- Global filters / filter bars
  - filterbar-07, 08, 11 — Time-range button groups, dropdowns, column chooser
- KPI cards / badges
  - kpi-card-03, 13–15, 17, 21, 23–24, 26–28 — Metric cards with variants
  - badge-01, 04, 08 — Status/badge variants
- Charts (single)
  - area-chart-05, 10, 15 — AreaChart with compact valueFormatter and legends
  - line-chart-04, 05, 06, 07, 10 — LineChart variants (multi-series)
  - bar-chart-01, 03, 06, 07, 11, 12 — BarChart variants and interactions
  - donut-chart-01, 03 — Donut breakdown with legend list
  - bar-list-06 — Ranked bar list component
  - spark-chart-04, 05 — SparkAreaChart inline trends
- Chart compositions and tooltips
  - chart-composition-02, 05, 09, 12, 13, 14, 15 — Multi-chart compositions
  - chart-tooltip-07, 08, 20, 21 — Tooltip customization examples
- Tables and actions
  - table-01, 04, 08, 11 — Table patterns
  - table-action-04, 06, 11 — Row actions/menus patterns
- Lists and grids
  - grid-list-03, 06, 13, 15 — Grid/list cards layouts
- Empty states
  - empty-state-02, 03, 04, 05, 06, 07, 07 (1), 10 — Empty/loading UX patterns
- File upload and pagination
  - file-upload-04, 05, 06 — Upload flows
  - pagination-04, 07 — Pagination controls
- Misc analytics blocks
  - onboarding-feed-01, 15, 16 — Activity/feed
  - chart-composition-12 — Overview with selects + multi-series chart + stat tiles
  - category bar: table-08 + CategoryBar instances
  - capacity card: empty-state-03 — ProgressCircle usage
  - cohort heatmap table: table-11 — Cohort retention heatmap

Notable components referenced in examples
- Charts: AreaChart, BarChart, DonutChart, SparkAreaChart, CategoryBar
- UI: Card, Tabs, Select/SelectNative, Tooltip, DropdownMenu, ProgressCircle, Divider
- Tables: TableRoot/Table/Head/Body/Row/Cell

Quick mapping to our dashboard tabs
- Overview
  - Page shell: page-shell-01 (header + filters + tabs scaffold)
  - KPIs: kpi-card-21 (or 23–24) for metric cards
  - Time Allocation: donut-chart-01 list pattern
  - Billable trend: area-chart-05 or line-chart-07
  - Top employees: bar-list-06 or bar-chart-06 vertical
  - Project hours: bar-chart-11 (stacked) or composition-05
  - Budget utilization: chart-composition-14 or a donut + legend
- Financial
  - Tables: table-01/04 with table-action-06 menus
  - Pagination: pagination-04
  - KPI strip: kpi-card-26/28
- Resource
  - Grid lists: grid-list-13/15 for allocations
  - Spark KPIs: spark-chart-04 within cards
- Executive
  - chart-composition-12 (multi-metric overview) + kpi cards
  - Empty states: empty-state-04 for no data sections

Adoption notes
- Tremor examples import from '@/components/...'; we will adapt them to our shadcn/Recharts wrappers or embed as-is behind adapter components.
- Keep our theming and export behavior; wire real data (Firestore) into selected blocks.
- Prefer page-shell-01 as the base layout for /dashboard.

## Action Plan
1) Add Reports menu on `/invoices` client page
2) Build modal wizards for each report option
3) Resolve and display assigned template for chosen scope
4) Wire API calls and handle streaming downloads
5) Validate cover page in department packet ZIP
6) Harden error/loading states and toasts
7) Non-regression checks on invoices listing

## Task Tracker
- [ ] 1. Inject Reports menu into `src/app/invoices/client-page.tsx`
  - [ ] Add a top-level "Reports" dropdown/button group
  - [ ] Options: Cover Pages, Invoices, Time Card, Summary Report, Billing Packet
  - [ ] Style with Tailwind; keep responsive
- [ ] 2. Create reusable ReportWizard modal component
  - [ ] Inputs: contract selector, department selector, date range, period label
  - [ ] Shows resolved template name (read-only)
  - [ ] Primary action triggers API call
- [ ] 3. Implement template resolution UI helper
  - [ ] Fetch active template assignment for scope/category via `/api/template-assignments?category=...&scope=...`
  - [ ] Display template title; fallback to Global assignment
- [ ] 4. Hook Cover Pages wizard to `/api/coverpage`
  - [ ] POST departmentId, date range, opt projectId/contractId
  - [ ] Stream/Blob download and save `.pdf`
- [ ] 5. Hook Billing Packet wizard to `/api/department-packet`
  - [ ] POST departmentId, date range
  - [ ] Stream/Blob download and save `.zip`
- [ ] 6. Wire Invoices/Time Card/Summary stubs
  - [ ] Prepare POST bodies and placeholders for download
  - [ ] Leave server endpoints as-is if already implemented
- [ ] 7. Add loading, error states, and toasts
  - [ ] Use `use-toast` hook for success/error
  - [ ] Disable buttons when loading
- [ ] 8. Preserve existing invoices listing
  - [ ] Ensure no breaking prop changes
  - [ ] Keep pagination and filters intact

## Dependencies
- Existing `/api/coverpage`, `/api/department-packet` endpoints
- `secureRequest` from `use-auth`
- Contracts preloaded via `/invoices/page.tsx`

## Notes
- Resolver v2 guarantees scope-based lookup for category
- Ensure Authorization + CSRF headers propagate via `secureRequest`

---

## Action Plan — Audit and Hardening

Goal: Complete a comprehensive audit, finish hardening of template/reporting flows, and clean up deprecated artifacts with strong typing and validation.

Phases and Action Items
1) Types Review and Tightening
- Audit `src/types/index.ts` for gaps and weak types (e.g., `Invoice.status: string` → union type).
- Define shared response/request DTOs for APIs (coverpage, department-packet, template endpoints).
- Introduce Zod schemas mirroring the DTOs for runtime validation.
- Outcome: Stronger compile-time safety and consistent API contracts.

2) Server-side Validation
- Add Zod validation to `/api/coverpage` and `/api/department-packet` for `manualData`, date ranges, and scope IDs.
- Normalize number/currency/date formats; reject invalid payloads with 400 and helpful messages.
- Outcome: Prevents malformed requests and improves error surfaces.

3) Dynamic Selects (optionsSource=collection)
- Implement `optionsSource` to hydrate select options from Firestore collections (e.g., departments, contracts, signers).
- Add caching and debounce for large collections.
- Outcome: Manual-first forms can reference live data.

4) Cleanup Deprecated Departmental Compilation
- Identify and remove legacy component, API route, and libs related to departmental compilation.
- Replace with redirects or feature flags if needed.
- Outcome: Reduced confusion and dead code.

5) Tests and Documentation
- Unit tests for template sanitization, stripUndefinedDeep, and mapping functions.
- Integration tests for coverpage and department-packet endpoints (happy/edge cases).
- Add `ARCHITECTURE.md` for template system, resolver, and reporting flows.
- Outcome: Prevent regressions and onboard faster.

6) UX Polish and Accessibility
- Ensure dialogs have focus traps, ARIA labels, keyboard navigation.
- Add progress indicators for long ZIP builds; better empty states.
- Outcome: Professional UX and inclusive design.

7) Build/Release Hygiene
- Ensure `npm run build` passes; add task to CI.
- Lint/format; remove unused code; tree-shake large libs; document env vars.
- Outcome: Stable builds and lean bundle.

## Task Tracker — Audit and Hardening
- [ ] T1: Tighten `Invoice.status` to a union type and refactor usages
  - Depends on: Types review
- [ ] T2: Define DTOs and Zod schemas for coverpage and department-packet
  - Depends on: Types review
- [ ] T3: Add server-side Zod validation to coverpage route
  - Depends on: T2
- [ ] T4: Add server-side Zod validation to department-packet route
  - Depends on: T2
- [ ] T5: Implement optionsSource=collection plumbing in UI and API
  - Depends on: None
- [ ] T6: Add Firestore-backed options loaders with caching/debounce
  - Depends on: T5
- [ ] T7: Remove legacy departmental compilation component, API, and libs
  - Depends on: None
- [ ] T8: Add unit tests for sanitization and mapping; integration tests for APIs
  - Depends on: T2–T4
- [ ] T9: Write ARCHITECTURE.md covering template/resolver/reporting
  - Depends on: Major features stable
- [ ] T10: A11y and UX polish for dialogs and long operations
  - Depends on: UI feature completeness
- [ ] T11: Build hygiene: fix lint warnings, tree-shake, document env vars
  - Depends on: None

---

## User Request Details — Vercel Deployment (2025-09-14)

- Target host: Vercel (start on Hobby; consider Pro later)
- Current state: Project only on local device, not yet on GitHub
- Need: Initialize git, create GitHub repo, push code, connect Vercel to repo
- Secrets: `.env` and `.env.local` both contain all secrets (Firebase, APIs). Must NOT commit these files
- Action: Mirror secrets into Vercel Environment Variables per environment (Development/Preview/Production)
- Deployments: Enable PR/Preview deployments; create staging (branch) and production (main) workflows
- Testing: Use preview URLs for smoke/E2E; verify PDF flows, auth, and Firestore access in Vercel
- Safety: Add `.gitignore` to exclude `.env*`; configure required envs in Vercel before first production deploy

## Action Plan — Move to GitHub and Deploy on Vercel

1) Repository hygiene
- Add .gitignore to protect secrets and common build artifacts
- Verify no .env files are tracked; add .env.example (later) for team reference

2) Initialize Git and first commit
- Initialize repo if needed; create initial commit including .gitignore

3) Create GitHub repository and push
- Create new GitHub repo (private recommended)
- Add remote origin and push main branch

4) Connect Vercel to GitHub repo
- Import project in Vercel; framework = Next.js; build command = `next build`, output = `.next`
- Set Node version from engines if needed; otherwise default

5) Configure Vercel Environment Variables
- Mirror all keys from local `.env/.env.local` into Vercel:
  - Development (vercel dev)
  - Preview (PR/branch deploys)
  - Production (main)
- Mark secrets appropriately (do not expose server-only keys to client)

6) Branch and deployment strategy
- main → Production deployment
- staging branch → Preview (used as staging)
- Pull Requests → Preview deployments with unique URLs

7) Post-deploy validation
- Run smoke tests on Preview: auth/login, dashboard load, invoices flow, PDF generation/preview, Firestore access
- Check logs and errors (Vercel + Sentry if configured)

8) Domain and security
- Add custom domain(s); enforce HTTPS
- Review CORS/CSRF, secure cookies, security headers

9) Rollback & monitoring
- Document rollback to last green deployment
- Set usage alerts and error monitoring per environment

## Task Tracker — Vercel Deployment
- [ ] T1: Create `.gitignore` with Next.js/Node/Vercel and env exclusions
- [ ] T2: Detect if Git repo exists; if not, initialize and make first commit
- [ ] T3: Create GitHub repo and push `main`
- [ ] T4: Import project in Vercel and link to GitHub repository
- [ ] T5: Add Environment Variables in Vercel (Development/Preview/Production)
- [ ] T6: Configure branch-to-environment mapping (main=Production, staging=Preview)
- [ ] T7: Validate Preview deployment (auth, PDFs, Firestore)
- [ ] T8: Add custom domain and enforce HTTPS
- [ ] T9: Document rollback plan and set alerts
