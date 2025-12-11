# Reports Database Field Mapping - Complete Technical Specification

**Purpose**: Exact database collections, fields, sub-collections, nested data, and references for all reports across all phases.

**Please verify each field name, type, and structure against your actual Firestore database.**

---

## Phase 1: Financial Reports (5 Reports)

### 1. Revenue by Department

**Processor**: `processRevenueByDepartment`

#### Collections Used:

**Primary Collection: `invoices`**
```typescript
{
  // Document ID
  id: string

  // Fields
  invoiceNumber: string
  invoiceTotal: number
  status: string              // Values: 'draft', 'approved', 'paid'
  createdAt: Timestamp
  dueDate: Timestamp
  approvedAt?: Timestamp
  paidDate?: Timestamp

  // References (DocumentReference)
  projectId: DocumentReference  // → projects/{projectId}
  contractNumber?: string

  // Nested Array: invoiceItems[]
  invoiceItems: Array<{
    employeeId: DocumentReference    // → employees/{employeeId}
    companyId: DocumentReference      // → companies/{companyId}
    serviceId: DocumentReference      // → services/{serviceId}
    hours: number
    billingRate: number
    amount: number
    markdown: number
  }>
}
```

**Related Collection: `departments`**
```typescript
{
  id: string
  departmentCode: string
  departmentName: string
  isActive: boolean
}
```

**Related Collection: `projects`** (to link invoices → departments)
```typescript
{
  id: string
  projectName: string
  poNumber: string

  // Reference
  departmentId: DocumentReference  // → departments/{departmentId}
}
```

#### Data Flow:
1. Fetch invoices filtered by date range
2. For each invoice: `invoice.projectId` → `project.departmentId` → `department`
3. Group by `department.id` and aggregate `invoice.invoiceTotal`

#### Filter Fields Used:
- `dateFrom` → filters `invoices.createdAt >= dateFrom`
- `dateTo` → filters `invoices.createdAt <= dateTo`
- `departmentId` (optional) → filters after grouping

---

### 2. Revenue by Project

**Processor**: `processRevenueByProject`

#### Collections Used:

**Primary Collection: `invoices`** (same structure as above)

**Primary Collection: `projects`**
```typescript
{
  id: string
  projectName: string
  poNumber: string
  budgetAmount: number
  createdAt: Timestamp

  // References
  departmentId: DocumentReference  // → departments/{departmentId}
  contractId: DocumentReference     // → contracts/{contractId}
}
```

#### Formulas:
```javascript
// Per project:
totalRevenue = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)
remainingBudget = project.budgetAmount - totalRevenue
budgetUtilization = (totalRevenue / project.budgetAmount) * 100
invoiceCount = COUNT(invoices WHERE invoice.projectId = project.id)
```

#### Filter Fields Used:
- `dateFrom` → filters `invoices.createdAt >= dateFrom`
- `dateTo` → filters `invoices.createdAt <= dateTo`
- `projectId` (optional) → filters `invoices.projectId == projectId`

---

### 3. Outstanding Invoices

**Processor**: `processOutstandingInvoices`

#### Collections Used:

**Primary Collection: `invoices`** (same structure as Report 1)

**Query**:
```javascript
WHERE status == 'approved' AND paidDate IS NULL
```

**Related Collection: `projects`** (to get project name)

#### Formulas:
```javascript
// Per invoice:
daysOutstanding = (TODAY - invoice.dueDate) / (1000 * 60 * 60 * 24)

// Aging buckets:
if (daysOutstanding <= 30) → '0-30 days'
else if (daysOutstanding <= 60) → '31-60 days'
else if (daysOutstanding <= 90) → '61-90 days'
else → '90+ days'
```

#### Filter Fields Used:
- `projectId` (optional) → filters `invoices.projectId == projectId`

---

### 4. Payment Tracking Report

**Processor**: `processPaymentTracking`

#### Collections Used:

**Primary Collection: `payment_tracking`**
```typescript
{
  id: string

  // References
  invoiceId: DocumentReference       // → invoices/{invoiceId}

  // Fields
  invoiceNumber: string
  invoiceAmount: number
  paidAmount: number
  outstandingAmount: number

  // Payment details
  paymentDate?: Timestamp
  paymentMethod?: string            // e.g., 'Check', 'Wire', 'ACH'
  paymentReference?: string

  // Status
  status: string                    // 'Pending', 'Partial', 'Paid', 'Overdue'
  dueDate: Timestamp

  // Notes
  notes?: string
}
```

