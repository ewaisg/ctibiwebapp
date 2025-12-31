# ✅ Phase 2 Item 3: Refactor admin/actions.ts - COMPLETE

**Date:** 2025-12-30
**Task:** Split monolithic `admin/actions.ts` (2,085 lines) into domain-focused files
**Status:** ✅ READY FOR TESTING

---

## 📦 What Was Created

### **Original File Structure:**
```
src/app/(authenticated)/admin/
└── actions.ts (2,085 lines - ALL admin functions in one file)
```

### **New File Structure:**
```
src/app/(authenticated)/admin/
├── admin-shared.ts (220 lines)
├── admin-user-actions.ts (330 lines)
├── admin-company-actions.ts (180 lines)
├── admin-project-actions.ts (680 lines)
├── admin-org-actions.ts (160 lines)
├── admin-template-rate-actions.ts (190 lines)
├── admin-payment-actions.ts (520 lines)
└── admin-report-actions.ts (120 lines)
```

**Total:** 2,400 lines across 8 files (includes extracted shared utilities)

---

## 📋 File Breakdown

### **1. `admin-shared.ts` (220 lines)**
**Purpose:** Shared utilities and Firebase initialization

**Exports:**
- `adminDb` - Firebase Admin database instance
- `Timestamp` - Firebase Admin Timestamp
- `sanitizeForLog()` - Security logging utility
- `sanitizeProjectData()` - Clean and validate project data
- `discoverUserColumnMapping()` - Excel import column mapping for users
- `getCellValue()` - Excel cell value extractor
- `checkUserExists()` - Check if user email exists
- `getCompanyById()` - Fetch company by ID
- `generateSecurePassword()` - Secure password generator
- `nowTs()` - Current timestamp helper

**TypeScript Interfaces:**
- `UserFormData` - User creation/update payload
- `UserImportResult` - User import response
- `UserActionResult` - User action response
- `UserColumnMapping` - Excel column mapping for user imports

**Used by:** All other admin action files

---

### **2. `admin-user-actions.ts` (330 lines)**
**Purpose:** User management with Firebase Auth integration

**Functions:**
- `createUser()` - Create user with Firebase Auth + Firestore
  - Auto-generates secure password (14 chars)
  - Creates Firebase Auth account
  - Creates Firestore user document
  - Returns temporary password for admin distribution

- `updateUser()` - Update existing user
  - Updates Firebase Auth profile
  - Updates Firestore user document
  - Company validation

- `processUserImport()` - Bulk import users from Excel
  - Discovers column mapping automatically
  - Validates required fields (displayName, email, role, companyId)
  - Checks for duplicates
  - Reports processed, duplicates, errors

- `deleteUserAndAccount()` - Delete user completely
  - Deletes from Firebase Auth first (prevents orphaned login)
  - Deletes Firestore user document

**Business Logic:**
- Password validation: min 8 chars or auto-generate 14 chars
- Role validation: Admin, Prime, Subconsultant only
- Company existence validation
- Duplicate email detection

---

### **3. `admin-company-actions.ts` (180 lines)**
**Purpose:** Company management operations

**Functions:**
- `createCompany()` - Create new company
  - Uses companyCode as document ID
  - Checks for duplicate company codes
  - Diversity certification tracking (MWBE, WBE, SBE, None)

- `updateCompany()` - Update existing company
  - Updates company details
  - Maintains company code

- `processCompanyImport()` - Bulk import companies from Excel
  - Column mapping: companyName, companyCode, isSubconsultant, isInactive, diversityCertification
  - Duplicate detection
  - Reports processed, duplicates, errors

**Data Model:**
- `companyName` - Company display name
- `companyCode` - Unique identifier
- `isSubconsultant` - Boolean flag
- `isInactive` - Boolean flag
- `diversityCertification` - Enum: MWBE | WBE | SBE | None

---

### **4. `admin-project-actions.ts` (680 lines)**
**Purpose:** Project lifecycle management

**Functions:**
- `createProject()` - Create new project
  - Uses poNumber as document ID
  - Fetches contract for denormalized contractNumber
  - Fetches department for denormalized departmentCode
  - Calculates financial fields (newPoAmount, remainingPoAmount, remainingHours)
  - Initializes empty assignedCompanies and files arrays

- `updateProject()` - Update existing project
  - Partial updates supported
  - Recalculates financial fields on amount/hour changes
  - Updates denormalized fields from contract/department
  - Sanitizes assignedCompanies with isActive service flag

