# ✅ Phase 2 Item 2: Refactor invoicing/actions.ts - COMPLETE

**Date:** 2025-12-30
**Task:** Split monolithic `invoicing/actions.ts` (1,784 lines) into domain-focused files
**Status:** ✅ READY FOR TESTING

---

## 📦 What Was Created

### **Original File Structure:**
```
src/app/(authenticated)/invoicing/
└── actions.ts (1,784 lines - ALL functions in one file)
```

### **New File Structure:**
```
src/app/(authenticated)/invoicing/
├── invoice-shared.ts (150 lines)
├── invoice-autofill-actions.ts (380 lines)
├── invoice-pdf-actions.ts (180 lines)
├── invoice-workflow-actions.ts (270 lines)
└── invoice-crud-actions.ts (830 lines)
```

---

## 📋 File Breakdown

### **1. `invoice-shared.ts` (150 lines)**
**Purpose:** Shared utilities and Firebase initialization

**Exports:**
- `adminDb` - Firebase Admin database instance
- `AdminTs` - Firebase Admin Timestamp
- `getCollectionData()` - Fetch Firestore collections with fallback
- `serializeFirestoreValue()` - Convert Firestore types to JSON
- `snapshotToInvoice()` - Convert Firestore snapshot to Invoice type
- `getUserRoleAndName()` - Get user role and display name
- `assertAllowed()` - Permission check helper
- `sumInvoiceHours()` - Calculate total invoice hours
- `nowTs()` - Current timestamp helper
- `revalidateInvoiceViews()` - Cache revalidation

**Used by:** All other invoice action files

---

### **2. `invoice-autofill-actions.ts` (380 lines)**
**Purpose:** Timesheet autofill logic and data fetching

**Main Function:**
- `autofillFromTimesheets()` - Generate invoice items from timesheet data
  - Filters timesheets by project PO number and date range
  - Aggregates billable hours by employee
  - Resolves billing rates from project assignments
  - Matches services from timesheet labor entries
  - Calculates due dates and term of week

**Data Fetchers:**
- `getEmployees()` - Fetch all employees
- `getCompanies()` - Fetch all companies
- `getServices()` - Fetch all services
- `getRates()` - Fetch all billing rates
- `getProjects()` - Fetch all projects
- `getAllTimesheetEntries()` - Fetch all timesheet entries
- `getDepartments()` - Fetch all departments
- `getUsers()` - Fetch all users

**Business Logic:**
- BILLABLE_CODES: `['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP']`
- Matches Project/Categories field with PO number for strict validation
- Aggregates hours with duplicate detection
- Resolves services from timesheet Service/Category fields

---

### **3. `invoice-pdf-actions.ts` (180 lines)**
**Purpose:** PDF generation, versioning, and restoration

**Functions:**
- `uploadPdfBufferToStorage()` - Upload PDF buffer to Firebase Storage (exported for reuse)
- `generatePDFDocument()` - Generate PDF from invoice data using templates
- `generateInvoicePDF()` - Generate PDF for submission (lowercase PDF)
- `generateInvoicePdf()` - Generate PDF for approved invoices (Admin/Prime only, lowercase pdf)
- `submitInvoiceWithInternalChanges()` - Submit internal revision with new PDF version
- `restoreInvoicePdfVersion()` - Restore a previous PDF version

**PDF Versioning:**
- Each PDF generation creates a new version entry
- Versions tracked with: `version`, `type`, `fileName`, `url`, `createdAt`, `createdByName`, `notes`
- Types: `'initial'`, `'replacement'`, `'internal-revision'`
- Version counter increments with each generation
- Maintains full version history in `pdfVersions` array

---

### **4. `invoice-workflow-actions.ts` (270 lines)**
**Purpose:** Invoice state transitions and approval workflow

**Functions:**
- `submitInvoiceForReview()` - Submit draft → submitted or rejected → resubmitted
  - Creates `submittedSnapshot` to preserve original submission
  - Adds history entry with timestamp and user info
  - Notifies Admin/Prime users

- `resubmitInvoice()` - Wrapper for resubmission (calls submitInvoiceForReview)

- `approveInvoice()` - Approve invoice with project rollups
  - Idempotent (uses approvalRunId)
  - Creates `approvalSnapshot` with total and hours
  - Updates project: `previouslyInvoicedAmount`, `usedHours`, `remainingPoAmount`, `remainingHours`
  - Notifies invoice author

- `rejectInvoice()` - Reject invoice with optional rollback
  - Can reverse prior approval with `reversePriorApproval: true`
  - Rolls back project amounts if reversing approval
  - Adds rejection notes and history entry
  - Notifies invoice author

- `returnInvoiceForEdits()` - Return for revisions (neutral alternative to rejection)
  - Sets status to `'revision_requested'`
  - Preserves history with previous status