**Related Collections**:
- `invoices` → get invoice details
- `projects` → get project name via invoice.projectId
- `contracts` → get contract details via project.contractId

#### Formulas:
```javascript
// Per payment tracking entry:
outstandingAmount = invoiceAmount - paidAmount
paymentProgress = (paidAmount / invoiceAmount) * 100

// Overdue check:
isOverdue = (status IN ['Pending', 'Partial']) AND (dueDate < TODAY)
```

#### Filter Fields Used:
- `dateFrom` → filters `payment_tracking.paymentDate >= dateFrom`
- `dateTo` → filters `payment_tracking.paymentDate <= dateTo`
- `contractId` (optional) → filters via invoice → project → contract

---

### 5. Profitability Analysis

**Processor**: `processProfitabilityAnalysis`

#### Collections Used:

**Primary Collection: `invoices`** (for revenue - same structure as Report 1)

**Primary Collection: `cti_timesheets`** (for labor cost)
```typescript
{
  id: string

  // References
  employeeId: DocumentReference     // → employees/{employeeId}

  // Fields
  timecardDate: Timestamp
  totalHoursActual: number

  // Nested Array: payItems[]
  payItems: Array<{
    payItemCode: string            // 'HRLY', 'OVT15', 'OVT20', 'SalaryHrs', etc.
    payItemHours: number
    payItemName: string
  }>

  // Nested Array: labors[]
  labors: Array<{
    laborTitle: string             // 'Project/Job', 'Customer', 'Division'
    laborValue: string             // Project code (matches project.poNumber)
  }>
}
```

**Related Collection: `projects`**
```typescript
{
  id: string
  projectName: string
  poNumber: string                 // IMPORTANT: Used to match timesheet.labors[].laborValue

  departmentId: DocumentReference
}
```

**Related Collection: `employees`** (for cost rates)
```typescript
{
  id: string
  formalName: string
  employeeId: string

  isInternal: boolean
  isSubconsultant: boolean

  // References
  companyId: DocumentReference     // → companies/{companyId}
}
```

**Related Collection: `departments`**

#### Formulas:
```javascript
// Per project:
revenue = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)

// Billable hours:
billableHours = SUM(
  timesheet.payItems[i].payItemHours
  WHERE payItems[i].payItemCode IN ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs']
  AND labors[j].laborValue = project.poNumber
)

// Labor cost (simplified - requires internal cost rates):
laborCost = billableHours * averageInternalCostRate

// Profit metrics:
grossProfit = revenue - laborCost
profitMargin = (grossProfit / revenue) * 100
markup = ((averageBillingRate - averageCostRate) / averageCostRate) * 100
```

#### Filter Fields Used:
- `dateFrom` → filters both `invoices.createdAt` and `cti_timesheets.timecardDate`
- `dateTo` → filters both collections
- `departmentId` (optional) → filters via project.departmentId
- `projectId` (optional) → filters invoices.projectId and timesheets via poNumber match

---

## Phase 2: Labor Reports (5 Reports)

### 6. Labor Hours by Department

**Processor**: `processLaborHoursByDepartment`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (same structure as Report 5)

**Related Collection: `employees`**
```typescript
{
  id: string
  formalName: string

  // Reference
  departmentId: DocumentReference  // → departments/{departmentId}
}
```

**Related Collection: `departments`** (same structure as Report 1)

#### Formulas:
```javascript
// Per department:
totalHours = SUM(timesheet.totalHoursActual WHERE employee.departmentId = department.id)

// Break down by pay item:
regularHours = SUM(payItems[i].payItemHours WHERE payItemCode = 'HRLY')
overtimeHours = SUM(payItems[i].payItemHours WHERE payItemCode IN ['OVT15', 'OVT20'])
```

#### Filter Fields Used:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `departmentId` (optional) → filters via employee.departmentId

---

### 7. Labor Hours by Project

**Processor**: `processLaborHoursByProject`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (same structure as Report 5)

**Related Collection: `projects`** (same structure as Report 2)

#### Data Matching:
```javascript
// Match timesheet to project:
timesheet.labors[].laborValue == project.poNumber
```

#### Formulas:
```javascript
// Per project:
totalHours = SUM(timesheet.payItems[].payItemHours WHERE labors[].laborValue = project.poNumber)

billableHours = SUM(payItems[i].payItemHours
  WHERE payItemCode IN ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs'])

nonBillableHours = totalHours - billableHours
```

