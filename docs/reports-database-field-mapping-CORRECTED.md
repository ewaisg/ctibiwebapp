# Reports Database Field Mapping - CORRECTED from types/index.ts

**Source of Truth**: `src/types/index.ts`
**Date**: December 7, 2025

> ⚠️ **CRITICAL**: This document is derived directly from the TypeScript interfaces in `src/types/index.ts`, which is the authoritative source for all Firestore collection structures.

---

## Phase 1: Financial Reports (5 Reports)

### 1. Revenue by Department

**Processor**: `processRevenueByDepartment`

#### Collections Used:

**Primary Collection: `invoices`**
```typescript
interface Invoice {
  id: string                    // Auto-generated

  // Core fields
  invoiceNumber: string
  invoiceTotal: number
  status: string                // NOT enum - just string
  createdAt: Timestamp
  dueDate: Timestamp
  approvedAt: Timestamp         // When invoice was approved

  // References
  projectId: FlexibleReference  // → projects/{projectId} or string ID
  contractId: FlexibleReference // → contracts/{contractId} or string ID
  contractNumber: number        // Denormalized number

  // Invoice details
  fromDate: Timestamp
  toDate: Timestamp
  invoiceItemsTotal: number
  reimbursableExpensesTotal: number

  // Nested array: invoiceItems[]
  invoiceItems: InvoiceItem[]   // See below for structure

  // Reimbursable expenses
  reimbursableExpenses: ReimbursableExpense[]

  // User tracking
  userId: FlexibleReference     // → users/{uid}
  approvedBy: FlexibleReference // → users/{uid}
  approvedByName: string

  // Note: NO paidDate field exists in the type definition!
  // Payment tracking is in separate PaymentTracking collection
}

interface InvoiceItem {
  amount: number
  billingRate: number
  companyId: FlexibleReference    // → companies/{companyId}
  companyName?: string            // Denormalized
  employeeId: FlexibleReference   // → employees/{employeeId}
  employeeName?: string           // Denormalized
  serviceId?: FlexibleReference   // → services/{serviceId}
  serviceName?: string            // Denormalized
  hours: number
  markdown: number                // Percentage markdown (additive, NOT discount)
  notes: string
}
```

**Related Collection: `departments`**
```typescript
interface Department {
  id: string                      // Custom ID = departmentCode
  divisionId: FlexibleReference   // → divisions/{divisionId}
  departmentCode: string
  departmentName: string
  isInactive: boolean
}
```

**Related Collection: `projects`**
```typescript
interface Project {
  id: string                      // Custom ID = poNumber
  projectName: string
  poNumber: string

  // Budget fields (NOT just "budgetAmount"!)
  originalPoAmount?: number
  changeOrderAmount?: number
  newPoAmount?: number            // original + change orders
  previouslyInvoicedAmount?: number
  remainingPoAmount?: number

  // Hour tracking
  budgetedHours?: number
  usedHours?: number
  remainingHours?: number

  // References
  contractId: FlexibleReference   // → contracts/{contractId}
  departmentId?: FlexibleReference // → departments/{departmentId}
  departmentCode?: string         // Denormalized
  contractNumber?: number         // Denormalized

  // Status
  isInactive: boolean
  isComplete?: boolean

  // Management
  projectManager?: string
  approvingSupervisor?: string

  // Nested: Assigned companies/employees/services
  assignedCompanies?: {
    companyId: FlexibleReference
    companyName: string
    assignedEmployees?: {
      employeeId: FlexibleReference
      employeeName: string
    }[]
    assignedServices?: {
      serviceId: FlexibleReference
      serviceName: string
      description?: string
      billingRate: number
      isActive?: boolean
    }[]
  }[]
}
```

#### Data Flow:
1. Fetch `invoices` filtered by `createdAt` date range
2. For each invoice: `invoice.projectId` → `project.departmentId` → `department`
3. Group by `department.id` and aggregate `invoice.invoiceTotal`
4. **IMPORTANT**: To check if invoice is "paid", you must query `PaymentTracking` collection

