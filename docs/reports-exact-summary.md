# Reports Exact Summary - All Collections, Fields, Logic & Calculations

**Date**: December 8, 2025
**Total Reports**: 20

---

## PHASE 1: FINANCIAL REPORTS (5 Reports)

### Report 1: Revenue by Department

**Collections Used**:
- `invoices` (primary)
- `departments` (lookup)
- `projects` (linking invoices to departments)

**Fields Accessed**:
```typescript
Invoice:
  - id
  - createdAt (filtered by dateFrom/dateTo)
  - status (filtered if specified)
  - invoiceTotal
  - projectId (DocumentReference)

Department:
  - id
  - departmentCode
  - departmentName

Project:
  - id
  - departmentId (DocumentReference)
```

**Logic**:
1. Fetch all invoices within date range
2. Fetch all departments
3. Fetch all projects
4. For each invoice:
   - Get projectId → find project → get departmentId
   - Aggregate invoice totals by department
   - Categorize by status: 'paid', 'approved', or 'pending'

**Calculations**:
```javascript
totalRevenue = SUM(invoice.invoiceTotal) per department
invoiceCount = COUNT(invoices) per department
paidAmount = SUM(invoiceTotal WHERE status = 'paid')
approvedAmount = SUM(invoiceTotal WHERE status = 'approved')
pendingAmount = SUM(invoiceTotal WHERE status NOT IN ['paid', 'approved'])
averageInvoiceAmount = totalRevenue / invoiceCount
```

**Status**: ⚠️ **Payment categorization needs clarification** (checking invoice.status === 'paid')

---

### Report 2: Revenue by Project

**Collections Used**:
- `invoices` (primary)
- `projects` (primary)

**Fields Accessed**:
```typescript
Invoice:
  - id
  - createdAt (filtered by dateFrom/dateTo)
  - status (filtered if specified)
  - invoiceTotal
  - projectId (DocumentReference)

Project:
  - id
  - poNumber
  - projectName
  - projectManager
  - departmentId (for filtering)
  - contractId (for filtering)
  - newPoAmount (or originalPoAmount as fallback)
  - remainingPoAmount
```

**Logic**:
1. Fetch all invoices within date range
2. Fetch all projects
3. Filter projects by departmentId/contractId/projectId if specified
4. Aggregate invoice totals by project
5. Calculate budget utilization

**Calculations**:
```javascript
totalRevenue = SUM(invoice.invoiceTotal) per project
invoiceCount = COUNT(invoices) per project
budgetAmount = project.newPoAmount || project.originalPoAmount || 0
remainingBudget = project.remainingPoAmount || 0
budgetUtilized = (totalRevenue / budgetAmount) * 100
isOverBudget = totalRevenue > budgetAmount
```

**Status**: ✅ **READY** - Uses correct budget fields

---

### Report 3: Outstanding Invoices

**Collections Used**:
- `invoices` (primary - WHERE status = 'approved')
- `projects` (lookup for filtering and project name)

**Fields Accessed**:
```typescript
Invoice:
  - id
  - invoiceNumber
  - createdAt (filtered by dateFrom/dateTo)
  - status (filtered WHERE status = 'approved')
  - invoiceTotal
  - dueDate
  - projectId (DocumentReference)
  - submitterCompany

Project:
  - id
  - projectName
  - poNumber
  - departmentId (for filtering)
  - contractId (for filtering)
```

**Logic**:
1. Fetch invoices WHERE status = 'approved'
2. Apply date filters if specified
3. Fetch all projects
4. For each invoice:
   - Calculate days outstanding from dueDate
   - Categorize into aging buckets
   - Get project details via projectId

**Calculations**:
```javascript
daysOutstanding = (TODAY - invoice.dueDate) / (1000 * 60 * 60 * 24)

// Aging categories:
'0-30 days' if daysOutstanding <= 30
'31-60 days' if daysOutstanding <= 60
'61-90 days' if daysOutstanding <= 90
'90+ days' if daysOutstanding > 90

// Aging summary per bucket:
count = COUNT(invoices in bucket)
amount = SUM(invoiceTotal in bucket)

totalOutstanding = SUM(invoiceTotal)
```