#### Filter Fields Used:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `projectId` (optional) → filters via poNumber match

---

### 8. Labor Hours by Employee

**Processor**: `processLaborHoursByEmployee`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (same structure as Report 5)

**Related Collection: `employees`** (same structure as Report 6)

**Related Collection: `departments`** (for department name)

#### Formulas:
```javascript
// Per employee:
totalHours = SUM(timesheet.totalHoursActual WHERE timesheet.employeeId = employee.id)

regularHours = SUM(payItems[i].payItemHours WHERE payItemCode = 'HRLY')
overtimeHours = SUM(payItems[i].payItemHours WHERE payItemCode IN ['OVT15', 'OVT20'])
ptoHours = SUM(payItems[i].payItemHours WHERE payItemCode = 'PTO')
```

#### Filter Fields Used:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `employeeId` (optional) → filters `cti_timesheets.employeeId == employeeId`
- `departmentId` (optional) → filters via employee.departmentId

---

### 9. Overtime Analysis

**Processor**: `processOvertimeAnalysis`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (same structure as Report 5)

**Related Collection: `employees`** (same structure as Report 6)

**Related Collection: `departments`** (for department name)

#### Focus on Pay Item Codes:
```typescript
payItems[].payItemCode values:
- 'HRLY' → Regular hours
- 'OVT15' → 1.5x overtime
- 'OVT20' → 2.0x overtime
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

#### Filter Fields Used:
- `dateFrom` → filters `cti_timesheets.timecardDate >= dateFrom`
- `dateTo` → filters `cti_timesheets.timecardDate <= dateTo`
- `departmentId` (optional) → filters via employee.departmentId

---

### 10. Labor Cost Analysis

**Processor**: `processLaborCostAnalysis`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (same structure as Report 5)

**Primary Collection: `invoices`** (for billable rates - same structure as Report 1)

**Related Collection: `employees`** (same structure as Report 6)

**Related Collection: `projects`** (same structure as Report 2)

**Related Collection: `departments`** (for grouping)

#### Formulas:
```javascript
// Per department or project:
totalHours = SUM(timesheet.payItems[].payItemHours)

// From invoices:
averageBillingRate = SUM(invoiceItems[].billingRate * invoiceItems[].hours) / SUM(invoiceItems[].hours)

// Cost (requires internal cost rates - may need additional employee cost data):
laborCost = totalHours * averageInternalCostRate

// Analysis:
costPerHour = laborCost / totalHours
revenuePerHour = totalRevenue / totalHours
profitPerHour = revenuePerHour - costPerHour
```

#### Filter Fields Used:
- `dateFrom` → filters both `cti_timesheets.timecardDate` and `invoices.createdAt`
- `dateTo` → filters both collections
- `departmentId` (optional) → filters via employee.departmentId
- `projectId` (optional) → filters via project

---

## Phase 3: Project Reports (5 Reports)

### 11. Project Status Report

**Processor**: `processProjectStatus`

#### Collections Used:

**Primary Collection: `projects`**
```typescript
{
  id: string
  projectName: string
  poNumber: string
  budgetAmount: number

  // Status fields
  status: string                   // 'Active', 'On Hold', 'Completed', 'Cancelled'
  startDate: Timestamp
  endDate?: Timestamp

  // Progress
  percentComplete?: number

  // References
  departmentId: DocumentReference  // → departments/{departmentId}
  contractId: DocumentReference     // → contracts/{contractId}

  // Project manager
  projectManagerId?: DocumentReference  // → employees/{employeeId}
}
```

**Related Collection: `invoices`** (for revenue to date)

**Related Collection: `contracts`**
```typescript
{
  id: string
  contractNumber: string
  contractName: string
  clientName: string
  effectiveDate: Timestamp
  expirationDate?: Timestamp
}
```

#### Formulas:
```javascript
// Per project:
revenueToDate = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)
remainingBudget = project.budgetAmount - revenueToDate
budgetUtilization = (revenueToDate / project.budgetAmount) * 100