- `assignCompanyToProject()` - Assign company with employees and services
  - Assigns employees to project
  - Assigns services with billing rates
  - Updates or adds company assignment

- `uploadProjectFile()` - Upload file to Firebase Storage
  - 25MB file size limit
  - Duplicate filename detection
  - Generates signed URLs (expires 2100-01-01)
  - Stores metadata (size, type, uploadedAt)

- `deleteProjectFile()` - Delete file from Storage + Firestore
  - Best-effort Storage deletion
  - Removes from project files array

- `processProjectImport()` - Bulk import projects from Excel
  - Column mapping: projectName, poNumber, contractId, departmentId, projectManager, originalPoAmount, budgetedHours
  - Creates projects with default inactive=false, complete=false
  - Duplicate detection

**Financial Calculations:**
- `newPoAmount = originalPoAmount + changeOrderAmount`
- `remainingPoAmount = newPoAmount - previouslyInvoicedAmount`
- `remainingHours = budgetedHours - usedHours`

**File Storage:**
- Path: `projects/{projectId}/files/{timestamp}-{safeName}`
- Signed URLs for secure access
- Metadata tracking

---

### **5. `admin-org-actions.ts` (160 lines)**
**Purpose:** Organizational structure management

**Functions:**
- `createDivision()` - Create division
  - Uses divisionCode as document ID
  - Duplicate detection

- `updateDivision()` - Update division
  - Updates name and inactive status

- `createDepartment()` - Create department
  - Uses departmentCode as document ID
  - Links to division via divisionId
  - Duplicate detection

- `updateDepartment()` - Update department
  - Updates name, division link, and inactive status

**Organizational Hierarchy:**
```
Division
  └── Department
      └── Project
```

---

### **6. `admin-template-rate-actions.ts` (190 lines)**
**Purpose:** Invoice template and global billing rate management

**Functions:**
- `createInvoiceTemplate()` - Create invoice template
  - Template types: Standard, MWBE, Custom
  - Optional logo, header, footer text
  - Company info (name, address, phone, email)
  - Active/inactive status

- `updateInvoiceTemplate()` - Update template
  - Updates all template fields
  - Maintains timestamps

- `createGlobalRate()` - Create global billing rate
  - Links to service via DocumentReference
  - Effective date and optional expiration date
  - Approval tracking (approvedBy, approvedByName, approvalDate)
  - Active/inactive status
  - Optional notes

- `updateGlobalRate()` - Update global rate
  - Updates rate, dates, status, notes
  - Maintains service link

**Template Model:**
- Template types for different invoice formats
- Company branding information
- Activation control

**Rate Model:**
- Service-linked rates
- Date range validity (effectiveDate, expirationDate)
- Approval audit trail
- Active status management

---

### **7. `admin-payment-actions.ts` (520 lines)**
**Purpose:** Payment tracking and financial reconciliation

**Functions:**
- `recordPayment()` - Record invoice payment
  - Calculates outstanding amount
  - Determines status (Pending, Partial, Paid, Overdue)
  - Resolves departmentId from project if missing
  - Creates payment tracking record

- `getPaymentHistory()` - Fetch payment history for invoice
  - Ordered by createdAt descending
  - Serializes DocumentReferences and Timestamps
  - Returns all entries (payments, write-offs, credits, refunds)

- `addPaymentEntry()` - Add payment-related entry
  - Entry types: payment, write_off, credit, refund
  - Cumulative calculation logic
  - Validations:
    - Payment: cannot exceed outstanding
    - Refund: cannot exceed paid amount
    - Write-off/Credit: cannot exceed outstanding
  - Recalculates status after each entry

- `updatePaymentEntry()` - Update existing entry
  - Updates entry details
  - Recomputes all cumulative values via `recomputeInvoicePayments()`

- `voidPaymentEntry()` - Void an entry
  - Marks as voided with timestamp and reason
  - Recomputes all cumulative values
  - Voided entries excluded from calculations

- `recomputeInvoicePayments()` - Recalculate cumulative payment fields
  - Processes all entries chronologically
  - Applies non-voided entries only
  - Updates paid, outstanding, status for each entry
  - Batch commits all updates

**Payment Logic:**
- **Payment:** Increases paid amount, decreases outstanding
- **Refund:** Decreases paid amount, increases outstanding
- **Write-off/Credit:** Decreases outstanding directly (debt forgiveness)

**Status Determination:**
- **Paid:** paidAmount >= invoiceAmount
- **Partial:** paidAmount > 0 but < invoiceAmount
- **Overdue:** paidAmount = 0 and past due date
- **Pending:** Default state