**Status**: ✅ **READY** - Bug fixed (was using invoice.poNumber, now uses project.poNumber)

---

### Report 4: Payment Tracking Report

**Collections Used**:
- `invoices` (primary - WHERE status = 'paid')
- `projects` (lookup)

**Fields Accessed**:
```typescript
Invoice:
  - id
  - invoiceNumber
  - createdAt (filtered by dateFrom/dateTo)
  - status (filtered WHERE status = 'paid')
  - invoiceTotal
  - approvedAt
  - approvedByName
  - projectId (DocumentReference)
  - submitterCompany

Project:
  - id
  - projectName
  - poNumber
  - departmentId (for filtering)
  - contractId (for filtering)
```

**Logic**:
1. Fetch invoices WHERE status = 'paid'
2. Apply date filters
3. Fetch all projects
4. Filter and map invoices with project details
5. Group by month for monthly breakdown

**Calculations**:
```javascript
// Per invoice: just data aggregation, no calculations

// Monthly breakdown:
monthKey = "YYYY-MM" from approvedAt
monthlyBreakdown = {
  month: monthKey,
  count: COUNT(invoices in month),
  amount: SUM(invoiceTotal in month)
}

totalPaid = SUM(invoiceTotal)
totalCount = COUNT(invoices)
```

**Status**: ✅ **READY** - Bug fixed (was using invoice.poNumber, now uses project.poNumber)
⚠️ **Note**: Assumes invoice.status changes to 'paid' when payment received

---

### Report 5: Profitability Analysis

**Collections Used**:
- `invoices` (primary)
- `projects` (primary)
- `cti_timesheets` (for labor cost estimation)

**Fields Accessed**:
```typescript
Invoice:
  - id
  - createdAt (filtered by dateFrom/dateTo)
  - invoiceTotal
  - status
  - projectId (DocumentReference)

Project:
  - id
  - poNumber
  - projectName
  - departmentId (for filtering)
  - contractId (for filtering)

CtiTimesheet:
  - id
  - timecardDate (filtered by dateFrom/dateTo)
  - totalHoursActual
  - labors[] (array of {laborTitle, laborValue})
```

**Logic**:
1. Fetch invoices and timesheets within date range
2. Fetch all projects
3. Filter projects by departmentId/contractId/projectId if specified
4. For each project:
   - Sum revenue from invoices (status 'paid' or 'approved')
   - Calculate labor cost from timesheets
   - Match timesheets to projects via labors[].laborValue = project.poNumber

**Calculations**:
```javascript
revenue = SUM(invoice.invoiceTotal WHERE status IN ['paid', 'approved'])

// Labor cost estimation:
AVERAGE_HOURLY_RATE = 75 // ⚠️ HARDCODED PLACEHOLDER
laborCost = SUM(timesheet.totalHoursActual * AVERAGE_HOURLY_RATE)

profit = revenue - laborCost
profitMargin = (profit / revenue) * 100
isProfitable = profit > 0

// Totals:
totalRevenue = SUM(revenue)
totalLaborCost = SUM(laborCost)
totalProfit = SUM(profit)
averageMargin = AVG(profitMargin)
profitableCount = COUNT(projects WHERE isProfitable = true)
```

**Status**: ⚠️ **USES PLACEHOLDER DATA** - Labor cost uses hardcoded $75/hr rate
- Returns note: "Labor costs are estimated using average hourly rate. For accurate profitability, integrate actual payroll data."
- ✅ Correct data structure otherwise

---

## PHASE 2: LABOR REPORTS (5 Reports)

### Report 6: Direct Labor Hours

**Collections Used**:
- `cti_timesheets` (primary)
- `employees` (lookup)
- `projects` (reference only, not fetched)

**Fields Accessed**:
```typescript
CtiTimesheet:
  - id
  - timecardDate (filtered by dateFrom/dateTo)
  - employeeId (number)
  - totalHoursActual
  - payItems[] (array of {payItemCode, payItemHours, payItemName})
  - labors[] (array of {laborTitle, laborValue})

Employee:
  - id
  - employeeId (number)
  - firstName
  - lastName
  - companyName
  - departmentCode
  - departmentId (DocumentReference, for filtering)
```