// Days metrics:
daysActive = (TODAY - project.startDate) / (1000 * 60 * 60 * 24)
daysToCompletion = project.endDate ? (project.endDate - TODAY) / (1000 * 60 * 60 * 24) : null
```

#### Filter Fields Used:
- `departmentId` (optional) → filters `projects.departmentId == departmentId`
- `status` (optional) → filters `projects.status == status`

---

### 12. Project Budget vs Actuals

**Processor**: `processProjectBudgetVsActuals`

#### Collections Used:

**Primary Collection: `projects`** (same structure as Report 11)

**Related Collection: `invoices`** (for actual revenue)

**Related Collection: `cti_timesheets`** (for actual labor hours)

#### Formulas:
```javascript
// Per project:
budgetAmount = project.budgetAmount
actualRevenue = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)
variance = actualRevenue - budgetAmount
variancePercentage = (variance / budgetAmount) * 100

// Labor hours:
plannedHours = project.estimatedHours  // If this field exists
actualHours = SUM(timesheet.payItems[].payItemHours WHERE labors[].laborValue = project.poNumber)
hoursVariance = actualHours - plannedHours
```

#### Filter Fields Used:
- `dateFrom` → filters `invoices.createdAt` and `cti_timesheets.timecardDate`
- `dateTo` → filters both collections
- `departmentId` (optional) → filters `projects.departmentId`
- `projectId` (optional) → filters specific project

---

### 13. Project Completion Report

**Processor**: `processProjectCompletion`

#### Collections Used:

**Primary Collection: `projects`** (same structure as Report 11)

**Focus on**: Projects with `status = 'Completed'`

**Related Collection: `invoices`** (for final revenue)

**Related Collection: `cti_timesheets`** (for total labor hours)

#### Formulas:
```javascript
// Per completed project:
finalRevenue = SUM(invoices.invoiceTotal WHERE invoice.projectId = project.id)
budgetVariance = finalRevenue - project.budgetAmount

totalLaborHours = SUM(timesheet.payItems[].payItemHours WHERE labors[].laborValue = project.poNumber)

projectDuration = (project.endDate - project.startDate) / (1000 * 60 * 60 * 24)  // in days
```

#### Filter Fields Used:
- `dateFrom` → filters `projects.endDate >= dateFrom`
- `dateTo` → filters `projects.endDate <= dateTo`
- `departmentId` (optional) → filters `projects.departmentId`

---

### 14. Project Timeline Report

**Processor**: `processProjectTimeline`

#### Collections Used:

**Primary Collection: `projects`** (same structure as Report 11)

**Sub-Collection: `projects/{projectId}/milestones`** (if exists)
```typescript
{
  id: string
  milestoneName: string
  targetDate: Timestamp
  completedDate?: Timestamp
  status: string                   // 'Pending', 'In Progress', 'Completed', 'Delayed'
  description?: string
}
```

**Related Collection: `invoices`** (to show billing milestones)

#### Formulas:
```javascript
// Per project:
daysElapsed = (TODAY - project.startDate) / (1000 * 60 * 60 * 24)
daysRemaining = project.endDate ? (project.endDate - TODAY) / (1000 * 60 * 60 * 24) : null

// Schedule status:
if (project.endDate < TODAY && project.status != 'Completed') → 'Overdue'
else if (percentComplete < expectedPercentage) → 'Behind Schedule'
else → 'On Track'
```

#### Filter Fields Used:
- `departmentId` (optional) → filters `projects.departmentId`
- `status` (optional) → filters `projects.status`

---

### 15. Resource Allocation Report

**Processor**: `processResourceAllocation`

#### Collections Used:

**Primary Collection: `resource_allocations`**
```typescript
{
  id: string

  // References
  employeeId: DocumentReference    // → employees/{employeeId}
  projectId: DocumentReference      // → projects/{projectId}

  // Allocation details
  allocationPercentage: number     // 0-100 (% of employee's time)
  startDate: Timestamp
  endDate?: Timestamp

  // Role on project
  role?: string                     // 'Project Manager', 'Engineer', 'Designer', etc.

  // Status
  status: string                    // 'Active', 'Completed', 'Planned'
}
```

**Related Collection: `employees`** (same structure as Report 6)

**Related Collection: `projects`** (same structure as Report 11)

**Related Collection: `cti_timesheets`** (for actual hours)

#### Formulas:
```javascript
// Per employee:
totalAllocation = SUM(allocation.allocationPercentage WHERE allocation.employeeId = employee.id AND status = 'Active')

// Warning if totalAllocation > 100
isOverallocated = totalAllocation > 100

