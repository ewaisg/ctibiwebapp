# PDF Field Mapper

## Overview

The PDF Field Mapper is a tool for mapping PDF form fields to data sources without designing templates from scratch. Instead of using a visual designer, you:

1. **Upload existing PDF forms** (that already have the design/layout)
2. **Visually map fields** - see the PDF and click on fields to map them
3. **Configure tables** - specify which fields are table columns
4. **Use with existing fill logic** - your current PDF filling code still works

## Why This Approach?

**Previous Approach (Visual Designer)**:
- Build templates element by element (text, rectangles, images)
- Complex, time-consuming
- Hard to match existing designs

**New Approach (Field Mapper)**:
- Use your existing PDF forms
- Just map fields to data
- Much simpler and faster

## How It Works

### 1. Upload PDF Form

```typescript
// User uploads PDF file
const file = event.target.files[0];

// System extracts all form fields using pdf-lib
const fields = extractFields(pdfFile);
// Returns: [
//   { name: "invoiceNumber", type: "text", page: 0, rect: {...} },
//   { name: "dueDate", type: "text", page: 0, rect: {...} },
//   ...
// ]
```

### 2. Visual Field Mapping

The PDF is displayed with field overlays:

```
┌─────────────────────────────────────┐
│  INVOICE                            │
│                                     │
│  ┌────────────┐  (blue overlay)    │
│  │invoiceNumber│ ← Click to map    │
│  └────────────┘                     │
│                                     │
│  ┌────────────┐  (green overlay)   │
│  │  dueDate   │ ← Already mapped   │
│  └────────────┘                     │
└─────────────────────────────────────┘
```

Click a field → Map to data:
- `invoiceNumber` → `invoice.invoiceNumber`
- `dueDate` → `invoice.dueDate`
- `projectName` → `project.projectName`

### 3. Table Configuration

For repeating data (like invoice line items):

```typescript
{
  name: "Invoice Line Items",
  dataPath: "invoice.invoiceItems",  // Array in your data
  startRow: 1,
  maxRows: 10,
  columns: [
    {
      pdfFieldPattern: "Item_Description_{row}",
      dataPath: "description"
    },
    {
      pdfFieldPattern: "Item_Hours_{row}",
      dataPath: "hours"
    },
    {
      pdfFieldPattern: "Item_Amount_{row}",
      dataPath: "amount"
    }
  ]
}
```

This maps:
- `Item_Description_1` ← `invoiceItems[0].description`
- `Item_Hours_1` ← `invoiceItems[0].hours`
- `Item_Amount_1` ← `invoiceItems[0].amount`
- `Item_Description_2` ← `invoiceItems[1].description`
- etc.

### 4. PDF Generation

Use your existing fill logic with new mappings:

```typescript
// Load template
const template = await getMappedTemplate(templateId);

// Get invoice data
const data = await getInvoice(invoiceId);

// Fill PDF using mappings
for (const mapping of template.fieldMappings) {
  const value = getNestedValue(data, mapping.dataPath);

  // Apply transforms
  const transformedValue = applyTransform(value, mapping.transform, mapping.format);

  // Fill field
  form.getTextField(mapping.pdfFieldName).setText(transformedValue);
}

// Fill tables
for (const table of template.tableMappings) {
  const arrayData = getNestedValue(data, table.dataPath);

  for (let i = 0; i < Math.min(arrayData.length, table.maxRows); i++) {
    for (const column of table.columns) {
      const fieldName = column.pdfFieldPattern.replace('{row}', String(i + 1));
      const value = arrayData[i][column.dataPath];
      form.getTextField(fieldName).setText(value);
    }
  }
}
```

## Data Structures

### PdfFieldInfo
Extracted from PDF:
```typescript
interface PdfFieldInfo {
  name: string;                    // Field name from PDF
  type: 'text' | 'checkbox' | ...; // Field type
  rect?: { x, y, width, height };  // Position on page
  page: number;                    // Page number
  defaultValue?: string;
  options?: string[];              // For dropdowns
  required?: boolean;
  readOnly?: boolean;
}
```

### FieldMapping
Maps PDF field to data:
```typescript
interface FieldMapping {
  pdfFieldName: string;            // PDF field name
  dataPath: string;                // Data path (e.g., "invoice.invoiceNumber")
  transform?: 'date' | 'currency' | ...; // Optional transform
  format?: string;                 // Format string (e.g., "MM/dd/yyyy")
  defaultValue?: string;           // Fallback value
}
```

### TableMapping
Maps array data to table fields:
```typescript
interface TableMapping {
  id: string;
  name: string;
  dataPath: string;                // Array path (e.g., "invoice.invoiceItems")
  startRow: number;                // Starting row index
  maxRows: number;                 // Max rows to fill
  columns: TableColumnMapping[];
}

interface TableColumnMapping {
  pdfFieldPattern: string;         // Pattern with {row} placeholder
  dataPath: string;                // Field in array item
  transform?: ...;
  format?: string;
}
```

### MappedPdfTemplate
Complete template:
```typescript
interface MappedPdfTemplate {
  id?: string;
  templateName: string;
  templateType: 'Invoice' | 'Report' | 'CoverPage' | 'Custom';

  // PDF storage
  base64Data?: string;
  storageUrl?: string;

  // Extracted fields
  pdfFields: PdfFieldInfo[];

  // Mappings
  fieldMappings: FieldMapping[];
  tableMappings: TableMapping[];

  // Data source
  dataSource: {
    primaryCollection: string;     // e.g., "invoices"
    requiredRelations?: string[];  // e.g., ["project", "contract"]
  };

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  pageCount?: number;
  pageSize?: { width: number; height: number };
}
```