**Logic**:
1. Fetch timesheets within date range
2. Fetch all employees
3. Match timesheet.employeeId (number) to employee.employeeId (number)
4. Filter by departmentId if specified
5. Categorize hours by pay item codes
6. Extract project codes from labors[]

**Calculations**:
```javascript
// Constants used:
BILLABLE_CODES = ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs', '1099COMP']
NON_BILLABLE_CODES = ['SAL', 'CTI_REG', 'CTI_OVT']
PTO_CODES = ['PTO', 'HOL', 'FLTHOL', 'BER', 'JURY', 'LV_UNPD', 'MIL']

totalHours = SUM(timesheet.totalHoursActual)

// Per employee, sum payItemHours by category:
billableHours = SUM(payItemHours WHERE payItemCode IN BILLABLE_CODES)
nonBillableHours = SUM(payItemHours WHERE payItemCode IN NON_BILLABLE_CODES)
ptoHours = SUM(payItemHours WHERE payItemCode IN PTO_CODES)

billablePercent = (billableHours / totalHours) * 100
projectCount = COUNT(DISTINCT labors[].laborValue)
```

**Status**: ✅ **READY** - Correct employeeId handling (number type)

---

### Report 7: Employee Utilization

**Collections Used**:
- `cti_timesheets` (primary)
- `employees` (lookup)

**Fields Accessed**:
```typescript
CtiTimesheet:
  - id
  - timecardDate (filtered by dateFrom/dateTo)
  - employeeId (number)
  - totalHoursActual
  - payItems[] (array of {payItemCode, payItemHours})

Employee:
  - id
  - employeeId (number)
  - firstName
  - lastName
  - companyName
  - departmentCode
  - weeklyCapacityHours
  - departmentId (for filtering)
```

**Logic**:
1. Fetch timesheets within date range
2. Fetch all employees
3. Match by employeeId (number)
4. Calculate billable hours per employee
5. Calculate utilization against weekly capacity

**Calculations**:
```javascript
billableHours = SUM(payItemHours WHERE payItemCode IN BILLABLE_CODES)
totalHours = SUM(timesheet.totalHoursActual)

// Calculate weeks in date range:
weeks = (dateTo - dateFrom) / (7 * 24 * 60 * 60 * 1000)
totalCapacity = employee.weeklyCapacityHours * weeks

utilizationPercent = (billableHours / totalCapacity) * 100
billablePercent = (billableHours / totalHours) * 100
```

**Status**: ✅ **READY** - Uses correct weeklyCapacityHours field

---

### Report 8: Billable vs Non-Billable

**Collections Used**:
- `cti_timesheets` (primary)
- `employees` (lookup)
- `projects` (lookup)

**Fields Accessed**:
```typescript
CtiTimesheet:
  - timecardDate (filtered)
  - employeeId (number)
  - payItems[] ({payItemCode, payItemHours})
  - labors[] ({laborTitle, laborValue})

Employee:
  - employeeId (number)
  - firstName, lastName
  - departmentId (for filtering)

Project:
  - poNumber (matches labors[].laborValue)
  - projectName
```

**Logic**:
1. Fetch timesheets within date range
2. Classify hours as billable/non-billable using pay item codes
3. Can group by employee, project, or department

**Calculations**:
```javascript
billableHours = SUM(payItemHours WHERE payItemCode IN BILLABLE_CODES)
nonBillableHours = SUM(payItemHours WHERE payItemCode IN NON_BILLABLE_CODES)
ptoHours = SUM(payItemHours WHERE payItemCode IN PTO_CODES)
totalHours = billableHours + nonBillableHours + ptoHours

billablePercent = (billableHours / totalHours) * 100
nonBillablePercent = (nonBillableHours / totalHours) * 100
```

**Status**: ✅ **READY** - Uses correct pay item code constants

---

### Report 9: Overtime Analysis

**Collections Used**:
- `cti_timesheets` (primary)
- `employees` (lookup)
- `departments` (lookup)

