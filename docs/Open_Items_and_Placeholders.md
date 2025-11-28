# Open Items, Placeholders, and Incomplete Areas

Generated: 2025-11-12

## Table of Contents

- [Cross-Cutting Technical](#cross-cutting-technical)
- [Data Layer & Consistency](#data-layer--consistency)
- [PDF Viewer & Documents](#pdf-viewer--documents)
- [Dashboard](#dashboard)
- [Projects](#projects)
- [Timesheets](#timesheets)
- [Invoicing](#invoicing)
- [Manpower & Utilization](#manpower--utilization)
- [Organizations](#organizations-companiesdepartmentsdivisionscontracts)
- [Employees & Users](#employees--users)
- [Admin & Settings](#admin--settings)
- [Profile & Account](#profile--account)
- [Shortcuts & Accessibility](#shortcuts--accessibility)
- [Open Questions / Decisions Needed](#open-questions--decisions-needed)
- [Suggested Next Steps](#suggested-next-steps)
- [Ownership, Priorities, and Timelines](#ownership-priorities-and-timelines)

This document tracks known gaps and placeholders across modules and technical areas. Use it to prioritize work and communicate status.

## Cross-Cutting Technical

- Service worker (`public/service-worker.js`) is a placeholder; no offline caching or precache implemented.
- Middleware security:
  - CSRF tokens stored in-memory Map; replace with secure server-side store (e.g., Redis/session).
  - Rate limiting uses in-memory Map; replace with persistent store and per-route tuning.
  - Auth token verification placeholder; implement server-side Firebase token verification.
- Testing:
  - `vitest.config.ts` is empty; add config, tests, and coverage for core modules.
- CI/CD:
  - No documented pipeline; add build/test, lint checks, and env management steps.
- Indexes:
  - `firestore.indexes.json` present; ensure deployment and keep in sync with queries.
- Environment variables:
  - Provide sample `.env.local.example` and secure secret management guidance.
- Syncfusion license:
  - Ensure `NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY` is set and license usage documented.

[!WARNING]
In-memory security stores are not production-ready. Replace with secure, persistent solutions.

## Data Layer & Consistency

- Users document ID mismatch:
  - `use-auth` reads `users/{uid}`; `src/services/firestore.addUser` writes `users/{email}`.
  - Align on `uid` for consistency and update existing records/migrations.

## PDF Viewer & Documents

- Component placeholder: `src/components/pdf-viewer/syncfusion-pdf-viewer.tsx` is empty.
  - Implement viewer wrapper and props, wire up Syncfusion viewer, and integrate with modules.
- Planned features:
  - Annotations, search, thumbnails mentioned as future enhancements; add roadmap and UI behind flags.

## Dashboard

- Saved views mentioned “if enabled”; may not be implemented.
- KPI definitions documented; add tooltips/help in UI for users.

## Projects

- File Manager: confirm supported file types and limits; add bulk operations if needed.
- Services/Contracts: add validations to prevent misaligned rates; UI hints for data integrity.

## Timesheets

- Templates: ensure downloadable latest templates are exposed in UI.
- Validation: document exhaustive rules in UI; add row-level inline fix support if planned.
- Approvals: add activity feed/audit trail for approvals.

## Invoicing

- Adjustments/Credit notes: add explicit workflow UI and audit logging.
- Taxes/fees: if applicable, document configuration and application to line items.
- PDF generation: confirm template selection and versioning in UI.

## Manpower & Utilization

- Thresholds for over/under utilization: make configurable and documented.
- Drilldowns: add direct links to assignment edits where possible.

## Organizations (Companies/Departments/Divisions/Contracts)

- Import flows: ensure validation feedback is comprehensive and export errors.
- Hierarchy management: add bulk reassignment tools if needed.
- Contracts: prevent overlapping effective dates or highlight conflicts.

## Employees & Users

- Role management UI: add clearer role descriptions and permission previews.
- Offboarding workflow: provide guided steps and checks.

## Admin & Settings

- Audit logs: confirm availability; if not, add basic logging and export.
- Configuration versioning: track template/rate changes with timestamps and authors.

## Profile & Account

- Email changes/password reset: document flows and permissions.
- Preferences: add persistency docs (local vs server-side).

## Shortcuts & Accessibility

- Shortcut customization: not supported; consider roadmap note.
- Accessibility audits: schedule and track findings; add a11y issue reporting.

## Open Questions / Decisions Needed

- Standardize user document ID: email vs uid (recommend uid).
- Saved Views feature scope and persistence model.
- Which security store (Redis/DB) for CSRF/rate limit/session.
- CI/CD platform choice and required checks.

## Suggested Next Steps

- Replace in-memory security stores with persistent solutions.
- Fix user ID inconsistency; migrate `users/{email}` → `users/{uid}`.
- Implement PDF viewer component and feature flags.
- Add tests and coverage with proper `vitest.config.ts`.
- Deliver a CI/CD pipeline and sample env files.
- Validate and deploy Firestore indexes.

## Ownership, Priorities, and Timelines

Priority legend: P0 Critical, P1 High, P2 Medium, P3 Low
Status: Not started | In progress | Blocked | Done
ETA: target month/quarter (e.g., 2025-12 or Q1 2026)

### Cross-Cutting Technical

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Replace in-memory CSRF/rate-limit/session stores with Redis/DB | Platform/Backend | P0 | Not started | 2025-12 |
| Implement server-side Firebase ID token verification | Backend | P0 | Not started | 2025-12 |
| Add Vitest config, tests, coverage | QA/Engineering | P1 | Not started | 2025-12 |
| CI/CD pipeline (build/test/lint/env management) | DevOps | P1 | Not started | 2025-12 |
| Validate/deploy Firestore indexes | Backend/Data | P1 | Not started | 2025-12 |
| Provide .env.local.example and secrets guidance | Platform | P2 | Not started | 2025-11 |
| Syncfusion license docs and checks | Frontend | P2 | Not started | 2025-11 |

### Data Layer & Consistency

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Standardize users doc ID to uid (migrate from email) | Backend/Data | P0 | Not started | 2025-12 |

### PDF Viewer & Documents

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Implement `syncfusion-pdf-viewer.tsx` wrapper/component | Frontend | P1 | Not started | 2025-11 |
| Feature flags: annotations/search/thumbnails | Frontend | P3 | Not started | Q1 2026 |

### Dashboard

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Saved views feature (persisted filters) | Frontend | P2 | Not started | Q1 2026 |
| KPI tooltips/help texts in UI | Frontend | P2 | Not started | 2025-12 |

### Projects

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| File Manager: supported types/limits + bulk ops | Frontend | P2 | Not started | Q1 2026 |
| Services/Contracts: validations to prevent misaligned rates | Frontend/Finance | P1 | Not started | 2025-12 |

### Timesheets

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Expose latest downloadable templates in UI | Frontend | P1 | Not started | 2025-11 |
| Document exhaustive validation rules in UI | Frontend | P2 | Not started | 2025-12 |
| Inline row-level fix UI (optional) | Frontend | P2 | Not started | Q1 2026 |
| Approvals activity feed/audit trail | Frontend | P2 | Not started | Q1 2026 |

### Invoicing

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Adjustments/Credit notes explicit workflow UI | Frontend | P1 | Not started | 2025-12 |
| Taxes/fees configuration and application | Finance/Frontend | P2 | Not started | Q1 2026 |
| PDF template selection + versioning in UI | Frontend | P2 | Not started | Q1 2026 |

### Manpower & Utilization

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Configurable over/under utilization thresholds | Frontend | P2 | Not started | 2025-12 |
| Drilldowns: links to assignment edits | Frontend | P2 | Not started | 2025-12 |

### Organizations

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Import validation feedback + export errors | Frontend | P2 | Not started | 2025-12 |
| Bulk department reassignment tools | Frontend | P3 | Not started | Q1 2026 |
| Contracts overlap detection/highlighting | Frontend | P2 | Not started | 2025-12 |

### Employees & Users

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Role descriptions + permission preview UI | Frontend | P2 | Not started | Q1 2026 |
| Offboarding wizard with checks | Frontend | P2 | Not started | Q1 2026 |

### Admin & Settings

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Audit logs (basic logging + export) | Platform/Backend | P1 | Not started | 2025-12 |
| Configuration versioning (templates/rates) | Platform/Finance | P1 | Not started | 2025-12 |

### Profile & Account

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Password reset and email change flow docs | Admin/Frontend | P2 | Not started | 2025-11 |
| Preferences persistence docs (local vs server) | Frontend | P3 | Not started | 2025-12 |

### Shortcuts & Accessibility

| Item | Owner | Priority | Status | ETA |
|---|---|---|---|---|
| Shortcut customization roadmap note | Product | P3 | Not started | Q1 2026 |
| Schedule a11y audit and track findings | Product/Frontend | P2 | Not started | 2025-12 |

### Open Questions / Decisions

| Question | Owner | Priority | Target Decision |
|---|---|---|---|
| Users doc ID standard (email vs uid) | Backend/Data | P0 | 2025-11 |
| Saved Views scope & persistence model | Product/Frontend | P2 | Q1 2026 |
| Security store choice (Redis/DB) | Platform/Backend | P0 | 2025-11 |
| CI/CD platform and required checks | DevOps | P1 | 2025-11 |