**Cumulative Tracking:**
- Each entry stores cumulative `paidAmount` and `outstandingAmount`
- Enables point-in-time balance inquiry
- Audit trail for all financial changes

---

### **8. `admin-report-actions.ts` (120 lines)**
**Purpose:** Financial report generation

**Functions:**
- `generateFinancialReport()` - Generate financial report
  - Report types: Revenue, Outstanding, Utilization, Profitability
  - Date range filtering
  - Entity filtering (companies, projects, departments)
  - Stores generated report in Firestore
  - Audit trail (generatedBy, generatedByName, generatedAt)

**Report Generators (Stub Implementations):**
- `generateRevenueReport()` - Revenue aggregation
- `generateOutstandingReport()` - Outstanding balance summary
- `generateUtilizationReport()` - Resource utilization metrics
- `generateProfitabilityReport()` - Profit margin analysis

**Note:** Report generators are placeholder implementations returning empty data. These should be replaced with real Firestore aggregations based on business requirements.

---

## 🔄 Updated Import Statements

### **Files Updated: 12 components**

1. **`components/user-form.tsx`** → `admin-user-actions.ts`
   - `createUser()`, `updateUser()`

2. **`components/user-management.tsx`** → `admin-user-actions.ts`
   - `deleteUserAndAccount()`

3. **`components/user-import.tsx`** → `admin-user-actions.ts`
   - `processUserImport()`

4. **`components/company-form.tsx`** → `admin-company-actions.ts`
   - `createCompany()`, `updateCompany()`

5. **`components/company-import.tsx`** → `admin-company-actions.ts`
   - `processCompanyImport()`

6. **`components/project-form.tsx`** → `admin-project-actions.ts`
   - `createProject()`, `updateProject()`

7. **`components/project-management.tsx`** → `admin-project-actions.ts`
   - `updateProject()`

8. **`components/project-import.tsx`** → `admin-project-actions.ts`
   - `processProjectImport()`

9. **`components/project-file-manager.tsx`** → `admin-project-actions.ts`
   - `uploadProjectFile()`, `deleteProjectFile()`

10. **`components/division-form.tsx`** → `admin-org-actions.ts`
    - `createDivision()`, `updateDivision()`

11. **`components/department-form.tsx`** → `admin-org-actions.ts`
    - `createDepartment()`, `updateDepartment()`

12. **`components/payment-drawer.tsx`** → `admin-payment-actions.ts`
    - `getPaymentHistory()`, `addPaymentEntry()`, `updatePaymentEntry()`, `voidPaymentEntry()`

---

## 🗑️ Deleted Files

- ✅ `src/app/(authenticated)/admin/actions.ts` (2,085 lines - original monolithic file)

---

## 📊 Impact Summary

### **Before Refactoring:**
```
actions.ts:                   2,085 lines
Functions:                    37 exported + 7 helpers
Domains:                      8 mixed together (User, Company, Project, Org, Template, Rate, Payment, Report)
Responsibilities per file:    8 domains
Maintainability:              Low (all logic in one file)
Testability:                  Low (hard to isolate domains)
Firebase Admin:               Mixed throughout
Excel Import Logic:           Duplicated across user/company/project
```

### **After Refactoring:**
```
Total lines:                  2,400 lines (in 8 files)
admin-shared.ts:              220 lines (utilities)
admin-user-actions.ts:        330 lines (users + Firebase Auth)
admin-company-actions.ts:     180 lines (companies)
admin-project-actions.ts:     680 lines (projects + files)
admin-org-actions.ts:         160 lines (divisions + departments)
admin-template-rate-actions.ts: 190 lines (templates + rates)
admin-payment-actions.ts:     520 lines (payments + tracking)
admin-report-actions.ts:      120 lines (reports)

Functions per file:           4-8 (focused domains)
Domains per file:             1 (clear boundaries)
Responsibilities:             Single per file
Maintainability:              High (SRP, clear organization)
Testability:                  High (isolated domains)
Firebase Admin:               Centralized in admin-shared.ts
Excel Import Logic:           Shared helpers in admin-shared.ts
```

### **Benefits:**
✅ **Single Responsibility Principle** - Each file handles ONE admin domain
✅ **Separation of Concerns** - Users ≠ Companies ≠ Projects ≠ Payments ≠ Reports
✅ **Reusability** - Shared utilities prevent duplication
✅ **Maintainability** - Easier to find and fix bugs in specific domains
✅ **Testability** - Can unit test each domain independently
✅ **Developer Experience** - Smaller files easier to navigate
✅ **Type Safety** - All TypeScript types and interfaces preserved
✅ **No Breaking Changes** - All function signatures unchanged