**Fields Accessed**:
```typescript
CtiTimesheet:
  - timecardDate (filtered)
  - employeeId (number)
  - payItems[] ({payItemCode, payItemHours})

Employee:
  - employeeId (number)
  - firstName, lastName
  - departmentCode
  - departmentId (for filtering)

Department:
  - id
  - departmentName
```

**Logic**:
1. Fetch timesheets within date range
2. Identify overtime hours by pay item codes
3. Group by employee or department

**Calculations**:
```javascript
// Overtime specific codes:
regularHours = SUM(payItemHours WHERE payItemCode = 'HRLY')
overtime15Hours = SUM(payItemHours WHERE payItemCode = 'OVT15')
overtime20Hours = SUM(payItemHours WHERE payItemCode = 'OVT20')

totalOvertimeHours = overtime15Hours + overtime20Hours
totalRegularHours = regularHours

overtimePercent = (totalOvertimeHours / (regularHours + totalOvertimeHours)) * 100

// Cost implications (if implemented):
overtimeCost = (overtime15Hours * regularRate * 1.5) + (overtime20Hours * regularRate * 2.0)
```

**Status**: ✅ **READY** - Correctly identifies OVT15 and OVT20 codes

---

### Report 10: Labor Cost Analysis

**Collections Used**:
- `cti_timesheets` (primary)
- `invoices` (for billing rates)
- `employees` (lookup)
- `projects` (lookup)
- `departments` (for grouping)

**Fields Accessed**:
```typescript
CtiTimesheet:
  - timecardDate (filtered)
  - employeeId (number)
  - payItems[] ({payItemCode, payItemHours})
  - labors[] ({laborTitle, laborValue})

Invoice:
  - createdAt (filtered)
  - invoiceItems[] ({billingRate, hours})
  - projectId

Employee:
  - employeeId (number)
  - firstName, lastName
  - departmentId

Project:
  - id
  - poNumber
  - projectName
  - departmentId

Department:
  - id
  - departmentName
```

**Logic**:
1. Fetch timesheets and invoices within date range
2. Calculate total hours from timesheets
3. Calculate average billing rates from invoices
4. Compare labor hours to billed hours
5. Estimate cost per hour

**Calculations**:
```javascript
totalHours = SUM(timesheet.payItems[].payItemHours)

// From invoices:
averageBillingRate = SUM(invoiceItems[].billingRate * invoiceItems[].hours) / SUM(invoiceItems[].hours)

// Labor cost (estimated):
laborCost = totalHours * averageInternalCostRate // ⚠️ May use placeholder

// Analysis:
costPerHour = laborCost / totalHours
revenuePerHour = totalRevenue / totalHours
profitPerHour = revenuePerHour - costPerHour
```

**Status**: ⚠️ **May use placeholder cost rates** - Depends on available payroll data

---

## PHASE 3: PROJECT REPORTS (4 Reports)

### Report 11: Project Status Report

**Collections Used**:
- `projects` (primary)
- `invoices` (for revenue to date)

**Fields Accessed**:
```typescript
Project:
  - id
  - poNumber
  - projectName
  - projectManager
  - departmentId (for filtering)
  - contractId (for filtering)
  - originalPoAmount
  - changeOrderAmount
  - newPoAmount
  - previouslyInvoicedAmount
  - remainingPoAmount
  - isInactive
  - isComplete

Invoice:
  - id
  - projectId
  - invoiceTotal
  - createdAt
```

**Logic**:
1. Fetch all projects
2. Filter by departmentId/contractId/projectId if specified
3. Fetch all invoices
4. Group invoices by project
5. Calculate completion percentage and determine status

**Calculations**:
```javascript
budgetUsed = project.originalPoAmount - project.remainingPoAmount
// OR: budgetUsed = project.previouslyInvoicedAmount

budgetTotal = project.newPoAmount || project.originalPoAmount || 0
completionPercent = (budgetUsed / budgetTotal) * 100

// Status determination:
if (project.isInactive) status = 'Inactive'
else if (project.isComplete) status = 'Completed'
else if (completionPercent > 100) status = 'Over Budget'
else if (completionPercent > 90) status = 'At Risk'
else if (completionPercent > 0) status = 'On Track'
else status = 'Active'

// Per project:
originalBudget = project.originalPoAmount || 0
changeOrders = project.changeOrderAmount || 0
currentBudget = budgetTotal
invoiced = budgetUsed
remaining = project.remainingPoAmount || 0
invoiceCount = COUNT(invoices)
lastInvoiceDate = MAX(invoices.createdAt)
```