**State Transitions:**
```
draft → submitted → approved
   ↓        ↓           ↓
   └─────→ rejected ←──┘
           ↓
      resubmitted → approved
```

---

### **5. `invoice-crud-actions.ts` (830 lines)**
**Purpose:** Create, read, update, delete operations

**Functions:**
- `createInvoice()` - Create new invoice with full validation
  - Validates contract number and invoice ID
  - Resolves employee, company, service names for denormalization
  - Determines submitter company from first item or user
  - Fetches project's departmentId
  - Uploads attachments to Firebase Storage
  - Supports draft/submitted/approved statuses
  - Auto-approval for Admin/Prime on create

- `updateInvoiceDetails()` - Update existing invoice
  - Permission checks: author or Admin/Prime
  - Editable states: draft, rejected, revision_requested (or Admin/Prime anytime)
  - Prevents changing project on approved invoices (rollup integrity)
  - Delta rollup adjustment for approved invoice edits
  - Updates `approvalSnapshot` on approved invoice changes
  - Handles file attachments

- `submitInvoice()` - Submit invoice (legacy function, different from submitInvoiceForReview)
  - Updates status to 'submitted'
  - Generates PDF automatically
  - Updates PDF URL and filename

- `generateInvoicePDF()` - Generate PDF for invoice (used by submitInvoice)

- `generatePDFDocument()` - Helper function to generate PDF from data

- `deleteInvoice()` - Delete single invoice
  - Admin/Prime: can delete any invoice
  - Subconsultant: can delete own drafts, rejected, or historical
  - Authorization based on status and isHistorical flag

- `deleteMultipleInvoices()` - Bulk delete with result tracking

- `getInvoiceByIdOrNumber()` - Fetch invoice by document ID or invoice number

- `createHistoricalInvoice()` - Import legacy invoice data
  - Sets `isHistorical: true`
  - Creates payment tracking record
  - Converts string dates to Timestamps

**Schemas:**
- `CreateInvoiceSchema` - Zod validation for invoice creation
- `UpdateInvoiceSchema` - Zod validation for invoice updates (omits status)

**Types:**
- `CreateInvoiceInput`, `CreateInvoiceResult`
- `UpdateInvoiceInput`, `UpdateInvoiceResult`, `UploadedFileResponse`

---

## 🔄 Updated Import Statements

### **Files Updated:**

1. **`/invoices/actions.ts`** - Re-export wrapper
   - Now imports from 3 separate files instead of 1

2. **`invoicing/page.tsx`** - Server component
   - Imports data fetchers from `invoice-autofill-actions.ts`
   - Imports `getInvoiceByIdOrNumber` from `invoice-crud-actions.ts`

3. **`hooks/use-invoice-workflow.ts`** - React hook
   - 7 dynamic imports updated to point to new files
   - CRUD operations → `invoice-crud-actions.ts`
   - Workflow operations → `invoice-workflow-actions.ts`
   - PDF operations → `invoice-pdf-actions.ts`

4. **`invoicing/client-page.tsx`** - Main invoice form
   - Autofill import → `invoice-autofill-actions.ts`

5. **`components/autofill-form.tsx`** - Autofill preview component
   - Autofill import → `invoice-autofill-actions.ts`

6. **`lib/labor-report-generator.ts`** - Labor report utility
   - Timesheet fetch → `invoice-autofill-actions.ts`

---

## 🗑️ Deleted Files

- ✅ `src/app/(authenticated)/invoicing/actions.ts` (1,784 lines - original monolithic file)
- ✅ `src/app/(authenticated)/invoicing/client-page.backup.tsx` (2,220 lines - from Phase 2 Item 1)

---

## ✅ Verification Steps

### **TypeScript Compilation:**
```bash
npx tsc --noEmit
```
**Result:** ✅ Only pre-existing strict null check warnings for `adminDb`
**No import errors** - All imports resolved successfully

### **Import Resolution:**
```bash
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "from.*invoicing/actions"
```
**Result:** ✅ No files found - All imports updated successfully

---

## 📊 Impact Summary

### **Before Refactoring:**
```
actions.ts:                   1,784 lines
Functions:                    35+ functions
Responsibilities:             6 domains (CRUD, workflow, PDF, autofill, data fetch, utilities)
Imports from this file:       7 files
Maintainability:              Low (all logic in one file)
Testability:                  Low (hard to isolate domains)
```