#### Formulas:
```javascript
// Per department:
totalRevenue = SUM(invoices.invoiceTotal) WHERE invoice.projectId links to department

// For paid/pending status, must query PaymentTracking:
paidAmount = SUM(paymentTracking.paidAmount WHERE status = 'Paid')
pendingAmount = SUM(invoices.invoiceTotal) - paidAmount
```

#### Filter Fields:
- `dateFrom` → filters `invoices.createdAt >= dateFrom`
- `dateTo` → filters `invoices.createdAt <= dateTo`
- `departmentId` (optional) → filters via `project.departmentId`

---

### 2. Revenue by Project

**Processor**: `processRevenueByProject`

#### Collections Used:

**Primary Collection: `invoices`** (same as above)

**Primary Collection: `projects`** (same as above)

#### Formulas:
```javascript
// Per project:
totalRevenue = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)

// Budget tracking:
remainingBudget = project.remainingPoAmount // Already calculated field
budgetUtilization = (project.previouslyInvoicedAmount / project.newPoAmount) * 100

// Note: project.newPoAmount = originalPoAmount + changeOrderAmount
```

#### Filter Fields:
- `dateFrom` → filters `invoices.createdAt >= dateFrom`
- `dateTo` → filters `invoices.createdAt <= dateTo`
- `projectId` (optional) → filters `invoices.projectId == projectId`

---

### 3. Outstanding Invoices

**Processor**: `processOutstandingInvoices`

#### Collections Used:

**Primary Collection: `invoices`** (same structure as Report 1)

**Related Collection: `PaymentTracking`**
```typescript
interface PaymentTracking {
  id: string                      // Auto-generated
  invoiceId: FlexibleReference    // → invoices/{invoiceId}
  invoiceNumber: string           // Denormalized
  projectId: FlexibleReference    // → projects/{projectId}
  projectName: string             // Denormalized

  // Amounts
  invoiceAmount: number
  paidAmount: number
  outstandingAmount: number

  // Payment details
  paymentDate?: Timestamp
  paymentMethod?: 'Check' | 'ACH' | 'Wire' | 'Credit Card'
  paymentReference?: string

  // Status
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue'
  dueDate: Timestamp

  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### Query Logic:
```javascript
// Outstanding invoices:
// Option 1: Query PaymentTracking where status != 'Paid'
WHERE paymentTracking.status IN ['Pending', 'Partial', 'Overdue']

// Option 2: Query invoices where status = 'approved' but no corresponding
// PaymentTracking with status = 'Paid'
```

#### Formulas:
```javascript
// Per invoice:
daysOutstanding = (TODAY - paymentTracking.dueDate) / (1000 * 60 * 60 * 24)

// Aging buckets:
if (daysOutstanding <= 30) → '0-30 days'
else if (daysOutstanding <= 60) → '31-60 days'
else if (daysOutstanding <= 90) → '61-90 days'
else → '90+ days'

// Outstanding amount from PaymentTracking:
outstandingAmount = paymentTracking.outstandingAmount
```

#### Filter Fields:
- `projectId` (optional) → filters via `paymentTracking.projectId`

---

### 4. Payment Tracking Report

**Processor**: `processPaymentTracking`

#### Collections Used:

**Primary Collection: `PaymentTracking`** (structure shown in Report 3)

**Related Collections**:
- `invoices` → via `paymentTracking.invoiceId`
- `projects` → via `paymentTracking.projectId`
- `contracts` → via `invoice.contractId`

#### Formulas:
```javascript
// Per payment entry:
outstandingAmount = invoiceAmount - paidAmount  // Already calculated in collection
paymentProgress = (paidAmount / invoiceAmount) * 100

// Overdue check:
isOverdue = (status IN ['Pending', 'Partial']) AND (dueDate < TODAY)
```

#### Filter Fields:
- `dateFrom` → filters `paymentTracking.paymentDate >= dateFrom`
- `dateTo` → filters `paymentTracking.paymentDate <= dateTo`
- `contractId` (optional) → filters via `invoice.contractId`

---

### 5. Profitability Analysis

**Processor**: `processProfitabilityAnalysis`

#### Collections Used:

**Primary Collection: `invoices`** (for revenue - structure in Report 1)

**Primary Collection: `cti_timesheets`** (for labor)
```typescript
interface CtiTimesheet {
  id: string