**Status**: ✅ **READY** - Uses correct complex budget fields

---

### Report 12: Budget vs Actual

**Collections Used**:
- `projects` (primary)
- `invoices` (for actual revenue)
- `cti_timesheets` (for actual hours)

**Fields Accessed**:
```typescript
Project:
  - id
  - poNumber
  - projectName
  - departmentId (for filtering)
  - originalPoAmount
  - changeOrderAmount
  - newPoAmount
  - previouslyInvoicedAmount
  - budgetedHours
  - usedHours

Invoice:
  - createdAt (filtered)
  - projectId
  - invoiceTotal

CtiTimesheet:
  - timecardDate (filtered)
  - labors[] ({laborTitle, laborValue})
  - payItems[] ({payItemHours})
```

**Logic**:
1. Fetch projects filtered by department/projectId
2. Fetch invoices within date range
3. Fetch timesheets within date range
4. Compare budgeted vs actual for each project

**Calculations**:
```javascript
// Budget (from project fields):
originalBudget = project.originalPoAmount
totalBudget = project.newPoAmount // original + change orders
budgetedHours = project.budgetedHours

// Actuals:
actualRevenue = project.previouslyInvoicedAmount // Already calculated in DB
// OR: actualRevenue = SUM(invoices.invoiceTotal)

actualHours = project.usedHours // Already calculated in DB
// OR: actualHours = SUM(timesheet hours matching poNumber)

// Variance:
revenueVariance = actualRevenue - totalBudget
revenueVariancePercent = (revenueVariance / totalBudget) * 100
hoursVariance = actualHours - budgetedHours
hoursVariancePercent = (hoursVariance / budgetedHours) * 100
```

**Status**: ✅ **READY** - Uses correct budget fields and pre-calculated values

---

### Report 13: Change Order Impact

**Collections Used**:
- `projects` (primary)
- `invoices` (for tracking revenue after change orders)

**Fields Accessed**:
```typescript
Project:
  - id
  - poNumber
  - projectName
  - departmentId (for filtering)
  - contractId (for filtering)
  - originalPoAmount
  - changeOrderAmount
  - newPoAmount
  - previouslyInvoicedAmount
  - remainingPoAmount

Invoice:
  - projectId
  - invoiceTotal
  - createdAt
```

**Logic**:
1. Fetch all projects
2. Filter by department/contract if specified
3. Identify projects with change orders (changeOrderAmount != 0)
4. Analyze impact of change orders on budget

**Calculations**:
```javascript
originalBudget = project.originalPoAmount || 0
changeOrderAmount = project.changeOrderAmount || 0
newBudget = project.newPoAmount || originalBudget

changeOrderPercent = (changeOrderAmount / originalBudget) * 100

invoiced = project.previouslyInvoicedAmount || 0
remaining = project.remainingPoAmount || 0

// Impact metrics:
budgetIncrease = newBudget - originalBudget
remainingAfterCO = remaining
utilizationWithCO = (invoiced / newBudget) * 100
utilizationWithoutCO = (invoiced / originalBudget) * 100
```

**Status**: ✅ **READY** - Uses changeOrderAmount field correctly

---

### Report 14: Resource Allocation

**Collections Used**:
- `resource_allocations` (primary)
- `employees` (lookup)
- `projects` (lookup)
- `cti_timesheets` (for actual hours comparison)

**Fields Accessed**:
```typescript
ResourceAllocation:
  - id
  - employeeId (DocumentReference)
  - projectId (DocumentReference)
  - serviceId (DocumentReference, optional)
  - weekStartDate
  - scheduledHours

Employee:
  - id
  - employeeId (number)
  - firstName, lastName
  - weeklyCapacityHours
  - departmentId (for filtering)

Project:
  - id
  - projectName
  - poNumber

CtiTimesheet:
  - employeeId (number)
  - timecardDate
  - totalHoursActual
  - labors[] ({laborValue})
```