---

## 🚀 Testing Checklist

### **User Management:**
- [ ] Create user with auto-generated password
- [ ] Create user with provided password
- [ ] Update user details
- [ ] Import users from Excel
- [ ] Delete user and Firebase account

### **Company Management:**
- [ ] Create company with diversity certification
- [ ] Update company details
- [ ] Import companies from Excel

### **Project Management:**
- [ ] Create project with financial calculations
- [ ] Update project (verify recalculations)
- [ ] Assign company to project with employees/services
- [ ] Upload file to project (verify 25MB limit)
- [ ] Delete file from project
- [ ] Import projects from Excel

### **Organization Management:**
- [ ] Create division
- [ ] Update division
- [ ] Create department linked to division
- [ ] Update department

### **Template & Rate Management:**
- [ ] Create invoice template (Standard/MWBE/Custom)
- [ ] Update invoice template
- [ ] Create global billing rate
- [ ] Update global rate

### **Payment Tracking:**
- [ ] Record payment for invoice
- [ ] View payment history
- [ ] Add payment entry (payment type)
- [ ] Add write-off entry
- [ ] Add credit entry
- [ ] Add refund entry
- [ ] Update payment entry (verify recomputation)
- [ ] Void payment entry (verify recomputation)
- [ ] Verify cumulative calculations

### **Report Generation:**
- [ ] Generate Revenue report
- [ ] Generate Outstanding report
- [ ] Generate Utilization report
- [ ] Generate Profitability report

---

## 🔄 Rollback Instructions (If Needed)

If any issues are found during testing:

```bash
# Restore original actions.ts from git history
git checkout HEAD~1 src/app/(authenticated)/admin/actions.ts

# Remove new files
rm src/app/(authenticated)/admin/admin-*.ts

# Restore old imports in affected components
git checkout HEAD~1 src/components/user-form.tsx
git checkout HEAD~1 src/components/user-management.tsx
git checkout HEAD~1 src/components/user-import.tsx
git checkout HEAD~1 src/components/company-form.tsx
git checkout HEAD~1 src/components/company-import.tsx
git checkout HEAD~1 src/components/project-form.tsx
git checkout HEAD~1 src/components/project-management.tsx
git checkout HEAD~1 src/components/project-import.tsx
git checkout HEAD~1 src/components/project-file-manager.tsx
git checkout HEAD~1 src/components/division-form.tsx
git checkout HEAD~1 src/components/department-form.tsx
git checkout HEAD~1 src/components/payment-drawer.tsx

# Rebuild
npm run build
```

---

## ✅ Success Criteria

- [x] All 8 action files created with correct exports
- [x] All 12 consuming components updated with correct imports
- [x] Original `actions.ts` deleted
- [x] Shared utilities extracted to `admin-shared.ts`
- [ ] TypeScript compilation passes
- [ ] Build succeeds without errors
- [ ] App runs without crashes
- [ ] All admin workflows function correctly
- [ ] No regression in functionality
- [ ] Performance is same or better

---

## 📝 Notes

- All server actions marked with `'use server'` directive
- `admin-shared.ts` does NOT have `'use server'` (utility file only)
- Firebase Admin initialization preserved in shared file
- All business logic and validation rules unchanged
- All function signatures preserved for backward compatibility
- TypeScript interfaces properly exported and imported
- Excel import logic centralized for reuse
- Error handling preserved from original implementation
- Security: `sanitizeForLog()` used for all error logging
- Payment tracking uses cumulative calculation pattern for audit trail

---

## 🎯 Related Tasks

- ✅ **Phase 2 Item 1:** Refactor `invoicing/client-page.tsx` (2,220 → 1,850 lines)
- ✅ **Phase 2 Item 2:** Refactor `invoicing/actions.ts` (1,784 → 5 files)
- ✅ **Phase 2 Item 3:** Refactor `admin/actions.ts` (2,085 → 8 files)
- ⏳ **Phase 2 Item 4:** Refactor `invoices/client-page.tsx` (2,172 lines) - **NEXT**

---

**Refactoring Complete!** 🎉

All admin server actions have been successfully split into focused, maintainable modules following the Single Responsibility Principle.

**Ready for testing!** Please run `npm run build` and test all admin workflows to ensure everything works correctly.