  // IMPORTANT: employeeId is a NUMBER, not DocumentReference!
  employeeId: number              // Matches employees.employeeId (number)
  employeeNumber: string          // Matches employees.employeeNumber (string)
  employeeFirstName: string
  employeeLastName: string

  timecardDate: Timestamp
  day?: string
  startTime?: string
  endTime?: string
  totalHoursActual: number        // Sum of all payItemHours

  // Nested arrays:
  labors: {
    laborTitle: string            // 'Division' | 'Customer' | 'Department' | 'Project/Categories' | 'Project/Job'
    laborValue: string            // Project code, department code, etc.
  }[]

  payItems: {
    payItemCode: string           // 'HRLY', 'OVT15', 'OVT20', 'SalaryHrs', 'PTO', 'HOL', etc.
    payItemHours: number
    payItemName: string
  }[]

  notes?: string
}

// Pay item classifications (from types):
const BILLABLE_PAY_ITEM_CODES = ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP'];
const NON_BILLABLE_PAY_ITEM_CODES = ['SAL', 'CTI_REG', 'CTI_OVT'];
const PTO_PAY_ITEM_CODES = ['PTO', 'HOL', 'FLTHOL', 'BER', 'JURY', 'LV_UNPD', 'MIL'];
const NON_BILLABLE_DEPARTMENT_CODES = ['100', '500', '900', '905', '910', '915', '920'];
```

**Related Collection: `employees`**
```typescript
interface Employee {
  id: string                      // Custom ID = employeeId as string

  // IMPORTANT: employeeId is NUMBER, employeeNumber is STRING
  employeeId: number              // Integer ID from iSolved/imports
  employeeNumber: string          // Internal String ID from CTI

  // Name fields
  firstName: string
  lastName: string
  middleInitial?: string
  formalName: string              // Use this for display

  // Status
  employmentStatus: 'Active' | 'Terminated'
  role?: string

  // References
  divisionId?: FlexibleReference  // → divisions/{divisionId}
  divisionCode?: string           // Denormalized
  departmentId?: FlexibleReference // → departments/{departmentId}
  departmentCode?: string         // Denormalized
  companyId: FlexibleReference    // → companies/{companyId}
  companyName: string             // Denormalized

  // Work details
  weeklyCapacityHours: number
  selfServiceEmail?: string

  // Flags
  isAdmin: boolean
  isInternal: boolean
  isSubconsultant: boolean
}
```

**Related Collection: `projects`** (structure in Report 2)

**Related Collection: `departments`** (structure in Report 1)

#### Data Matching Logic:
```javascript
// Match timesheet to project:
// timesheet.labors[] contains { laborTitle, laborValue }
// When laborTitle = 'Project/Job' or 'Project/Categories':
//   laborValue matches project.poNumber

// Match timesheet to employee:
// timesheet.employeeId (number) matches employee.employeeId (number)
```

#### Formulas:
```javascript
// Per project:
revenue = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)

// Billable hours:
billableHours = SUM(
  timesheet.payItems[i].payItemHours
  WHERE payItems[i].payItemCode IN BILLABLE_PAY_ITEM_CODES
  AND labors[j].laborValue = project.poNumber
  AND labors[j].laborTitle IN ['Project/Job', 'Project/Categories']
)

// Labor cost (requires cost rates - may need additional data):
laborCost = billableHours * averageInternalCostRate

// Profit metrics:
grossProfit = revenue - laborCost
profitMargin = (grossProfit / revenue) * 100
markup = ((averageBillingRate - averageCostRate) / averageCostRate) * 100
```

#### Filter Fields:
- `dateFrom` → filters `invoices.createdAt` AND `cti_timesheets.timecardDate`
- `dateTo` → filters both collections
- `departmentId` (optional) → filters via `project.departmentId`
- `projectId` (optional) → filters `invoices.projectId` and timesheets via poNumber match

---

## Phase 2: Labor Reports (5 Reports)

### 6. Labor Hours by Department

**Processor**: `processLaborHoursByDepartment`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (structure in Report 5)

**Related Collection: `employees`** (structure in Report 5)

**Related Collection: `departments`** (structure in Report 1)

#### Data Matching:
```javascript
// Match timesheet to employee:
timesheet.employeeId (number) == employee.employeeId (number)

