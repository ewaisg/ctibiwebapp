# Template Field Mapping Guide

## Understanding Field Mappings

Field mappings connect PDF form fields to your data sources. When generating a PDF, the system:
1. Loads your template
2. Fetches data from mapped sources
3. Fills PDF fields with the data
4. Returns the completed PDF

## Data Source Collections

### 1. Invoice Collection
Direct access to invoice data.

**Available Fields:**
```typescript
- invoiceNumber: "INV-2024-001"
- contractNumber: "CTR-001"
- poNumber: "PO-12345"
- pmisNumber: "PMIS-567"
- fromDate: Date
- toDate: Date
- dueDate: Date
- termOfWeek: "Week ending 12/31/2023"
- approvingSupervisor: "John Doe"
- subtotal: 10000.00
- total: 10500.00
- notes: "Additional notes..."
```

**Example Mapping:**
```
PDF Field: invoice_number
↓
Data Source: Invoice
↓
Field: invoiceNumber
↓
Output: "INV-2024-001"
```

### 2. Project Collection
Access to project information through invoice relationship.

**Available Fields:**
```typescript
- projectName: "Downtown Development"
- projectManager: "Jane Smith"
- poNumber: "PO-12345"
- pmisNumber: "PMIS-567"
- remainingPoAmount: 50000.00
- remainingHours: 240
```

**Relationship Path:**
```
Invoice → projectId → Project Document
```

**Example Mapping:**
```
PDF Field: project_name
↓
Data Source: Project
↓
Field: projectName
↓
Output: "Downtown Development"
```

### 3. Contract Collection
Access to contract details through project relationship.

**Available Fields:**
```typescript
- contractNumber: "CTR-001"
- contractTitle: "Master Services Agreement"
- effectiveDate: Date
- expirationDate: Date
- totalValue: 1000000.00
```

**Relationship Path:**
```
Invoice → Project → contractId → Contract Document
```

### 4. Department Collection
Access to department information.

**Available Fields:**
```typescript
- departmentName: "Engineering"
- departmentCode: "ENG"
```

**Relationship Path:**
```
Invoice → Project → departmentId → Department Document
```

### 5. Company Collection
Access to company information.

**Available Fields:**
```typescript
- companyName: "ABC Consulting"
- address: "123 Main St"
- phone: "(555) 123-4567"
- email: "contact@abc.com"
```

**Usage:** Typically for invoice items, mapped through assigned companies.

### 6. Manual Entry
User-provided data at generation time.

**Use Cases:**
- One-time values
- User signatures
- Custom notes
- Dynamic content

## Common Mapping Patterns

### Pattern 1: Invoice Header
```
PDF Fields → Invoice Data

invoice_number → Invoice.invoiceNumber
po_number → Invoice.poNumber
invoice_date → Invoice.fromDate
due_date → Invoice.dueDate
```

### Pattern 2: Project Information
```
PDF Fields → Project Data

project_name → Project.projectName
project_manager → Project.projectManager
pmis_number → Project.pmisNumber
remaining_budget → Project.remainingPoAmount
```

### Pattern 3: Billing Period
```
PDF Fields → Invoice Data

period_from → Invoice.fromDate
period_to → Invoice.toDate
term_of_week → Invoice.termOfWeek
```

### Pattern 4: Totals
```
PDF Fields → Invoice Data

subtotal → Invoice.subtotal
tax → [Computed from subtotal]
total → Invoice.total
```

## Field Naming Conventions

### PDF Form Field Names
Your PDF form fields can use any naming convention, but we recommend:

**Recommended:**
- `invoice_number` (snake_case)
- `projectName` (camelCase)
- `Project Name` (spaces, auto-converted)

**Avoid:**
- Special characters: `invoice#number`
- Leading numbers: `1invoice`
- Reserved words: `class`, `type`, `id`

### Auto-Mapping Suggestions

The system will suggest mappings based on field name patterns:

```typescript
PDF Field Name → Suggested Mapping

// Invoice patterns
invoice_number → Invoice.invoiceNumber
invoice_no → Invoice.invoiceNumber
inv_num → Invoice.invoiceNumber

// Date patterns
from_date → Invoice.fromDate
start_date → Invoice.fromDate
period_start → Invoice.fromDate

// Project patterns
project_name → Project.projectName
proj_name → Project.projectName
project → Project.projectName

// Amount patterns
total → Invoice.total
amount → Invoice.total
sum → Invoice.total
```

## Required vs Optional Fields

### Required Fields
- Must have data when generating PDF
- Generation fails if empty
- Use for critical fields: invoice number, dates, amounts

**Example:**
```
✅ Required
invoice_number → Invoice.invoiceNumber
total → Invoice.total

❌ Not Required
notes → Invoice.notes
special_instructions → Invoice.notes
```

### Optional Fields
- Can be empty
- PDF generated with blank values
- Use for supplementary information

