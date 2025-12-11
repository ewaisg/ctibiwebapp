# Reports Design Standards & Implementation Plan

**Generated**: December 7, 2025
**Purpose**: Define consistent design standards and implementation plan for all reports

---

## Table of Contents

1. [Design Standards](#design-standards)
2. [Report Templates Structure](#report-templates-structure)
3. [Implementation Plan](#implementation-plan)
4. [Phase Breakdown](#phase-breakdown)
5. [Technical Architecture](#technical-architecture)

---

## Design Standards

### Brand Identity

**Company**: Civil Technology
**Logo**: Civil Technology logo (purple/blue geometric design)
**Tagline**: Integrated Project Management & Support Service/Infrastructure

**Company Address**:
```
2413 Washington Street
Denver, Colorado 80205
Tel: 303-292-0348
Fax: 303-388-9512
```

### Color Palette

```typescript
export const REPORT_COLORS = {
  // Primary header background (dark olive/military green)
  PRIMARY_HEADER_BG: '#505301',
  PRIMARY_HEADER_TEXT: '#FFFFFF', // White

  // Secondary header background (light grayish blue)
  SECONDARY_HEADER_BG: '#dedfea',
  SECONDARY_HEADER_TEXT: '#000000', // Black

  // Body content
  BODY_TEXT: '#000000',
  BODY_TEXT_LIGHT: '#333333',

  // Table borders
  BORDER_COLOR: '#000000',
  BORDER_LIGHT: '#CCCCCC',

  // Background
  PAGE_BACKGROUND: '#FFFFFF',
  TABLE_ROW_ALT: '#F9F9F9', // Optional alternating row color
};
```

### Typography

```typescript
export const REPORT_TYPOGRAPHY = {
  // Headers
  PRIMARY_HEADER: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: REPORT_COLORS.PRIMARY_HEADER_TEXT,
  },

  SECONDARY_HEADER: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: REPORT_COLORS.SECONDARY_HEADER_TEXT,
  },

  // Report title
  REPORT_TITLE: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: REPORT_COLORS.BODY_TEXT,
  },

  // Body text
  BODY: {
    fontSize: 9,
    fontWeight: 'normal',
    color: REPORT_COLORS.BODY_TEXT,
  },

  // Labels
  LABEL: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: REPORT_COLORS.BODY_TEXT,
  },

  // Font family
  FONT_FAMILY: 'Helvetica',
};
```

### Layout Standards

```typescript
export const REPORT_LAYOUT = {
  // Page margins (in points, 72 points = 1 inch)
  MARGIN_TOP: 50,
  MARGIN_BOTTOM: 50,
  MARGIN_LEFT: 50,
  MARGIN_RIGHT: 50,

  // Logo dimensions
  LOGO_WIDTH: 120,
  LOGO_HEIGHT: 40,

  // Spacing
  SECTION_SPACING: 15,
  LINE_SPACING: 12,
  HEADER_SPACING: 20,

  // Table settings
  TABLE_BORDER_WIDTH: 0.5,
  ROW_HEIGHT: 18,
  HEADER_ROW_HEIGHT: 20,
};
```

### Page Orientations by Report Category

| Report Category | Default Orientation | Rationale |
|----------------|---------------------|-----------|
| **Financial Reports** | Portrait | Typically fewer columns, detailed line items |
| **Labor Reports** | Landscape | Many columns (employee, hours, rates, projects) |
| **Project Reports** | Landscape | Budget tracking requires multiple columns |
| **Compliance Reports** | Landscape | Company breakdowns, certifications, percentages |
| **Executive Reports** | Portrait/Landscape | Mixed - use portrait for summaries, landscape for detailed tables |

---

## Report Templates Structure

### Template Types

1. **Base Template** - Common header/footer for all reports
2. **Table-Heavy Template** - For reports with large data tables
3. **Summary Template** - For executive summaries with KPIs
4. **Compliance Template** - For MWBE/DBE reports with specific fields

### Common Header Structure

Every report should include:

```
┌─────────────────────────────────────────────────────────────┐
│ [LOGO]                              [REPORT TITLE]          │
│                                                              │
│ CONTRACT NO: _____________    INVOICE NO: _____________     │
│ CONTRACT NAME: ___________    BILLING PERIOD: __________    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Common Footer Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Page X of Y                     Generated: MM/DD/YYYY       │
│ Civil Technology, Inc. - Confidential                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Overview

We will implement all 23 reports documented in `reports-data-mapping.md` with consistent design standards. The implementation will be phased to ensure quality and maintainability.

### Goals

1. ✅ **Consistent Design** - All reports use same colors, fonts, logo, layout
2. ✅ **Reusable Components** - Create shared PDF generation components
3. ✅ **Accurate Data** - All formulas and calculations verified
4. ✅ **Performance** - Optimize queries and aggregations
5. ✅ **Maintainability** - Clear code structure and documentation
6. ✅ **Extensibility** - Easy to add new reports in the future

### File Structure

```
src/
├── lib/
│   ├── pdf-generation/
│   │   ├── constants/
│   │   │   ├── design-tokens.ts          # Colors, fonts, spacing
│   │   │   └── layout-config.ts          # Page layouts, margins
│   │   ├── components/
│   │   │   ├── pdf-header.ts             # Common header component
│   │   │   ├── pdf-footer.ts             # Common footer component
│   │   │   ├── pdf-table.ts              # Table rendering component
│   │   │   ├── pdf-summary-section.ts    # Summary boxes
│   │   │   └── pdf-kpi-section.ts        # KPI cards
│   │   ├── templates/
│   │   │   ├── base-template.ts          # Base PDF template
│   │   │   ├── table-report-template.ts  # Table-heavy reports
│   │   │   ├── summary-template.ts       # Executive summaries
│   │   │   └── compliance-template.ts    # MWBE/DBE templates
│   │   ├── generators/
│   │   │   ├── financial-reports.ts      # Financial PDF generators
│   │   │   ├── labor-reports.ts          # Labor PDF generators
│   │   │   ├── project-reports.ts        # Project PDF generators
│   │   │   ├── compliance-reports.ts     # Compliance PDF generators
│   │   │   └── executive-reports.ts      # Executive PDF generators
│   │   └── utils/
│   │       ├── pdf-helpers.ts            # Helper functions
│   │       └── formatting.ts             # Number/date formatting
│   ├── report-processors/                # Existing data processors
│   │   └── ...
│   └── report-templates/                 # Existing template definitions
│       └── ...
└── public/
    └── assets/
        └── civil-technology-logo.png     # Company logo
```

---

## Phase Breakdown

### Phase 0: Foundation (Week 1)

**Objective**: Create reusable PDF generation infrastructure

#### Tasks

1. **Create Design Constants**
   - [ ] Create `design-tokens.ts` with colors, fonts
   - [ ] Create `layout-config.ts` with margins, spacing
   - [ ] Add company logo to `/public/assets/`
   - [ ] Define TypeScript interfaces for all design tokens

2. **Build Core Components**
   - [ ] `pdf-header.ts` - Renders logo, title, contract info
   - [ ] `pdf-footer.ts` - Renders page numbers, generated date
   - [ ] `pdf-table.ts` - Renders tables with primary/secondary headers
   - [ ] `pdf-summary-section.ts` - Renders summary boxes
   - [ ] `pdf-kpi-section.ts` - Renders KPI cards

3. **Create Base Templates**
   - [ ] `base-template.ts` - Basic report structure
   - [ ] `table-report-template.ts` - For data-heavy reports
   - [ ] `summary-template.ts` - For executive summaries
   - [ ] `compliance-template.ts` - For MWBE/DBE reports

4. **Helper Utilities**
   - [ ] `pdf-helpers.ts` - Common PDF operations
   - [ ] `formatting.ts` - Currency, date, percentage formatting

**Deliverables**:
- Reusable PDF generation library
- Blank template for future custom reports
- Documentation for adding new reports

**Estimated Time**: 3-5 days

---

### Phase 1: Financial Reports (Week 2)

**Objective**: Implement all 5 financial reports

#### Reports to Implement

1. **Revenue by Department**
   - Orientation: Portrait
   - Template: `table-report-template`
   - Data: invoices, departments, projects

2. **Revenue by Project**
   - Orientation: Landscape
   - Template: `table-report-template`
   - Data: invoices, projects

3. **Outstanding Invoices**
   - Orientation: Portrait
   - Template: `table-report-template`
   - Data: invoices, projects (with aging)

4. **Payment Tracking Report**
   - Orientation: Landscape
   - Template: `table-report-template`
   - Data: invoices, payment_tracking, projects, contracts

5. **Profitability Analysis**
   - Orientation: Landscape
   - Template: `summary-template` + tables
   - Data: invoices, timesheets, projects, employees

#### Tasks per Report

1. Verify data processor exists and is accurate
2. Create PDF generator using appropriate template
3. Implement data-to-PDF mapping
4. Add summary sections with KPIs
5. Test with real/sample data
6. Document any assumptions or calculations

**Deliverables**:
- 5 working financial reports
- Test suite for financial reports
- User documentation

**Estimated Time**: 5-7 days

---

### Phase 2: Labor Reports (Week 3)

**Objective**: Implement all 5 labor reports

#### Reports to Implement

6. **Direct Labor Hours by Project**
   - Orientation: Landscape
   - Template: `table-report-template`
   - Data: cti_timesheets, projects, employees

7. **Employee Utilization Report**
   - Orientation: Landscape
   - Template: `table-report-template`
   - Data: cti_timesheets, employees, departments

8. **Billable vs Non-Billable Hours**
   - Orientation: Landscape
   - Template: `table-report-template` + charts
   - Data: cti_timesheets, departments, employees

9. **Overtime Analysis**
   - Orientation: Landscape
   - Template: `table-report-template`
   - Data: cti_timesheets, employees, projects

10. **Labor Cost Analysis**
    - Orientation: Landscape
    - Template: `summary-template` + tables
    - Data: cti_timesheets, invoices, projects, employees

**Deliverables**:
- 5 working labor reports
- Test suite for labor reports
- User documentation

**Estimated Time**: 5-7 days

---

### Phase 3: Project Reports (Week 4)

**Objective**: Implement all 5 project reports

#### Reports to Implement

11. **Project Status Summary**
    - Orientation: Landscape
    - Template: `table-report-template`
    - Data: projects, invoices, contracts

12. **Budget vs Actual**
    - Orientation: Landscape
    - Template: `table-report-template` + variance charts
    - Data: projects, invoices

13. **Change Order Summary**
    - Orientation: Portrait
    - Template: `table-report-template`
    - Data: projects, contracts

14. **Project Completion Forecast**
    - Orientation: Landscape
    - Template: `summary-template` + tables
    - Data: projects, invoices, timesheets

15. **Project Hours Summary**
    - Orientation: Landscape
    - Template: `table-report-template`
    - Data: projects, timesheets, invoices

**Deliverables**:
- 5 working project reports
- Test suite for project reports
- User documentation

**Estimated Time**: 5-7 days

---

### Phase 4: Compliance Reports (Week 5)

**Objective**: Implement all 4 compliance reports

#### Reports to Implement

16. **MWBE Compliance Report**
    - Orientation: Landscape
    - Template: `compliance-template`
    - Data: invoices, projects, companies, contracts
    - **Special**: Matches existing MWBE Summary design

17. **Sub-Consultant Breakdown**
    - Orientation: Landscape
    - Template: `compliance-template`
    - Data: invoices, projects, companies

18. **DBE Participation Report**
    - Orientation: Landscape
    - Template: `compliance-template`
    - Data: invoices, projects, companies, contracts

19. **Certified Payroll Report**
    - Orientation: Landscape
    - Template: `table-report-template`
    - Data: cti_timesheets, employees, projects
    - **Special**: Weekly grouping for payroll compliance

**Deliverables**:
- 4 working compliance reports
- Test suite for compliance reports
- User documentation

**Estimated Time**: 4-6 days

---

### Phase 5: Executive Reports (Week 6)

**Objective**: Implement all 4 executive reports

#### Reports to Implement

20. **Company-Wide Summary**
    - Orientation: Portrait
    - Template: `summary-template`
    - Data: invoices, projects, timesheets, departments
    - **Special**: Heavy use of KPI cards and summary sections

21. **Key Performance Indicators**
    - Orientation: Portrait
    - Template: `summary-template`
    - Data: invoices, projects, timesheets, employees
    - **Special**: Dashboard-style KPI presentation

22. **Trend Analysis Report**
    - Orientation: Landscape
    - Template: `summary-template` + tables
    - Data: invoices, timesheets, projects (time series)
    - **Special**: Charts and trend lines

23. **Department Comparison**
    - Orientation: Landscape
    - Template: `table-report-template`
    - Data: departments, invoices, timesheets, projects
    - **Special**: Side-by-side comparison layout

**Deliverables**:
- 4 working executive reports
- Test suite for executive reports
- User documentation

**Estimated Time**: 4-6 days

---

### Phase 6: Testing & Refinement (Week 7)

**Objective**: End-to-end testing and polish

#### Tasks

1. **Comprehensive Testing**
   - [ ] Test all 23 reports with real data
   - [ ] Test edge cases (no data, large datasets)
   - [ ] Test date range filters
   - [ ] Test department/project/employee filters
   - [ ] Performance testing for large reports

2. **User Acceptance Testing**
   - [ ] Get feedback from stakeholders
   - [ ] Refine layouts based on feedback
   - [ ] Verify all calculations match expectations
   - [ ] Ensure compliance reports meet regulatory requirements

3. **Documentation**
   - [ ] User guide for generating reports
   - [ ] Developer guide for adding new reports
   - [ ] API documentation for report endpoints
   - [ ] Update reports-data-mapping.md with PDF details

4. **Performance Optimization**
   - [ ] Add Firestore indexes for common queries
   - [ ] Implement caching for frequently accessed reports
   - [ ] Optimize PDF generation for large datasets
   - [ ] Add pagination for very large reports

**Deliverables**:
- Fully tested report system
- Complete documentation
- Performance benchmarks
- User training materials

**Estimated Time**: 5-7 days

---

## Technical Architecture

### PDF Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Request                          │
│  (Select Report, Apply Filters, Click Generate)             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Route Handler                          │
│  /api/reports/generate (POST)                               │
│  - Validate inputs                                           │
│  - Get report template definition                           │
│  - Get processor function                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Processor                             │
│  (e.g., processRevenueByDepartment)                         │
│  - Fetch from Firestore with filters                        │
│  - Join related collections                                  │
│  - Calculate aggregations and formulas                       │
│  - Return structured data                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PDF Generator                              │
│  (e.g., generateRevenueByDepartmentPDF)                     │
│  - Load appropriate template                                 │
│  - Apply design tokens                                       │
│  - Render header with logo                                   │
│  - Render data tables                                        │
│  - Render summary sections                                   │
│  - Render footer with page numbers                           │
│  - Generate PDF bytes                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Response to Client                         │
│  - Content-Type: application/pdf                            │
│  - Content-Disposition: attachment/inline                    │
│  - PDF bytes in response body                                │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```typescript
// Example: Revenue by Department Report

// 1. Data Processor (already exists)
const data = await processRevenueByDepartment(filters);

// 2. PDF Generator (new)
import { createTableReport } from '@/lib/pdf-generation/templates/table-report-template';
import { REPORT_COLORS, REPORT_TYPOGRAPHY } from '@/lib/pdf-generation/constants/design-tokens';

const pdfBytes = await createTableReport({
  title: 'Revenue by Department',
  orientation: 'portrait',
  headerInfo: {
    contractNo: filters.contractId,
    billingPeriod: `${filters.dateFrom} to ${filters.dateTo}`,
  },
  summary: {
    totalRevenue: data.summary.totalRevenue,
    totalInvoices: data.summary.invoiceCount,
    departmentCount: data.summary.departmentCount,
  },
  table: {
    headers: [
      { label: 'Department', width: 150 },
      { label: 'Revenue', width: 100, align: 'right' },
      { label: 'Invoices', width: 80, align: 'right' },
      { label: 'Paid', width: 100, align: 'right' },
      { label: 'Pending', width: 100, align: 'right' },
    ],
    rows: data.items.map(item => [
      item.departmentName,
      formatCurrency(item.totalRevenue),
      item.invoiceCount.toString(),
      formatCurrency(item.paidAmount),
      formatCurrency(item.pendingAmount),
    ]),
  },
});
```

### Reusable Template Structure

```typescript
// Base Template Interface
interface BaseReportOptions {
  title: string;
  orientation: 'portrait' | 'landscape';
  headerInfo?: {
    contractNo?: string;
    contractName?: string;
    invoiceNo?: string;
    billingPeriod?: string;
    [key: string]: string | undefined;
  };
  footer?: {
    showPageNumbers?: boolean;
    showGeneratedDate?: boolean;
    customText?: string;
  };
}

// Table Report Template
interface TableReportOptions extends BaseReportOptions {
  summary?: {
    title?: string;
    items: Array<{ label: string; value: string | number }>;
  };
  table: {
    headers: Array<{ label: string; width: number; align?: 'left' | 'center' | 'right' }>;
    rows: Array<Array<string | number>>;
    totals?: Array<string | number>;
  };
}

// Summary Report Template
interface SummaryReportOptions extends BaseReportOptions {
  kpis: Array<{
    label: string;
    value: string | number;
    delta?: string;
    trend?: 'up' | 'down' | 'flat';
  }>;
  sections: Array<{
    title: string;
    content: string | Array<{ label: string; value: string }>;
  }>;
}
```

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review and approve design standards
- [ ] Obtain high-resolution logo file
- [ ] Set up development environment
- [ ] Create feature branch: `feature/reports-overhaul`

### Phase 0: Foundation

- [ ] Create design constants files
- [ ] Build PDF header component
- [ ] Build PDF footer component
- [ ] Build PDF table component
- [ ] Build PDF summary section component
- [ ] Create base templates
- [ ] Write helper utilities
- [ ] Test blank template generation

### Phase 1: Financial Reports (5 reports)

- [ ] Revenue by Department
- [ ] Revenue by Project
- [ ] Outstanding Invoices
- [ ] Payment Tracking Report
- [ ] Profitability Analysis

### Phase 2: Labor Reports (5 reports)

- [ ] Direct Labor Hours by Project
- [ ] Employee Utilization Report
- [ ] Billable vs Non-Billable Hours
- [ ] Overtime Analysis
- [ ] Labor Cost Analysis

### Phase 3: Project Reports (5 reports)

- [ ] Project Status Summary
- [ ] Budget vs Actual
- [ ] Change Order Summary
- [ ] Project Completion Forecast
- [ ] Project Hours Summary

### Phase 4: Compliance Reports (4 reports)

- [ ] MWBE Compliance Report
- [ ] Sub-Consultant Breakdown
- [ ] DBE Participation Report
- [ ] Certified Payroll Report

### Phase 5: Executive Reports (4 reports)

- [ ] Company-Wide Summary
- [ ] Key Performance Indicators
- [ ] Trend Analysis Report
- [ ] Department Comparison

### Phase 6: Testing & Refinement

- [ ] Comprehensive testing
- [ ] User acceptance testing
- [ ] Documentation complete
- [ ] Performance optimization
- [ ] Code review
- [ ] Merge to main

---

## Success Criteria

### Functional Requirements

✅ All 23 reports generate correctly with real data
✅ All filters work as expected (date, department, project, etc.)
✅ All formulas and calculations are accurate
✅ PDFs are properly formatted with consistent design
✅ Reports handle edge cases (no data, large datasets)

### Design Requirements

✅ All reports use consistent color palette
✅ All reports use consistent typography
✅ Logo appears correctly on all reports
✅ Headers and footers are consistent
✅ Tables are properly aligned and formatted

### Technical Requirements

✅ Reports generate in < 5 seconds for typical datasets
✅ Reports generate in < 30 seconds for large datasets
✅ PDF file sizes are reasonable (< 5MB for typical reports)
✅ Code is well-documented and maintainable
✅ No memory leaks or performance issues

### Documentation Requirements

✅ User guide for generating reports
✅ Developer guide for adding new reports
✅ Design standards document
✅ API documentation
✅ Test coverage documentation

---

## Timeline Summary

| Phase | Duration | Reports | Deliverables |
|-------|----------|---------|--------------|
| Phase 0: Foundation | 3-5 days | 0 | Reusable components, blank template |
| Phase 1: Financial | 5-7 days | 5 | Financial reports |
| Phase 2: Labor | 5-7 days | 5 | Labor reports |
| Phase 3: Project | 5-7 days | 5 | Project reports |
| Phase 4: Compliance | 4-6 days | 4 | Compliance reports |
| Phase 5: Executive | 4-6 days | 4 | Executive reports |
| Phase 6: Testing | 5-7 days | 0 | Documentation, testing, refinement |
| **Total** | **31-45 days** | **23** | **Complete report system** |

**Estimated Timeline**: 6-9 weeks for full implementation

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Obtain approval** for design standards
3. **Get logo file** in high resolution (PNG with transparency)
4. **Begin Phase 0** - Foundation work
5. **Set up regular check-ins** to review progress

---

## Questions for Stakeholder Review

1. Are the color schemes and typography standards approved?
2. Do we have the logo file in the required format (high-res PNG with transparency)?
3. Are there any additional report types needed beyond the 23 documented?
4. Are there specific compliance requirements for any reports (e.g., certified payroll format)?
5. What is the priority order if timeline needs to be compressed?
6. Who will be involved in user acceptance testing?

---

**Document Maintained By**: Development Team
**Review Cycle**: Weekly during implementation
**Status**: Ready for Stakeholder Review