// Match employee to department:
employee.departmentId → department.id
```

#### Formulas:
```javascript
// Per department:
totalHours = SUM(timesheet.totalHoursActual WHERE employee.departmentId = department.id)

// Break down by pay item:
regularHours = SUM(payItems[i].payItemHours WHERE payItemCode = 'HRLY')
overtimeHours = SUM(payItems[i].payItemHours WHERE payItemCode IN ['OVT15', 'OVT20'])
ptoHours = SUM(payItems[i].payItemHours WHERE payItemCode IN PTO_PAY_ITEM_CODES)

// Billable vs non-billable:
billableHours = SUM(payItems[i].payItemHours WHERE payItemCode IN BILLABLE_PAY_ITEM_CODES)
nonBillableHours = totalHours - billableHours
```

#### Filter Fields:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `departmentId` (optional) → filters via `employee.departmentId`

---

### 7. Labor Hours by Project

**Processor**: `processLaborHoursByProject`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (structure in Report 5)

**Related Collection: `projects`** (structure in Report 2)

#### Data Matching:
```javascript
// Match timesheet to project:
FOR each labor in timesheet.labors:
  IF labor.laborTitle IN ['Project/Job', 'Project/Categories']:
    IF labor.laborValue == project.poNumber:
      → timesheet belongs to this project
```

#### Formulas:
```javascript
// Per project:
totalHours = SUM(
  timesheet.payItems[].payItemHours
  WHERE labors[].laborValue = project.poNumber
  AND labors[].laborTitle IN ['Project/Job', 'Project/Categories']
)

billableHours = SUM(
  payItems[i].payItemHours
  WHERE payItemCode IN BILLABLE_PAY_ITEM_CODES
)

nonBillableHours = totalHours - billableHours
```

#### Filter Fields:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `projectId` (optional) → filters via poNumber match

---

### 8. Labor Hours by Employee

**Processor**: `processLaborHoursByEmployee`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (structure in Report 5)

**Related Collection: `employees`** (structure in Report 5)

**Related Collection: `departments`** (for grouping)

#### Data Matching:
```javascript
// Match timesheet to employee:
timesheet.employeeId (number) == employee.employeeId (number)
```

#### Formulas:
```javascript
// Per employee:
totalHours = SUM(timesheet.totalHoursActual WHERE timesheet.employeeId = employee.employeeId)

regularHours = SUM(payItems[i].payItemHours WHERE payItemCode = 'HRLY')
overtimeHours = SUM(payItems[i].payItemHours WHERE payItemCode IN ['OVT15', 'OVT20'])
ptoHours = SUM(payItems[i].payItemHours WHERE payItemCode IN PTO_PAY_ITEM_CODES)

billableHours = SUM(payItems[i].payItemHours WHERE payItemCode IN BILLABLE_PAY_ITEM_CODES)
utilization = (billableHours / totalHours) * 100
```

#### Filter Fields:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `employeeId` (optional) → filters `cti_timesheets.employeeId == employeeId` (number!)
- `departmentId` (optional) → filters via `employee.departmentId`

---

### 9. Overtime Analysis

**Processor**: `processOvertimeAnalysis`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (structure in Report 5)

**Related Collection: `employees`** (structure in Report 5)

**Related Collection: `departments`** (for grouping)

#### Focus on Pay Item Codes:
```typescript
// From types:
payItemCode values for overtime:
- 'HRLY' → Regular hours
- 'OVT15' → 1.5x overtime
- 'OVT20' → 2.0x overtime
- 'SalaryHrs' → Salary hours
```

#### Formulas:
```javascript
// Per employee:
regularHours = SUM(payItems[i].payItemHours WHERE payItemCode = 'HRLY')
overtime15Hours = SUM(payItems[i].payItemHours WHERE payItemCode = 'OVT15')
overtime20Hours = SUM(payItems[i].payItemHours WHERE payItemCode = 'OVT20')
totalOvertimeHours = overtime15Hours + overtime20Hours