## Cross-Collection Lookups

The system automatically resolves relationships:

### Example 1: Getting Contract Number
```
Your PDF: contract_number
Your Data: Invoice has projectId → Project has contractId → Contract has contractNumber

Mapping:
PDF Field: contract_number
Source: Contract
Field: contractNumber

System automatically:
1. Gets projectId from invoice
2. Loads project document
3. Gets contractId from project
4. Loads contract document
5. Returns contractNumber
```

### Example 2: Getting Department Name
```
Your PDF: department
Your Data: Invoice → Project → Department

Mapping:
PDF Field: department
Source: Department
Field: departmentName

System resolves: Invoice → Project → Department → departmentName
```

## Testing Your Mappings

### 1. Use Sample Data
Upload a template and map all fields, then:
```
1. Click "Preview" (Phase 2)
2. Select "Use Sample Data"
3. Review generated PDF
4. Verify all fields filled correctly
```

### 2. Use Real Invoice
Test with actual invoice data:
```
1. Go to specific invoice
2. Click "Generate PDF"
3. Select your template
4. Review output
```

### 3. Check for Empty Fields
Common issues:
- Missing required field data
- Incorrect relationship paths
- Typos in field names

## Advanced Mapping (Phase 2)

### Computed Fields
```
PDF Field: tax_amount
Mapping: Computed
Formula: subtotal * 0.08
```

### Conditional Fields
```
PDF Field: rush_fee
Mapping: Conditional
Condition: invoice.priority === 'rush'
Value: 500.00
Default: 0.00
```

### Formatted Fields
```
PDF Field: invoice_date
Mapping: Invoice.fromDate
Format: MM/DD/YYYY (instead of ISO string)
```

### Aggregated Fields
```
PDF Field: total_hours
Mapping: Aggregation
Source: Invoice.invoiceItems
Operation: SUM(hours)
```

## Troubleshooting

### Field Not Filling
1. ✅ Check field name matches PDF form field
2. ✅ Verify source collection is correct
3. ✅ Ensure data exists in source
4. ✅ Check relationship path is valid

### Wrong Data Appearing
1. ✅ Verify source field selection
2. ✅ Check if using correct collection
3. ✅ Review relationship resolution

### PDF Generation Fails
1. ✅ Check required fields all mapped
2. ✅ Verify all mapped data exists
3. ✅ Test with minimal mappings first
4. ✅ Review error logs

## Best Practices

### 1. Start Simple
```
✅ Map critical fields first:
   - Invoice number
   - Dates
   - Total amount

❌ Don't map everything at once
```

### 2. Use Consistent Naming
```
✅ invoice_number, invoice_date, invoice_total
❌ invNum, date1, amt
```

### 3. Test Incrementally
```
✅ Add 5 mappings → Test → Add 5 more
❌ Map all 50 fields → Test once
```

### 4. Document Custom Mappings
```
✅ Add description in template notes
✅ Keep mapping guide document
❌ Rely on memory
```

### 5. Version Your Templates
```
✅ v1.0.0 → v1.1.0 when adding fields
✅ Keep old versions for history
❌ Overwrite existing templates
```

## Example: Complete Invoice Template

### PDF Form Fields
```
invoice_header:
- invoice_number
- invoice_date
- due_date
- po_number

project_info:
- project_name
- project_manager
- contract_number

billing_period:
- period_from
- period_to
- term_of_week

amounts:
- subtotal
- tax
- total

footer:
- supervisor_name
- notes
```

### Field Mappings
```typescript
{
  // Header
  { fieldName: "invoice_number", source: "invoice", field: "invoiceNumber", required: true },
  { fieldName: "invoice_date", source: "invoice", field: "fromDate", required: true },
  { fieldName: "due_date", source: "invoice", field: "dueDate", required: true },
  { fieldName: "po_number", source: "invoice", field: "poNumber", required: true },

  // Project
  { fieldName: "project_name", source: "project", field: "projectName", required: true },
  { fieldName: "project_manager", source: "project", field: "projectManager", required: false },
  { fieldName: "contract_number", source: "contract", field: "contractNumber", required: true },

  // Billing Period
  { fieldName: "period_from", source: "invoice", field: "fromDate", required: true },
  { fieldName: "period_to", source: "invoice", field: "toDate", required: true },
  { fieldName: "term_of_week", source: "invoice", field: "termOfWeek", required: false },

  // Amounts
  { fieldName: "subtotal", source: "invoice", field: "subtotal", required: true },
  { fieldName: "tax", source: "computed", formula: "subtotal * 0.08", required: false },
  { fieldName: "total", source: "invoice", field: "total", required: true },

  // Footer
  { fieldName: "supervisor_name", source: "invoice", field: "approvingSupervisor", required: false },
  { fieldName: "notes", source: "invoice", field: "notes", required: false }
}
```

This maps all PDF fields to appropriate data sources with proper required flags.
