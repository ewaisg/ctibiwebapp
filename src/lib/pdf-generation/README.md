# PDF Generation Library

**Civil Technology Reports System**

This library provides a consistent, reusable foundation for generating PDF reports with the company's design standards.

## Features

- ✅ Consistent design tokens (colors, fonts, spacing)
- ✅ Reusable components (header, footer, tables, summaries)
- ✅ Base templates for common report types
- ✅ Blank template for custom reports
- ✅ Automatic page breaks with header/footer continuity
- ✅ Responsive table rendering
- ✅ Professional formatting utilities

## Quick Start

### Generate a Table Report

```typescript
import { generateTableReport } from '@/lib/pdf-generation';
import { formatCurrency } from '@/lib/pdf-generation';

const pdfBytes = await generateTableReport({
  title: 'REVENUE BY DEPARTMENT',
  orientation: 'portrait',
  headerInfo: {
    contractNo: 'C-2024-001',
    contractName: 'Denver Airport',
    billingPeriod: '01/01/2024 TO 01/31/2024',
  },
  summary: {
    title: 'Summary',
    items: [
      { label: 'Total Revenue', value: formatCurrency(450000), highlight: true },
      { label: 'Invoices', value: '16' },
    ],
  },
  tables: [
    {
      options: {
        columns: [
          { label: 'Department', width: 150 },
          { label: 'Revenue', width: 100, align: 'right' },
        ],
        rows: [
          ['Engineering', formatCurrency(125000)],
          ['Construction', formatCurrency(250000)],
        ],
        totals: ['TOTAL', formatCurrency(375000)],
      },
    },
  ],
});

// Return as response
return new NextResponse(Buffer.from(pdfBytes), {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="report.pdf"',
  },
});
```

### Generate a Blank Template

```typescript
import { generateBlankReport } from '@/lib/pdf-generation';

const pdfBytes = await generateBlankReport({
  title: 'CUSTOM REPORT',
  orientation: 'portrait',
  headerInfo: {
    contractNo: '______________',
    contractName: '______________',
  },
});
```

## Design Standards

### Colors

- **Primary Header**: `#505301` (dark olive) with white text
- **Secondary Header**: `#dedfea` (light blue) with black text
- **Body Text**: Black, size 9pt
- **Borders**: Black or light gray

### Typography

- **Font Family**: Helvetica
- **Font Sizes**:
  - Title: 14pt
  - Subtitle: 12pt
  - Headers: 9pt
  - Body: 9pt

### Layout

- **Margins**: 50pt (0.7 inches) on all sides
- **Logo**: 120x40pt (top left)
- **Page Sizes**: Letter (portrait: 612x792pt, landscape: 792x612pt)

## Components

### Header Component

Renders company logo, report title, and contract information.

```typescript
import { drawHeader } from '@/lib/pdf-generation';

const currentY = await drawHeader(pdfDoc, page, fonts, {
  title: 'REPORT TITLE',
  contractNo: 'C-2024-001',
  contractName: 'Project Name',
  billingPeriod: '01/01/2024 TO 01/31/2024',
});
```

### Footer Component

Renders page numbers, generation date, and confidential notice.

```typescript
import { drawFooter } from '@/lib/pdf-generation';

drawFooter(page, fonts, {
  pageNumber: 1,
  totalPages: 5,
  showGeneratedDate: true,
  showConfidential: true,
});
```

### Table Component

Renders tables with primary/secondary headers and automatic pagination.

```typescript
import { drawTable } from '@/lib/pdf-generation';

const result = await drawTable(context, {
  columns: [
    { label: 'Name', width: 150, align: 'left' },
    { label: 'Amount', width: 100, align: 'right' },
  ],
  rows: [
    ['Item 1', '$1,000.00'],
    ['Item 2', '$2,000.00'],
  ],
  totals: ['TOTAL', '$3,000.00'],
  showBorders: true,
  alternateRowColors: true,
});
```

### Summary Section Component

Renders summary boxes with key metrics.

```typescript
import { drawSummarySection } from '@/lib/pdf-generation';

const newY = drawSummarySection(page, fonts, currentY, {
  title: 'Summary',
  items: [
    { label: 'Total Revenue', value: '$450,000.00', highlight: true },
    { label: 'Total Invoices', value: '16' },
  ],
  columns: 2,
});
```

## Formatting Utilities

```typescript
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  formatNumber,
  formatHours,
} from '@/lib/pdf-generation';

formatCurrency(1234.56);        // "$1,234.56"
formatDate(new Date());          // "12/07/2024"
formatPercentage(85.5);          // "85.5%"
formatNumber(1234.56, 2);        // "1,234.56"
formatHours(8.75);               // "8.8" or "8:45" with minutes
```

## Templates

### Table Report Template

For data-heavy reports with tables (most reports).

```typescript
import { generateTableReport } from '@/lib/pdf-generation';
```

### Blank Template

For custom reports with header/footer only.

```typescript
import { generateBlankReport } from '@/lib/pdf-generation';
```

## Adding New Reports

1. **Use existing processor** from `src/lib/report-processors/`
2. **Create PDF generator** in `src/lib/pdf-generation/generators/`
3. **Use table template** or extend base template
4. **Follow design standards** for consistent look

Example:

```typescript
// src/lib/pdf-generation/generators/financial-reports.ts
import { generateTableReport } from '../templates/table-report-template';
import { formatCurrency } from '../utils/formatting';

export async function generateRevenuByDepartmentPDF(data: any, filters: any) {
  return generateTableReport({
    title: 'REVENUE BY DEPARTMENT',
    orientation: 'portrait',
    headerInfo: {
      contractNo: filters.contractId,
      billingPeriod: `${filters.dateFrom} TO ${filters.dateTo}`,
    },
    summary: {
      items: [
        { label: 'Total Revenue', value: formatCurrency(data.summary.totalRevenue) },
      ],
    },
    tables: [
      {
        options: {
          columns: [
            { label: 'Department', width: 150 },
            { label: 'Revenue', width: 100, align: 'right' },
          ],
          rows: data.items.map(item => [
            item.departmentName,
            formatCurrency(item.totalRevenue),
          ]),
        },
      },
    ],
  });
}
```

## Examples

See `src/lib/pdf-generation/examples/sample-report.ts` for complete examples:

- Table report with summary
- Blank template for custom reports

## Testing

Generate sample reports to verify design:

```typescript
import { generateSampleReport, generateBlankTemplateExample } from '@/lib/pdf-generation/examples/sample-report';

// Generate sample report
const samplePDF = await generateSampleReport();

// Generate blank template
const blankPDF = await generateBlankTemplateExample();
```

## Design Token Reference

All design constants are in `src/lib/pdf-generation/constants/design-tokens.ts`:

- `REPORT_COLORS` - Color palette
- `REPORT_TYPOGRAPHY` - Font sizes and families
- `REPORT_LAYOUT` - Margins, spacing, dimensions
- `COMPANY_INFO` - Company details

## Support

For questions or issues with PDF generation:
1. Check the examples in `examples/sample-report.ts`
2. Review design standards in `docs/reports-design-standards.md`
3. Check data mapping in `docs/reports-data-mapping.md`

---

**Version**: 1.0
**Last Updated**: December 7, 2025
**Maintained By**: Development Team
