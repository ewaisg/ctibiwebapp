# Reports Data Mapping Documentation

**Generated**: December 7, 2025
**Purpose**: Complete mapping of all available reports to Firestore collections, fields, subcollections, nested data, formulas, and calculations.

---

## Table of Contents

1. [Overview](#overview)
2. [Firestore Collections Structure](#firestore-collections-structure)
3. [Financial Reports](#financial-reports)
4. [Labor Reports](#labor-reports)
5. [Project Reports](#project-reports)
6. [Compliance Reports](#compliance-reports)
7. [Executive Reports](#executive-reports)
8. [Data Relationships](#data-relationships)
9. [Common Formulas](#common-formulas)

---

## Overview

This document provides a comprehensive mapping of all reports available in the system to their underlying Firestore data sources. Each report is documented with:

- **Collections Used**: Primary and related collections
- **Fields Accessed**: Specific fields from each collection
- **Nested Data**: Subcollections and nested object structures
- **Formulas**: Calculations and aggregations
- **Filters**: Required and optional filters
- **Purpose**: Why the report uses specific data

---

## Firestore Collections Structure

### Available Collections

1. **clients** - Client information
2. **companies** - Company profiles (including subconsultants)
3. **contracts** - Contract details and terms
4. **cti_timesheets** - Timesheet entries from iSolved
5. **departments** - Department organizational structure
6. **employees** - Employee profiles and details
7. **invoices** - Invoice records with line items
8. **payment_tracking** - Payment status and history
9. **projects** - Project details and budgets
10. **resource_allocations** - Weekly resource scheduling
11. **services** - Service types and billing rates

### Key Data Relationships

```
contracts → clients (via clientId)
projects → contracts (via contractId)
projects → departments (via departmentId)
invoices → projects (via projectId)
invoices → contracts (via contractId)
employees → companies (via companyId)
employees → departments (via departmentId)
cti_timesheets → employees (via employeeId/employeeNumber)
resource_allocations → employees (via employeeId)
resource_allocations → projects (via projectId)
payment_tracking → invoices (via invoiceId)
```

---

## Financial Reports

### 1. Revenue by Department

**Report ID**: `revenue-by-department`
**Category**: Financial
**Processor**: `processRevenueByDepartment`

#### Collections Used

1. **invoices** (Primary)
   - `id` - Invoice document ID
   - `invoiceTotal` - Total invoice amount
   - `invoiceNumber` - Invoice number
   - `status` - Invoice status (approved, paid, pending, rejected)
   - `createdAt` - Invoice creation date
   - `projectId` - Reference to project

2. **departments** (Related)
   - `id` - Department document ID
   - `departmentName` - Department name
   - `departmentCode` - Department code

3. **projects** (Lookup)
   - `id` - Project document ID
   - `departmentId` - Reference to department
   - `projectName` - Project name

#### Fields and Nested Data

**Invoice Collection**:
- Direct fields: `invoiceTotal`, `status`, `createdAt`, `invoiceNumber`
- References: `projectId` → projects collection

**Invoice Line Items** (nested in invoices):
- Not directly accessed but contributes to `invoiceTotal`

#### Formulas

```javascript
// Total Revenue by Department
totalRevenue = SUM(invoices.invoiceTotal) WHERE invoice.projectId.departmentId = department.id

// Paid Amount by Department
paidAmount = SUM(invoices.invoiceTotal) WHERE status IN ['approved', 'paid']

// Pending Amount by Department
pendingAmount = SUM(invoices.invoiceTotal) WHERE status NOT IN ['approved', 'paid']

// Invoice Count by Department
invoiceCount = COUNT(invoices) WHERE invoice.projectId.departmentId = department.id
```

#### Required Filters
- `dateFrom` (Date) - Start date for invoice filter
- `dateTo` (Date) - End date for invoice filter

#### Optional Filters
- `departmentId` (String) - Filter by specific department
- `status` (String) - Filter by invoice status

#### Why This Data?

- **invoices**: Primary source of revenue data
- **departments**: Organizational grouping for revenue analysis
- **projects**: Bridge between invoices and departments (invoices link to projects, projects link to departments)
- **Date filters**: Required to analyze revenue over specific time periods
- **Status**: Differentiates between approved/paid vs pending revenue

---

### 2. Revenue by Project

**Report ID**: `revenue-by-project`
**Category**: Financial
**Processor**: `processRevenueByProject`

#### Collections Used

1. **invoices** (Primary)
   - `id`, `invoiceTotal`, `invoiceNumber`, `status`, `createdAt`
   - `projectId` - Reference to project

2. **projects** (Primary)
   - `id`, `projectName`, `poNumber`
   - `originalPoAmount` - Original purchase order amount
   - `changeOrderAmount` - Change order adjustments
   - `newPoAmount` - Updated PO amount after change orders
   - `previouslyInvoicedAmount` - Previously invoiced amount
   - `remainingPoAmount` - Remaining budget
   - `budgetedHours` - Planned hours
   - `usedHours` - Actual hours used
   - `remainingHours` - Hours remaining

#### Formulas

```javascript
// Total Revenue per Project
projectRevenue = SUM(invoices.invoiceTotal) WHERE invoice.projectId = project.id

// Budget Utilization
budgetUtilization = (projectRevenue / project.originalPoAmount) * 100

// Remaining Budget
remainingBudget = project.remainingPoAmount

// Invoice Count per Project
invoiceCount = COUNT(invoices) WHERE invoice.projectId = project.id

// Average Invoice Amount
avgInvoiceAmount = projectRevenue / invoiceCount
```

#### Required Filters
- `dateFrom`, `dateTo` - Date range for analysis

#### Optional Filters
- `departmentId` - Filter projects by department
- `projectId` - Specific project analysis
- `status` - Invoice status filter

#### Why This Data?

- **invoices**: Revenue data per project
- **projects**: Budget baseline and comparison metrics
- **Budget fields**: Essential for comparing actual revenue against planned budgets
- **Hours fields**: Provides labor utilization context

---

### 3. Outstanding Invoices

**Report ID**: `outstanding-invoices`
**Category**: Financial
**Processor**: `processOutstandingInvoices`

#### Collections Used

1. **invoices** (Primary)
   - `id`, `invoiceNumber`, `invoiceTotal`, `status`
   - `createdAt`, `dueDate`, `approvedAt`
   - `projectId`, `contractNumber`

2. **projects** (Related)
   - `id`, `projectName`, `poNumber`

#### Formulas

```javascript
// Days Outstanding
daysOutstanding = (TODAY - invoice.dueDate) / (1000 * 60 * 60 * 24)

// Aging Buckets
agingCategory =
  if (daysOutstanding <= 30) return '0-30'
  else if (daysOutstanding <= 60) return '31-60'
  else if (daysOutstanding <= 90) return '61-90'
  else return '90+'

// Total Outstanding by Bucket
totalByBucket = SUM(invoices.invoiceTotal) GROUP BY agingCategory

// Total Outstanding Amount
totalOutstanding = SUM(invoices.invoiceTotal) WHERE status = 'approved' AND paidDate IS NULL
```

#### Optional Filters
- `departmentId` - Filter by department
- `projectId` - Filter by project

#### Why This Data?

- **invoices with status='approved' and no paidDate**: These are outstanding receivables
- **dueDate**: Required for aging analysis
- **projects**: Context for which project the outstanding amount belongs to
- **Aging categories**: Industry-standard AR aging buckets for cash flow management

---

### 4. Payment Tracking Report

**Report ID**: `payment-tracking`
**Category**: Financial
**Processor**: `processPaymentTracking`

#### Collections Used

1. **invoices** (Primary)
   - All invoice fields

2. **projects** (Related)
   - `id`, `projectName`, `poNumber`

3. **contracts** (Related)
   - `id`, `contractNumber`, `contractName`, `clientName`

4. **payment_tracking** (Primary)
   - `id`, `invoiceId`, `invoiceNumber`
   - `invoiceAmount`, `paidAmount`, `outstandingAmount`
   - `paymentDate`, `paymentMethod`, `paymentReference`
   - `status` - Pending, Partial, Paid, Overdue
   - `dueDate`, `notes`

#### Formulas

```javascript
// Outstanding Balance per Invoice
outstandingAmount = invoice.invoiceTotal - paidAmount

// Payment Progress
paymentProgress = (paidAmount / invoice.invoiceTotal) * 100

// Total Outstanding by Contract
totalOutstandingByContract = SUM(payment_tracking.outstandingAmount)
  GROUP BY invoice.contractId

// Overdue Status
isOverdue = (status = 'Pending' OR status = 'Partial') AND dueDate < TODAY
```

#### Required Filters
- `dateFrom`, `dateTo` - Payment date range

#### Optional Filters
- `contractId` - Filter by contract
- `projectId` - Filter by project

#### Why This Data?

- **payment_tracking**: Dedicated payment status tracking
- **invoices**: Complete invoice details for context
- **contracts**: Client-level payment tracking
- **projects**: Project-level payment analysis

---

### 5. Profitability Analysis

**Report ID**: `profitability-analysis`
**Category**: Financial
**Processor**: `processProfitabilityAnalysis`

#### Collections Used

1. **invoices** (Primary - Revenue)
   - `invoiceTotal`, `projectId`, `createdAt`
   - `invoiceItems[]` (nested array):
     - `hours`, `billingRate`, `amount`
     - `employeeId`, `companyId`, `serviceId`

2. **cti_timesheets** (Primary - Labor Cost)
   - `employeeId`, `timecardDate`, `totalHoursActual`
   - `payItems[]` (nested array):
     - `payItemCode`, `payItemHours`, `payItemName`
   - `labors[]` (nested array):
     - `laborTitle`, `laborValue` (project code)

3. **projects** (Related)
   - `id`, `projectName`, `poNumber`

4. **employees** (Related - Cost Calculation)
   - `id`, `formalName`, `companyId`
   - `employeeId`, `isInternal`, `isSubconsultant`

5. **departments** (Related)
   - `id`, `departmentName`

#### Nested Data Structures

**Invoice Items** (invoices.invoiceItems[]):
```javascript
{
  employeeId: Reference,
  companyId: Reference,
  serviceId: Reference,
  hours: Number,
  billingRate: Number,
  amount: Number,
  markdown: Number
}
```

**Timesheet Pay Items** (cti_timesheets.payItems[]):
```javascript
{
  payItemCode: String,  // HRLY, OVT15, OVT20, SalaryHrs, etc.
  payItemHours: Number,
  payItemName: String
}
```

**Timesheet Labors** (cti_timesheets.labors[]):
```javascript
{
  laborTitle: String,  // 'Project/Job', 'Customer', 'Division'
  laborValue: String   // Project code (matches project.poNumber)
}
```

#### Formulas

```javascript
// Total Revenue per Project
revenue = SUM(invoices.invoiceTotal) WHERE invoice.projectId = project.id

// Total Billable Hours per Project
billableHours = SUM(
  timesheets.payItems[i].payItemHours
) WHERE
  payItems[i].payItemCode IN ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs'] AND
  labors[j].laborValue = project.poNumber

// Estimated Labor Cost (simplified)
// Note: Actual cost requires internal cost rates
laborCost = billableHours * averageInternalCostRate

// Gross Profit
grossProfit = revenue - laborCost

// Profit Margin
profitMargin = (grossProfit / revenue) * 100

// Billing Rate vs Cost Rate
markup = ((averageBillingRate - averageCostRate) / averageCostRate) * 100
```

#### Required Filters
- `dateFrom`, `dateTo` - Analysis period

#### Optional Filters
- `departmentId` - Department filter
- `projectId` - Project filter

#### Why This Data?

- **invoices + invoiceItems**: Revenue side of profitability
- **cti_timesheets**: Actual labor hours spent (cost side)
- **payItems array**: Differentiates billable vs non-billable hours
- **labors array**: Maps timesheets to projects
- **employees**: Internal vs subconsultant differentiation (affects cost calculation)
- **projects & departments**: Organizational grouping for profitability analysis

---

## Labor Reports

### 6. Direct Labor Hours by Project

**Report ID**: `direct-labor-by-project`
**Category**: Labor
**Processor**: `processDirectLaborByProject`

#### Collections Used

1. **cti_timesheets** (Primary)
   - `employeeId`, `employeeNumber`, `employeeFirstName`, `employeeLastName`
   - `timecardDate`, `totalHoursActual`
   - `labors[]` - Project mapping
   - `payItems[]` - Hour type breakdown

2. **projects** (Related)
   - `id`, `projectName`, `poNumber`

3. **employees** (Related)
   - `id`, `formalName`, `companyId`, `companyName`
   - `departmentId`, `departmentCode`

#### Nested Data - Pay Items Classification

**Billable Pay Item Codes**:
- `HRLY` - Regular hourly
- `OVT15` - Overtime 1.5x
- `OVT20` - Overtime 2.0x
- `SalaryHrs` - Salaried hours
- `1099COMP` - 1099 compensation

**Non-Billable Pay Item Codes**:
- `SAL` - Salary (non-billable)
- `CTI_REG` - CTI regular
- `CTI_OVT` - CTI overtime

**PTO Pay Item Codes**:
- `PTO` - Paid time off
- `HOL` - Holiday
- `FLTHOL` - Floating holiday
- `BER` - Bereavement
- `JURY` - Jury duty
- `LV_UNPD` - Unpaid leave
- `MIL` - Military leave

#### Formulas

```javascript
// Total Hours per Project
totalHours = SUM(timesheets.totalHoursActual)
  WHERE labors[].laborValue = project.poNumber

// Billable Hours per Project
billableHours = SUM(
  payItems[i].payItemHours
) WHERE
  payItems[i].payItemCode IN ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs'] AND
  labors[].laborValue = project.poNumber

// Hours by Employee per Project
employeeHours = SUM(timesheets.totalHoursActual)
  GROUP BY employeeId, projectId

// Unique Employees per Project
employeeCount = COUNT(DISTINCT timesheets.employeeId)
  WHERE labors[].laborValue = project.poNumber
```

#### Required Filters
- `dateFrom`, `dateTo` - Time period

#### Optional Filters
- `departmentId` - Department filter
- `projectId` - Specific project
- `employeeId` - Specific employee

#### Why This Data?

- **cti_timesheets**: Source of actual labor hours
- **labors[] nested array**: Maps timesheets to projects via laborValue = poNumber
- **payItems[] nested array**: Categorizes hours as billable, non-billable, or PTO
- **projects**: Project context and names
- **employees**: Employee details and organizational assignment

---

### 7. Employee Utilization Report

**Report ID**: `employee-utilization`
**Category**: Labor
**Processor**: `processEmployeeUtilization`

#### Collections Used

1. **cti_timesheets** (Primary)
   - All timesheet fields with payItems[]

2. **employees** (Primary)
   - `id`, `formalName`, `employeeId`, `employeeNumber`
   - `weeklyCapacityHours` - Weekly capacity (e.g., 40 hours)
   - `companyId`, `companyName`
   - `departmentId`, `departmentCode`
   - `isInternal`, `isSubconsultant`

3. **departments** (Related)
   - `id`, `departmentName`

#### Formulas

```javascript
// Total Hours per Employee
totalHours = SUM(timesheets.totalHoursActual) WHERE timesheets.employeeId = employee.id

// Billable Hours per Employee
billableHours = SUM(
  payItems[i].payItemHours
) WHERE payItems[i].payItemCode IN ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs']

// Non-Billable Hours per Employee
nonBillableHours = SUM(
  payItems[i].payItemHours
) WHERE payItems[i].payItemCode NOT IN billable_codes AND NOT IN pto_codes

// PTO Hours per Employee
ptoHours = SUM(
  payItems[i].payItemHours
) WHERE payItems[i].payItemCode IN ['PTO', 'HOL', 'FLTHOL', 'BER', 'JURY', 'LV_UNPD', 'MIL']

// Utilization Rate
utilizationRate = (billableHours / totalHours) * 100

// Capacity Utilization (if using resource_allocations)
capacityUtilization = (totalHours / (weeklyCapacityHours * numberOfWeeks)) * 100
```

#### Required Filters
- `dateFrom`, `dateTo` - Analysis period

#### Optional Filters
- `departmentId` - Department filter
- `employeeId` - Specific employee

#### Why This Data?

- **cti_timesheets**: Actual time worked
- **employees.weeklyCapacityHours**: Baseline for capacity calculations
- **payItems[]**: Essential for categorizing billable vs non-billable time
- **departments**: Organizational analysis
- **Company fields**: Internal vs external employee analysis

---

### 8. Billable vs Non-Billable Hours

**Report ID**: `billable-vs-nonbillable`
**Category**: Labor
**Processor**: `processBillableVsNonBillable`

#### Collections Used

1. **cti_timesheets** (Primary)
   - All fields with payItems[] categorization

2. **departments** (Related)
   - Department grouping

3. **employees** (Related)
   - Employee details

#### Non-Billable Department Codes
Special department codes that mark work as non-billable:
- `100`, `500`, `900`, `905`, `910`, `915`, `920`

#### Formulas

```javascript
// Billable Hours by Department
billableHoursByDept = SUM(
  payItems[i].payItemHours
) WHERE
  payItems[i].payItemCode IN billable_codes AND
  labors[].laborValue NOT IN non_billable_dept_codes
  GROUP BY employee.departmentId

// Non-Billable Hours by Department
nonBillableHoursByDept = SUM(
  payItems[i].payItemHours
) WHERE
  payItems[i].payItemCode IN non_billable_codes OR
  labors[].laborValue IN non_billable_dept_codes
  GROUP BY employee.departmentId

// Billable Percentage
billablePercentage = (billableHours / totalHours) * 100
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`

#### Why This Data?

- **cti_timesheets**: Time tracking data
- **payItems[]**: Hour type classification
- **labors[]**: Department code check for non-billable work
- **Non-billable dept codes**: Organizational overhead and admin departments

---

### 9. Overtime Analysis

**Report ID**: `overtime-analysis`
**Category**: Labor
**Processor**: `processOvertimeAnalysis`

#### Collections Used

1. **cti_timesheets** (Primary)
   - All fields focusing on overtime payItems

2. **employees** (Related)
   - Employee details

3. **projects** (Related)
   - Project assignment

#### Overtime Pay Item Codes
- `OVT15` - 1.5x overtime
- `OVT20` - 2.0x overtime (double time)

#### Formulas

```javascript
// Total Overtime Hours
overtimeHours = SUM(
  payItems[i].payItemHours
) WHERE payItems[i].payItemCode IN ['OVT15', 'OVT20']

// Overtime 1.5x Hours
overtime15 = SUM(payItems[i].payItemHours) WHERE payItemCode = 'OVT15'

// Overtime 2.0x Hours
overtime20 = SUM(payItems[i].payItemHours) WHERE payItemCode = 'OVT20'

// Overtime Percentage
overtimePercentage = (overtimeHours / totalHours) * 100

// Overtime by Employee
overtimeByEmployee = SUM(overtimeHours) GROUP BY employeeId

// Overtime by Project
overtimeByProject = SUM(overtimeHours)
  WHERE labors[].laborValue = project.poNumber
  GROUP BY project.id
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`, `projectId`, `employeeId`

#### Why This Data?

- **cti_timesheets.payItems[]**: Identifies overtime hours by code
- **employees**: Context on who is working overtime
- **projects**: Identifies which projects drive overtime
- **Multiple OT codes**: Differentiates between 1.5x and 2.0x rates for cost analysis

---

### 10. Labor Cost Analysis

**Report ID**: `labor-cost-analysis`
**Category**: Labor
**Processor**: `processLaborCostAnalysis`

#### Collections Used

1. **cti_timesheets** (Primary)
   - Labor hours data

2. **invoices** (Related)
   - `invoiceItems[]` for billing rates

3. **projects** (Related)
   - Project budgets

4. **employees** (Related)
   - Employee cost data

#### Formulas

```javascript
// Total Labor Hours per Project
laborHours = SUM(timesheets.totalHoursActual)
  WHERE labors[].laborValue = project.poNumber

// Billed Amount per Project (from invoices)
billedAmount = SUM(
  invoiceItems[i].amount
) WHERE invoice.projectId = project.id

// Average Billing Rate
avgBillingRate = billedAmount / laborHours

// Labor Efficiency
laborEfficiency = (billedAmount / laborCost) * 100

// Cost per Hour (requires internal cost rates)
costPerHour = totalLaborCost / laborHours
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`, `projectId`

#### Why This Data?

- **cti_timesheets**: Actual labor hours
- **invoices.invoiceItems[]**: Billing rates and billed amounts
- **Comparison**: Enables analysis of billing rate vs cost rate efficiency

---

## Project Reports

### 11. Project Status Summary

**Report ID**: `project-status-summary`
**Category**: Project
**Processor**: `processProjectStatusSummary`

#### Collections Used

1. **projects** (Primary)
   - `id`, `projectName`, `poNumber`
   - `originalPoAmount`, `changeOrderAmount`, `newPoAmount`
   - `previouslyInvoicedAmount`, `remainingPoAmount`
   - `budgetedHours`, `usedHours`, `remainingHours`
   - `isComplete`, `isInactive`
   - `projectManager`, `approvingSupervisor`
   - `contractId`, `departmentId`

2. **invoices** (Related)
   - Count and total by project

3. **contracts** (Related)
   - `contractNumber`, `contractName`, `clientName`

#### Formulas

```javascript
// Budget Utilization
budgetUtilization = (previouslyInvoicedAmount / originalPoAmount) * 100

// Remaining Budget
remainingBudget = remainingPoAmount

// Completion Percentage
completionPercentage = (previouslyInvoicedAmount / newPoAmount) * 100

// Hours Utilization
hoursUtilization = (usedHours / budgetedHours) * 100

// Remaining Hours
remainingHours = budgetedHours - usedHours

// Status Flag
statusFlag =
  if (remainingPoAmount < 0 OR remainingHours < 0) return 'critical'
  else if (budgetUtilization > 85) return 'warning'
  else return 'healthy'
```

#### Optional Filters
- `departmentId`, `contractId`, `status`

#### Why This Data?

- **projects**: Complete project lifecycle data
- **Budget fields**: Essential for tracking project financial health
- **Hours fields**: Labor tracking and utilization
- **contracts**: Client and contract context
- **invoices**: Historical billing data

---

### 12. Budget vs Actual

**Report ID**: `budget-vs-actual`
**Category**: Project
**Processor**: `processBudgetVsActual`

#### Collections Used

1. **projects** (Primary)
   - All budget-related fields

2. **invoices** (Primary)
   - Actual invoiced amounts

#### Formulas

```javascript
// Budget (Baseline)
budget = project.originalPoAmount

// Actual (Invoiced to Date)
actual = project.previouslyInvoicedAmount
// OR: SUM(invoices.invoiceTotal) WHERE invoice.projectId = project.id

// Variance
variance = budget - actual

// Variance Percentage
variancePercentage = ((actual - budget) / budget) * 100

// Projected Final Amount
// Based on current burn rate
burnRate = actual / elapsedDays
projectedFinal = actual + (burnRate * remainingDays)

// Forecasted Overrun
forecastedOverrun = MAX(0, projectedFinal - budget)
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`, `projectId`

#### Why This Data?

- **projects.originalPoAmount**: Budget baseline
- **projects.previouslyInvoicedAmount**: Actual spending
- **invoices**: Detailed transaction history
- **Change orders**: Budget adjustments tracking

---

### 13. Change Order Summary

**Report ID**: `change-order-summary`
**Category**: Project
**Processor**: `processChangeOrderSummary`

#### Collections Used

1. **projects** (Primary)
   - `originalPoAmount` - Original budget
   - `changeOrderAmount` - Total change orders
   - `newPoAmount` - Updated budget (original + changes)

2. **contracts** (Related)
   - Contract context

#### Formulas

```javascript
// Total Change Orders per Project
totalChangeOrders = project.changeOrderAmount

// New Budget
newBudget = project.originalPoAmount + project.changeOrderAmount

// Change Order Percentage
changeOrderPercentage = (changeOrderAmount / originalPoAmount) * 100

// Budget Growth
budgetGrowth = ((newPoAmount - originalPoAmount) / originalPoAmount) * 100
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`, `projectId`, `contractId`

#### Why This Data?

- **projects.changeOrderAmount**: Direct change order tracking
- **Baseline comparison**: Shows project scope growth
- **Budget impact**: How change orders affect project budgets

---

### 14. Project Completion Forecast

**Report ID**: `project-completion-forecast`
**Category**: Project
**Processor**: `processProjectCompletionForecast`

#### Collections Used

1. **projects** (Primary)
   - Budget and hours fields

2. **invoices** (Historical data)
   - Billing history for trend analysis

3. **cti_timesheets** (Historical data)
   - Labor consumption trends

#### Formulas

```javascript
// Current Burn Rate ($ per day)
dollarBurnRate = actual / daysElapsed

// Hours Burn Rate (hours per day)
hoursBurnRate = usedHours / daysElapsed

// Days to Completion (based on budget)
daysToCompletion = remainingPoAmount / dollarBurnRate

// Forecasted Completion Date
forecastedCompletionDate = TODAY + daysToCompletion

// Budget Depletion Date
budgetDepletionDate = TODAY + (remainingPoAmount / dollarBurnRate)

// Hours Depletion Date
hoursDepletionDate = TODAY + (remainingHours / hoursBurnRate)
```

#### Optional Filters
- `departmentId`, `projectId`, `status`

#### Why This Data?

- **projects**: Current state and budgets
- **invoices**: Historical billing patterns for trend analysis
- **cti_timesheets**: Historical labor consumption patterns
- **Trend data**: Essential for forecasting future completion

---

### 15. Project Hours Summary

**Report ID**: `project-hours-summary`
**Category**: Project
**Processor**: `processProjectHoursSummary`

#### Collections Used

1. **projects** (Primary)
   - `budgetedHours`, `usedHours`, `remainingHours`

2. **cti_timesheets** (Primary)
   - Actual hours worked

3. **invoices** (Related)
   - Billed hours from invoiceItems[]

#### Formulas

```javascript
// Total Hours Worked
totalHours = SUM(timesheets.totalHoursActual)
  WHERE labors[].laborValue = project.poNumber

// Budgeted Hours
budgetedHours = project.budgetedHours

// Remaining Hours
remainingHours = budgetedHours - totalHours

// Hours Utilization
hoursUtilization = (totalHours / budgetedHours) * 100

// Billed Hours (from invoices)
billedHours = SUM(invoiceItems[i].hours) WHERE invoice.projectId = project.id

// Billable Hours (from timesheets)
billableHours = SUM(payItems[i].payItemHours) WHERE payItemCode IN billable_codes

// Billing Efficiency
billingEfficiency = (billedHours / billableHours) * 100
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`, `projectId`

#### Why This Data?

- **projects**: Budgeted hours baseline
- **cti_timesheets**: Actual hours worked
- **invoices.invoiceItems[]**: Billed hours
- **Comparison**: Identifies gaps between worked, billable, and billed hours

---

## Compliance Reports

### 16. MWBE Compliance Report

**Report ID**: `mwbe-compliance`
**Category**: Compliance
**Processor**: `processMWBECompliance`

#### Collections Used

1. **invoices** (Primary)
   - `invoiceTotal`, `invoiceItems[]`

2. **projects** (Related)
   - Project details

3. **companies** (Primary)
   - `companyName`, `companyCode`
   - `diversityCertification` - 'MWBE', 'WBE', 'SBE', 'None'
   - `isSubconsultant`

4. **contracts** (Related)
   - `mwbeGoalPercent` - MWBE goal percentage

#### Formulas

```javascript
// Total Invoice Amount
totalInvoiceAmount = SUM(invoices.invoiceTotal)

// MWBE Company Amount
mwbeAmount = SUM(
  invoiceItems[i].amount
) WHERE
  invoiceItems[i].companyId.diversityCertification IN ['MWBE', 'WBE']

// MWBE Percentage
mwbePercentage = (mwbeAmount / totalInvoiceAmount) * 100

// MWBE Goal
mwbeGoal = contract.mwbeGoalPercent

// MWBE Achievement
mwbeAchievement = (mwbePercentage / mwbeGoal) * 100

// Shortfall/Surplus
mwbeShortfall = mwbeGoal - mwbePercentage

// By Company Type
mwbeOnlyAmount = SUM(amount) WHERE certification = 'MWBE'
wbeOnlyAmount = SUM(amount) WHERE certification = 'WBE'
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`, `projectId`, `contractId`

#### Why This Data?

- **companies.diversityCertification**: Identifies MWBE/WBE firms
- **invoices.invoiceItems[]**: Contains company-level billing data
- **contracts.mwbeGoalPercent**: Contract compliance target
- **Subconsultant flag**: MWBE compliance applies to subconsultants
- **Reporting requirement**: Many government contracts require MWBE participation reporting

---

### 17. Sub-Consultant Breakdown

**Report ID**: `subconsultant-breakdown`
**Category**: Compliance
**Processor**: `processSubConsultantBreakdown`

#### Collections Used

1. **invoices** (Primary)
   - `invoiceItems[]` with company details

2. **projects** (Related)
   - Project context

3. **companies** (Primary)
   - `companyName`, `isSubconsultant`
   - `diversityCertification`

4. **employees** (Related)
   - Employee assignments to companies

#### Formulas

```javascript
// Total Subconsultant Amount
subConsultantAmount = SUM(
  invoiceItems[i].amount
) WHERE invoiceItems[i].companyId.isSubconsultant = true

// Subconsultant Percentage
subConsultantPercentage = (subConsultantAmount / totalInvoiceAmount) * 100

// By Company
amountByCompany = SUM(invoiceItems[i].amount)
  GROUP BY invoiceItems[i].companyId
  WHERE company.isSubconsultant = true

// Hours by Company
hoursByCompany = SUM(invoiceItems[i].hours)
  GROUP BY invoiceItems[i].companyId

// Average Rate by Company
avgRateByCompany = amountByCompany / hoursByCompany
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`, `projectId`, `companyId`

#### Why This Data?

- **companies.isSubconsultant**: Identifies subconsultant firms
- **invoiceItems[]**: Detailed billing by company
- **Compliance tracking**: Many contracts require subconsultant participation reporting
- **Company diversity**: Cross-references with MWBE status

---

### 18. DBE Participation Report

**Report ID**: `dbe-participation`
**Category**: Compliance
**Processor**: `processDBEParticipation`

#### Collections Used

1. **invoices** (Primary)
   - `invoiceItems[]`

2. **projects** (Related)
   - Project details

3. **companies** (Primary)
   - `diversityCertification` - Includes 'DBE' status
   - `isSubconsultant`

4. **contracts** (Related)
   - DBE goal tracking (if available in contract fields)

#### Formulas

```javascript
// DBE Amount
dbeAmount = SUM(
  invoiceItems[i].amount
) WHERE invoiceItems[i].companyId.diversityCertification = 'DBE'

// DBE Percentage
dbePercentage = (dbeAmount / totalInvoiceAmount) * 100

// By DBE Company
dbeByCompany = SUM(invoiceItems[i].amount)
  GROUP BY companyId
  WHERE diversityCertification = 'DBE'
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `contractId`, `projectId`

#### Why This Data?

- **Similar to MWBE**: DBE (Disadvantaged Business Enterprise) tracking
- **Federal contracts**: Often require DBE participation goals
- **companies.diversityCertification**: Includes DBE status

---

### 19. Certified Payroll Report

**Report ID**: `certified-payroll`
**Category**: Compliance
**Processor**: `processCertifiedPayroll`

#### Collections Used

1. **cti_timesheets** (Primary)
   - All timesheet fields with detailed breakdown

2. **employees** (Primary)
   - `formalName`, `employeeId`, `employeeNumber`
   - Employee classification data

3. **projects** (Related)
   - `projectName`, `poNumber`

#### Formulas

```javascript
// Hours Worked per Employee per Week
hoursPerWeek = SUM(timesheets.totalHoursActual)
  WHERE WEEK(timecardDate) = week
  GROUP BY employeeId

// Regular Hours
regularHours = SUM(payItems[i].payItemHours)
  WHERE payItemCode = 'HRLY'

// Overtime Hours
overtimeHours = SUM(payItems[i].payItemHours)
  WHERE payItemCode IN ['OVT15', 'OVT20']

// By Project and Employee
payrollByProjectEmployee = {
  employee: employee.formalName,
  project: project.projectName,
  regularHours: regularHours,
  overtimeHours: overtimeHours,
  totalHours: regularHours + overtimeHours
}
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `projectId`, `employeeId`

#### Why This Data?

- **Prevailing wage compliance**: Many government projects require certified payroll
- **cti_timesheets**: Source of truth for hours worked
- **payItems[]**: Detailed hour type breakdown
- **Weekly reporting**: Certified payroll is typically weekly
- **Employee details**: Required for payroll certification

---

## Executive Reports

### 20. Company-Wide Summary

**Report ID**: `company-wide-summary`
**Category**: Executive
**Processor**: `processCompanyWideSummary`

#### Collections Used

1. **invoices** (Primary)
   - All invoice data

2. **projects** (Primary)
   - All project data

3. **cti_timesheets** (Primary)
   - All timesheet data

4. **departments** (Related)
   - Organizational structure

#### Formulas

```javascript
// Total Revenue
totalRevenue = SUM(invoices.invoiceTotal) WHERE status IN ['approved', 'paid']

// Total Outstanding
totalOutstanding = SUM(invoices.invoiceTotal) WHERE status = 'approved' AND NOT paid

// Total Hours
totalHours = SUM(timesheets.totalHoursActual)

// Total Billable Hours
totalBillableHours = SUM(payItems[i].payItemHours)
  WHERE payItemCode IN billable_codes

// Company-Wide Utilization
utilizationRate = (totalBillableHours / totalHours) * 100

// Active Projects
activeProjects = COUNT(projects) WHERE isInactive = false AND isComplete = false

// Project Budget Utilization
avgProjectUtilization = AVG(project.previouslyInvoicedAmount / project.originalPoAmount) * 100

// Revenue by Department
revenueByDept = SUM(invoices.invoiceTotal)
  GROUP BY project.departmentId

// Hours by Department
hoursByDept = SUM(timesheets.totalHoursActual)
  GROUP BY employee.departmentId
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Why This Data?

- **Cross-cutting view**: Aggregates all major data sources
- **Executive dashboard**: High-level metrics for leadership
- **invoices**: Revenue metrics
- **timesheets**: Labor metrics
- **projects**: Project health metrics
- **departments**: Organizational performance

---

### 21. Key Performance Indicators (KPI Dashboard)

**Report ID**: `kpi-dashboard`
**Category**: Executive
**Processor**: `processKPIDashboard`

#### Collections Used

1. **invoices** (Primary)
2. **projects** (Primary)
3. **cti_timesheets** (Primary)
4. **employees** (Primary)

#### Formulas

```javascript
// KPI 1: Total Revenue
totalRevenue = SUM(invoices.invoiceTotal) WHERE status IN ['approved', 'paid']

// KPI 2: Outstanding AR
outstandingAR = SUM(invoices.invoiceTotal) WHERE status = 'approved' AND NOT paid

// KPI 3: Utilization Rate
utilizationRate = (totalBillableHours / totalHours) * 100

// KPI 4: Project Completion Rate
projectCompletionRate = (COUNT(projects WHERE isComplete) / COUNT(projects)) * 100

// KPI 5: Average Project Budget Utilization
avgProjectUtilization = AVG(previouslyInvoicedAmount / originalPoAmount) * 100

// KPI 6: On-Time Invoice Rate
onTimeInvoiceRate = (COUNT(invoices WHERE approvedAt <= dueDate) / COUNT(invoices)) * 100

// KPI 7: Active Employees
activeEmployees = COUNT(employees WHERE employmentStatus = 'Active')

// KPI 8: Revenue per Employee
revenuePerEmployee = totalRevenue / activeEmployees

// KPI 9: Billable Hours per Employee
billableHoursPerEmployee = totalBillableHours / activeEmployees

// KPI 10: Change Order Percentage
changeOrderPercentage = AVG(changeOrderAmount / originalPoAmount) * 100
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`

#### Why This Data?

- **Strategic metrics**: KPIs for executive decision-making
- **Multi-dimensional**: Financial, operational, and productivity metrics
- **Benchmarking**: Enables period-over-period comparisons
- **All collections**: Requires cross-collection aggregation

---

### 22. Trend Analysis Report

**Report ID**: `trend-analysis`
**Category**: Executive
**Processor**: `processTrendAnalysis`

#### Collections Used

1. **invoices** (Time series)
2. **cti_timesheets** (Time series)
3. **projects** (Time series)

#### Formulas

```javascript
// Revenue Trend (by month/quarter)
revenueTrend = SUM(invoices.invoiceTotal)
  GROUP BY MONTH(createdAt)
  ORDER BY createdAt

// Hours Trend
hoursTrend = SUM(timesheets.totalHoursActual)
  GROUP BY MONTH(timecardDate)

// Utilization Trend
utilizationTrend = (billableHours / totalHours) * 100
  GROUP BY MONTH(timecardDate)

// Profitability Trend
profitabilityTrend = (revenue - laborCost) / revenue * 100
  GROUP BY MONTH

// Moving Averages (3-month)
movingAvgRevenue = AVG(revenue) OVER (last 3 months)

// Growth Rate (Month-over-Month)
revenueGrowthRate = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100

// Forecast (Linear Regression)
forecastedRevenue = FORECAST(revenueTrend)
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Optional Filters
- `departmentId`

#### Why This Data?

- **Historical patterns**: Identifies trends and seasonality
- **Time series data**: Requires date-based grouping
- **Predictive**: Enables forecasting
- **Multiple metrics**: Revenue, hours, utilization trends

---

### 23. Department Comparison

**Report ID**: `department-comparison`
**Category**: Executive
**Processor**: `processDepartmentComparison`

#### Collections Used

1. **departments** (Primary)
2. **invoices** (Aggregated)
3. **cti_timesheets** (Aggregated)
4. **projects** (Aggregated)

#### Formulas

```javascript
// Revenue by Department
revenueByDept = SUM(invoices.invoiceTotal)
  WHERE invoice.projectId.departmentId = department.id
  GROUP BY department.id

// Hours by Department
hoursByDept = SUM(timesheets.totalHoursActual)
  WHERE employee.departmentId = department.id
  GROUP BY department.id

// Utilization by Department
utilizationByDept = (billableHoursByDept / totalHoursByDept) * 100
  GROUP BY department.id

// Projects by Department
projectsByDept = COUNT(projects)
  WHERE departmentId = department.id
  GROUP BY department.id

// Active Projects by Department
activeProjectsByDept = COUNT(projects)
  WHERE isInactive = false AND isComplete = false
  GROUP BY department.id

// Average Project Size by Department
avgProjectSize = AVG(project.originalPoAmount)
  GROUP BY department.id

// Revenue per Employee by Department
revenuePerEmpByDept = revenueByDept / COUNT(employees WHERE employee.departmentId = department.id)

// Ranking
deptRanking = RANK departments BY revenueByDept DESC
```

#### Required Filters
- `dateFrom`, `dateTo`

#### Why This Data?

- **Comparative analysis**: Side-by-side department performance
- **Resource allocation**: Identifies high/low performing departments
- **Strategic planning**: Informs organizational decisions
- **Cross-department metrics**: Revenue, hours, utilization, projects

---

## Data Relationships

### Collection Relationship Diagram

```
┌─────────────┐
│   clients   │
└──────┬──────┘
       │
       │ clientId
       ▼
┌─────────────┐
│  contracts  │
└──────┬──────┘
       │
       │ contractId
       ▼
┌─────────────┐       departmentId      ┌──────────────┐
│  projects   │◄─────────────────────────┤ departments  │
└──────┬──────┘                          └──────────────┘
       │
       │ projectId
       ▼
┌─────────────┐       employeeId        ┌──────────────┐
│  invoices   │                          │  employees   │
│             │                          │              │
│ invoiceItems│◄─────────────────────────┤              │
│  [array]    │                          └───────┬──────┘
└─────────────┘                                  │
                                                 │ employeeId
                                                 ▼
                                          ┌──────────────┐
                                          │cti_timesheets│
                                          │              │
                                          │ labors[]     │
                                          │ payItems[]   │
                                          └──────────────┘

┌──────────────┐       employeeId        ┌──────────────┐
│  resource_   │◄─────────────────────────┤  employees   │
│ allocations  │                          └──────────────┘
└──────┬───────┘
       │
       │ projectId
       ▼
┌──────────────┐
│  projects    │
└──────────────┘

┌──────────────┐       invoiceId         ┌──────────────┐
│  payment_    │◄─────────────────────────┤  invoices    │
│  tracking    │                          └──────────────┘
└──────────────┘
```

### Key Reference Fields

**projects** references:
- `contractId` → contracts
- `departmentId` → departments

**invoices** references:
- `projectId` → projects
- `contractId` → contracts
- `userId` (submitter) → users
- `approvedBy` → users

**invoices.invoiceItems[]** references:
- `companyId` → companies
- `employeeId` → employees
- `serviceId` → services

**employees** references:
- `companyId` → companies
- `departmentId` → departments
- `divisionId` → divisions

**cti_timesheets** references:
- `employeeId` (number) → employees.employeeId
- `employeeNumber` (string) → employees.employeeNumber
- `labors[].laborValue` (for projects) → projects.poNumber

**resource_allocations** references:
- `employeeId` → employees
- `projectId` → projects
- `serviceId` → services

**payment_tracking** references:
- `invoiceId` → invoices
- `projectId` → projects

---

## Common Formulas

### Revenue Calculations

```javascript
// Total Revenue
totalRevenue = SUM(invoices.invoiceTotal)

// Paid Revenue
paidRevenue = SUM(invoices.invoiceTotal) WHERE status IN ['approved', 'paid']

// Outstanding Revenue
outstandingRevenue = SUM(invoices.invoiceTotal) WHERE status = 'approved' AND paidDate IS NULL

// Revenue by Period
revenueByPeriod = SUM(invoices.invoiceTotal) GROUP BY PERIOD(createdAt)
```

### Hour Calculations

```javascript
// Total Hours
totalHours = SUM(timesheets.totalHoursActual)

// Billable Hours
billableHours = SUM(
  timesheets.payItems[i].payItemHours
) WHERE payItems[i].payItemCode IN ['HRLY', 'OVT15', 'OVT20', 'SalaryHrs']

// Non-Billable Hours
nonBillableHours = SUM(
  timesheets.payItems[i].payItemHours
) WHERE payItems[i].payItemCode NOT IN billable_codes AND NOT IN pto_codes

// PTO Hours
ptoHours = SUM(
  timesheets.payItems[i].payItemHours
) WHERE payItems[i].payItemCode IN ['PTO', 'HOL', 'FLTHOL', 'BER']
```

### Utilization Calculations

```javascript
// Employee Utilization
employeeUtilization = (billableHours / totalHours) * 100

// Capacity Utilization
capacityUtilization = (totalHours / (weeklyCapacityHours * numberOfWeeks)) * 100

// Department Utilization
deptUtilization = (deptBillableHours / deptTotalHours) * 100
```

### Budget Calculations

```javascript
// Budget Utilization
budgetUtilization = (actualSpend / budgetAmount) * 100

// Remaining Budget
remainingBudget = budgetAmount - actualSpend

// Budget Variance
budgetVariance = actualSpend - budgetAmount

// Budget Variance Percentage
budgetVariancePercent = ((actualSpend - budgetAmount) / budgetAmount) * 100
```

### Profitability Calculations

```javascript
// Gross Profit
grossProfit = revenue - directCosts

// Profit Margin
profitMargin = (grossProfit / revenue) * 100

// Labor Efficiency
laborEfficiency = revenue / laborCosts
```

### Aging Calculations

```javascript
// Days Outstanding
daysOutstanding = (TODAY - dueDate) / (24 * 60 * 60 * 1000)

// Aging Category
agingCategory =
  if (daysOutstanding <= 30) return '0-30'
  else if (daysOutstanding <= 60) return '31-60'
  else if (daysOutstanding <= 90) return '61-90'
  else return '90+'
```

### Trend Calculations

```javascript
// Period-over-Period Growth
growthRate = ((currentPeriod - previousPeriod) / previousPeriod) * 100

// Moving Average (3-period)
movingAverage = (period1 + period2 + period3) / 3

// Compound Growth Rate
CAGR = ((endValue / startValue) ^ (1 / numberOfPeriods)) - 1
```

---

## Implementation Notes

### Data Consistency

All reports rely on the authoritative data structures defined in [src/types/index.ts](../src/types/index.ts). Any deviations from these structures are considered bugs.

### Reference Resolution

Collections use **FlexibleReference** types, which can be:
- Firestore DocumentReferences
- String IDs

Report processors must use `extractId()` from [document-reference-utils.ts](../src/lib/document-reference-utils.ts) to safely extract IDs.

### Nested Data Access

Several collections contain nested arrays:
- `invoices.invoiceItems[]`
- `invoices.uploadedFiles[]`
- `invoices.history[]`
- `cti_timesheets.payItems[]`
- `cti_timesheets.labors[]`
- `projects.assignedCompanies[]`
- `projects.assignedCompanies[].assignedEmployees[]`
- `projects.assignedCompanies[].assignedServices[]`

Reports must iterate through these arrays when aggregating data.

### Date Handling

Different collections use different date fields:
- **invoices**: `createdAt`, `dueDate`, `approvedAt`
- **cti_timesheets**: `timecardDate`
- **projects**: `createdAt`
- **contracts**: `contractEffectiveDate`
- **payment_tracking**: `paymentDate`, `dueDate`

Filters apply the appropriate date field based on the collection.

### Performance Considerations

1. **Index Requirements**: Reports that filter by date ranges and multiple fields require composite indexes
2. **Query Limits**: Large reports may need pagination (current limit: 100 records)
3. **Aggregations**: Complex aggregations may benefit from pre-computed fields
4. **Caching**: Frequently accessed reports should consider caching strategies

### Security and Permissions

Reports respect user roles:
- **Admin**: All reports, all data
- **Prime (Internal)**: All reports, all data
- **Subconsultant**: Limited to their own company's data

---

## Summary

This documentation provides a complete mapping of:

- **23 Report Templates** across 5 categories
- **11 Firestore Collections** with detailed field mappings
- **Nested data structures** in invoices, timesheets, and projects
- **40+ formulas** for calculations and aggregations
- **Data relationships** between collections
- **Implementation guidance** for accurate reporting

All reports are designed to provide accurate, fully-functional insights without assumptions. Each report's data sources, formulas, and purposes are clearly documented to ensure developers and stakeholders understand exactly how data flows through the reporting system.

---

**Document Version**: 1.0
**Last Updated**: December 7, 2025
**Maintained By**: Development Team
**Review Cycle**: Quarterly or upon schema changes