// Actual hours vs allocation:
expectedHours = (allocationPercentage / 100) * 40 * numberOfWeeks
actualHours = SUM(timesheet.payItems[].payItemHours WHERE labors[].laborValue = project.poNumber)
variance = actualHours - expectedHours
```

#### Filter Fields Used:
- `dateFrom` → filters allocations active in date range
- `dateTo` → filters allocations active in date range
- `departmentId` (optional) → filters via employee.departmentId
- `projectId` (optional) → filters `resource_allocations.projectId`

---

## Phase 4: Compliance Reports (4 Reports)

### 16. MWBE Participation Report

**Processor**: `processMWBEParticipation`

#### Collections Used:

**Primary Collection: `companies`**
```typescript
{
  id: string
  companyName: string

  // MWBE fields
  isMWBE: boolean
  mwbeType?: string                // 'MBE', 'WBE', 'DBE', etc.
  mwbeCertificationNumber?: string
  mwbeCertificationDate?: Timestamp
  mwbeCertificationExpiry?: Timestamp
}
```

**Primary Collection: `invoices`** (to track MWBE spending)
```typescript
// Uses invoiceItems[] where companyId references MWBE companies
invoiceItems: Array<{
  companyId: DocumentReference     // → companies/{companyId}
  amount: number
}>
```

**Related Collection: `projects`** (for project context)

**Related Collection: `contracts`** (for contract goals)
```typescript
{
  id: string
  contractNumber: string

  // MWBE goals
  mwbeGoalPercentage?: number      // Target % for MWBE participation
  mwbeGoalAmount?: number
}
```

#### Formulas:
```javascript
// Per contract or project:
totalSpending = SUM(invoiceItems[].amount)

mwbeSpending = SUM(invoiceItems[].amount
  WHERE companies[invoiceItems[].companyId].isMWBE = true)

mwbeParticipationPercentage = (mwbeSpending / totalSpending) * 100

// Goal tracking:
goalAchievement = (mwbeParticipationPercentage / contract.mwbeGoalPercentage) * 100
```

#### Filter Fields Used:
- `dateFrom` → filters `invoices.createdAt`
- `dateTo` → filters `invoices.createdAt`
- `contractId` (optional) → filters via project.contractId
- `projectId` (optional) → filters `invoices.projectId`

---

### 17. DBE Utilization Report

**Processor**: `processDBEUtilization`

#### Collections Used:

**Same structure as Report 16 (MWBE), but focused on DBE certifications**

**Primary Collection: `companies`**
```typescript
{
  // DBE-specific fields
  isDBE: boolean
  dbeCertificationNumber?: string
  dbeCertificationDate?: Timestamp
  dbeCertificationExpiry?: Timestamp
}
```

**Primary Collection: `invoices`** (same structure as Report 16)

#### Formulas: (same as Report 16, but for DBE)

#### Filter Fields Used:
- `dateFrom` → filters `invoices.createdAt`
- `dateTo` → filters `invoices.createdAt`
- `contractId` (optional) → filters via project.contractId

---

### 18. Subcontractor Compliance

**Processor**: `processSubcontractorCompliance`

#### Collections Used:

**Primary Collection: `companies`**
```typescript
{
  id: string
  companyName: string

  // Compliance fields
  isSubcontractor: boolean

  // Insurance
  insuranceExpiryDate?: Timestamp
  insuranceCertificateUrl?: string

  // License
  licenseNumber?: string
  licenseExpiryDate?: Timestamp

  // W9/Tax
  w9OnFile: boolean
  w9DateReceived?: Timestamp
  taxId?: string

  // Safety
  safetyRating?: string
  lastSafetyAuditDate?: Timestamp
}
```

**Primary Collection: `invoices`** (to track subcontractor work)

**Related Collection: `projects`** (for project context)

#### Compliance Checks:
```javascript
// Per subcontractor:
isInsuranceCurrent = insuranceExpiryDate > TODAY
isLicenseCurrent = licenseExpiryDate > TODAY
isW9Current = w9OnFile = true
isSafetyCurrent = lastSafetyAuditDate > (TODAY - 365 days)

complianceStatus =
  if (all checks pass) → 'Compliant'
  else if (any critical check fails) → 'Non-Compliant'
  else → 'Warning'
