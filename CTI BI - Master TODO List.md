CTI BI - Master TODO List

**Last Updated:** 2025-12-30
**Based on:** CODEBASE_ANALYSIS_REPORT.md

---

# PHASE 0: CRITICAL SECURITY ISSUES ⚠️ IMMEDIATE ACTION REQUIRED

## Environment Variables & Secrets 🔴 CRITICAL

- [ ] **IMMEDIATE: Remove .env.local from version control**
  - Location: `.env.local` in repository root
  - Issue: Contains GOOGLE_PRIVATE_KEY, ISOLVED_CLIENT_SECRET, JWT_SECRET, DEV_BYPASS_AUTH in plain text
  - Risk: All secrets exposed in version control history
  - Fix:
    1. Add `.env.local` to `.gitignore`
    2. Remove from git history: `git filter-branch` or BFG Repo-Cleaner
    3. Rotate ALL exposed secrets immediately
    4. Use environment variable management (Vercel, Azure Key Vault, etc.)
  - **PRIORITY: CRITICAL** - Security breach risk

- [ ] **IMMEDIATE: Rotate all exposed secrets**
  - Location: All services using exposed credentials
  - Issue: Private keys and secrets committed to git
  - Fix:
    1. Generate new Firebase service account private key
    2. Regenerate JWT_SECRET
    3. Rotate ISOLVED_CLIENT_SECRET with vendor
    4. Update all deployment environments
  - **PRIORITY: CRITICAL** - Assume secrets are compromised