**Logic**:
1. Fetch resource allocations by date range (weekStartDate)
2. Fetch employees and projects
3. Fetch timesheets for actual hours
4. Compare scheduled vs actual hours per employee

**Calculations**:
```javascript
// Per employee:
totalScheduledHours = SUM(allocation.scheduledHours WHERE weekStartDate IN [range])

weeklyCapacity = employee.weeklyCapacityHours
utilizationScheduled = (totalScheduledHours / weeklyCapacity) * 100
isOverallocated = totalScheduledHours > weeklyCapacity

// Actual vs scheduled:
actualHours = SUM(timesheet.totalHoursActual WHERE timecardDate IN [week])
variance = actualHours - totalScheduledHours
variancePercent = (variance / totalScheduledHours) * 100
```

**Status**: ✅ **READY** - Uses resource_allocations collection correctly

---

## PHASE 4: COMPLIANCE REPORTS (2 Reports)

### Report 15: MWBE Participation Report

**Collections Used**:
- `invoices` (primary)
- `companies` (lookup for certification)
- `projects` (linking)
- `contracts` (for MWBE goals)

**Fields Accessed**:
```typescript
Invoice:
  - id
  - createdAt (filtered)
  - invoiceTotal
  - projectId
  - submitterCompanyId

Company:
  - id
  - companyName
  - diversityCertification ('MWBE' | 'WBE' | 'SBE' | 'None')

Project:
  - id
  - contractId
  - departmentId (for filtering)

Contract:
  - id
  - contractNumber
  - contractName
  - mwbeGoalPercent
```

**Logic**:
1. Fetch invoices within date range
2. Fetch companies, projects, contracts
3. For each invoice, determine company's diversity certification
4. Group by contract and calculate participation by certification type

**Calculations**:
```javascript
// Per contract:
totalAmount = SUM(invoice.invoiceTotal)

mwbeAmount = SUM(invoiceTotal WHERE company.diversityCertification = 'MWBE')
wbeAmount = SUM(invoiceTotal WHERE company.diversityCertification = 'WBE')
sbeAmount = SUM(invoiceTotal WHERE company.diversityCertification = 'SBE')
nonMWBEAmount = SUM(invoiceTotal WHERE company.diversityCertification IN ['None', null])

mwbeParticipation = (mwbeAmount / totalAmount) * 100
wbeParticipation = (wbeAmount / totalAmount) * 100
sbeParticipation = (sbeAmount / totalAmount) * 100

mwbeGoal = contract.mwbeGoalPercent
goalAchievement = (mwbeParticipation / mwbeGoal) * 100
isCompliant = mwbeParticipation >= mwbeGoal
```

**Status**: ✅ **READY** - Uses diversityCertification enum correctly

---

### Report 16: DBE Utilization Report

**Collections Used**:
- `invoices` (primary)
- `companies` (lookup)
- `projects` (linking)
- `contracts` (for DBE goals)

**Fields Accessed**:
```typescript
// Same as MWBE report

Company:
  - diversityCertification
  // Note: DBE tracking likely uses this field
  // May need to add 'DBE' to the enum values
```

**Logic**:
Same as MWBE report, but specifically tracking DBE certification

**Calculations**:
```javascript
// Same as MWBE, but for DBE certification:
dbeAmount = SUM(invoiceTotal WHERE company.diversityCertification = 'DBE')
dbeParticipation = (dbeAmount / totalAmount) * 100
```

**Status**: ⚠️ **May need DBE added to diversityCertification enum**
- Currently supports: 'MWBE' | 'WBE' | 'SBE' | 'None'
- May need to add 'DBE' option

---

## PHASE 5: EXECUTIVE REPORTS (4 Reports)

### Report 17: Executive Dashboard (Company-Wide Summary)

**Collections Used**:
- `invoices` (primary)
- `projects` (primary)
- `cti_timesheets` (primary)
- `departments` (primary)