overtimePercentage = (totalOvertimeHours / (regularHours + totalOvertimeHours)) * 100
```

#### Filter Fields:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `departmentId` (optional) → filters via `employee.departmentId`

---

### 10. Labor Cost Analysis

**Processor**: `processLaborCostAnalysis`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (structure in Report 5)

**Primary Collection: `invoices`** (for billing rates - structure in Report 1)

**Related Collection: `employees`** (structure in Report 5)

**Related Collection: `projects`** (structure in Report 2)

**Related Collection: `departments`** (for grouping)

#### Formulas:
```javascript
// Per department or project:
totalHours = SUM(timesheet.payItems[].payItemHours)

// From invoices - average billing rate:
averageBillingRate = SUM(invoiceItems[].billingRate * invoiceItems[].hours) / SUM(invoiceItems[].hours)

// Cost calculation (requires internal cost rates):
laborCost = totalHours * averageInternalCostRate

// Analysis:
costPerHour = laborCost / totalHours
revenuePerHour = totalRevenue / totalHours
profitPerHour = revenuePerHour - costPerHour
```

#### Filter Fields:
- `dateFrom` → filters both `cti_timesheets.timecardDate` AND `invoices.createdAt`
- `dateTo` → filters both collections
- `departmentId` (optional) → filters via `employee.departmentId`
- `projectId` (optional) → filters via project

---

## Phase 3: Project Reports (4 Reports)

### 11. Project Status Report

**Processor**: `processProjectStatus`

#### Collections Used:

**Primary Collection: `projects`** (structure in Report 2)

**Related Collection: `invoices`** (for revenue to date)

**Related Collection: `contracts`**
```typescript
interface Contract {
  id: string                      // Auto-generated
  contractName: string
  contractNumber: number          // NUMBER, not string!

  // Client
  clientId: FlexibleReference     // → clients/{clientId}
  clientName: string              // Denormalized

  // Dates
  contractEffectiveDate: Timestamp
  contractDuration: string

  // Budget
  contractCapacity: number

  // MWBE
  mwbeGoalPercent: number

  // Other
  supplierContractNumber?: string
}
```

**Related Collection: `clients`**
```typescript
interface Client {
  id: string                      // Auto-generated
  clientName: string
  contactName?: string
  emailAddress?: string
  phoneNumber?: string
  streetAddress?: string
  city?: string
  state?: string
  zipCode?: string
  title?: string
}
```

#### Formulas:
```javascript
// Per project:
revenueToDate = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)

// Use existing calculated fields:
remainingBudget = project.remainingPoAmount
budgetUtilization = (project.previouslyInvoicedAmount / project.newPoAmount) * 100

// Completion status:
isComplete = project.isComplete === true
isInactive = project.isInactive === true
```

#### Filter Fields:
- `departmentId` (optional) → filters `projects.departmentId`
- `isComplete` (optional) → filters `projects.isComplete`
- `isInactive` (optional) → filters `projects.isInactive`

---

### 12. Project Budget vs Actuals

**Processor**: `processProjectBudgetVsActuals`

#### Collections Used:

**Primary Collection: `projects`** (structure in Report 2)

**Related Collection: `invoices`** (for actual revenue)

**Related Collection: `cti_timesheets`** (for actual hours)

#### Formulas:
```javascript
// Per project - use existing calculated fields:
originalBudget = project.originalPoAmount
totalBudget = project.newPoAmount  // original + change orders
actualRevenue = project.previouslyInvoicedAmount  // Already calculated!
variance = actualRevenue - totalBudget
variancePercentage = (variance / totalBudget) * 100

// Hours:
budgetedHours = project.budgetedHours
actualHours = project.usedHours  // Already calculated!
hoursVariance = actualHours - budgetedHours
```

#### Filter Fields:
- `dateFrom` → filters `invoices.createdAt` AND `cti_timesheets.timecardDate`
- `dateTo` → filters both collections
- `departmentId` (optional) → filters `projects.departmentId`
- `projectId` (optional) → filters specific project

---

### 13. Project Completion Report

**Processor**: `processProjectCompletion`

#### Collections Used:

**Primary Collection: `projects`** (structure in Report 2)

**Query**: `WHERE projects.isComplete = true`

**Related Collection: `invoices`** (for final revenue)

**Related Collection: `cti_timesheets`** (for total hours)

#### Formulas:
```javascript
// Per completed project:
finalRevenue = project.previouslyInvoicedAmount  // Already calculated
budgetVariance = finalRevenue - project.newPoAmount

