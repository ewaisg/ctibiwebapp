# COMPREHENSIVE CODEBASE ANALYSIS REPORT: CTI BI Web Application

**Analysis Date:** 2025-12-30
**Analyzed By:** Claude Code
**Project Path:** `/Users/ewaisg/Documents/DevOps/ctibiwebapp`

---

## PROJECT OVERVIEW AND PURPOSE

**CTI BI Web App** is a comprehensive Next.js 15 business intelligence platform designed for CTI operations management. It provides end-to-end functionality for:

- Timesheet management and tracking
- Project and contract management
- Invoice creation, approval workflows, and payment tracking
- Manpower utilization and resource allocation
- Executive, financial, and operational dashboards
- PDF generation for reports and invoices
- Template management and field mapping

**Project Scale:**
- ~370 TypeScript files
- ~78,000 lines of code
- 19 authenticated pages
- 37 API routes
- 172+ UI/feature components
- 83+ library utilities

---

## TECHNOLOGY STACK

### Core Framework & Runtime
- **Next.js 16.0.7** (App Router architecture)
- **React 19.2.1** (latest stable)
- **TypeScript 5** (strict mode enabled)
- **Node.js 20+** required

### UI & Styling
- **Tailwind CSS 4** (latest)
- **Radix UI** primitives (20+ components: dialogs, popovers, dropdowns, etc.)
- **shadcn/ui** component library
- **Lucide React** icons
- **Tabler Icons**
- **Motion** (framer-motion successor) for animations
- **next-themes** for dark/light mode

### Backend & Database
- **Firebase 12.2.1** (client SDK)
- **Firebase Admin 13.5.0** (server SDK)
- **Firestore** (primary database)
- **Firebase Storage** (file uploads)
- **Firebase Authentication** (user management)

### PDF & Document Handling
- **Syncfusion PDF Viewer** (commercial license)
- **jsPDF 3.0.2**
- **pdf-lib 1.17.1**
- **pdfjs-dist 5.4.449**
- **Handlebars** (templating)
- **Fabric.js 5.3.0** (canvas manipulation)
- **html-to-image**

### Data Processing
- **xlsx** (Excel imports)
- **date-fns 4.1.0** (date manipulation)
- **zod 4.1.5** (schema validation)
- **react-hook-form 7.62.0** (form handling)
- **recharts 2.15.4** (charts)

### Security & Auth
- **jose 5.10.0** (JWT handling)
- **isomorphic-dompurify 2.26.0** (XSS prevention)
- Custom middleware for CSRF, rate limiting, auth

### Development Tools
- **ESLint 9** with Next.js config
- **Vitest 0.30.0** (testing - minimal test coverage)
- TypeScript path aliases (`@/*`)

---

## ARCHITECTURE AND FOLDER STRUCTURE

### High-Level Architecture Pattern
**Server-Side Rendering (SSR) + Client-Side Hydration**
- Server Components for data fetching
- Client Components for interactivity
- API routes for server-side operations
- Middleware for security and auth

### Directory Structure

```
ctibiwebapp/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (authenticated)/          # Protected route group
│   │   │   ├── admin/                # Admin panel, templates, PDF config
│   │   │   ├── dashboard/            # Executive dashboard
│   │   │   ├── invoices/             # Invoice list view
│   │   │   ├── invoicing/            # Invoice creation/editing
│   │   │   ├── manpower/             # Resource allocation
│   │   │   ├── profile/              # User profile
│   │   │   ├── projects/             # Project management
│   │   │   ├── reports/              # Report generation
│   │   │   ├── timesheets/           # Timesheet uploads
│   │   │   └── utilization/          # Utilization reports
│   │   ├── api/                      # 37 API routes
│   │   │   ├── auth/                 # CSRF, session, set-claim
│   │   │   ├── contracts/            # Contract CRUD
│   │   │   ├── coverpage/            # Cover page generation
│   │   │   ├── dashboard-data/       # Dashboard aggregation
│   │   │   ├── department-packet/    # Departmental reports
│   │   │   ├── departments/          # Department CRUD
│   │   │   ├── employees/            # Employee CRUD
│   │   │   ├── generate-pdf/         # PDF generation endpoint
│   │   │   ├── pdf-templates/        # Template management
│   │   │   ├── projects/             # Project CRUD
│   │   │   ├── reports/              # Report generation
│   │   │   ├── system/               # Data export/deletion
│   │   │   ├── template-assignments/ # Template assignments
│   │   │   ├── templates/            # Template upload/detection
│   │   │   ├── timesheet-upload/     # Timesheet processing
│   │   │   └── visual-templates/     # Visual template designer
│   │   ├── login/                    # Login page
│   │   ├── page.tsx                  # Root redirect
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/                   # 172+ React components
│   │   ├── charts/                   # Dashboard charts
│   │   ├── dashboard/                # Dashboard components
│   │   │   ├── executive/            # Executive metrics
│   │   │   ├── financial/            # Financial metrics
│   │   │   └── resource/             # Resource metrics
│   │   ├── form-designer/            # Syncfusion form designer
│   │   ├── invoicing/                # Invoice form components
│   │   ├── manpower/                 # Workload planning
│   │   ├── pdf-field-mapper/         # PDF field mapping
│   │   ├── pdf-viewer/               # Syncfusion PDF viewer
│   │   ├── projects/                 # Project components
│   │   ├── reports/                  # Report generation UI
│   │   ├── system-settings/          # Data management
│   │   ├── template-designer/        # Visual template designer
│   │   ├── templates/                # Template management
│   │   ├── timesheets/               # Timesheet components
│   │   ├── ui/                       # 53 reusable UI components
│   │   └── utilization/              # Utilization charts
│   │
│   ├── hooks/                        # 16 custom React hooks
│   │   ├── use-auth.ts               # Authentication hook
│   │   ├── use-autofill.ts           # Invoice autofill logic
│   │   ├── use-invoice-form.ts       # Invoice form state
│   │   ├── use-keyboard-shortcut.ts  # Keyboard shortcuts
│   │   └── ...                       # Other utility hooks
│   │
│   ├── lib/                          # 83+ utility libraries
│   │   ├── firebase-client.ts        # Client Firebase init
│   │   ├── firebase-admin.ts         # Admin SDK init
│   │   ├── auth-middleware.ts        # withAuth, withRateLimit
│   │   ├── security-utils.ts         # Sanitization functions
│   │   ├── audit-logger.ts           # Security logging
│   │   ├── api-error-handler.ts      # Error handling
│   │   ├── pdf-generation/           # PDF generation library
│   │   │   ├── components/           # Reusable PDF elements
│   │   │   ├── constants/            # Design tokens, layout
│   │   │   ├── generators/           # Specific PDF generators
│   │   │   ├── templates/            # PDF templates
│   │   │   └── utils/                # PDF utilities
│   │   ├── metrics/                  # Dashboard calculations
│   │   ├── report-processors/        # Report data processing
│   │   └── report-templates/         # Report definitions
│   │
│   ├── services/                     # Data access layer
│   │   ├── firestore.ts              # Firestore CRUD operations
│   │   └── roles.ts                  # Role permissions
│   │
│   ├── types/                        # TypeScript definitions
│   │   ├── index.ts                  # 809 lines - main types
│   │   ├── dashboard.ts              # Dashboard types
│   │   ├── pdf-field-mapper.ts       # PDF mapper types
│   │   └── template-designer.ts      # Template types
│   │
│   └── config/                       # Configuration
│       ├── constants.ts              # App-wide constants
│       └── pay-items.ts              # Payroll codes
│
├── public/                           # Static assets
│   ├── service-worker.js             # PWA support
│   ├── CTI_Icon.svg                  # App icon
│   └── themes/                       # Syncfusion themes
│
├── middleware.ts                     # Security middleware
├── next.config.ts                    # Next.js config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── firestore.indexes.json            # Firestore indexes
└── .env.local                        # Environment variables
```