```

#### Filter Fields Used:
- `contractId` (optional) → filters via project.contractId
- `projectId` (optional) → filters work on specific project

---

### 19. Certified Payroll Report

**Processor**: `processCertifiedPayroll`

#### Collections Used:

**Primary Collection: `cti_timesheets`** (same structure as Report 5)

**Related Collection: `employees`**
```typescript
{
  id: string
  formalName: string
  employeeId: string

  // Payroll classification
  classification?: string          // 'Laborer', 'Carpenter', 'Engineer', etc.

  // Wage information
  baseWageRate?: number
  fringeRate?: number

  // Status
  isInternal: boolean
  isSubconsultant: boolean

  // References
  companyId: DocumentReference     // → companies/{companyId}
}
```

**Related Collection: `projects`** (for prevailing wage projects)
```typescript
{
  id: string
  projectName: string

  // Prevailing wage flag
  isPrevailingWageProject: boolean
  prevailingWageRates?: {
    [classification: string]: {
      baseRate: number
      fringeRate: number
    }
  }
}
```

#### Certified Payroll Format:
```javascript
// Per employee per week:
{
  employeeName: employee.formalName
  employeeId: employee.employeeId
  classification: employee.classification

  // Hours breakdown
  regularHours: SUM(payItems[i].payItemHours WHERE payItemCode = 'HRLY')
  overtimeHours: SUM(payItems[i].payItemHours WHERE payItemCode IN ['OVT15', 'OVT20'])

  // Rates
  baseWageRate: employee.baseWageRate
  fringeRate: employee.fringeRate
  overtimeRate: baseWageRate * 1.5

  // Gross pay
  grossPay = (regularHours * baseWageRate) + (overtimeHours * overtimeRate)
  fringePay = (regularHours + overtimeHours) * fringeRate

  // Project worked on
  projectName: project.projectName
  weekEnding: Timestamp
}
```

#### Filter Fields Used:
- `dateFrom` → filters `cti_timesheets.timecardDate`
- `dateTo` → filters `cti_timesheets.timecardDate`
- `projectId` (optional) → filters work on specific project

---

## Phase 5: Executive Reports (4 Reports)

### 20. Executive Dashboard

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
// Financial
totalRevenue = SUM(invoices.invoiceTotal WHERE invoices.createdAt IN [dateRange])
totalOutstanding = SUM(invoices.invoiceTotal WHERE status = 'approved' AND paidDate IS NULL)

// Operations
activeProjects = COUNT(projects WHERE status = 'Active')
activeEmployees = COUNT(employees WHERE isActive = true)
totalLaborHours = SUM(cti_timesheets.totalHoursActual WHERE timecardDate IN [dateRange])

// Utilization
utilizationRate = (billableHours / totalLaborHours) * 100

// Growth
revenueGrowth = ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
```

#### Filter Fields Used:
- `dateFrom` → filters all collections
- `dateTo` → filters all collections

---

### 21. Revenue Trends Report

**Processor**: `processRevenueTrends`

#### Collections Used:

**Primary Collection: `invoices`** (same structure as Report 1)

**Related Collection: `projects`** (for grouping by project)

**Related Collection: `departments`** (for grouping by department)

#### Time Series Analysis:
```javascript
// Group by month:
monthlyRevenue = SUM(invoices.invoiceTotal) GROUP BY MONTH(invoices.createdAt)

// Calculate trends:
movingAverage3Month = AVG(monthlyRevenue for last 3 months)
growthRate = ((currentMonth - previousMonth) / previousMonth) * 100

// Forecasting (simple linear):
projectedNextMonth = currentMonth + (currentMonth - previousMonth)
```

#### Filter Fields Used:
- `dateFrom` → filters `invoices.createdAt >= dateFrom`
- `dateTo` → filters `invoices.createdAt <= dateTo`
- `departmentId` (optional) → filters via project.departmentId

---

### 22. KPI Summary Report

**Processor**: `processKPISummary`

#### Collections Used:

**Multiple Collections** for various KPIs:

**Financial KPIs** (from `invoices`):
```javascript
totalRevenue = SUM(invoices.invoiceTotal)
averageInvoiceValue = totalRevenue / COUNT(invoices)
collectionRate = (totalPaid / totalInvoiced) * 100
daysToPayment = AVG(paidDate - createdAt) for paid invoices
```

**Labor KPIs** (from `cti_timesheets`):
```javascript
utilizationRate = (billableHours / totalHours) * 100
averageHoursPerEmployee = totalHours / employeeCount
overtimeRate = (overtimeHours / totalHours) * 100
```