totalLaborHours = project.usedHours  // Already calculated

// If project has completion date, calculate duration:
// Note: Project type doesn't have startDate/endDate fields!
// May need to use createdAt or other fields
```

#### Filter Fields:
- `departmentId` (optional) → filters `projects.departmentId`
- `isComplete` → filters `projects.isComplete = true`

---

### 14. Resource Allocation Report

**Processor**: `processResourceAllocation`

#### Collections Used:

**Primary Collection: `resource_allocations`**
```typescript
interface ResourceAllocation {
  id: string                      // Auto-generated
  employeeId: FlexibleReference   // → employees/{employeeId}
  projectId: FlexibleReference    // → projects/{projectId}
  serviceId?: FlexibleReference   // → services/{serviceId}
  weekStartDate: Timestamp        // Always starts on Sunday
  scheduledHours: number
}
```

**Related Collection: `employees`** (structure in Report 5)

**Related Collection: `projects`** (structure in Report 2)

**Related Collection: `cti_timesheets`** (for actual hours)

#### Formulas:
```javascript
// Per employee:
totalScheduledHours = SUM(allocation.scheduledHours
  WHERE allocation.employeeId = employee.id
  AND weekStartDate IN [current week]
)

// Compare to capacity:
weeklyCapacity = employee.weeklyCapacityHours
utilizationScheduled = (totalScheduledHours / weeklyCapacity) * 100
isOverallocated = totalScheduledHours > weeklyCapacity

// Actual hours vs scheduled:
actualHours = SUM(timesheet.totalHoursActual
  WHERE timesheet.employeeId = employee.employeeId
  AND timecardDate IN [week])

variance = actualHours - totalScheduledHours
```

#### Filter Fields:
- `dateFrom` → filters allocations by weekStartDate
- `dateTo` → filters allocations by weekStartDate
- `departmentId` (optional) → filters via `employee.departmentId`
- `projectId` (optional) → filters `resource_allocations.projectId`

---

## Phase 4: Compliance Reports (2 Reports)

### 15. MWBE Participation Report

**Processor**: `processMWBEParticipation`

#### Collections Used:

**Primary Collection: `companies`**
```typescript
interface Company {
  id: string                      // Custom ID = companyCode
  companyName: string
  companyCode: string

  // Flags
  isSubconsultant: boolean
  isInactive: boolean

  // MWBE field:
  diversityCertification?: 'MWBE' | 'WBE' | 'SBE' | 'None'