---

## CORE FEATURES AND FUNCTIONALITIES

### 1. Authentication & Authorization
**Location:** [src/hooks/use-auth.ts](src/hooks/use-auth.ts), [src/lib/auth-middleware.ts](src/lib/auth-middleware.ts), [middleware.ts](middleware.ts)

**Features:**
- Firebase Authentication integration
- Session cookie management
- Role-based access control (Admin, Prime, Subconsultant, Viewer)
- Custom claims in JWT tokens
- Remember me functionality (localStorage vs sessionStorage)
- Password reset via email
- Optional debug logging (localStorage flag)

**Security Measures:**
- CSRF token validation
- Rate limiting on auth endpoints (100 requests/15 min)
- Server-side token verification
- Audit logging for login attempts
- Protected routes via middleware
- Dev bypass mode for development (`DEV_BYPASS_AUTH=true`)

**Issues:**
- Debug mode enabled via localStorage (security concern in production)
- Many `console.log` statements in auth flow
- Weak authentication check in [middleware.ts:156-159](middleware.ts#L156-L159) (only checks token length > 0)

### 2. Invoice Management System
**Location:** [src/app/(authenticated)/invoicing/](src/app/(authenticated)/invoicing/), [src/components/invoicing/](src/components/invoicing/)

**Features:**
- Invoice creation wizard with steps:
  1. Department selection
  2. Project selection
  3. Date range and metadata
  4. Invoice items (labor)
  5. Reimbursable expenses
  6. File attachments
- Autofill from timesheet data
- Manual entry mode
- Historical invoice entry
- Multi-step workflow (Draft → Submitted → Approved/Rejected)
- Role-based actions (Subconsultant submits, Prime/Admin approves)
- PDF generation for invoices
- Financial tracking and contract summaries
- Immutable approval snapshots
- Submitted snapshot preservation

**Invoice Workflow:**
- **Draft** → Author can edit
- **Submitted** → Prime/Admin can approve/reject
- **Approved** → Immutable (snapshot preserved)
- **Rejected** → Author can resubmit with changes

**Complex Features:**
- Autofill logic fetches timesheet data filtered by:
  - Project
  - Date range
  - Billable pay items
  - Employee assignments
- Rate lookups from `companyRateTemplates` or `rates` collections
- Contract financial tracking (PO amounts, change orders, remaining budget)
- Markdown rate adjustments
- File attachments stored in Firebase Storage

**Issues:**
- 2,220 lines in [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx) (extremely large component)
- 1,784 lines in [src/app/(authenticated)/invoicing/actions.ts](src/app/(authenticated)/invoicing/actions.ts) (needs refactoring)
- Heavy use of `useMemo`, `useCallback`, `useEffect` (24 hooks in one component)
- `JSON.parse(JSON.stringify())` hack for serialization in server actions

### 3. Project Management
**Location:** [src/app/(authenticated)/projects/](src/app/(authenticated)/projects/), [src/components/project-*.tsx](src/components/)

**Features:**
- Project CRUD operations
- Contract association
- Department assignment
- Financial tracking (PO amounts, budgets, hours)
- File uploads per project (stored in Firebase Storage)
- Project team management (assigned companies, employees, services)
- Billing rates per service
- Project completion marking
- Search and filtering

**Data Model:**
```typescript
interface Project {
  id: string; // PO Number
  projectName: string;
  contractId: FlexibleReference;
  departmentId?: FlexibleReference;
  originalPoAmount?: number;
  changeOrderAmount?: number;
  newPoAmount?: number;
  previouslyInvoicedAmount?: number;
  remainingPoAmount?: number;
  budgetedHours?: number;
  usedHours?: number;
  remainingHours?: number;
  assignedCompanies?: { ... }[];
  files?: { fileName, fileUrl, filePath, ... }[];
  isInactive: boolean;
}
```

**Issues:**
- 946 lines in [src/app/(authenticated)/projects/client-page.tsx](src/app/(authenticated)/projects/client-page.tsx)
- Duplicate file upload logic across multiple components

### 4. Timesheet Upload & Processing
**Location:** [src/app/api/timesheet-upload/](src/app/api/timesheet-upload/), [src/components/timesheet-upload-dialog.tsx](src/components/timesheet-upload-dialog.tsx)

**Features:**
- Excel file upload (.xlsx)
- Automatic field detection and mapping
- Data validation and sanitization
- Duplicate detection
- Batch import to Firestore
- Progress tracking UI
- Error reporting per row

**Processing Flow:**
1. Upload Excel file
2. Parse with `xlsx` library
3. Detect columns (flexible mapping)
4. Validate each row (employee ID, dates, hours)
5. Sanitize inputs (remove NoSQL operators)
6. Check for duplicates
7. Batch write to `cti_timesheets` collection

**Issues:**
- Multiple `console.log` statements in [src/app/api/timesheet-upload/route.ts](src/app/api/timesheet-upload/route.ts)
- NoSQL injection risk (partially mitigated with sanitization)
- No proper error recovery for partial imports

### 5. Dashboard & Reporting
**Location:** [src/app/(authenticated)/dashboard/](src/app/(authenticated)/dashboard/), [src/components/dashboard/](src/components/dashboard/), [src/lib/metrics/](src/lib/metrics/)

**Dashboard Types:**
- **Executive Dashboard:** Company health, highlights, hotspot projects, narratives
- **Financial Dashboard:** Revenue trends, AR aging, cash projection
- **Resource Dashboard:** Utilization trends, capacity by segment, overtime signals

**Metrics:**
- Revenue over time
- Top/bottom performing projects
- Employee utilization rates
- Billable vs non-billable hours
- Budget burn rates
- Accounts receivable aging
- Project health scores

**Visualization:**
- Recharts for line/bar/pie charts
- Syncfusion grids for data tables
- Custom chart download to PNG
- Responsive design for mobile

**Issues:**
- 773 lines in [src/app/(authenticated)/dashboard/dashboard-client.tsx](src/app/(authenticated)/dashboard/dashboard-client.tsx)
- Heavy computations on client side (should move to server)
- Multiple `useEffect` with complex dependencies

### 6. PDF Generation & Template System
**Location:** [src/lib/pdf-generation/](src/lib/pdf-generation/), [src/components/pdf-field-mapper/](src/components/pdf-field-mapper/), [src/components/template-designer/](src/components/template-designer/)

**Features:**
- **PDF Generation Library:** Modular, reusable components for PDF creation
  - Header, footer, table, summary section components
  - Professional design tokens (colors, fonts, spacing)
  - Multiple templates (invoice, cover page, reports)
- **Template Upload:** Upload PDF files, detect form fields
- **Field Mapping:** Map PDF fields to Firestore data paths
- **Visual Template Designer:** Drag-and-drop UI for template creation
- **Template Assignments:** Assign templates to contracts, departments, projects
- **Dynamic PDF Generation:** Fill templates with live data

**PDF Generators:**
- Invoice PDFs
- Cover pages
- Timesheet reports
- Labor reports
- MWBE compliance reports
- Sub-consultant breakdown
- PO budget summary
- Departmental project reports
- Overall projects summary package

**Template Resolution Logic:**
1. Check for project-specific template
2. Check for department-specific template
3. Check for contract-specific template
4. Fall back to global template

**Issues:**
- Multiple PDF generation approaches (jsPDF, pdf-lib, Syncfusion)
- Inconsistent error handling
- Large base64 strings in [src/lib/pdf-template-base64.ts](src/lib/pdf-template-base64.ts)
- Multiple `console.log` statements in generators

### 7. Manpower Utilization & Resource Allocation
**Location:** [src/app/(authenticated)/manpower/](src/app/(authenticated)/manpower/), [src/app/(authenticated)/utilization/](src/app/(authenticated)/utilization/)

**Features:**
- Workload planner (assign employees to projects)
- Weekly capacity hours tracking
- Utilization percentage calculations
- Allocation conflicts detection
- Annual utilization charts
- Employee-level utilization reports

**Data Model:**
```typescript
interface Assignment {
  id: string;
  employeeId: FlexibleReference;
  projectId: FlexibleReference;
  allocatedHours: number;
  startDate: Timestamp;
  endDate?: Timestamp;
}
```

### 8. Admin Panel
**Location:** [src/app/(authenticated)/admin/](src/app/(authenticated)/admin/)

**Features:**
- User management (roles, permissions)
- Company, department, division management
- Service definitions
- Contract management
- PDF template management
- Template assignments
- System settings (data export, data deletion)
- Cover page designer
- Department packet generator

**Admin-Only Operations:**
- Set custom claims on users
- Approve/reject invoices
- System-wide data export
- Data deletion (with preview)

**Issues:**
- Backup file present: [src/app/(authenticated)/admin/pdf-templates/client-page-backup.tsx](src/app/(authenticated)/admin/pdf-templates/client-page-backup.tsx)

### 9. Data Import/Export
**Location:** [src/app/api/system/export/](src/app/api/system/export/), [src/app/api/system/deletion/](src/app/api/system/deletion/)

**Features:**
- Export all Firestore data to JSON
- Preview deletion targets before deletion
- Batch deletion with audit logging
- Employee, contract, project imports from Excel
- Validation and duplicate detection

**Issues:**
- Admin-only protection added recently
- Rate limiting added (5 exports/hour, 2 deletions/hour)

### 10. Security Features
**Location:** [middleware.ts](middleware.ts), [src/lib/auth-middleware.ts](src/lib/auth-middleware.ts), [src/lib/security-utils.ts](src/lib/security-utils.ts)

**Security Measures:**
- **Content Security Policy (CSP)** headers
- **HSTS** in production
- **X-Frame-Options: DENY**
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy: strict-origin-when-cross-origin**
- **CSRF token validation** for state-changing requests
- **Rate limiting** on sensitive endpoints
- **Input sanitization** (HTML, NoSQL operators, file paths)
- **Audit logging** (login attempts, access denied, rate limit exceeded)
- **Role-based access control**

**Recent Security Improvements (from TODO list):**
- Added authentication to 9 unprotected API routes
- Added rate limiting to PDF generation, uploads, exports
- Replaced fake auth in deletion route
- Added NoSQL injection prevention
- Added input validation to all endpoints

**Remaining Security Concerns:**
- `.env.local` contains real credentials (committed to repo)
- `DEV_BYPASS_AUTH=true` flag (dangerous if left in production)
- Weak middleware auth check ([middleware.ts:158](middleware.ts#L158): only checks token length)
- Debug logging enabled via localStorage
- 122 files with `console.log` statements

---

## DATABASE SCHEMA AND MODELS

### Firestore Collections

**Note:** The [src/types/index.ts](src/types/index.ts) file is explicitly marked as "source of truth" for all Firestore collections.

#### Core Collections

1. **users**
   - Document ID: `uid` (from Firebase Auth)
   - Fields: `displayName`, `email`, `role`, `companyId`, `isActive`, `createdAt`, `lastLoginAt`
   - Role types: `Admin`, `Prime`, `Subconsultant`, `Viewer`

2. **employees**
   - Document ID: `employeeId` (integer as string)
   - Fields: `firstName`, `lastName`, `companyId`, `departmentId`, `employeeNumber`, `employmentStatus`, `weeklyCapacityHours`, `isAdmin`, `isInternal`, `isSubconsultant`

3. **companies**
   - Document ID: `companyCode`
   - Fields: `companyName`, `companyCode`, `isSubconsultant`, `isInactive`, `diversityCertification` (MWBE/WBE/SBE/None)

4. **divisions**
   - Document ID: `divisionCode`
   - Fields: `divisionName`, `isInactive`

5. **departments**
   - Document ID: `departmentCode`
   - Fields: `divisionId` (FlexibleReference), `departmentName`, `isInactive`

6. **clients**
   - Document ID: auto-generated
   - Fields: `clientName`, `contactName`, `emailAddress`, `phoneNumber`, address fields

7. **contracts**
   - Document ID: auto-generated
   - Fields: `contractName`, `contractNumber`, `clientId` (FlexibleReference), `contractEffectiveDate`, `contractCapacity`, `contractDuration`, `mwbeGoalPercent`

8. **services**
   - Document ID: auto-generated
   - Fields: `serviceName`, `serviceDescription`, `isActive`

9. **projects**
   - Document ID: `poNumber`
   - Fields: `projectName`, `contractId`, `departmentId`, financial fields (`originalPoAmount`, `changeOrderAmount`, etc.), `assignedCompanies`, `files`, `isInactive`

10. **invoices**
    - Document ID: auto-generated
    - Fields: `invoiceNumber`, `projectId`, `contractId`, `fromDate`, `toDate`, `dueDate`, `status`, `invoiceItems`, `reimbursableExpenses`, `pdfUrl`, `pdfVersions`, `approvalSnapshot`, `submittedSnapshot`

11. **cti_timesheets**
    - Document ID: auto-generated
    - Fields: `employeeId`, `projectId`, `timecardDate`, `startTime`, `endTime`, `hours`, `notes`, `payItemCode`

12. **resource_allocations**
    - Document ID: auto-generated
    - Fields: `employeeId`, `projectId`, `allocatedHours`, `startDate`, `endDate`

13. **companyRateTemplates**
    - Document ID: auto-generated
    - Fields: `companyId`, `companyName`, `services` (array of `{ serviceId, serviceName, standardRate, markdownRate }`)

14. **pdfTemplates**
    - Document ID: auto-generated
    - Fields: `templateName`, `templateType`, `base64Data`, `fieldMappings`, `isActive`, `manualOnly`

15. **templateAssignments**
    - Document ID: auto-generated
    - Fields: `assignmentType` (Contract/Department/Project/Global), `assignmentId`, `templateId`, `priority`

16. **visualTemplates**
    - Document ID: auto-generated
    - Fields: `name`, `category`, `elements` (canvas-based design), `dataBindings`

17. **rates**
    - Document ID: auto-generated
    - Fields: `companyId`, `serviceId`, `rate`

18. **paymentTracking**
    - Document ID: auto-generated
    - Fields: `invoiceId`, `projectId`, `invoiceAmount`, `paidAmount`, `outstandingAmount`, `status`, `dueDate`

### FlexibleReference System

**Purpose:** Handle Firestore DocumentReferences and string IDs interchangeably

```typescript
type FlexibleReference = DocumentReference | string;
```

**Utility functions:**
- `extractId()` - Extract string ID from reference
- `resolveFlexibleReference()` - Convert to DocumentReference
- `normalizeReferenceId()` - Ensure string ID
- `buildReferenceMap()` - Create ID → name lookup maps

### Firestore Indexes

Defined in [firestore.indexes.json](firestore.indexes.json):
- `cti_timesheets`: (`employeeId` ASC, `timecardDate` ASC)
- `invoices`: (`projectId` ASC, `status` ASC)
- `resource_allocations`: (`employeeId` ASC, `projectId` ASC)
- `pdfTemplates`: (`isActive` ASC, `createdAt` DESC)
- `projects`: (`contractId` ASC, `createdAt` DESC)
- `projects`: (`departmentId` ASC, `createdAt` DESC)
- `templateAssignments`: (`isActive` ASC, `createdAt` DESC)

---

## API ENDPOINTS AND ROUTES

### Authentication & Session
- `POST /api/auth/csrf` - Generate CSRF token (rate limited: 10/min)
- `POST /api/auth/session` - Create session cookie
- `POST /api/auth/set-claim` - Set custom user claims (Admin only)

### Core Data Management
- `GET /api/contracts` - List all contracts
- `GET /api/departments` - List all departments
- `GET /api/employees` - List all employees
- `GET /api/projects` - List all projects with filtering

### Invoice & Financial
- `POST /api/generate-pdf` - Generate invoice PDF (rate limited: 5/min)
- `GET /api/dashboard-data` - Aggregate dashboard metrics (rate limited: 30/min)

### Timesheet Processing
- `GET /api/timesheet-upload` - Get upload status
- `POST /api/timesheet-upload` - Process Excel upload (rate limited: 10/hour)

### PDF Template Management
- `GET /api/pdf-templates` - List templates
- `GET /api/pdf-templates/[id]` - Get template by ID
- `PUT /api/pdf-templates/[id]` - Update template
- `DELETE /api/pdf-templates/[id]` - Delete template
- `POST /api/pdf-templates/[id]/preview` - Preview template with data
- `POST /api/pdf-templates/extract-fields` - Extract fields from PDF
- `GET /api/pdf-templates/mapped` - List templates with field mappings

### Template System
- `POST /api/templates/upload` - Upload PDF template
- `POST /api/templates/detect-fields` - Detect form fields in PDF
- `PUT /api/templates/update-mappings` - Update field mappings
- `DELETE /api/templates/delete` - Delete template

### Template Assignments
- `GET /api/template-assignments/resolve` - Resolve template for context
- `GET /api/template-assignments/[id]` - Get assignment
- `PUT /api/template-assignments/[id]` - Update assignment
- `DELETE /api/template-assignments/[id]` - Delete assignment

### Visual Template Designer
- `GET /api/visual-templates` - List visual templates
- `POST /api/visual-templates` - Create visual template
- `GET /api/visual-templates/[templateId]` - Get visual template
- `PUT /api/visual-templates/[templateId]` - Update visual template
- `DELETE /api/visual-templates/[templateId]` - Delete visual template
- `POST /api/visual-templates/[templateId]/generate-pdf` - Generate PDF from visual template

### Reporting
- `POST /api/coverpage` - Generate cover page PDF
- `POST /api/department-packet` - Generate departmental packet
- `POST /api/departmental-compilation` - Compile departmental reports
- `POST /api/overall-projects-summary` - Generate projects summary package
- `POST /api/reports/generate` - Generate custom reports
- `GET /api/reports/test` - Test report generation

### System Administration
- `GET /api/system/export/preview` - Preview data export (Admin only, rate limited: 10/min)
- `POST /api/system/export/run` - Export all data (Admin only, rate limited: 5/hour)
- `GET /api/system/deletion/preview` - Preview deletion targets (Admin only, rate limited: 10/min)
- `POST /api/system/deletion/run` - Execute deletion (Admin only, rate limited: 2/hour)

### Utility
- `GET /api/firestore/structure` - Get Firestore schema structure
- `POST /api/upload/image` - Upload image to Firebase Storage

### API Routes Summary
**Total: 37 API routes**

**Authentication Status:**
- All routes now have authentication (Phase 1 completed per TODO list)
- Rate limiting added to critical endpoints
- Input validation added to most endpoints

---

## UI COMPONENTS AND PAGES

### Page Components (19 total)

**Public:**
- `/` - Root redirect to /dashboard or /login
- `/login` - Login page with email/password

**Authenticated Pages:**
- `/dashboard` - Executive/Financial/Resource dashboard
- `/invoicing` - Invoice creation wizard
- `/invoices` - Invoice list and management
- `/projects` - Project list and management
- `/projects/[id]` - Project detail page
- `/projects/[id]/files` - Project file manager
- `/timesheets` - Timesheet list
- `/timesheets/upload` - Timesheet upload interface
- `/utilization` - Utilization reports
- `/manpower` - Resource allocation planner
- `/reports` - Custom report generation
- `/admin` - Admin panel
- `/admin/templates` - Template management
- `/admin/pdf-templates` - PDF template field mapping
- `/admin/coverpage` - Cover page designer
- `/admin/department-packet` - Department packet generator
- `/profile` - User profile and settings

### Component Categories (172+ total)

**UI Components (53 in [src/components/ui/](src/components/ui/)):**
- Primitives: button, input, textarea, label, checkbox, switch, select
- Layouts: card, separator, tabs, collapsible, scroll-area
- Overlays: dialog, alert-dialog, popover, tooltip, dropdown-menu, context-menu, sheet
- Data: table, data-table, chart
- Feedback: alert, progress, skeleton, toast
- Navigation: breadcrumbs, sidebar, command-palette
- Complex: calendar, form, enhanced-file-upload, validated-input
- Custom: error-state, empty-state, icon-button, confirmation-dialog, keyboard-shortcuts-dialog

**Feature Components:**
- **Invoicing (9 components):** Header, SummarySidebar, WorkflowActions, InvoiceItemsTable, ReimbursableExpensesTable, FileAttachments, DepartmentSelectionStep, ProjectSelectionStep, WorkflowStepIndicator
- **Dashboard (14 components):** Executive, Financial, and Resource sub-components, charts (line, bar, pie)
- **Projects (4 components):** ProjectManagement, ProjectTeamManagement, ProjectContractManagement, ProjectFileManager
- **Timesheets (2 components):** TimesheetUploadDialog, UtilizationSummaryTable
- **Manpower (3 components):** WorkloadPlanner, AddProjectForm, AssignmentForm
- **Templates (5 components):** TemplateList, TemplateUpload, FieldMappingEditor, TemplateUploadDialog, TemplateAssignmentDialog
- **Template Designer (4 components):** TemplateDesignerDialog, DataMappingPanel, FirestoreDataBrowser, ImageUploader
- **PDF Field Mapper (2 components):** PdfFieldMapper, PdfViewer
- **Form Designer (2 components):** SyncfusionFormDesigner, DataFieldBrowser
- **System Settings (2 components):** DataExport, DataDeletion
- **Reports (various):** ReportGenerator, ReportFilters, ReportPreview
- **Other:** CompanyEmployeeManagement, ContractForm, ContractImport, DivisionDepartmentManagement, EmployeeForm, EmployeeImport, FinancialAdministration, HistoricalInvoiceDialog, ManualEntrySetupForm, NewInvoiceDialog, etc.

### Component Issues

**Large Components (potential refactoring targets):**
- [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx) - 2,220 lines
- [src/app/(authenticated)/invoices/client-page.tsx](src/app/(authenticated)/invoices/client-page.tsx) - 2,172 lines
- [src/app/(authenticated)/timesheets/client-page.tsx](src/app/(authenticated)/timesheets/client-page.tsx) - 1,054 lines
- [src/app/(authenticated)/projects/client-page.tsx](src/app/(authenticated)/projects/client-page.tsx) - 946 lines
- [src/app/(authenticated)/dashboard/dashboard-client.tsx](src/app/(authenticated)/dashboard/dashboard-client.tsx) - 773 lines

---

## AUTHENTICATION AND AUTHORIZATION

### Role-Based Access Control

**Roles:**
```typescript
type UserRole = 'Admin' | 'Prime' | 'Subconsultant' | 'Viewer';
```

**Permission Matrix:**
```typescript
const ROLE_PERMISSIONS = {
  Admin: {
    canAccessDashboard: true,
    canAccessProjects: true,
    canEditProjects: true,
    canAccessInvoices: true,
    canCreateInvoices: true,
    canEditInvoices: true,
    canApproveInvoices: true,
    canAccessReports: true,
    canAccessTimesheets: true,
    canUploadTimesheets: true,
    canAccessManpower: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageTemplates: true,
    canExportData: true,
    canDeleteData: true,
  },
  Prime: {
    // Similar to Admin but cannot deleteData
  },
  Subconsultant: {
    // Limited: can create invoices, view own projects, no admin access
  },
  Viewer: {
    // Read-only: dashboard, projects, invoices (view only)
  },
};
```

### Authentication Flow

1. User enters email/password
2. Firebase Authentication validates credentials
3. `signInWithEmailAndPassword()` returns Firebase user
4. Fetch user document from Firestore (`users/{uid}`)
5. Check `isActive` flag
6. Create session cookie (`/api/auth/session`)
7. Set custom claims if role is Admin/Prime
8. Update `lastLoginAt` timestamp
9. Redirect to dashboard

### Protected Routes

**Middleware Protection:**
- All `/dashboard/*`, `/projects/*`, `/invoices/*`, `/timesheets/*`, `/invoicing/*`, `/admin/*`, `/api/*` routes require authentication
- Admin-only routes checked at API level (withAuth middleware)

**Client-Side Protection:**
- `<ProtectedRoute requiredPermission="...">` wrapper component
- Checks `user.permissions[permission]` before rendering
- Redirects to /login if unauthenticated

### Session Management

**Session Cookie:**
- Name: `__session`
- Created in `/api/auth/session` route
- Verified by Firebase Admin SDK
- Expires after inactivity (configurable)

**CSRF Protection:**
- Token generated in `/api/auth/csrf`
- Stored in Map (in-memory, should use Redis in production)
- Validated for POST/PUT/DELETE/PATCH requests to `/api/*`
- Excludes `/api/auth/*` routes

**Rate Limiting:**
- In-memory Map (should use Redis in production)
- Per-IP tracking
- Configurable windows and limits
- Audit logging on rate limit exceeded

---

## ISSUES FOUND

### 1. Code Quality Issues

**Console Logging:**
- 122 files contain `console.log`, `console.error`, or `console.warn`
- Exposes sensitive data in production
- Key offenders:
  - [src/lib/labor-report-generator.ts](src/lib/labor-report-generator.ts) - 5 occurrences
  - [src/lib/pdf-generator.ts](src/lib/pdf-generator.ts) - 6 occurrences
  - [src/lib/overall-projects-summary-package.ts](src/lib/overall-projects-summary-package.ts) - 8 occurrences
  - [src/app/api/timesheet-upload/route.ts](src/app/api/timesheet-upload/route.ts) - multiple
  - [src/hooks/use-auth.ts](src/hooks/use-auth.ts) - conditional debug mode

**Debug Code:**
- [src/hooks/use-auth.ts:20-30](src/hooks/use-auth.ts#L20-L30): localStorage-based debug mode
  - Enables verbose logging when `localStorage.DEBUG_AUTH = '1'`
  - Should use proper logging service
  - Security risk: exposes auth flow details

**TypeScript Type Safety:**
- 6 instances of `@ts-ignore` in [src/components/form-designer/SyncfusionFormDesigner.tsx](src/components/form-designer/SyncfusionFormDesigner.tsx)
- 15 instances of `eslint-disable` comments
- `any` types in multiple locations (partially addressed per TODO list)

**Large Components:**
- [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx) - 2,220 lines (needs refactoring)
- [src/app/(authenticated)/invoicing/actions.ts](src/app/(authenticated)/invoicing/actions.ts) - 1,784 lines (needs splitting)
- [src/app/(authenticated)/admin/actions.ts](src/app/(authenticated)/admin/actions.ts) - 2,085 lines (needs splitting)
- [src/app/(authenticated)/invoices/client-page.tsx](src/app/(authenticated)/invoices/client-page.tsx) - 2,172 lines (too complex)

**Hook Overuse:**
- [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx) has 24 React hooks (useState, useEffect, useMemo, useCallback)
- Creates performance issues and hard-to-debug re-renders

**JSON Serialization Hack:**
```typescript
// src/app/(authenticated)/invoicing/page.tsx:28-34
return {
  projects: JSON.parse(JSON.stringify(projects)),
  departments: JSON.parse(JSON.stringify(departments)),
  // ...
};
```
- Used to bypass Next.js serialization restrictions
- Loses Timestamp and DocumentReference objects
- Should use proper serialization library

### 32. Security Concerns

**CRITICAL: Environment Variables Exposed**
- `.env.local` file contains:
  - Firebase API keys and project IDs (public keys, acceptable)
  - **GOOGLE_PRIVATE_KEY** (full private key in plain text)
  - **ISOLVED_CLIENT_SECRET** (API secret in plain text)
  - **JWT_SECRET** (authentication secret)
  - **DEV_BYPASS_AUTH=true** (disables auth in development)
- **These should NEVER be committed to version control**
- Use `.gitignore` and environment variable management tools

**Weak Middleware Authentication:**
```typescript
// middleware.ts:156-159
function validateAuthentication(request: NextRequest): { valid: boolean } {
  const authToken = request.cookies.get('__session')?.value || ...;
  if (!authToken) return { valid: false };
  return { valid: authToken.length > 0 }; // WEAK: only checks length
}
```
- Only checks if token exists, doesn't verify signature
- Should use Firebase Admin SDK to verify token

**Dev Bypass Auth:**
```typescript
// src/lib/auth-middleware.ts:22-26
if (process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === 'true') {
  authenticatedReq.user = { uid: 'dev', email: 'dev@example.com', role: 'Admin', ... };
  return handler(authenticatedReq);
}
```
- Dangerous if `DEV_BYPASS_AUTH` is accidentally left `true` in production

**In-Memory Rate Limiting:**
- [middleware.ts](middleware.ts) and [src/lib/auth-middleware.ts](src/lib/auth-middleware.ts) use in-memory Maps
- Won't work in multi-instance deployments
- Should use Redis or similar distributed store

**NoSQL Injection (partially mitigated):**
- Timesheet upload route sanitizes inputs (Phase 1 completed)
- Dashboard route sanitizes query params (Phase 1 completed)
- Other routes may still be vulnerable

**CSRF Token Storage:**
- Tokens stored in in-memory Map
- Lost on server restart
- Should use secure session storage (Redis, database)

**Dangerous Functions Found:**
- `dangerouslySetInnerHTML` in 3 files:
  - [src/lib/template-pdf-generator.ts](src/lib/template-pdf-generator.ts)
  - [src/hooks/use-async.ts](src/hooks/use-async.ts)
  - [src/components/ui/chart.tsx](src/components/ui/chart.tsx)
- Review these for XSS vulnerabilities

### 3. Logic Problems & Bugs

**FlexibleReference Confusion:**
- Mix of Firestore DocumentReferences and string IDs throughout codebase
- Requires utility functions to handle both types
- Can cause bugs when wrong type is passed
- Should standardize on one approach or use a discriminated union

**Date Handling Issues:**
- Mix of JavaScript Date, Timestamp, and ISO strings
- `normalizeDateValue()` utility added but not used consistently
- Can cause timezone bugs and data corruption

**Deprecated Field:**
- `dataPath` field in `TemplateFieldMapping` ([types/index.ts:371](src/types/index.ts#L371))
- Marked as deprecated but still present
- Should remove or migrate

**Invoice Status Edge Cases:**
- Complex workflow logic in [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx)
- Edge cases around "resubmitted" status not fully handled
- Rejection flow allows editing but doesn't clear previous rejection notes

**Timesheet Duplicate Detection:**
- Checks for exact duplicates but doesn't handle near-duplicates
- Could lead to double-billing if same data uploaded with slight variations

### 4. Performance Issues

**Client-Side Metrics Calculation:**
- Dashboard metrics calculated in [src/app/(authenticated)/dashboard/dashboard-client.tsx](src/app/(authenticated)/dashboard/dashboard-client.tsx) on client side
- Should move to server-side or API route for better performance
- Large datasets will cause UI lag

**No Pagination:**
- All lists fetch entire collections (projects, invoices, employees)
- Will fail at scale (100s or 1000s of records)
- Should implement cursor-based pagination

**Large Bundle Size:**
- Syncfusion components are large (~5 MB minified)
- Multiple PDF libraries (jsPDF, pdf-lib, pdfjs-dist)
- Should use code splitting and lazy loading (partially implemented)

**Inefficient Re-renders:**
- 24 hooks in [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx) cause frequent re-renders
- `useMemo` and `useCallback` used but dependency arrays may be incorrect
- Should profile with React DevTools

**No Query Caching:**
- Firestore queries re-run on every page load
- Should implement caching layer (React Query, SWR)

### 5. Incomplete Implementations

**TODO Comments:**
- Line 83 in [src/components/template-designer/DataMappingPanel.tsx:83](src/components/template-designer/DataMappingPanel.tsx#L83): "TODO: Parse relationship binding"
- Relationship paths in field mappings not fully implemented

**Minimal Test Coverage:**
- Vitest configured but only test route is [src/app/api/reports/test](src/app/api/reports/test)
- No unit tests for critical functions
- No integration tests
- No E2E tests

**Missing Error Handling:**
- Many `try/catch` blocks only log errors and return 500
- No user-friendly error messages
- No error recovery mechanisms

**Audit Logging Gaps:**
- Audit logger created but not used consistently
- Missing logs for:
  - Invoice approvals/rejections
  - Template changes
  - User role changes
  - Data exports

### 6. Inconsistencies

**PDF Generation:**
- Three different PDF libraries used:
  - jsPDF (most common)
  - pdf-lib (for form filling)
  - Syncfusion PDF Viewer (for viewing)
- Inconsistent error handling across generators
- Different approaches to styling and layout

**Data Fetching:**
- Mix of client-side and server-side fetching
- Server actions in some routes, API routes in others
- No consistent pattern

**Styling:**
- Mix of Tailwind utility classes and custom CSS
- Inconsistent spacing and sizing tokens
- Some components use design tokens, others hardcode values

**Import Paths:**
- Mix of `@/` aliases and relative imports
- Should standardize on `@/` throughout

### 7. Anti-Patterns

**God Components:**
- [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx) handles too many responsibilities:
  - Form state management
  - API calls
  - Validation
  - UI rendering
  - Business logic
- Should extract hooks and sub-components

**Prop Drilling:**
- Many components pass 10+ props through multiple levels
- Should use React Context or state management library

**Inline Styles:**
- Some components use `style={{ ... }}` instead of CSS classes
- Reduces performance and maintainability

**Magic Numbers:**
- Hardcoded values throughout (e.g., rate limiting numbers, page sizes)
- Should extract to constants

**Mutation:**
- Some functions mutate input arrays/objects instead of creating copies
- Can cause hard-to-debug state issues

---

## RECOMMENDATIONS

### High Priority (Security & Stability)

1. **IMMEDIATE: Secure Environment Variables**
   - Remove `.env.local` from version control
   - Add to `.gitignore`
   - Use environment variable management (Vercel, Azure, etc.)
   - Rotate all exposed secrets (private keys, API keys)

2. **IMMEDIATE: Fix Middleware Authentication**
   - Implement proper token verification in [middleware.ts:validateAuthentication()](middleware.ts#L156-L159)
   - Use Firebase Admin SDK to verify tokens server-side
   - Remove weak length-only check

3. **Remove Debug Code**
   - Delete or disable localStorage-based debug mode in [src/hooks/use-auth.ts](src/hooks/use-auth.ts)
   - Replace all `console.log` with proper logging library (winston, pino)
   - Create log levels (error, warn, info, debug) and use environment-based filtering

4. **Implement Production-Grade Session Management**
   - Replace in-memory Maps with Redis or database
   - For CSRF tokens, rate limiting, session storage
   - Essential for multi-instance deployments

5. **Disable Dev Bypass in Production**
   - Ensure `DEV_BYPASS_AUTH` is never set in production
   - Add runtime check to throw error if enabled in production

6. **Add Comprehensive Input Validation**
   - Review all API routes for injection vulnerabilities
   - Use zod schemas for request validation
   - Sanitize all user inputs consistently

7. **Fix XSS Vulnerabilities**
   - Review all uses of `dangerouslySetInnerHTML`
   - Ensure DOMPurify is used consistently
   - Add CSP headers to block inline scripts (already partially done)

### Medium Priority (Code Quality & Maintainability)

8. **Refactor Large Components**
   - Break down [src/app/(authenticated)/invoicing/client-page.tsx](src/app/(authenticated)/invoicing/client-page.tsx) into smaller components
   - Extract custom hooks for complex logic
   - Split [src/app/(authenticated)/invoicing/actions.ts](src/app/(authenticated)/invoicing/actions.ts) and [src/app/(authenticated)/admin/actions.ts](src/app/(authenticated)/admin/actions.ts) into domain-specific files

9. **Reduce Hook Complexity**
   - Profile components with many hooks using React DevTools
   - Optimize dependency arrays for `useMemo` and `useCallback`
   - Consider moving complex state to Zustand or Jotai

10. **Improve TypeScript Type Safety**
    - Remove all `@ts-ignore` comments
    - Replace `any` types with proper interfaces
    - Enable strict null checks in tsconfig

11. **Standardize Data Fetching**
    - Choose between Server Actions and API routes
    - Document the pattern in README
    - Refactor existing code to follow pattern

12. **Implement Proper Serialization**
    - Remove `JSON.parse(JSON.stringify())` hacks
    - Use `superjson` or custom serializer for Timestamps and DocumentReferences
    - Create serialization utilities in `/src/lib/`

13. **Consolidate PDF Generation**
    - Standardize on one PDF approach (recommend jsPDF with pdf-lib for form filling)
    - Create unified PDF generation API
    - Document when to use each library

### Low Priority (Performance & UX)

14. **Implement Pagination**
    - Add cursor-based pagination to all list views
    - Use Firestore `startAfter()` and `limit()`
    - Add infinite scroll or "Load More" buttons

15. **Add Query Caching**
    - Install React Query or SWR
    - Cache Firestore queries on client side
    - Implement cache invalidation on mutations

16. **Optimize Bundle Size**
    - Analyze bundle with `@next/bundle-analyzer`
    - Lazy load Syncfusion components
    - Consider replacing Syncfusion with lighter alternatives

17. **Move Metrics to Server**
    - Create `/api/dashboard-metrics` endpoint
    - Calculate aggregations in Firestore or Cloud Functions
    - Cache results with short TTL

18. **Add Test Coverage**
    - Write unit tests for critical functions (security-utils, date-utils, etc.)
    - Add integration tests for API routes
    - Consider Playwright for E2E tests

19. **Improve Error Handling**
    - Create user-friendly error messages
    - Add error recovery UI (retry buttons, reset forms)
    - Implement error boundaries for each feature section

20. **Add Audit Logging**
    - Log all invoice approvals/rejections
    - Log template changes
    - Log user role changes
    - Create audit log viewer in admin panel

21. **Implement Complete Relationship Parsing**
    - Finish TODO in [src/components/template-designer/DataMappingPanel.tsx:83](src/components/template-designer/DataMappingPanel.tsx#L83)
    - Support cross-collection lookups in template field mappings
    - Test with complex relationship paths

### Documentation & DevEx

22. **Add Code Comments**
    - Document complex business logic
    - Add JSDoc comments to public APIs
    - Explain FlexibleReference system

23. **Create Architecture Docs**
    - Document authentication flow
    - Document invoice workflow states
    - Document PDF generation pipeline
    - Document data model relationships

24. **Add Developer Setup Guide**
    - How to get Firebase credentials
    - How to run locally with emulators
    - How to seed test data
    - How to run tests

25. **Create Contribution Guidelines**
    - Code style guide
    - Component structure patterns
    - Git commit conventions
    - PR review checklist

---

## SUMMARY

### Strengths

- Modern tech stack (Next.js 15, React 19, TypeScript)
- Comprehensive feature set covering entire business workflow
- Well-structured folder organization
- Good use of TypeScript for type safety
- Solid UI component library (Radix + shadcn)
- Recent security improvements (Phase 1 completed)
- Detailed Firestore schema with FlexibleReference system
- Modular PDF generation library

### Critical Weaknesses

- **Exposed secrets in `.env.local`** (CRITICAL SECURITY ISSUE)
- **Weak middleware authentication** (only checks token length)
- Dev bypass auth flag (potential production leak)
- 122 files with `console.log` statements
- Very large components (2,000+ lines)
- No test coverage
- In-memory session/rate-limit storage (won't scale)
- No pagination (will fail at scale)
- Client-side metrics calculation (performance issue)

### Project Maturity Assessment

**Current State:** Late-stage MVP / Early Production
- Feature complete for core workflows
- Security hardening in progress (Phase 1 complete)
- Ready for small-scale deployment
- Needs significant refactoring before scaling

**Readiness for Production:**
- ⚠️ **NOT READY** until critical security issues fixed
- After fixes: suitable for 10-50 users
- Needs performance work before 100+ users
- Needs architecture changes before 1,000+ users

### Recommended Next Steps

1. Fix critical security issues (secrets, auth verification, dev bypass)
2. Remove debug code, implement proper logging
3. Refactor largest components, add basic tests
4. mplement pagination, move metrics to server
5. Production-grade session management, comprehensive testing
6. Performance optimization, monitoring, documentation

---

## CONCLUSION

The CTI BI Web Application is a feature-rich and well-structured business intelligence platform with a modern technology stack. The application successfully implements comprehensive workflows for invoice management, project tracking, timesheet processing, and reporting. However, it requires immediate attention to critical security issues, particularly around exposed environment variables and weak authentication validation.

The codebase demonstrates good architectural patterns with clear separation of concerns, but suffers from technical debt in the form of large monolithic components, lack of test coverage, and scalability concerns. With targeted refactoring and security hardening, the application can evolve from a late-stage MVP into a production-ready system capable of handling enterprise-scale operations.

**Priority Actions:**
1. Secure environment variables and rotate exposed secrets
2. Implement proper token verification in middleware
3. Remove debug code and console.log statements
4. Refactor large components into smaller, maintainable units
5. Add comprehensive test coverage
6. Implement pagination and caching for scalability
