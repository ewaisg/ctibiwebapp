# Reports Data Structure Review - December 8, 2025

**Status**: Review Complete
**Reports Reviewed**: 20 (after removing 3 demo reports)
**Critical Issues Found**: 2

---

## Executive Summary

Reviewed all 20 remaining reports across 5 phases to verify data structures match `src/types/index.ts`. Most reports are correctly implemented, but **2 critical bugs** were identified that must be fixed before testing.

---

## Critical Issues Found

### ❌ Issue 1: Invoice `poNumber` Field Does Not Exist

**Severity**: HIGH - Will cause runtime errors
**Files Affected**:
- [src/lib/report-processors/financial-processors.ts:247](../src/lib/report-processors/financial-processors.ts#L247)
- [src/lib/report-processors/financial-processors.ts:494](../src/lib/report-processors/financial-processors.ts#L494)

**Problem**:
```typescript
// INCORRECT - Invoice does NOT have poNumber field
poNumber: invoice.poNumber
```

**Root Cause**:
According to `src/types/index.ts`, the `Invoice` interface does NOT have a `poNumber` field. The `poNumber` exists on the `Project` interface.

**Correct Implementation**:
```typescript
// Get project from invoice.projectId
const projectId = extractId(invoice.projectId);
const project = projectMap.get(projectId);

// Use project's poNumber
poNumber: project?.poNumber || 'N/A'
```

**Impact**:
- **Report 3: Outstanding Invoices** - Will show undefined/null for PO Number column
- **Report 4: Payment Tracking** - Will show undefined/null for PO Number column

---

### ⚠️ Issue 2: Payment Status Logic - Needs Clarification

**Severity**: MEDIUM - May not accurately reflect payment status
**Files Affected**:
- [src/lib/report-processors/financial-processors.ts:117-123](../src/lib/report-processors/financial-processors.ts#L117-L123)
- [src/lib/report-processors/executive-processors.ts:66-73](../src/lib/report-processors/executive-processors.ts#L66-L73)

**Current Implementation**:
```typescript
// Checking invoice.status for 'paid'
if (invoice.status === 'paid') {
  data.paidAmount += amount;
} else if (invoice.status === 'approved') {
  data.approvedAmount += amount;
}
```

**Question for User**:
According to the corrected database mapping document, invoices do NOT have a `paidDate` field and payment tracking should use the `PaymentTracking` collection. However, the code is checking `invoice.status === 'paid'`.

**Options**:
1. **Option A**: Invoice status IS updated to 'paid' when payment received → Current code is correct
2. **Option B**: Invoice status stays 'approved' and we must query `PaymentTracking` collection → Need to fix

**Recommendation**: Please clarify if:
- Is `invoice.status` set to 'paid' when payment is received?
- Or should we query the `PaymentTracking` collection to determine payment status?

---

## Reports Status by Phase

### ✅ Phase 1: Financial Reports (5 Reports)

| # | Report Name | Status | Issues |
|---|-------------|--------|--------|
| 1 | Revenue by Department | ⚠️ **NEEDS FIX** | Payment status logic needs clarification |
| 2 | Revenue by Project | ✅ **READY** | No issues - uses correct Project budget fields |
| 3 | Outstanding Invoices | ❌ **BROKEN** | Missing poNumber field (critical) |
| 4 | Payment Tracking | ❌ **BROKEN** | Missing poNumber field (critical) |
| 5 | Profitability Analysis | ✅ **READY** | No issues |

**Phase 1 Summary**: 2 reports ready to test, 2 broken (need bug fix), 1 needs clarification

---

### ✅ Phase 2: Labor Reports (5 Reports)

| # | Report Name | Status | Data Structure |
|---|-------------|--------|----------------|
| 6 | Direct Labor Hours | ✅ **READY** | ✓ Correct employeeId handling (number)<br>✓ Correct pay item codes<br>✓ Correct labor matching via poNumber |
| 7 | Employee Utilization | ✅ **READY** | ✓ Correct timesheet aggregation<br>✓ Correct billable hour calculation |
| 8 | Billable vs Non-Billable | ✅ **READY** | ✓ Uses BILLABLE_CODES constants<br>✓ Correct classification logic |
| 9 | Overtime Analysis | ✅ **READY** | ✓ Correct OVT15/OVT20 detection<br>✓ Proper percentage calculations |
| 10 | Labor Cost Analysis | ✅ **READY** | ✓ Correct integration with invoices<br>✓ Proper rate calculations |

**Phase 2 Summary**: **ALL 5 REPORTS READY TO TEST** ✅

---

### ✅ Phase 3: Project Reports (4 Reports)

| # | Report Name | Status | Data Structure |
|---|-------------|--------|----------------|
| 11 | Project Status | ✅ **READY** | ✓ Correct budget fields:<br>&nbsp;&nbsp;• originalPoAmount<br>&nbsp;&nbsp;• changeOrderAmount<br>&nbsp;&nbsp;• newPoAmount<br>&nbsp;&nbsp;• previouslyInvoicedAmount<br>&nbsp;&nbsp;• remainingPoAmount |
| 12 | Budget vs Actual | ✅ **READY** | ✓ Correct budget comparison logic<br>✓ Proper variance calculations |
| 13 | Change Order Impact | ✅ **READY** | ✓ Uses changeOrderAmount field<br>✓ Correct impact analysis |
| 14 | Resource Allocation | ✅ **READY** | ✓ Correct resource_allocations collection<br>✓ Proper employee capacity tracking |

**Phase 3 Summary**: **ALL 4 REPORTS READY TO TEST** ✅

---

### ✅ Phase 4: Compliance Reports (2 Reports)

| # | Report Name | Status | Data Structure |
|---|-------------|--------|----------------|
| 15 | MWBE Participation | ✅ **READY** | ✓ Uses diversityCertification field<br>✓ Checks 'MWBE', 'WBE', 'SBE' values<br>✓ Uses mwbeGoalPercent from contract |
| 16 | DBE Utilization | ✅ **READY** | ✓ Same structure as MWBE<br>✓ Proper certification tracking |

**Phase 4 Summary**: **ALL 2 REPORTS READY TO TEST** ✅

---

### ✅ Phase 5: Executive Reports (4 Reports)

| # | Report Name | Status | Issues |
|---|-------------|--------|--------|
| 17 | Executive Dashboard | ⚠️ **NEEDS FIX** | Payment status logic needs clarification |
| 18 | KPI Summary | ⚠️ **NEEDS FIX** | Payment status logic needs clarification |
| 19 | Trend Analysis | ✅ **READY** | Uses correct aggregation logic |
| 20 | Department Comparison | ✅ **READY** | Correct cross-department analysis |

**Phase 5 Summary**: 2 reports ready, 2 need payment status clarification

---

## Data Structure Verification

### ✅ Verified Correct Implementations

1. **Project Budget Fields** ✓
   - Using `originalPoAmount`, `changeOrderAmount`, `newPoAmount`
   - NOT using non-existent `budgetAmount` field
   - Correct calculation of remainingPoAmount

2. **Employee ID Handling** ✓
   - `timesheet.employeeId` treated as NUMBER
   - `employee.employeeId` treated as NUMBER
   - Converted to string for Map keys: `String(timesheet.employeeId)`

3. **Pay Item Codes** ✓
   - Using constants: `BILLABLE_CODES`, `NON_BILLABLE_CODES`, `PTO_CODES`
   - Matching types/index.ts definitions exactly

4. **Company Diversity Certification** ✓
   - Using single `diversityCertification` enum field
   - Checking 'MWBE' | 'WBE' | 'SBE' | 'None'
   - NOT using separate isMWBE/isDBE boolean fields

5. **Contract Fields** ✓
   - `contractNumber` used as NUMBER (not string)
   - `mwbeGoalPercent` used correctly

6. **Project-Timesheet Matching** ✓
   - Using `labors[].laborValue` to match `project.poNumber`
   - Checking laborTitle for 'Project/Job' or 'Project/Categories'

---

## What Can You Test Now?

### ✅ Fully Testable Reports (11 reports)

**Test these immediately - no blocking issues:**

**Phase 2 - Labor Reports (ALL 5):**
1. ✅ Direct Labor Hours
2. ✅ Employee Utilization
3. ✅ Billable vs Non-Billable
4. ✅ Overtime Analysis
5. ✅ Labor Cost Analysis

**Phase 3 - Project Reports (ALL 4):**
1. ✅ Project Status
2. ✅ Budget vs Actual
3. ✅ Change Order Impact
4. ✅ Resource Allocation

**Phase 4 - Compliance Reports (ALL 2):**
1. ✅ MWBE Participation
2. ✅ DBE Utilization

---

### ⚠️ Test After Clarification (5 reports)

**Need to confirm payment status logic first:**

**Phase 1:**
- Revenue by Department (Report 1)

**Phase 5:**
- Executive Dashboard (Report 17)
- KPI Summary (Report 18)

**Phase 1:**
- Revenue by Project (Report 2) - Can test, but payment breakdown may be inaccurate
- Profitability Analysis (Report 5) - Can test basic functionality

---

### ❌ Cannot Test Yet (2 reports)

**Must fix critical bugs first:**

**Phase 1:**
- Outstanding Invoices (Report 3) - Missing poNumber field
- Payment Tracking (Report 4) - Missing poNumber field

---

## Required Actions

### Priority 1: Fix Critical Bug (REQUIRED)

**Fix invoice.poNumber bug:**

File: `src/lib/report-processors/financial-processors.ts`

**Line 247** - Outstanding Invoices:
```typescript
// BEFORE (line 244-249):
return {
  invoiceNumber: invoice.invoiceNumber,
  projectName: project?.projectName || 'N/A',
  poNumber: invoice.poNumber,  // ❌ WRONG - Invoice has no poNumber
  invoiceTotal: invoice.invoiceTotal,
  dueDate: dueDate,

// AFTER:
return {
  invoiceNumber: invoice.invoiceNumber,
  projectName: project?.projectName || 'N/A',
  poNumber: project?.poNumber || 'N/A',  // ✅ CORRECT - Get from project
  invoiceTotal: invoice.invoiceTotal,
  dueDate: dueDate,
```

**Line 494** - Payment Tracking:
```typescript
// BEFORE (similar structure):
poNumber: invoice.poNumber,  // ❌ WRONG

// AFTER:
poNumber: project?.poNumber || 'N/A',  // ✅ CORRECT
```

---

### Priority 2: Clarify Payment Status Logic (IMPORTANT)

**Question**: How is invoice payment status tracked?

**Option A**: Invoice status field is updated
- If `invoice.status` changes to 'paid' when payment received
- Current code is correct, no changes needed

**Option B**: PaymentTracking collection must be queried
- If `invoice.status` stays 'approved' after payment
- Must query `PaymentTracking` collection with status = 'Paid'
- Need to update 5 reports

**Please confirm which option is correct.**

---

## Testing Recommendations

### Phase 1: Test Labor Reports (Highest Confidence)
Start with Phase 2 (Labor Reports) - all 5 reports are fully verified and ready:
1. Direct Labor Hours
2. Employee Utilization
3. Billable vs Non-Billable
4. Overtime Analysis
5. Labor Cost Analysis

**Expected Results**:
- Should show correct employee hours
- Billable/non-billable classification should work
- Overtime calculations should be accurate
- All fields should populate correctly

---

### Phase 2: Test Project & Compliance Reports
After labor reports work, test:

**Project Reports (4)**:
- Should show correct budget fields
- Change orders should calculate properly
- Resource allocation should work

**Compliance Reports (2)**:
- MWBE/DBE tracking should work
- Certification types should filter correctly

---

### Phase 3: Fix Critical Bug & Test Financial Reports

1. **Fix** the `invoice.poNumber` bug
2. **Clarify** payment status tracking
3. **Test** all 5 financial reports

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| **Total Reports** | **20** | After removing 3 demos |
| ✅ Ready to Test | 11 | Labor (5), Project (4), Compliance (2) |
| ⚠️ Needs Clarification | 5 | Payment status logic |
| ❌ Blocking Bug | 2 | Missing poNumber field |
| 🗑️ Removed | 3 | Demo reports (14, 18, 19) |

---

## Next Steps

1. ✅ **You can start testing 11 reports immediately** (no blockers)
2. ❌ **Fix the poNumber bug** (2 lines of code)
3. ⚠️ **Clarify payment status tracking** (answer Option A or B)
4. ✅ **Complete testing of remaining 9 reports**

---

**Document Status**: Complete
**Last Updated**: December 8, 2025
**Reviewed By**: Claude
**Reports Ready**: 11/20 (55%)
**Reports Blocked**: 2/20 (10%)
**Reports Pending**: 7/20 (35%)