  // Timestamps
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
```

**Primary Collection: `invoices`** (structure in Report 1)
- Use `invoiceItems[]` where `companyId` references MWBE companies

**Related Collection: `contracts`** (structure in Report 11)
- Use `mwbeGoalPercent` field for goals

#### Formulas:
```javascript
// Per contract or project:
totalSpending = SUM(invoiceItems[].amount)

mwbeSpending = SUM(invoiceItems[].amount
  WHERE companies[invoiceItems[].companyId].diversityCertification IN ['MWBE', 'WBE', 'SBE'])

mwbeParticipationPercentage = (mwbeSpending / totalSpending) * 100

// Goal tracking:
goalAchievement = (mwbeParticipationPercentage / contract.mwbeGoalPercent) * 100
```

#### Filter Fields:
- `dateFrom` → filters `invoices.createdAt`
- `dateTo` → filters `invoices.createdAt`
- `contractId` (optional) → filters via `invoice.contractId`
- `projectId` (optional) → filters `invoices.projectId`

---

### 16. DBE Utilization Report

**Processor**: `processDBEUtilization`

**Note**: Company type does NOT have separate DBE fields. DBE is likely tracked via `diversityCertification` field or may need additional fields added to Company interface.

#### Collections Used:

**Primary Collection: `companies`** (same structure as Report 16)

**Primary Collection: `invoices`** (structure in Report 1)

#### Formulas:
```javascript
// Same as MWBE report, but checking for specific certification type
// May need to add 'DBE' to diversityCertification enum
```

#### Filter Fields:
- Same as Report 16

---

## Phase 5: Executive Reports (4 Reports)

### 17. Executive Dashboard

**Processor**: `processExecutiveDashboard`

#### Collections Used:

**Multiple Collections** (Summary from all sources):
- `invoices` → total revenue
- `cti_timesheets` → total hours
- `projects` → active projects count
- `employees` → headcount
- `contracts` → active contracts

#### Key Metrics:
```javascript
// Financial:
totalRevenue = SUM(invoices.invoiceTotal WHERE invoices.createdAt IN [dateRange])

// Outstanding from PaymentTracking:
totalOutstanding = SUM(paymentTracking.outstandingAmount WHERE status != 'Paid')

// Operations:
activeProjects = COUNT(projects WHERE isInactive = false)
completedProjects = COUNT(projects WHERE isComplete = true)
activeEmployees = COUNT(employees WHERE employmentStatus = 'Active')
totalLaborHours = SUM(cti_timesheets.totalHoursActual WHERE timecardDate IN [dateRange])

// Utilization:
billableHours = SUM(payItems[i].payItemHours WHERE payItemCode IN BILLABLE_PAY_ITEM_CODES)
utilizationRate = (billableHours / totalLaborHours) * 100
```

#### Filter Fields:
- `dateFrom` → filters all collections
- `dateTo` → filters all collections

---

### 18-20. Revenue Trends, KPI Summary, Year-over-Year Comparison

These reports use the same collections and structures as above, with different aggregation and time series logic.

---

## Critical Corrections Summary

### MAJOR DIFFERENCES FROM PREVIOUS VERSION:

1. **Invoice collection**:
   - ❌ NO `paidDate` field exists
   - ✅ Use `PaymentTracking` collection for payment status
   - ✅ `contractNumber` is a **number**, not string
   - ✅ `status` is just **string**, not enum

2. **Project collection**:
   - ❌ NO simple `budgetAmount` field
   - ✅ Has `originalPoAmount`, `changeOrderAmount`, `newPoAmount`
   - ✅ Has `previouslyInvoicedAmount` (calculated value)
   - ✅ Has `budgetedHours`, `usedHours`, `remainingHours`
   - ✅ `id` = `poNumber` (custom ID)

3. **CtiTimesheet collection**:
   - ✅ `employeeId` is a **NUMBER**, not DocumentReference
   - ✅ `employeeNumber` is a **STRING**
   - ✅ Collection name likely `cti_timesheets`

4. **Employee collection**:
   - ✅ `employeeId` is a **NUMBER**
   - ✅ `employeeNumber` is a **STRING**
   - ✅ Use `formalName` for display
   - ✅ Has `weeklyCapacityHours` field
   - ✅ `id` = `employeeId` as string (custom ID)

5. **Company collection**:
   - ❌ NO separate MWBE/DBE/insurance/license fields
   - ✅ Has `diversityCertification` enum: 'MWBE' | 'WBE' | 'SBE' | 'None'
   - ✅ `id` = `companyCode` (custom ID)

6. **Contract collection**:
   - ✅ `contractNumber` is a **NUMBER**
   - ✅ Has `mwbeGoalPercent` (number)

7. **Department collection**:
   - ✅ Has `divisionId` reference
   - ✅ `id` = `departmentCode` (custom ID)

8. **Pay Item Codes**:
   - ✅ Billable: ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP']
   - ✅ Non-Billable: ['SAL', 'CTI_REG', 'CTI_OVT']
   - ✅ PTO: ['PTO', 'HOL', 'FLTHOL', 'BER', 'JURY', 'LV_UNPD', 'MIL']

9. **Removed Demo Reports**:
   - ❌ Report 14 (Project Timeline) - removed (demo with missing fields)
   - ❌ Report 18 (Subcontractor Compliance) - removed (demo with missing fields)
   - ❌ Report 19 (Certified Payroll) - removed (demo with missing fields)

---

## Document Status

✅ **CORRECTED**: This document now matches `src/types/index.ts` exactly
📅 **Last Updated**: December 7, 2025
🔍 **Verification Status**: Awaiting user confirmation