## API Endpoints

### Extract Fields from PDF
```
POST /api/pdf-templates/extract-fields
Content-Type: multipart/form-data

Body:
- pdf: File (PDF file)

Response:
{
  fields: PdfFieldInfo[],
  metadata: {
    pageCount: number,
    pageSize: { width, height },
    totalFields: number
  }
}
```

### Save Mapped Template
```
POST /api/pdf-templates/mapped
Content-Type: application/json

Body: MappedPdfTemplate

Response: MappedPdfTemplate (with ID)
```

### List Mapped Templates
```
GET /api/pdf-templates/mapped

Response:
{
  templates: MappedPdfTemplate[]
}
```

### Update Mapped Template
```
PUT /api/pdf-templates/mapped
Content-Type: application/json

Body: MappedPdfTemplate (with ID)

Response: MappedPdfTemplate
```

### Delete Mapped Template
```
DELETE /api/pdf-templates/mapped?id={templateId}

Response:
{
  success: boolean
}
```

## Components

### PdfFieldMapper
Main component for creating/editing mapped templates:
```typescript
<PdfFieldMapper
  templateId={optionalTemplateId}
  onSave={(template) => console.log('Saved:', template)}
  onCancel={() => router.back()}
/>
```

### PdfViewer
Displays PDF with field overlays:
```typescript
<PdfViewer
  pdfUrl={blobUrl}
  fields={extractedFields}
  mappedFields={fieldNames}
  onFieldClick={(field) => openMappingDialog(field)}
/>
```

### FieldMappingDialog
Dialog for mapping individual fields:
```typescript
<FieldMappingDialog
  field={selectedField}
  existingMapping={currentMapping}
  dataSource="invoices"
  onSave={(mapping) => saveMapping(mapping)}
  onClose={() => setDialogOpen(false)}
/>
```

### TableMappingDialog
Dialog for configuring table mappings:
```typescript
<TableMappingDialog
  fields={allFields}
  dataSource="invoices"
  existingTable={currentTable}
  onSave={(table) => saveTable(table)}
  onClose={() => setDialogOpen(false)}
/>
```

## Integration with Existing System

### Template Resolution
The mapped templates work alongside existing PDF templates:

```typescript
// In template-resolver.ts
const resolved = await resolveTemplate('Invoice', projectId, contractId, departmentId);

if (resolved.source === 'mapped') {
  // Use field mapper logic
  const mappedTemplate = resolved.template as MappedPdfTemplate;
  return fillPdfWithMappings(mappedTemplate, data);
} else if (resolved.source === 'visual') {
  // Use visual template logic
  return generatePDFFromTemplate(resolved.template, data);
} else {
  // Use legacy PDF template logic
  return fillPdfTemplate(resolved.template, data);
}
```

### Template Assignment
Mapped templates can be assigned just like other templates:

```typescript
// In template-assignment-dialog.tsx
<Select value={templateSource} onValueChange={setTemplateSource}>
  <SelectItem value="pdf">PDF Templates (Legacy)</SelectItem>
  <SelectItem value="visual">Visual Templates (Designer)</SelectItem>
  <SelectItem value="mapped">Mapped Templates (Field Mapper)</SelectItem>
</Select>
```

## Usage Example

### Step 1: Create Mapped Template

1. Navigate to Admin → PDF Templates
2. Click "Create Mapped Template"
3. Upload your existing invoice PDF form
4. System extracts 25 fields
5. Click on each field to map:
   - `invoiceNumber` → `invoice.invoiceNumber`
   - `invoiceDate` → `invoice.invoiceDate` (format: MM/dd/yyyy)
   - `total` → `invoice.invoiceTotal` (format: currency)
6. Click "Add Table" for line items:
   - Data source: `invoice.invoiceItems`
   - Max rows: 10
   - Columns:
     - `Item_Desc_{row}` → `description`
     - `Item_Hours_{row}` → `hours`
     - `Item_Rate_{row}` → `billingRate`
     - `Item_Amount_{row}` → `amount`
7. Save template

### Step 2: Assign Template

1. Navigate to Admin → Template Assignments
2. Create new assignment:
   - Template Source: Mapped Templates
   - Template: Your new invoice template
   - Assignment Type: Project
   - Assign To: Project PO00123
3. Save assignment

### Step 3: Generate Invoice

1. Navigate to Invoicing
2. Select project PO00123
3. Click "Generate Invoice"
4. System automatically:
   - Resolves mapped template for project
   - Fetches invoice data
   - Applies field mappings
   - Fills table data
   - Returns PDF

## Advantages

1. **Reuse Existing PDFs** - No need to recreate designs
2. **Visual Mapping** - See exactly what you're mapping
3. **Table Support** - Handle repeating data easily
4. **Transform Options** - Format dates, currency, numbers
5. **Simple Integration** - Works with existing code
6. **No Handlebars** - No template syntax to learn
7. **Type Safety** - TypeScript types throughout

## Next Steps

1. **Implement fill logic** - Create function to fill PDFs using mappings
2. **Add to template resolver** - Integrate with existing resolution
3. **Update admin UI** - Add "Mapped Templates" tab
4. **Add smart suggestions** - Auto-suggest mappings based on field names
5. **Import/Export** - Share template configurations