**Fields Accessed**:
```typescript
Invoice:
  - createdAt (filtered)
  - invoiceTotal
  - status
  - projectId

Project:
  - id
  - isInactive
  - isComplete
  - newPoAmount (or originalPoAmount)
  - remainingPoAmount
  - departmentId

CtiTimesheet:
  - timecardDate (filtered)
  - totalHoursActual
  - payItems[] ({payItemCode, payItemHours})

Department:
  - id
  - departmentName
```

**Logic**:
1. Fetch all data within date range
2. Calculate company-wide financial metrics
3. Calculate project metrics
4. Calculate labor metrics
5. Break down by department

**Calculations**:
```javascript
// Financial Metrics:
totalRevenue = SUM(invoice.invoiceTotal)
approvedRevenue = SUM(invoiceTotal WHERE status IN ['approved', 'paid'])
paidRevenue = SUM(invoiceTotal WHERE status = 'paid')
pendingRevenue = SUM(invoiceTotal WHERE status IN ['pending', 'draft'])

// Project Metrics:
activeProjects = COUNT(projects WHERE !isInactive AND !isComplete)
completedProjects = COUNT(projects WHERE isComplete)
totalProjectBudget = SUM(project.newPoAmount || project.originalPoAmount)
remainingBudget = SUM(project.remainingPoAmount)

// Labor Metrics:
totalHours = SUM(timesheet.totalHoursActual)
billableHours = SUM(payItemHours WHERE payItemCode IN BILLABLE_CODES)
utilizationRate = (billableHours / totalHours) * 100

// Department Breakdown:
// For each department:
  - Revenue from projects in department
  - Hours from employees in department
  - Projects in department
```

**Status**: ⚠️ **Payment status needs clarification** (checks invoice.status = 'paid')

---

### Report 18: KPI Dashboard

**Collections Used**:
- Multiple collections (similar to Executive Dashboard)
- Focuses on specific KPIs

**Fields Accessed**:
Similar to Executive Dashboard, but calculates specific KPIs

**Calculations**:
```javascript
// Financial KPIs:
averageInvoiceValue = totalRevenue / invoiceCount
collectionRate = (totalPaid / totalInvoiced) * 100
daysToPayment = AVG(paidDate - createdAt) // If paidDate exists

// Labor KPIs:
utilizationRate = (billableHours / totalHours) * 100
averageHoursPerEmployee = totalHours / employeeCount
overtimeRate = (overtimeHours / totalHours) * 100

// Project KPIs:
onTimeCompletionRate = (completedOnTime / totalCompleted) * 100
averageProjectDuration = AVG(endDate - startDate)
budgetVariance = AVG((actualRevenue - budgetAmount) / budgetAmount) * 100

// Client KPIs:
activeClients = COUNT(DISTINCT contracts WHERE status = 'Active')
revenuePerClient = totalRevenue / activeClients
```

**Status**: ⚠️ **May use placeholder/estimated metrics**

---

### Report 19: Trend Analysis

**Collections Used**:
- `invoices` (time series)
- `cti_timesheets` (time series)
- `projects` (time series)

**Logic**:
1. Fetch data over extended period (e.g., 12 months)
2. Group by month or week
3. Calculate trends and growth rates
4. Identify patterns

**Calculations**:
```javascript
// Monthly aggregation:
monthlyRevenue = SUM(invoiceTotal) GROUP BY MONTH(createdAt)
monthlyHours = SUM(totalHoursActual) GROUP BY MONTH(timecardDate)
monthlyProjects = COUNT(DISTINCT projectId) GROUP BY month

// Trends:
movingAverage3Month = AVG(monthlyRevenue for last 3 months)
growthRate = ((currentMonth - previousMonth) / previousMonth) * 100

// Forecasting (simple linear):
projectedNextMonth = currentMonth + (currentMonth - previousMonth)
```

**Status**: ✅ **READY** - Uses correct aggregation logic

---

### Report 20: Department Comparison

**Collections Used**:
- `invoices` (grouped by department)
- `cti_timesheets` (grouped by department)
- `employees` (grouped by department)
- `projects` (grouped by department)
- `departments` (primary)

**Logic**:
1. Fetch all data within date range
2. Group all metrics by department
3. Compare departments side-by-side