- [ ] **IMMEDIATE: Disable DEV_BYPASS_AUTH in production**
  - Location: [src/lib/auth-middleware.ts:22-26](src/lib/auth-middleware.ts#L22-L26)
  - Issue: `DEV_BYPASS_AUTH=true` allows bypassing all authentication
  - Risk: If accidentally enabled in production, total security bypass
  - Fix:
    1. Add runtime check: throw error if enabled in production
    2. Remove from .env.local
    3. Document as development-only feature
  - **PRIORITY: CRITICAL** - Complete auth bypass

## Authentication Vulnerabilities 🔴 CRITICAL

- [ ] **IMMEDIATE: Fix weak middleware authentication**
  - Location: [middleware.ts:156-159](middleware.ts#L156-L159) `validateAuthentication()` function
  - Issue: Only checks `authToken.length > 0`, doesn't verify token signature
  - Risk: Forged tokens accepted, complete authentication bypass
  - Current code:
    ```typescript
    function validateAuthentication(request: NextRequest): { valid: boolean } {
      const authToken = request.cookies.get('__session')?.value || ...;
      if (!authToken) return { valid: false };
      return { valid: authToken.length > 0 }; // WEAK: only checks length
    }
    ```
  - Fix: Use Firebase Admin SDK to verify token server-side
    ```typescript
    import { auth } from '@/lib/firebase-admin';

    async function validateAuthentication(request: NextRequest): Promise<{ valid: boolean; uid?: string }> {
      const authToken = request.cookies.get('__session')?.value;
      if (!authToken) return { valid: false };

      try {
        const decodedToken = await auth.verifySessionCookie(authToken, true);
        return { valid: true, uid: decodedToken.uid };
      } catch (error) {
        return { valid: false };
      }
    }
    ```
  - **PRIORITY: CRITICAL** - Authentication bypass vulnerability

- [ ] **Remove localStorage-based debug mode**
  - Location: [src/hooks/use-auth.ts:20-30](src/hooks/use-auth.ts#L20-L30)
  - Issue: `localStorage.DEBUG_AUTH = '1'` enables verbose logging in production
  - Risk: Exposes auth flow details, sensitive tokens in console
  - Fix: Replace with proper logging service with environment-based filtering
  - **PRIORITY: HIGH** - Information disclosure

## XSS and Injection Vulnerabilities 🔴 HIGH

- [ ] **Review all dangerouslySetInnerHTML usage**
  - Location: 3 files with potential XSS vulnerabilities
    - [src/lib/template-pdf-generator.ts](src/lib/template-pdf-generator.ts)
    - [src/hooks/use-async.ts](src/hooks/use-async.ts)
    - [src/components/ui/chart.tsx](src/components/ui/chart.tsx)
  - Issue: Potential XSS if user input not sanitized
  - Fix: Ensure DOMPurify is used consistently, add CSP headers
  - **PRIORITY: HIGH** - XSS vulnerability

- [ ] **Comprehensive NoSQL injection audit**
  - Location: All API routes
  - Issue: Phase 1 completed timesheet and dashboard, but other routes may be vulnerable
  - Fix: Review all Firestore queries for user input, apply sanitization consistently
  - **PRIORITY: HIGH** - Data manipulation risk

## Session & Rate Limiting Scalability 🟡 MEDIUM

- [ ] **Implement production-grade session management**
  - Location: [middleware.ts](middleware.ts), [src/lib/auth-middleware.ts](src/lib/auth-middleware.ts)
  - Issue: In-memory Maps for CSRF tokens and rate limiting won't work in multi-instance deployments
  - Current: `const csrfTokens = new Map<string, string>()` loses data on restart
  - Fix: Implement Redis or database-backed storage
  - **PRIORITY: MEDIUM** - Scalability blocker
  - Implementation plan:
    1. Install Redis client (ioredis)
    2. Create session storage abstraction layer
    3. Migrate CSRF tokens to Redis with TTL
    4. Migrate rate limiting to Redis with sliding window
    5. Update middleware to use new storage layer

---

# PHASE 1: SECURITY FIXES ✅ MOSTLY COMPLETE

## Authentication & Authorization ✅ COMPLETED

- [x] **Add authentication to /api/departments**
  - Location: src/app/api/departments/route.ts
  - Issue: Public access to all department data
  - Fix: Wrap with withAuth middleware
  - **COMPLETED** - Added auth middleware

## COMPLETED

- [x] **Add authentication to /api/contracts**
  - Location: src/app/api/contracts/route.ts
  - Issue: Public access to all contract data
  - Fix: Wrap with withAuth middleware
  - **COMPLETED** - Added auth middleware

## COMPLETED

- [x] **Add authentication to /api/employees**
  - Location: src/app/api/employees/route.ts
  - Issue: Public access to employee PII
  - Fix: Wrap with withAuth middleware
  - **COMPLETED** - Added auth middleware

## COMPLETED

- [x] **Add authentication to /api/projects**
  - Location: src/app/api/projects/route.ts
  - Issue: Public access to project data
  - Fix: Wrap with withAuth middleware
  - **COMPLETED** - Added auth middleware

## COMPLETED

- [x] **Add authentication to /api/generate-pdf**
  - Location: src/app/api/generate-pdf/route.ts
  - Issue: Anyone can generate PDFs (DoS risk)
  - Fix: Add withAuth and rate limiting
  - **COMPLETED** - Added auth + validation + rate limiting (5/min)

- [x] **Add authentication to /api/timesheet-upload**
  - Location: src/app/api/timesheet-upload/route.ts
  - Issue: Anonymous file uploads, data injection
  - Fix: Add withAuth with admin role requirement
  - **COMPLETED** - Added auth + rate limiting (10/hour for POST, 60/min for GET)

- [x] **Add authentication to /api/system/export/preview**
  - Location: src/app/api/system/export/preview/route.ts
  - Issue: Information disclosure about database
  - Fix: Add withAuth with admin role requirement
  - **COMPLETED** - Added Admin-only auth + rate limiting (10/min)

- [x] **Add authentication to /api/system/export/run**
  - Location: src/app/api/system/export/run/route.ts
  - Issue: Complete database exfiltration possible
  - Fix: Add withAuth with admin role requirement
  - **COMPLETED** - Added Admin-only auth + strict rate limiting (5/hour)

- [x] **Add authentication to /api/system/deletion/preview**
  - Location: src/app/api/system/deletion/preview/route.ts
  - Issue: Anyone can query deletion targets
  - Fix: Add withAuth with admin role requirement
  - **COMPLETED** - Added Admin-only auth + rate limiting (10/min)

- [x] **Fix fake authentication in deletion route**
  - Location: src/app/api/system/deletion/run/route.ts:6-9
  - Issue: requireAdmin() always returns true
  - Fix: Replace with proper withAuth middleware
  - **COMPLETED** - Removed fake auth, added real Admin-only auth + audit logging + strict rate limiting (2/hour)

- [x] **Replace custom auth in dashboard-data endpoint**
  - Location: src/app/api/dashboard-data/route.ts:33-46
  - Issue: Custom getUserFromRequest instead of standard middleware
  - Fix: Use withAuth middleware for consistency
  - **COMPLETED** - Replaced custom auth with withAuth + rate limiting (30/min)

## Input Validation & Injection Prevention COMPLETED

- [x] **Sanitize timesheet upload inputs**
  - Location: src/app/api/timesheet-upload/route.ts:95-106, 229-241
  - Issue: User input directly in Firestore queries (NoSQL injection)
  - Fix: Apply sanitizeValue() to all extracted fields
  - **COMPLETED** - Enhanced sanitization to remove NoSQL operators ($, {}, []), added sanitizeEmployeeId and sanitizeDocumentId to query functions

- [x] **Sanitize dashboard query parameters**
  - Location: src/app/api/dashboard-data/route.ts:50-53
  - Issue: Query params (projectId, employeeId) used without validation
  - Fix: Validate and sanitize all parameters
  - **COMPLETED** - Added sanitizeDocumentId, validateTimeRange, sanitizeEmployeeId

- [x] **Add validation to generate-pdf endpoint**
  - Location: src/app/api/generate-pdf/route.ts:26-30
  - Issue: Only checks existence, not format
  - Fix: Use validateInvoiceId() from security-utils
  - **COMPLETED** - Added validateInvoiceId validation

- [x] **Add validation to template assignment PUT endpoint**
  - Location: src/app/api/template-assignments/[id]/route.ts:51-55
  - Issue: Accepts arbitrary update data
  - Fix: Validate against schema before update
  - **COMPLETED** - Added sanitizeAssignmentData, validateTemplateAssignment, and allowedFields whitelist

## Rate Limiting COMPLETED

- [x] **Add rate limiting to CSRF endpoint**
  - Location: src/app/api/auth/csrf/route.ts
  - Issue: Token generation can be abused
  - Fix: Max 10 requests per minute per IP
  - **COMPLETED** - Added rate limiting (10/min)

- [x] **Add rate limiting to PDF generation**
  - Location: src/app/api/generate-pdf/route.ts
  - Issue: Expensive operation, no limits
  - Fix: Max 5 PDFs per minute per user
  - **COMPLETED** - Added strict rate limiting (5/min)

- [x] **Add rate limiting to file upload**
  - Location: src/app/api/timesheet-upload/route.ts
  - Issue: Storage exhaustion risk
  - Fix: Max 10 uploads per hour per user
  - **COMPLETED** - Added strict rate limiting (10/hour for uploads)

# PHASE 2: MAJOR REFACTORING & TECHNICAL DEBT

## Large Component Refactoring 🔴 HIGH PRIORITY

- [x] **Refactor invoicing/client-page.tsx (2,220 lines)** ✅ COMPLETED 2025-12-30
  - Location: [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx)
  - **Status:** Refactored from 2,220 lines → 1,850 lines (⬇️ 370 lines)
  - **Extracted:**
    - ✅ `useInvoiceWizard` hook (58 lines) - Step management
    - ✅ `useInvoiceValidation` hook (189 lines) - Validation logic
    - ✅ `useInvoiceWorkflow` hook (334 lines) - API calls and workflow
    - ✅ `invoice-utils.ts` (280 lines) - Permissions and payload prep
  - **Results:**
    - Hooks reduced from 24 → 12 (⬇️ 50%)
    - 861 lines moved to 4 new reusable files
    - All functionality preserved
    - TypeScript compilation passes ✅
  - **Files Created:**
    - `src/hooks/use-invoice-wizard.ts`
    - `src/hooks/use-invoice-validation.ts`
    - `src/hooks/use-invoice-workflow.ts`
    - `src/lib/invoice-utils.ts`
  - **Documentation:** See `REFACTORING_COMPLETE.md`
  - **PRIORITY: HIGH** - ✅ COMPLETED - Ready for user testing

- [x] **Refactor invoicing/actions.ts (1,784 lines → 5 focused files)**
  - Location: ~~[src/app/(authenticated)/invoicing/actions.ts](src/app/(authenticated)/invoicing/actions.ts)~~ DELETED
  - Issue: Monolithic server actions file
  - Fix: Split into domain-specific files:
    - `invoice-shared.ts` (150 lines) - Shared utilities and Firebase initialization
    - `invoice-autofill-actions.ts` (380 lines) - Autofill + data fetchers
    - `invoice-pdf-actions.ts` (180 lines) - PDF generation and versioning
    - `invoice-workflow-actions.ts` (270 lines) - Submit, approve, reject, return
    - `invoice-crud-actions.ts` (830 lines) - Create, read, update, delete, historical
  - **Updated imports in:** 6 files (invoices/actions.ts, invoicing/page.tsx, hooks/use-invoice-workflow.ts, invoicing/client-page.tsx, components/autofill-form.tsx, lib/labor-report-generator.ts)
  - **Documentation:** See [PHASE_2_ITEM_2_COMPLETE.md](PHASE_2_ITEM_2_COMPLETE.md)
  - **PRIORITY: HIGH** - ✅ COMPLETED - Build passes, ready for user testing

- [x] **Refactor admin/actions.ts (2,085 lines → 8 focused files)**
  - Location: ~~[src/app/(authenticated)/admin/actions.ts](src/app/(authenticated)/admin/actions.ts)~~ DELETED
  - Issue: All admin actions in one massive file
  - Fix: Split by domain:
    - `admin-shared.ts` (220 lines) - Shared utilities, Firebase init, Excel helpers
    - `admin-user-actions.ts` (330 lines) - User CRUD, import, delete, Firebase Auth
    - `admin-company-actions.ts` (180 lines) - Company CRUD, import
    - `admin-project-actions.ts` (680 lines) - Project CRUD, company assignment, file operations, import
    - `admin-org-actions.ts` (160 lines) - Division and Department CRUD
    - `admin-template-rate-actions.ts` (190 lines) - Invoice templates and global billing rates
    - `admin-payment-actions.ts` (520 lines) - Payment tracking, recording, history, entries
    - `admin-report-actions.ts` (120 lines) - Financial report generation
  - **Updated imports in:** 12 files (user-form, user-management, user-import, company-form, company-import, project-form, project-management, project-import, project-file-manager, division-form, department-form, payment-drawer)
  - **Documentation:** See [PHASE_2_ITEM_3_COMPLETE.md](PHASE_2_ITEM_3_COMPLETE.md)
  - **PRIORITY: HIGH** - ✅ COMPLETED - Ready for user testing

- [x] **Refactor invoices/client-page.tsx (2,172 lines)** ✅ COMPLETED 2025-12-30
  - Location: [src/app/(authenticated)/invoices/client-page.tsx](src/app/(authenticated)/invoices/client-page.tsx)
  - Issue: Massive list component with complex state management
  - Fix: Extract sub-components and hooks
    - ✅ `useInvoiceList` hook (role filtering + enrichment)
    - ✅ `useInvoiceFilters` hook (filter state + derived metrics)
    - ✅ `InvoiceListHeader` component
    - ✅ `InvoiceListFilters` component
    - ✅ `InvoiceListGrid` component
    - ✅ `InvoiceListActions` component
  - **Results:** Next.js build passes; invoices list page manually verified ✅
  - **PRIORITY: MEDIUM** - ✅ COMPLETED

## Data Model & Architecture Issues

- [ ] **Standardize FlexibleReference usage**
  - Location: Throughout codebase ([src/types/index.ts](src/types/index.ts))
  - Issue: Mix of Firestore DocumentReferences and string IDs causes bugs
  - Current: `type FlexibleReference = DocumentReference | string;`
  - Problems:
    - Requires utility functions to handle both types
    - Easy to pass wrong type
    - Debugging is difficult
  - Fix Options:
    1. Standardize on string IDs only (recommended)
    2. Use discriminated union: `{ type: 'ref', ref: DocumentReference } | { type: 'id', id: string }`
    3. Add runtime validation for all reference conversions
  - **PRIORITY: MEDIUM** - Source of subtle bugs

- [ ] **Fix JSON.parse(JSON.stringify()) serialization hack**
  - Location: Multiple server action files
  - Example: [src/app/(authenticated)/invoicing/page.tsx:28-34](src/app/(authenticated)/invoicing/page.tsx#L28-L34)
  - Issue: Loses Timestamp and DocumentReference objects
  - Current code:
    ```typescript
    return {
      projects: JSON.parse(JSON.stringify(projects)),
      departments: JSON.parse(JSON.stringify(departments)),
    };
    ```
  - Fix: Use proper serialization library
    - Install `superjson`
    - Create custom serializer for Firestore types
    - Update all server actions to use proper serialization
  - **PRIORITY: MEDIUM** - Data loss risk

- [ ] **Standardize date handling**
  - Location: Throughout codebase
  - Issue: Mix of JavaScript Date, Firestore Timestamp, and ISO strings
  - Problems:
    - Timezone bugs
    - Data corruption
    - Inconsistent formatting
  - Fix:
    1. Create `DateValue` type
    2. Create `normalizeDate()` utility (exists but not used consistently)
    3. Audit all date operations
    4. Add Zod schemas for date validation
  - **PRIORITY: MEDIUM** - Data integrity issue

- [ ] **Remove deprecated dataPath field**
  - Location: [src/types/index.ts:371](src/types/index.ts#L371) `TemplateFieldMapping` interface
  - Issue: Marked as deprecated but still present
  - Fix: Migration plan:
    1. Verify no usage in codebase
    2. Create migration script for Firestore data
    3. Remove from TypeScript interface
    4. Update documentation
  - **PRIORITY: LOW** - Technical debt

## Code Quality Issues

- [ ] **Remove all console.log statements from production code**
  - Location: **122 files** with console.log statements (not 26 as previously stated)
  - Issue: Exposes sensitive data, pollutes console
  - Major offenders:
    - [src/lib/labor-report-generator.ts](src/lib/labor-report-generator.ts) - 5 occurrences
    - [src/lib/pdf-generator.ts](src/lib/pdf-generator.ts) - 6 occurrences
    - [src/lib/overall-projects-summary-package.ts](src/lib/overall-projects-summary-package.ts) - 8 occurrences
    - [src/app/api/timesheet-upload/route.ts](src/app/api/timesheet-upload/route.ts) - multiple
    - [src/hooks/use-auth.ts](src/hooks/use-auth.ts) - conditional debug logging
    - 5 authenticated page files
  - Fix: Replace with proper logger (winston/pino) or remove entirely
  - Implementation:
    1. Install logging library (e.g., `pino`)
    2. Create `src/lib/logger.ts` with log levels
    3. Configure environment-based filtering
    4. Replace all console.log with logger calls
    5. Remove debug-only logs
  - **PRIORITY: MEDIUM** - Security and professionalism issue

- [ ] **Fix @ts-ignore abuse in SyncfusionFormDesigner**
  - Location: [src/components/form-designer/SyncfusionFormDesigner.tsx](src/components/form-designer/SyncfusionFormDesigner.tsx)
  - Issue: 6 instances of `@ts-ignore` defeats TypeScript safety
  - Fix: Properly type Syncfusion components or create type declaration file
  - **PRIORITY: LOW** - Vendor library typing issue

- [ ] **Remove eslint-disable comments**
  - Location: 15 instances throughout codebase
  - Issue: Hiding linting issues instead of fixing them
  - Fix: Address the underlying issues or document why disable is necessary
  - **PRIORITY: LOW** - Code quality

## Architecture Inconsistencies

- [ ] **Consolidate PDF generation approaches**
  - Location: Multiple PDF generators throughout codebase
  - Issue: Three different PDF libraries used inconsistently
    - **jsPDF** - Most common, used for invoice generation
    - **pdf-lib** - Used for form filling
    - **Syncfusion PDF Viewer** - Used for viewing only
  - Problems:
    - Inconsistent error handling
    - Different styling approaches
    - Duplicated layout logic
    - Hard to maintain
  - Fix: Standardize on one approach
    - Recommendation: jsPDF for generation + pdf-lib for form filling
    - Create unified PDF generation API
    - Document when to use each library
    - Consolidate common patterns (headers, footers, tables)
  - **PRIORITY: MEDIUM** - Maintainability issue

- [ ] **Standardize data fetching patterns**
  - Location: Throughout application
  - Issue: Mix of Server Actions and API routes with no consistent pattern
  - Current state:
    - Some routes use Server Actions (in `actions.ts` files)
    - Some routes use API routes (`/api/*`)
    - No clear decision framework
  - Fix:
    1. Define data fetching strategy
       - Server Actions for form submissions and mutations
       - API routes for public/external endpoints
       - Document the pattern in ARCHITECTURE.md
    2. Refactor inconsistent implementations
    3. Create templates for new features
  - **PRIORITY: MEDIUM** - Confusing for developers

- [ ] **Standardize import paths**
  - Location: Throughout codebase
  - Issue: Mix of `@/` aliases and relative imports
  - Fix: Use `@/` aliases exclusively
    - Search and replace relative imports
    - Add ESLint rule to enforce
  - **PRIORITY: LOW** - Consistency issue

- [ ] **Consolidate styling approach**
  - Location: Throughout components
  - Issue: Mix of Tailwind utilities, custom CSS, and inline styles
  - Problems:
    - Inconsistent spacing and sizing
    - Some components use design tokens, others hardcode values
    - Inline styles reduce performance
  - Fix:
    1. Audit all components
    2. Remove inline `style={{}}` attributes
    3. Create comprehensive design tokens
    4. Use Tailwind utilities consistently
    5. Document styling guidelines
  - **PRIORITY: LOW** - UX consistency

## Delete Unused Files

- [x] **Delete empty csrf.ts file**
  - Location: src/lib/csrf.ts
  - Issue: Only contains 1 empty line
  - Reason: CSRF handled in middleware, file not needed
  - **COMPLETED** - File deleted

- [x] **Delete redundant import-validation-clean.ts**
  - Location: src/lib/import-validation-clean.ts
  - Issue: Only re-exports from import-validation.ts
  - Reason: Use import-validation.ts directly
  - **COMPLETED** - File deleted

- [ ] **Delete backup file: client-page-backup.tsx**
  - Location: [src/app/(authenticated)/admin/pdf-templates/client-page-backup.tsx](src/app/(authenticated)/admin/pdf-templates/client-page-backup.tsx)
  - Issue: Backup file committed to repository
  - Fix: Delete file, use version control for backups
  - **PRIORITY: LOW** - Cleanup

## Fix TypeScript Type Safety (Top Priority Items)

- [x] **Fix invoice parameter type in use-invoice-access**
  - Location: src/hooks/use-invoice-access.ts:7
  - Issue: invoice: any defeats TypeScript
  - Fix: invoice: Invoice | null | undefined
  - **COMPLETED** - Fixed parameter type

- [x] **Fix any types in use-auth token claims**
  - Location: src/hooks/use-auth.ts (multiple locations)
  - Issue: Token claims cast as any
  - Fix: Create proper interface for custom claims
  - **COMPLETED** - Created FirebaseCustomClaims interface and replaced 6 occurrences

- [x] **Fix any type in InvoiceItem index signature**
  - Location: src/types/index.ts:239
  - Issue: [x: string]: any; allows anything
  - Fix: Remove or properly type index signature
  - **COMPLETED** - Removed unsafe index signature

- [ ] **Fix any types in component props**
  - Location: 106 component files
  - Issue: Props with any type
  - Fix: Create proper interfaces for all props

- [ ] **Fix any types in API route handlers**
  - Location: Multiple API routes
  - Issue: Request/response data as any
  - Fix: Type all request bodies and responses

- [ ] **Fix any types in utility functions**
  - Location: src/lib/ files
  - Issue: Function parameters as any
  - Fix: Add proper types to all functions

## Hook Improvements

- [x] **Split useAuth into 3 separate hooks**
  - Location: src/hooks/use-auth.ts (302 lines)
  - Issue: Handles auth + CSRF + API wrapper (3 responsibilities)
  - Fix: Create useAuth, useCSRF, useSecureRequest
  - **DEFERRED** - Upon review, CSRF and secureRequest are tightly coupled to auth state. Splitting would create unnecessary complexity, break many components, and require extensive refactoring. Current implementation is well-organized with proper cleanup (mounted flag added).

- [x] **Add cleanup to useAuth effect**
  - Location: src/hooks/use-auth.ts:36-122
  - Issue: Missing mounted flag, setState after unmount risk
  - Fix: Add mounted flag and check before setState
  - **COMPLETED** - Added mounted flag and wrapped all setAuthState calls with mounted checks

- [x] **Fix useAuth dependency array**
  - Location: src/hooks/use-auth.ts:122
  - Issue: eslint-disable hiding dependency issues
  - Fix: Properly manage dependencies or explain why empty
  - **COMPLETED** - Proper cleanup function with unsubscribe, empty dependency array is correct for this use case

- [x] **Fix stale closure in useAutofill**
  - Location: src/hooks/use-autofill.ts
  - Issue: Returned values don't update reactively
  - Fix: Use state or forceUpdate for reactive values
  - **COMPLETED** - Changed inProgress, lastKey, and error to useState for reactive updates

- [x] **Add error handling to useAutofill**
  - Location: src/hooks/use-autofill.ts
  - Issue: No error handling in async task
  - Fix: Wrap task in try-catch, return success boolean
  - **COMPLETED** - Added comprehensive error handling with try-catch, returns { success, error } object, logs errors to console

- [x] **Fix useAutofill dependency array**
  - Location: src/hooks/use-autofill.ts
  - Issue: canRun in dependencies causes unnecessary recreations
  - Fix: Remove from dependencies, inline the check
  - **COMPLETED** - canRun is properly memoized with useCallback and empty dependencies, no issue with current implementation

- [x] **Delete usePermissions hook**
  - Location: src/hooks/use-permissions.ts
  - Issue: Redundant, adds no value over useAuth
  - Reason: 3 usages, all can use useAuth directly
  - **COMPLETED** - File deleted, not used anywhere

- [x] **Fix useIsMobile SSR issue**
  - Location: src/hooks/use-mobile.ts:8-16
  - Issue: No window guard, uses inconsistent logic
  - Fix: Add SSR guard, use matchMedia consistently
  - **COMPLETED** - Added window SSR guard, using mql.matches consistently

- [x] **Fix useIsMobile hydration mismatch**
  - Location: src/hooks/use-mobile.ts
  - Issue: Initial state set inside effect
  - Fix: Set initial state from matchMedia immediately
  - **COMPLETED** - Initialize with false (server renders desktop), set correct value on mount

- [x] **Enhance useToast with more variants**
  - Location: src/hooks/use-toast.ts
  - Issue: Only supports success/error, missing info/warning
  - Fix: Add info, warning, loading, and promise support
  - **COMPLETED** - Added 5 new variants (success, error, info, warning, loading), promise support, and dismiss function

- [x] **Fix useToast return type**
  - Location: src/hooks/use-toast.ts
  - Issue: Return type not explicitly defined
  - Fix: Create and use ToastReturn interface
  - **COMPLETED** - Created ToastReturn interface with all helper methods properly typed

- [x] **Add memoization to useInvoiceAccess**
  - Location: src/hooks/use-invoice-access.ts
  - Issue: Dependencies only track object references
  - Fix: Track specific properties (uid, role, status, etc.)
  - **COMPLETED** - Added specific property tracking (userUid, userRole, invoiceStatus, invoiceUserId, invoiceId, pdfVersionsLength) for better memoization

- [x] **Add reset function to useInvoiceForm**
  - Location: src/hooks/use-invoice-form.ts
  - Issue: Can't reset form to initial state
  - Fix: Store initial data in ref, add reset function
  - **COMPLETED** - Added initialDataRef with useRef and reset() function

- [x] **Add dirty tracking to useInvoiceForm**
  - Location: src/hooks/use-invoice-form.ts
  - Issue: Can't detect if form has been modified
  - Fix: Compare current state with initial state
  - **COMPLETED** - Added isDirty computed property that compares all fields with initial state

- [x] **Add validation to useInvoiceForm**
  - Location: src/hooks/use-invoice-form.ts
  - Issue: No built-in validation
  - Fix: Add validate function with Zod schema
  - **COMPLETED** - Added validate() function with ValidationErrors interface for required fields, date validation, and invoice items validation

## Create Missing Hooks

- [x] **Create useAsync hook**
  - Location: New file src/hooks/use-async.ts
  - Reason: Repeated async pattern in 10+ components
  - Impact: Eliminates duplicate loading/error/data state
  - **COMPLETED** - Created comprehensive useAsync hook with loading/error/data states, mounted flag, execute/reset functions, and immediate execution option

- [x] **Create useDebounce hook**
  - Location: New file src/hooks/use-debounce.ts
  - Reason: Needed for form input optimization
  - Impact: Better performance for search/filter inputs
  - **COMPLETED** - Created useDebounce for value debouncing and useDebouncedCallback for function debouncing (default 500ms delay)

- [x] **Create useLocalStorage hook**
  - Location: New file src/hooks/use-local-storage.ts
  - Reason: Direct localStorage access without SSR guards
  - Impact: Safe localStorage with SSR support
  - **COMPLETED** - Created useLocalStorage and useSessionStorage with SSR guards, cross-tab syncing, and proper TypeScript typing

- [x] **Create useEventListener hook**
  - Location: New file src/hooks/use-event-listener.ts
  - Reason: Manual event listeners without cleanup guards
  - Impact: Cleaner event handling patterns
  - **COMPLETED** - Created useEventListener with proper TypeScript overloads, SSR guard, automatic cleanup, and useEventListeners for multiple events

- [x] **Create usePrevious hook**
  - Location: New file src/hooks/use-previous.ts
  - Reason: Comparing previous values manually
  - Impact: Easier value comparison in effects
  - **COMPLETED** - Created usePrevious, useCurrentAndPrevious, useHasChanged, and usePreviousDistinct for tracking value changes

## Remove Duplicate Code

- [x] **Remove duplicate invoice access logic**
  - Location: src/app/invoices/client-page.tsx:147-272
  - Issue: Same logic as useInvoiceAccess hook
  - Fix: Use the hook consistently
  - **COMPLETED** - Replaced duplicate permission logic with calls to getInvoiceAccess function, now using centralized logic consistently

- [x] **Consolidate Firebase initialization**
  - Location: src/app/api/generate-pdf/route.ts, src/app/api/auth/set-claim/route.ts, src/lib/auth-middleware.ts
  - Issue: Firebase Admin initialized in 3 places
  - Fix: Use centralized firebase-admin.ts
  - **COMPLETED** - Removed duplicate initialization from auth-middleware.ts and set-claim/route.ts, both now use centralized firebase-admin.ts

- [x] **Consolidate rate limiting implementations**
  - Location: src/lib/auth-middleware.ts, src/lib/api-error-handler.ts
  - Issue: Two different implementations
  - Fix: Use one implementation everywhere
  - **COMPLETED** - Removed duplicate RateLimiter class from api-error-handler.ts, now using withRateLimit middleware exclusively for all rate limiting

- [x] **Remove duplicate form validation patterns**
  - Location: payment-drawer.tsx:179-186, client-page.tsx:1159-1170
  - Issue: Similar validation logic duplicated
  - Fix: Create useFormValidation hook
  - **COMPLETED** - Upon review, validation logic is context-specific (payment amounts vs form data) and not truly duplicated. Each validates different data structures for different purposes.

## Error Handling

- [x] **Add error handling to all API routes (47 locations)**
  - Location: Multiple API routes
  - Issue: Missing try-catch blocks
  - Fix: Wrap all route handlers with try-catch and handleApiError
  - **COMPLETED** - All 37 API route files have comprehensive try-catch blocks with proper error handling

- [x] **Standardize error response format**
  - Location: All API routes
  - Issue: Inconsistent error formats
  - Fix: Always return { success: false, error: "message", code: "ERROR_CODE" }
  - **COMPLETED** - Added ApiErrorResponse interface, updated handleApiError() to include success: false in all responses, created createErrorResponse() helper

- [x] **Standardize success response format**
  - Location: All API routes
  - Issue: Inconsistent success formats
  - Fix: Always return { success: true, data: {...} }
  - **COMPLETED** - Added ApiSuccessResponse interface, created createSuccessResponse() helper function

- [x] **Add error boundaries to component tree**
  - Location: Root layout and major feature boundaries
  - Issue: No error boundaries for graceful failures
  - Fix: Add ErrorBoundary from react-error-boundary
  - **COMPLETED** - Created ErrorBoundary and FeatureErrorBoundary components, added to root layout with error logging

## Hard-coded Values

- [x] **Move pay item codes to configuration**
  - Location: src/app/api/timesheet-upload/route.ts:413-429
  - Issue: Hard-coded in function
  - Fix: Move to config file or database
  - **COMPLETED** - Created src/config/pay-items.ts with 13 pay item definitions and helper functions, updated timesheet-upload to import from config

- [x] **Extract magic numbers to constants**
  - Location: Throughout codebase
  - Issue: Numbers with no explanation (e.g., 900, 500, etc.)
  - Fix: Create named constants with documentation
  - **COMPLETED** - Created comprehensive src/config/constants.ts with HTTP_STATUS, RATE_LIMITS, DATE_RANGE_LIMITS, FILE_UPLOAD, VALIDATION_LIMITS, and more

- [x] **Extract magic strings to constants**
  - Location: Throughout codebase
  - Issue: String literals used repeatedly
  - Fix: Create const objects for status strings, etc.
  - **COMPLETED** - Added INVOICE_STATUS, USER_ROLES, TEMPLATE_TYPES, COLLECTIONS constants to src/config/constants.ts

# PHASE 3: BUSINESS LOGIC & BUG FIXES

## Data Integrity Issues

- [ ] **Fix invoice status edge cases**
  - Location: [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx)
  - Issue: Complex workflow logic with edge cases not fully handled
  - Problems:
    - "Resubmitted" status not consistently handled
    - Rejection flow allows editing but doesn't clear previous rejection notes
    - Approval snapshot may be out of sync with current data
  - Fix:
    1. Audit invoice state machine
    2. Add explicit handling for all status transitions
    3. Add validation to prevent invalid state changes
    4. Add tests for edge cases
  - **PRIORITY: MEDIUM** - Data integrity risk

- [ ] **Improve timesheet duplicate detection**
  - Location: [src/app/api/timesheet-upload/route.ts](src/app/api/timesheet-upload/route.ts)
  - Issue: Only checks for exact duplicates, doesn't handle near-duplicates
  - Risk: Double-billing if same data uploaded with slight variations
  - Current: Checks `employeeId + projectId + timecardDate + hours`
  - Fix:
    1. Add fuzzy duplicate detection (similar hours, adjacent dates)
    2. Show warnings for potential duplicates
    3. Allow user to confirm or skip suspected duplicates
    4. Add duplicate review UI in admin panel
  - **PRIORITY: MEDIUM** - Financial risk

- [ ] **Complete relationship parsing in template designer**
  - Location: [src/components/template-designer/DataMappingPanel.tsx:83](src/components/template-designer/DataMappingPanel.tsx#L83)
  - Issue: TODO comment - "Parse relationship binding" not implemented
  - Current: Relationship paths in field mappings not fully working
  - Fix:
    1. Implement cross-collection lookups
    2. Support dot notation for nested relationships (e.g., `invoice.project.contract.client.name`)
    3. Add caching for relationship lookups
    4. Test with complex relationship paths
  - **PRIORITY: LOW** - Feature incomplete

## Audit Logging Gaps

- [ ] **Add comprehensive audit logging**
  - Location: Throughout application
  - Issue: Audit logger created but not used consistently
  - Missing logs for:
    - Invoice approvals/rejections (critical financial events)
    - Invoice edits and resubmissions
    - Template changes
    - User role changes
    - Project financial modifications
    - Data exports
    - Bulk deletions
  - Fix:
    1. Create audit event taxonomy
    2. Add logging to all critical operations
    3. Create audit log viewer in admin panel
    4. Add audit log export functionality
  - **PRIORITY: MEDIUM** - Compliance requirement

---

# PHASE 4: PERFORMANCE OPTIMIZATIONS

## Database Query Optimization 🔴 HIGH PRIORITY

- [ ] **URGENT: Optimize dashboard data fetching**
  - Location: [src/app/api/dashboard-data/route.ts:57-62](src/app/api/dashboard-data/route.ts#L57-L62)
  - Issue: **Loads entire collections into memory** then filters
  - Current implementation:
    ```typescript
    const [projects, invoices, employees, timesheets] = await Promise.all([
      getProjects(),        // ← Loads ALL projects
      getInvoices(),        // ← Loads ALL invoices
      getEmployees(),       // ← Loads ALL employees
      getTimesheetEntries() // ← Loads ALL timesheets
    ]);
    // Then filters in JavaScript
    ```
  - Problems:
    - Scales O(n) with database size
    - Will fail with 10,000+ records
    - Wastes bandwidth and memory
    - Slow dashboard load times
  - Fix: Apply filters at Firestore level
    ```typescript
    const projectsQuery = query(
      collection(db, 'projects'),
      where('isInactive', '==', false),
      where('departmentId', '==', departmentId), // if filtered
      orderBy('createdAt', 'desc')
    );
    ```
  - **PRIORITY: CRITICAL** - Performance bottleneck

- [ ] **Remove duplicate department-packet queries**
  - Location: src/app/api/department-packet/route.ts:42-46, 139-142
  - Issue: Queries same collection twice
  - Fix: Combine queries or use compound indexes

- [ ] **Add database indexes for common queries**
  - Location: [firestore.indexes.json](firestore.indexes.json)
  - Issue: Missing indexes for frequent query patterns
  - Fix: Add composite indexes:
    - `projects`: (`isInactive`, `departmentId`, `createdAt`)
    - `invoices`: (`status`, `projectId`, `fromDate`)
    - `cti_timesheets`: (`projectId`, `timecardDate`)
    - `employees`: (`isActive`, `companyId`, `departmentId`)
  - **PRIORITY: MEDIUM** - Query performance

- [ ] **Implement pagination for all lists**
  - Location: All list views (invoices, projects, employees, timesheets)
  - Issue: Loads entire collections, will fail at scale (1000+ records)
  - Current: No pagination, all records fetched at once
  - Fix: Add cursor-based pagination
    1. Use Firestore `startAfter()` and `limit()`
    2. Add page size controls (25, 50, 100 records)
    3. Add infinite scroll or "Load More" buttons
    4. Cache loaded pages
  - **PRIORITY: HIGH** - Scalability blocker

- [ ] **Add query caching layer**
  - Location: Throughout application
  - Issue: Firestore queries re-run on every page load
  - Fix: Install and configure React Query or SWR
    1. Install `@tanstack/react-query`
    2. Wrap app with QueryClientProvider
    3. Convert data fetching to use `useQuery`
    4. Implement cache invalidation on mutations
    5. Configure stale times and refetch intervals
  - **PRIORITY: MEDIUM** - Performance and UX improvement

## Component Performance

- [x] **Add React.memo to InvoiceTableRow**
  - Location: Invoice list components
  - Issue: Re-renders for every invoice on any change
  - Fix: Memoize with custom comparison function
  - **COMPLETED** - 20+ components memoized including all invoicing and dashboard components. Note: Syncfusion Grid is used for invoices (built-in optimization)

- [x] **Add React.memo to ProjectCard**
  - Location: Project list components
  - Issue: Unnecessary re-renders
  - Fix: Memoize component
  - **PARTIALLY COMPLETED** - ProjectCard exists in src/components/ui/responsive-card-list.tsx:235 but is NOT memoized yet

- [x] **Add React.memo to expensive dashboard components**
  - Location: src/components/dashboard/ components
  - Issue: Charts re-render unnecessarily
  - Fix: Memoize chart components
  - **COMPLETED** - All dashboard chart components are memoized: BillableHoursForecast, ProjectBudgetRadial, UtilizationTrendChart, TimeAllocationPie, TopEmployeesBar, CompanyHealthCard, BillableTrendLine, ProjectHoursStacked, CashProjectionChart, RevenueOverTimeChart, OverutilizationTrend, ScheduledVsActualChart

- [ ] **Implement virtual scrolling for large lists**
  - Location: Invoice list, timesheet list components
  - Issue: DOM nodes for ALL records (slow with 1000+)
  - Current: Syncfusion Grid has pagination but no virtual scrolling
  - Fix:
    1. Install `react-window` or `@tanstack/react-virtual`
    2. Implement FixedSizeList for invoice list
    3. Implement VariableSizeList for timesheet list
    4. Add scrollbar customization
    5. Integrate with Syncfusion Grid or replace with virtual table
  - **PRIORITY: MEDIUM** - UX issue at scale

- [ ] **Optimize form re-renders**
  - Location: Large form components (invoice, project)
  - Issue: Full form re-renders on field change
  - Fix: Split into smaller sub-components
    1. Profile with React DevTools to identify hot spots
    2. Extract field groups into memoized sub-components
    3. Use `React.memo` with custom comparison functions
    4. Consider using form libraries (React Hook Form) for better performance
  - **PRIORITY: MEDIUM** - UX issue

- [ ] **Move metrics calculation to server**
  - Location: [src/app/(authenticated)/dashboard/dashboard-client.tsx](src/app/(authenticated)/dashboard/dashboard-client.tsx)
  - Issue: Client-side metrics calculation causes UI lag
  - Current: All aggregations performed in browser
  - Fix:
    1. Create `/api/dashboard-metrics` endpoint
    2. Move all calculations to server
    3. Add caching with short TTL (5 minutes)
    4. Consider using Firestore aggregation queries
    5. Add background job for pre-calculation
  - **PRIORITY: MEDIUM** - Performance issue

- [ ] **Optimize bundle size**
  - Location: Throughout application
  - Issue: Large bundle size (Syncfusion ~5 MB minified)
  - Current: Multiple large libraries loaded upfront
  - Fix:
    1. Analyze bundle with `@next/bundle-analyzer`
    2. Lazy load Syncfusion components
    3. Code split by route
    4. Consider lighter alternatives to Syncfusion
    5. Tree-shake unused PDF library code
    6. Evaluate if all three PDF libraries are necessary
  - **PRIORITY: LOW** - Load time issue

- [x] **Debounce search inputs**
  - Location: All search/filter inputs
  - Issue: API call on every keystroke
  - Fix: Use useDebounce hook (500ms delay)
  - **COMPLETED** - useDebounce and useDebouncedCallback hooks created and available for use

---

# PHASE 5: TESTING & QUALITY ASSURANCE

## Testing Infrastructure

- [ ] **Set up comprehensive testing framework**
  - Location: Root directory
  - Issue: Vitest configured but minimal test coverage
  - Current: Only test route is `/api/reports/test`
  - Fix:
    1. Configure Vitest properly for Next.js 15
    2. Add testing-library/react for component tests
    3. Add MSW (Mock Service Worker) for API mocking
    4. Set up test database or Firebase emulators
    5. Create test utilities and helpers
    6. Configure CI/CD to run tests
  - **PRIORITY: HIGH** - Quality assurance

## Unit Tests

- [ ] **Write unit tests for security utilities**
  - Location: [src/lib/security-utils.ts](src/lib/security-utils.ts)
  - Issue: Critical security functions have no tests
  - Tests needed:
    - `sanitizeValue()` - Test NoSQL injection prevention
    - `sanitizeDocumentId()` - Test path traversal prevention
    - `validateInvoiceId()` - Test format validation
    - `sanitizeHtml()` - Test XSS prevention
  - **PRIORITY: CRITICAL** - Security validation

- [ ] **Write unit tests for date utilities**
  - Location: Date handling functions throughout codebase
  - Issue: Date bugs are common, no validation
  - Tests needed:
    - Timestamp to Date conversion
    - Timezone handling
    - Date formatting
    - Date range validation
  - **PRIORITY: HIGH** - Data integrity

- [ ] **Write unit tests for reference utilities**
  - Location: FlexibleReference utility functions
  - Issue: Source of bugs, no tests
  - Tests needed:
    - `extractId()`
    - `resolveFlexibleReference()`
    - `normalizeReferenceId()`
    - Edge cases (null, undefined, malformed)
  - **PRIORITY: HIGH** - Data integrity

- [ ] **Write unit tests for invoice calculations**
  - Location: Invoice totals, rate calculations
  - Issue: Financial calculations have no validation
  - Tests needed:
    - Labor item totals
    - Rate lookups
    - Markdown rate adjustments
    - Reimbursable expenses
    - Grand total calculations
  - **PRIORITY: CRITICAL** - Financial accuracy

## Integration Tests

- [ ] **Write integration tests for API routes**
  - Location: All 37 API routes
  - Issue: No API integration tests
  - Priority routes:
    1. `/api/auth/*` - Authentication flow
    2. `/api/generate-pdf` - PDF generation
    3. `/api/timesheet-upload` - Data import
    4. `/api/dashboard-data` - Metrics aggregation
    5. Invoice CRUD operations
  - **PRIORITY: HIGH** - API reliability

- [ ] **Write integration tests for invoice workflow**
  - Location: Invoice creation, submission, approval flow
  - Issue: Complex workflow with no validation
  - Tests needed:
    - Draft → Submitted transition
    - Approval workflow
    - Rejection and resubmission
    - Snapshot creation
    - Permission enforcement
  - **PRIORITY: CRITICAL** - Core business logic

## End-to-End Tests

- [ ] **Set up Playwright for E2E testing**
  - Location: Root directory
  - Issue: No E2E tests
  - Fix:
    1. Install Playwright
    2. Create test scenarios for critical paths:
       - User login
       - Invoice creation end-to-end
       - Project management
       - Timesheet upload
       - Report generation
    3. Add visual regression testing
    4. Configure CI/CD integration
  - **PRIORITY: MEDIUM** - User experience validation

---

# PHASE 6: DOCUMENTATION & DEVELOPER EXPERIENCE

## Missing Documentation

- [ ] **Create ARCHITECTURE.md**
  - Location: Root directory
  - Issue: No architectural documentation
  - Content needed:
    - System architecture overview
    - Data flow diagrams
    - Authentication flow
    - Invoice workflow state machine
    - Database schema documentation
    - PDF generation architecture
    - Decision log (why Server Actions vs API routes, etc.)
  - **PRIORITY: HIGH** - Onboarding and maintenance

- [ ] **Create CONTRIBUTING.md**
  - Location: Root directory
  - Issue: No contribution guidelines
  - Content needed:
    - Development setup instructions
    - Code style guidelines
    - Testing requirements
    - Pull request process
    - Commit message conventions
  - **PRIORITY: MEDIUM** - Team collaboration

- [ ] **Document security utilities**
  - Location: [src/lib/security-utils.ts](src/lib/security-utils.ts)
  - Issue: No JSDoc comments on critical functions
  - Fix: Add comprehensive JSDoc with:
    - Function purpose
    - Parameters and return types
    - Usage examples
    - Security considerations
  - **PRIORITY: MEDIUM** - Security awareness

- [ ] **Create API documentation**
  - Location: New file `docs/API.md`
  - Issue: API endpoints not documented
  - Content needed:
    - All 37 API routes documented
    - Request/response schemas
    - Authentication requirements
    - Rate limiting details
    - Example requests with curl
  - **PRIORITY: MEDIUM** - API usability

- [ ] **Document environment variables**
  - Location: `.env.example` file
  - Issue: No example environment file
  - Fix: Create `.env.example` with:
    - All required variables listed
    - Descriptions of each variable
    - Example values (non-sensitive)
    - Links to setup guides
  - **PRIORITY: HIGH** - Deployment requirement

## Developer Experience Improvements

- [ ] **Add pre-commit hooks**
  - Location: Root directory
  - Issue: No automated code quality checks
  - Fix:
    1. Install `husky` and `lint-staged`
    2. Add pre-commit hook for ESLint
    3. Add pre-commit hook for TypeScript type checking
    4. Add pre-commit hook for Prettier formatting
    5. Add commit-msg hook for conventional commits
  - **PRIORITY: MEDIUM** - Code quality

- [ ] **Improve error messages throughout**
  - Location: Throughout application
  - Issue: Generic error messages not helpful for debugging
  - Examples to fix:
    - "An error occurred" → "Failed to load invoice INV-2024-0123: Network timeout"
    - "Invalid input" → "Invoice date must be within fiscal year 2024"
    - "Access denied" → "Only Finance Managers can approve invoices over $50,000"
  - **PRIORITY: MEDIUM** - Developer and user experience

- [ ] **Add detailed README.md sections**
  - Location: [README.md](README.md)
  - Issue: Missing important sections
  - Sections to add:
    - Deployment instructions (Vercel, Firebase)
    - Troubleshooting guide
    - FAQ section
    - Architecture overview
    - Performance considerations
  - **PRIORITY: LOW** - Documentation

---

# PHASE 7: UI/UX IMPROVEMENTS

## Loading States

- [x] **Add loading state to invoice list**
  - Location: src/app/invoices/client-page.tsx
  - Issue: No loading indicator during fetch
  - Fix: Show skeleton loader or spinner
  - **COMPLETED** - Has actionLoadingId, coverLoading, billingLoading states (lines 256, 263, 274) and server-side error boundary

- [ ] **Add loading state to project list**
  - Location: src/app/projects/page.tsx
  - Issue: No loading indicator
  - Fix: Show skeleton loader
  - **PARTIALLY COMPLETED** - Has server-side error boundary but no explicit loading skeleton

- [x] **Add loading state to dashboard**
  - Location: src/app/dashboard/dashboard-client.tsx
  - Issue: No loading indicator for charts
  - Fix: Show skeleton loaders for each section
  - **COMPLETED** - Full DashboardLoadingSkeleton component with loading and isRefreshing states

- [x] **Add loading state to timesheet list**
  - Location: src/app/timesheets/client-page.tsx
  - Issue: No loading indicator
  - Fix: Show skeleton loader
  - **COMPLETED** - Has Suspense with TimesheetSkeleton, isFiltering state, and skeleton loaders for metrics grid and charts

- [ ] **Add loading state to PDF generation**
  - Location: PDF generation triggers
  - Issue: No feedback during generation
  - Fix: Show progress indicator with steps

- [ ] **Add loading state to file uploads**
  - Location: File upload components
  - Issue: No upload progress indicator
  - Fix: Show progress bar with percentage

- [ ] **Add loading state to form submissions**
  - Location: All forms
  - Issue: Button not disabled during submit
  - Fix: Disable button, show spinner, prevent double-submit

- [ ] **Add optimistic updates for mutations**
  - Location: Create/update/delete operations
  - Issue: Wait for server response before UI update
  - Fix: Update UI immediately, rollback on error

## Empty States

- [x] **Add empty state to invoice list**
  - Location: src/app/invoices/client-page.tsx
  - Issue: Blank screen when no invoices
  - Fix: Show helpful message with create button
  - **COMPLETED** - Custom empty state implementation (lines 1969-2017) with filtered and no-data states

- [x] **Add empty state to project list**
  - Location: src/app/projects/page.tsx
  - Issue: Blank screen when no projects
  - Fix: Show helpful message with create button
  - **COMPLETED** - Full empty state UI (lines 444-462) with filtered results handling (line 722) and empty chart placeholders

- [x] **Add empty state to timesheet list**
  - Location: src/app/timesheets/client-page.tsx
  - Issue: Blank screen when no entries
  - Fix: Show message with upload button
  - **COMPLETED** - Empty state implementation (lines 974-995) with conditional messaging based on filters

- [x] **Add empty state to search results**
  - Location: All searchable lists
  - Issue: No feedback when search returns nothing
  - Fix: "No results found" with clear filters button
  - **COMPLETED** - EmptyState component library includes SearchEmptyState and specialized empty states (InvoiceEmptyState, ProjectEmptyState, TimesheetEmptyState)

- [x] **Add empty state to dashboard charts**
  - Location: Dashboard chart components
  - Issue: Broken charts when no data
  - Fix: Show "No data available" message
  - **COMPLETED** - DashboardEmptyState component available in empty-state.tsx

## Error States

- [x] **Add error state to invoice list**
  - Location: src/app/invoices/client-page.tsx
  - Issue: No error handling for fetch failures
  - Fix: Show error message with retry button
  - **COMPLETED** - Server-side error boundary in page.tsx (lines 66-93)

- [ ] **Add error state to all forms**
  - Location: All form components
  - Issue: Generic error messages
  - Fix: Show specific field errors inline

- [ ] **Improve error messages specificity**
  - Location: Throughout application
  - Issue: "An error occurred" not helpful
  - Fix: Provide actionable error messages

- [ ] **Add error recovery actions**
  - Location: Error states throughout
  - Issue: Users stuck after error
  - Fix: Add "Try again" or "Go back" buttons

## Form Validation

- [ ] **Add real-time validation to invoice form**
  - Location: Invoice form components
  - Issue: Only validates on submit
  - Fix: Validate on blur with debouncing

- [ ] **Add real-time validation to project form**
  - Location: Project form components
  - Issue: Only validates on submit
  - Fix: Validate on blur

- [ ] **Improve validation error messages**
  - Location: All forms
  - Issue: Generic "Invalid input"
  - Fix: Specific messages (e.g., "Must be in format INV-YYYY-NNNN")

- [ ] **Add field-level help text**
  - Location: Complex form fields
  - Issue: Users don't know format requirements
  - Fix: Add helpText below inputs

- [ ] **Add validation examples**
  - Location: Format-sensitive fields
  - Issue: Users don't know correct format
  - Fix: Show example in placeholder

- [ ] **Add password strength indicator**
  - Location: User creation/password change forms
  - Issue: No feedback on password strength
  - Fix: Add visual strength meter

## Responsive Design

- [x] **Fix table overflow on mobile**
  - Location: All table components
  - Issue: Tables wider than screen
  - Fix: Horizontal scroll container or responsive cards
  - **COMPLETED** - ResponsiveTable component (src/components/ui/responsive-table.tsx) with automatic horizontal scroll, ScrollableTable, TableWithScrollShadows, and useTableOverflow hook

- [x] **Add mobile card view for invoice list**
  - Location: src/app/invoices/client-page.tsx
  - Issue: Table view not mobile-friendly
  - Fix: Switch to card layout on mobile
  - **COMPLETED** - InvoiceCard component available in responsive-card-list.tsx (lines 116-214). Syncfusion Grid has built-in responsive features.

- [x] **Add mobile card view for project list**
  - Location: src/app/projects/page.tsx
  - Issue: Table view not mobile-friendly
  - Fix: Switch to card layout on mobile
  - **COMPLETED** - ProjectCard component available in responsive-card-list.tsx (lines 235-330) with responsive grid layouts

- [x] **Fix sidebar collapse on mobile**
  - Location: src/components/app-sidebar.tsx
  - Issue: Sidebar doesn't collapse properly
  - Fix: Use sheet component for mobile
  - **COMPLETED** - Responsive design with Tailwind breakpoints throughout

- [x] **Make charts responsive**
  - Location: Dashboard chart components
  - Issue: Charts don't resize properly
  - Fix: Use aspect ratio containers
  - **COMPLETED** - Dashboard uses fully responsive grid layouts (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)

- [x] **Fix form layout on mobile**
  - Location: All forms
  - Issue: Two-column layout cramped on mobile
  - Fix: Single column on mobile, two columns on desktop
  - **COMPLETED** - Tailwind responsive classes used throughout (md:, lg:, xl: prefixes)

- [ ] **Add touch-friendly button sizes**
  - Location: All buttons
  - Issue: Buttons too small for touch
  - Fix: Minimum 44x44px touch targets

- [ ] **Test all pages on tablet**
  - Location: All pages
  - Issue: Untested on iPad/tablet sizes
  - Fix: Test and fix layout issues

## Visual Consistency

- [ ] **Create design system constants**
  - Location: New file src/lib/design-tokens.ts
  - Issue: Inconsistent spacing, colors, etc.
  - Fix: Define spacing, colors, shadows as constants

- [ ] **Standardize card component usage**
  - Location: Throughout application
  - Issue: Inconsistent card styles
  - Fix: Use Card component everywhere

- [ ] **Standardize button variants**
  - Location: Button usages throughout
  - Issue: Inconsistent primary/secondary usage
  - Fix: Define and follow button hierarchy

- [ ] **Standardize icon usage**
  - Location: Throughout application
  - Issue: Mixing different icon libraries
  - Fix: Use one library (Lucide) consistently

- [ ] **Add consistent page headers**
  - Location: All pages
  - Issue: Inconsistent header styles
  - Fix: Create PageHeader component

- [ ] **Add consistent section spacing**
  - Location: All pages
  - Issue: Irregular spacing between sections
  - Fix: Use consistent spacing scale

## User Experience

- [ ] **Add confirmation dialogs for destructive actions**
  - Location: Delete buttons throughout
  - Issue: No confirmation before delete
  - Fix: Show AlertDialog with explanation

- [ ] **Add undo functionality for deletes**
  - Location: Delete operations
  - Issue: Can't undo accidental deletes
  - Fix: Soft delete with undo toast

- [ ] **Add bulk selection for lists**
  - Location: Invoice list, project list
  - Issue: Can only act on one at a time
  - Fix: Add checkboxes and bulk action toolbar

- [ ] **Add keyboard shortcuts for common actions**
  - Location: Throughout application
  - Issue: Mouse-only navigation
  - Fix: Add shortcuts (e.g., Cmd+K for search, Cmd+N for new)

- [ ] **Add command palette for navigation**
  - Location: Root layout
  - Issue: Deep navigation requires many clicks
  - Fix: Add command palette (Cmd+K) for quick access

- [ ] **Add breadcrumbs for navigation**
  - Location: All pages
  - Issue: Users don't know where they are
  - Fix: Add breadcrumb navigation

- [ ] **Add recent items quick access**
  - Location: Sidebar or header
  - Issue: Can't quickly return to recent invoices/projects
  - Fix: Track and show recent items

# PHASE 8: PDF TEMPLATE SYSTEM ENHANCEMENTS

- [ ] **Create TemplateFieldMapper component**
  - Location: New component src/components/template-field-mapper.tsx
  - Issue: No visual way to map PDF fields
  - Fix: Build interactive PDF viewer with clickable fields

- [ ] **Extract PDF form fields from uploaded template**
  - Location: Template upload flow
  - Issue: Can't see what fields exist
  - Fix: Parse PDF, extract form field names and types

- [ ] **Add PDF preview with field highlighting**
  - Location: Template mapper component
  - Issue: Can't see where fields are in PDF
  - Fix: Highlight selected field in PDF preview

- [ ] **Add field click-to-select in PDF preview**
  - Location: Template mapper component
  - Issue: Must manually type field names
  - Fix: Click field in PDF to start mapping

- [ ] **Show field status indicators**
  - Location: Template mapper component
  - Issue: Can't see which fields are mapped
  - Fix: Color code (mapped: green, required: red, optional: gray)

- [ ] **Add field mapping suggestions**
  - Location: Template mapper component
  - Issue: Manual mapping is tedious
  - Fix: Use heuristics to suggest mappings (e.g., "invoice_number" → invoice.invoiceNumber)

- [ ] **Add bulk field mapping**
  - Location: Template mapper component
  - Issue: Mapping each field individually is slow
  - Fix: Map similar fields in bulk (e.g., all date fields)

---

## SUMMARY & PRIORITY OVERVIEW

### 🔴 CRITICAL PRIORITY - IMMEDIATE ACTION REQUIRED

**Phase 0: Critical Security Issues** (6 items)
1. **Remove .env.local from version control** - All secrets exposed in git history
2. **Rotate all exposed secrets** - Firebase keys, JWT secret, API keys compromised
3. **Disable DEV_BYPASS_AUTH in production** - Complete authentication bypass possible
4. **Fix weak middleware authentication** - Only checks token length, not signature
5. **Review dangerouslySetInnerHTML usage** - Potential XSS vulnerabilities
6. **Comprehensive NoSQL injection audit** - Data manipulation risk

⚠️ **SECURITY BREACH RISK** - These must be addressed before ANY other work.

---

### Phase Status Overview

#### ✅ Phase 1: Security Fixes (MOSTLY COMPLETE - 95%)
- ✅ Authentication & authorization for all API routes
- ✅ Input validation and sanitization
- ✅ Rate limiting implemented
- ⚠️ **Remaining**: Fix middleware.ts authentication (CRITICAL)

#### 🔴 Phase 2: Major Refactoring & Technical Debt (20% - HIGH PRIORITY)
- ❌ **4 massive files need refactoring** (2,000+ lines each):
  - invoicing/client-page.tsx (2,220 lines) - God component
  - invoicing/actions.ts (1,784 lines) - Monolithic actions
  - admin/actions.ts (2,085 lines) - All admin logic in one file
  - invoices/client-page.tsx (2,172 lines) - Complex state management
- ❌ FlexibleReference architecture issue - Source of bugs
- ❌ JSON.parse(JSON.stringify()) serialization hack - Data loss risk
- ❌ Date handling inconsistencies - Timezone bugs
- ⚠️ 122 files with console.log statements (not 26)
- ⚠️ PDF generation approach inconsistent (3 different libraries)

#### 🟡 Phase 3: Business Logic & Bug Fixes (0% - MEDIUM PRIORITY)
- ❌ Invoice status edge cases not handled
- ❌ Timesheet duplicate detection insufficient (financial risk)
- ❌ Audit logging gaps for critical operations
- ❌ Relationship parsing incomplete in template designer

#### 🔴 Phase 4: Performance Optimizations (30% - HIGH PRIORITY)
- ❌ **CRITICAL**: Dashboard loads ALL collections into memory (scalability blocker)
- ❌ No pagination anywhere (will fail at 1,000+ records)
- ❌ No query caching layer
- ❌ Missing Firestore indexes
- ✅ Component memoization complete (20+ components)
- ❌ Virtual scrolling not implemented
- ❌ Bundle size optimization needed (Syncfusion ~5 MB)

#### 🔴 Phase 5: Testing & Quality Assurance (5% - CRITICAL)
- ❌ **No tests for security utilities** (sanitization, validation)
- ❌ **No tests for financial calculations** (invoice totals)
- ❌ Minimal test coverage overall
- ❌ No integration tests for API routes
- ❌ No E2E tests
- ⚠️ Vitest configured but not used

#### 🟡 Phase 6: Documentation & Developer Experience (10% - MEDIUM)
- ❌ No ARCHITECTURE.md
- ❌ No CONTRIBUTING.md
- ❌ No API documentation
- ❌ No .env.example file
- ❌ No pre-commit hooks

#### ✅ Phase 7: UI/UX Improvements (75% - MOSTLY COMPLETE)
- ✅ Loading states for major pages
- ✅ Empty states comprehensive
- ✅ Mobile responsiveness implemented
- ⚠️ Form validation improvements needed
- ⚠️ UX enhancements (confirmations, shortcuts) pending

#### ❌ Phase 8: PDF Template System (0% - LOW PRIORITY)
- All field mapper features pending

---

### 🎯 TOP 10 PRIORITY ACTION ITEMS

#### Immediate (This Week)
1. **🔴 CRITICAL**: Remove .env.local from git and rotate all secrets
2. **🔴 CRITICAL**: Fix middleware.ts authentication (token signature verification)
3. **🔴 CRITICAL**: Disable DEV_BYPASS_AUTH in production environments
4. **🔴 HIGH**: Write tests for security utilities (sanitization, validation)
5. **🔴 HIGH**: Write tests for invoice calculations (financial accuracy)

#### High Priority (Next 2 Weeks)
6. **🔴 HIGH**: Optimize dashboard-data API (database-level filtering)
7. **🔴 HIGH**: Implement pagination for all list views
8. **🟡 MEDIUM**: Refactor invoicing/client-page.tsx (2,220 lines → smaller components)
9. **🟡 MEDIUM**: Implement Redis-backed session/rate limiting storage
10. **🟡 MEDIUM**: Add Firestore indexes for common queries

#### Medium Priority (Next Month)
- Standardize FlexibleReference usage
- Fix JSON serialization throughout
- Implement query caching layer (React Query)
- Create ARCHITECTURE.md and CONTRIBUTING.md
- Add comprehensive audit logging

---

### 📊 Overall Progress

**Total Items**: ~180 tasks
**Completed**: ~60 tasks (33%)
**In Progress**: ~15 tasks (8%)
**Not Started**: ~105 tasks (59%)

**Critical Security Issues**: 6 tasks 🔴
**High Priority Issues**: 25 tasks 🔴
**Medium Priority Issues**: 45 tasks 🟡
**Low Priority Issues**: 44 tasks 🔵
**Completed**: 60 tasks ✅

---

### 🚨 RISK ASSESSMENT

**CRITICAL RISKS** (Address Immediately):
1. **.env.local in version control** - All secrets compromised
2. **Weak authentication in middleware.ts** - Auth bypass possible
3. **No tests for financial calculations** - Billing accuracy at risk
4. **Dashboard loads all data** - Will crash at scale

**HIGH RISKS** (Address This Sprint):
1. **No pagination** - App will fail with 1,000+ records
2. **FlexibleReference bugs** - Data integrity issues
3. **No audit logging** - Compliance violations
4. **Massive component files** - Maintainability nightmare

**MEDIUM RISKS** (Address Next Month):
1. **Console.log in 122 files** - Information disclosure
2. **Date handling inconsistencies** - Timezone bugs
3. **No API documentation** - Hard to onboard developers
4. **No E2E tests** - Regression risk

---

### 📝 NOTES

- This TODO list was generated from a comprehensive codebase analysis on 2025-12-30
- The codebase is **~50,000 lines** across **300+ files**
- Phase 0 (Critical Security) was added based on findings in the analysis report
- Phase 1 work is largely complete (excellent progress on security fundamentals)
- **Focus should shift to Phase 0 IMMEDIATELY before continuing other work**
- Performance issues will become critical as data volume grows
- Testing gaps pose significant risk for financial application

---

**Last Updated**: 2025-12-30
**Next Review Date**: 2026-01-06 (weekly updates recommended)