**Project KPIs** (from `projects`):
```javascript
onTimeCompletionRate = (projectsCompletedOnTime / totalCompletedProjects) * 100
averageProjectDuration = AVG(endDate - startDate) for completed projects
budgetVariance = AVG(actualRevenue - budgetAmount) / AVG(budgetAmount) * 100
```

**Client KPIs** (from `contracts` and `invoices`):
```javascript
activeClients = COUNT(DISTINCT contracts WHERE status = 'Active')
revenuePerClient = totalRevenue / activeClients
clientRetentionRate = (clientsRetained / totalClients) * 100
```

#### Filter Fields Used:
- `dateFrom` → filters all collections
- `dateTo` → filters all collections

---

### 23. Year-over-Year Comparison

**Processor**: `processYearOverYearComparison`

#### Collections Used:

**Primary Collection: `invoices`** (for revenue comparison)

**Primary Collection: `cti_timesheets`** (for hours comparison)

**Primary Collection: `projects`** (for project count comparison)

#### Comparison Logic:
```javascript
// Current period
currentYearRevenue = SUM(invoices.invoiceTotal WHERE createdAt IN [currentYearDateRange])

// Previous period (same date range, previous year)
previousYearRevenue = SUM(invoices.invoiceTotal WHERE createdAt IN [previousYearDateRange])

// Growth calculation
revenueGrowth = ((currentYearRevenue - previousYearRevenue) / previousYearRevenue) * 100

// Repeat for:
// - Labor hours
// - Project count
// - Employee count
// - Average invoice value
// - Profit margin
```

#### Filter Fields Used:
- `dateFrom` → defines current period start
- `dateTo` → defines current period end
- (Automatically calculates previous year period)

---

## Critical Database Verification Checklist

Please verify the following for YOUR database:

### Collection Names:
- [ ] `invoices` ✓
- [ ] `departments` ✓
- [ ] `projects` ✓
- [ ] `contracts` ✓
- [ ] `payment_tracking` ✓
- [ ] `cti_timesheets` ✓
- [ ] `employees` ✓
- [ ] `companies` ✓
- [ ] `resource_allocations` ✓

### Invoice Collection Fields:
- [ ] `invoiceNumber` (string)
- [ ] `invoiceTotal` (number)
- [ ] `status` (string: 'draft', 'approved', 'paid')
- [ ] `createdAt` (Timestamp)
- [ ] `dueDate` (Timestamp)
- [ ] `paidDate` (Timestamp, optional)
- [ ] `projectId` (DocumentReference → projects)
- [ ] `invoiceItems` (array of objects)

### Timesheet Collection Fields:
- [ ] `employeeId` (DocumentReference → employees)
- [ ] `timecardDate` (Timestamp)
- [ ] `totalHoursActual` (number)
- [ ] `payItems` (array with `payItemCode`, `payItemHours`, `payItemName`)
- [ ] `labors` (array with `laborTitle`, `laborValue`)

### Projects Collection Fields:
- [ ] `projectName` (string)
- [ ] `poNumber` (string) - IMPORTANT for timesheet matching
- [ ] `budgetAmount` (number)
- [ ] `departmentId` (DocumentReference → departments)
- [ ] `contractId` (DocumentReference → contracts)
- [ ] `status` (string)

### Reference Types:
- [ ] Are `projectId`, `departmentId`, `contractId`, `employeeId`, `companyId` stored as **DocumentReference** objects?
- [ ] OR are they stored as **string IDs**?

### Pay Item Codes (in `cti_timesheets.payItems[]`):
- [ ] What are your actual pay item codes? (e.g., 'HRLY', 'OVT15', 'OVT20', 'SalaryHrs', 'PTO', etc.)

### Timesheet Labor Matching:
- [ ] Confirm: `cti_timesheets.labors[].laborValue` contains the project code
- [ ] Confirm: This matches `projects.poNumber` for linking timesheets to projects

---

## Next Steps

1. **Review this document** carefully against your Firestore database
2. **Mark any discrepancies** (field names, types, structures)
3. **Provide corrections** for any mismatches
4. **Confirm pay item codes** and any other enum values
5. **Verify reference types** (DocumentReference vs string IDs)

Once verified, we can:
- Fix any data mapping issues in processors
- Update PDF generators with correct field names
- Proceed with confidence that all reports will work correctly

---

**Document Version**: 1.0
**Date**: December 7, 2025
**Status**: Awaiting Database Verification