**Calculations**:
```javascript
// Per department:
revenue = SUM(invoiceTotal for projects in department)
hours = SUM(totalHoursActual for employees in department)
billableHours = SUM(billable hours for employees in department)
projectCount = COUNT(projects in department)
employeeCount = COUNT(employees in department)

utilization = (billableHours / hours) * 100
revenuePerEmployee = revenue / employeeCount
revenuePerHour = revenue / hours

// Rankings:
rankByRevenue = RANK(department by revenue)
rankByUtilization = RANK(department by utilization)
```

**Status**: ✅ **READY** - Correct cross-department comparison logic

---

## REPORTS WITH PLACEHOLDER/DEMO DATA

### ⚠️ Report 5: Profitability Analysis
**Placeholder**: Labor cost calculation
```javascript
AVERAGE_HOURLY_RATE = 75 // HARDCODED PLACEHOLDER
laborCost = hours * AVERAGE_HOURLY_RATE
```
**Note**: Returns warning message about estimated costs
**Fix Needed**: Integrate actual payroll/cost data

### ⚠️ Report 10: Labor Cost Analysis
**Placeholder**: Internal cost rates (if payroll data not available)
```javascript
averageInternalCostRate = PLACEHOLDER_VALUE
laborCost = hours * averageInternalCostRate
```
**Fix Needed**: Integrate actual employee cost rates from payroll

### ⚠️ Report 18: KPI Dashboard
**Potential Placeholder**: Some KPIs may use estimated values
- Days to payment (if paidDate not tracked)
- On-time completion rate (if completion dates not tracked)
**Fix Needed**: Confirm all required date fields exist

---

## REPORTS REQUIRING CLARIFICATION

### ⚠️ All Reports Using invoice.status = 'paid':
- Report 1: Revenue by Department
- Report 4: Payment Tracking
- Report 5: Profitability Analysis
- Report 17: Executive Dashboard
- Report 18: KPI Dashboard

**Question**: Is `invoice.status` updated to 'paid' when payment received?
- **YES**: Reports are correct as-is
- **NO**: Need to query `PaymentTracking` collection instead

---

## SUMMARY TABLE

| # | Report Name | Status | Collections | Placeholders |
|---|-------------|--------|-------------|--------------|
| 1 | Revenue by Department | ⚠️ Clarify | 3 | Payment status |
| 2 | Revenue by Project | ✅ Ready | 2 | None |
| 3 | Outstanding Invoices | ✅ Ready | 2 | None |
| 4 | Payment Tracking | ⚠️ Clarify | 2 | Payment status |
| 5 | Profitability Analysis | ⚠️ Placeholder | 3 | $75/hr rate |
| 6 | Direct Labor Hours | ✅ Ready | 2 | None |
| 7 | Employee Utilization | ✅ Ready | 2 | None |
| 8 | Billable vs Non-Billable | ✅ Ready | 3 | None |
| 9 | Overtime Analysis | ✅ Ready | 3 | None |
| 10 | Labor Cost Analysis | ⚠️ Placeholder | 5 | Cost rates |
| 11 | Project Status | ✅ Ready | 2 | None |
| 12 | Budget vs Actual | ✅ Ready | 3 | None |
| 13 | Change Order Impact | ✅ Ready | 2 | None |
| 14 | Resource Allocation | ✅ Ready | 4 | None |
| 15 | MWBE Participation | ✅ Ready | 4 | None |
| 16 | DBE Utilization | ⚠️ Enum | 4 | May need DBE enum |
| 17 | Executive Dashboard | ⚠️ Clarify | 4 | Payment status |
| 18 | KPI Dashboard | ⚠️ Clarify | Multiple | Some KPIs |
| 19 | Trend Analysis | ✅ Ready | 3 | None |
| 20 | Department Comparison | ✅ Ready | 5 | None |

**Legend**:
- ✅ Ready = Fully implemented with real data
- ⚠️ Clarify = Needs user input/confirmation
- ⚠️ Placeholder = Uses hardcoded/estimated values
- ⚠️ Enum = May need enum value added

---

**Total**: 20 reports
- **13 fully ready** (65%)
- **5 need clarification** (25%)
- **2 use placeholders** (10%)