### **After Refactoring:**
```
Total lines:                  1,810 lines (in 5 files)
invoice-shared.ts:            150 lines (utilities)
invoice-autofill-actions.ts:  380 lines (autofill + data fetch)
invoice-pdf-actions.ts:       180 lines (PDF operations)
invoice-workflow-actions.ts:  270 lines (state transitions)
invoice-crud-actions.ts:      830 lines (create, read, update, delete)

Functions per file:           ~5-8 (focused domains)
Responsibilities per file:    1 domain
Imports updated:              6 files
Maintainability:              High (SRP, clear boundaries)
Testability:                  High (isolated domains)
```

### **Benefits:**
✅ **Single Responsibility Principle** - Each file has one clear domain
✅ **Separation of Concerns** - CRUD ≠ Workflow ≠ PDF ≠ Autofill
✅ **Reusability** - Shared utilities in `invoice-shared.ts`
✅ **Maintainability** - Easier to find and fix bugs in specific domains
✅ **Testability** - Can unit test each domain independently
✅ **Performance** - Smaller bundles when only specific actions are needed
✅ **Type Safety** - All Zod schemas and TypeScript types preserved
✅ **No Breaking Changes** - All function signatures unchanged

---

## 🚀 Next Steps for Testing

### **1. Build the App**
```bash
npm run build
```
**Expected:** ✅ Build completes without errors

### **2. Run Development Server**
```bash
npm run dev
```
**Expected:** ✅ Server starts successfully

### **3. Test Invoice Workflows**

#### **Create Invoice:**
1. Navigate to `/invoicing/new`
2. Select department (Admin/Prime) or project (Subconsultant)
3. Use autofill from timesheets
4. Verify all data fetchers work (employees, companies, services, rates)
5. Save as draft
6. Submit for review (should auto-approve for Admin/Prime)

#### **Edit Invoice:**
1. Open draft invoice
2. Modify items and expenses
3. Save changes
4. Verify update works correctly

#### **Workflow Actions:**
1. Submit invoice for review
2. Approve invoice (Admin/Prime)
3. Verify project rollups updated
4. Reject invoice (optional)
5. Verify rollback works if reversing approval

#### **PDF Operations:**
1. Generate PDF for approved invoice
2. Verify version counter increments
3. Submit internal revision
4. Restore previous PDF version
5. Verify version history maintained

#### **Delete Operations:**
1. Delete draft invoice
2. Delete historical invoice (author only)
3. Verify authorization rules

---

## 🔄 Rollback Instructions (If Needed)

If any issues are found during testing, the refactoring can be rolled back:

```bash
# Note: Original actions.ts was already deleted
# You would need to restore from git history
git checkout HEAD~1 src/app/(authenticated)/invoicing/actions.ts

# Remove new files
rm src/app/(authenticated)/invoicing/invoice-*.ts

# Restore old imports in affected files
git checkout HEAD~1 src/app/(authenticated)/invoices/actions.ts
git checkout HEAD~1 src/app/(authenticated)/invoicing/page.tsx
git checkout HEAD~1 src/hooks/use-invoice-workflow.ts
git checkout HEAD~1 src/app/(authenticated)/invoicing/client-page.tsx
git checkout HEAD~1 src/components/autofill-form.tsx
git checkout HEAD~1 src/lib/labor-report-generator.ts

# Rebuild
npm run build
```

---

## ✅ Success Criteria

- [x] All 5 action files created with correct exports
- [x] All 6 consuming files updated with correct imports
- [x] Original `actions.ts` deleted
- [x] TypeScript compilation passes (only pre-existing warnings)
- [x] No "Cannot find module" errors
- [ ] Build succeeds without errors
- [ ] App runs without crashes
- [ ] All invoice workflows function correctly
- [ ] No regression in functionality
- [ ] Performance is same or better

---

## 📝 Notes

- All server actions marked with `'use server'` directive
- Firebase Admin initialization preserved in `invoice-shared.ts`
- All business logic and validation rules unchanged
- All function signatures preserved for backward compatibility
- Zod schemas maintained for input validation
- All TypeScript types properly defined
- Error handling preserved from original implementation
- Transaction logic maintained for atomic operations
- Notification system integrated (notifyAdminsPrimes, notifyAuthor)

---

## 🎯 Related Tasks

- ✅ **Phase 2 Item 1:** Refactor `invoicing/client-page.tsx` (2,220 → 1,850 lines)
- ✅ **Phase 2 Item 2:** Refactor `invoicing/actions.ts` (1,784 → 5 files)
- ⏳ **Phase 2 Item 3:** Refactor `admin/actions.ts` (2,085 lines) - **NEXT**
- ⏳ **Phase 2 Item 4:** Refactor `invoices/client-page.tsx` (2,172 lines)

---

**Refactoring Complete!** 🎉

All invoice server actions have been successfully split into focused, maintainable modules following the Single Responsibility Principle.

**Ready for testing!** Please run the app and test all invoice workflows. Report any issues found during testing.
