# Visual PDF Template Designer - Implementation Plan

## Overview
Build a drag-and-drop visual template designer that allows users to create professional PDF templates without coding.

---

## Technology Stack

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Canvas | Fabric.js | 5.3.0 | Drawing and manipulation |
| Templates | Handlebars.js | 4.7.8 | Data binding syntax |
| PDF Export | pdf-lib | 1.17.1 | PDF generation (existing) |
| Storage | Firestore | - | Template persistence (existing) |
| UI Framework | React + shadcn/ui | - | Component library (existing) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Toolbox    │  │    Canvas    │  │  Properties  │      │
│  │  (Elements)  │  │  (Fabric.js) │  │    Panel     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Template Engine                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Template JSON                                       │   │
│  │  {                                                   │   │
│  │    elements: [                                       │   │
│  │      { type: 'text', x, y, text: '{{fieldName}}' }  │   │
│  │      { type: 'table', x, y, dataSource: '{{list}}' }│   │
│  │    ]                                                 │   │
│  │  }                                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (Firestore)                      │
│  Collection: pdfTemplates                                    │
│  Collection: templateAssignments                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### PdfTemplate (Visual Template)
```typescript
interface PdfTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'report' | 'cover-page' | 'custom';
  category: 'visual' | 'uploaded'; // NEW: distinguish from uploaded PDFs

  // Page settings
  pageSize: 'letter' | 'legal' | 'a4';
  orientation: 'portrait' | 'landscape';
  width: number;  // in points (1/72 inch)
  height: number; // in points

  // Template content
  elements: TemplateElement[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  isActive: boolean;

  // Preview
  thumbnailUrl?: string;
}
```

### TemplateElement
```typescript
type TemplateElement =
  | TextElement
  | ImageElement
  | TableElement
  | ShapeElement
  | PageBreakElement;

interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface TextElement extends BaseElement {
  type: 'text';
  text: string;  // Can include {{dataBind}}
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

interface ImageElement extends BaseElement {
  type: 'image';
  imageUrl: string;
  imageType: 'logo' | 'signature' | 'custom';
  preserveAspectRatio: boolean;
}

interface TableElement extends BaseElement {
  type: 'table';
  dataSource: string; // e.g., '{{invoiceItems}}'
  columns: TableColumn[];
  headerStyle: CellStyle;
  rowStyle: CellStyle;
  alternateRowStyle?: CellStyle;
  showBorders: boolean;
  borderColor: string;
  borderWidth: number;
}

interface TableColumn {
  header: string;
  field: string;  // e.g., '{{item.name}}'
  width: number;
  align: 'left' | 'center' | 'right';
}

interface CellStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  backgroundColor: string;
  padding: number;
}

interface ShapeElement extends BaseElement {
  type: 'line' | 'rectangle' | 'circle';
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
}

interface PageBreakElement extends BaseElement {
  type: 'pageBreak';
  // Forces a new page at this position
}
```

---

## Component Structure

```
src/components/template-designer/
├── TemplateDesignerDialog.tsx       # Main modal container
├── DesignerCanvas.tsx                # Fabric.js canvas wrapper
├── ElementToolbox.tsx                # Draggable elements sidebar
├── PropertyPanel.tsx                 # Element properties editor
├── DataBindingPanel.tsx              # Data field selector
├── TemplatePreview.tsx               # Live preview with sample data
├── hooks/
│   ├── useCanvas.ts                  # Canvas state management
│   ├── useTemplateElements.ts        # Element CRUD operations
│   └── useDataBinding.ts             # Data binding logic
└── utils/
    ├── fabric-helpers.ts             # Fabric.js utilities
    ├── template-serializer.ts        # JSON <-> Canvas conversion
    └── pdf-generator.ts              # Template -> PDF converter
```

---

## Implementation Phases

### **Phase 1: Foundation** (Day 1)
✅ Install dependencies (Fabric.js, Handlebars)
✅ Create data models
✅ Set up Firestore collections
✅ Create basic dialog structure

### **Phase 2: Canvas** (Day 2)
- Initialize Fabric.js canvas
- Implement pan and zoom
- Add grid and rulers
- Element selection and manipulation
- Undo/redo stack

### **Phase 3: Toolbox** (Day 3)
- Create element library
- Implement drag-and-drop
- Add element to canvas
- Basic element types (text, image, line)

### **Phase 4: Properties Panel** (Day 4)
- Element property editor
- Style controls (font, color, size)
- Position and size inputs
- Delete and duplicate

### **Phase 5: Data Binding** (Day 5)
- Data source configuration
- Field selector dropdown
- Handlebars syntax validation
- Preview with sample data

### **Phase 6: Tables** (Day 6)
- Table element creation
- Column configuration
- Row template editor
- Dynamic row generation

### **Phase 7: Save/Load** (Day 7)
- Serialize canvas to JSON
- Save template to Firestore
- Load template from Firestore
- Template library/gallery

### **Phase 8: PDF Generation** (Day 8)
- Parse template JSON
- Apply data to template
- Convert to PDF using pdf-lib
- Handle multi-page templates

### **Phase 9: Integration** (Day 9)
- Integrate with report generation
- Template selection in dialogs
- Replace hardcoded PDFs
- Migration path

### **Phase 10: Polish** (Day 10)
- Keyboard shortcuts
- Alignment guides
- Snap to grid
- Export/import templates
- Documentation

---

## Data Binding Syntax

Using Handlebars.js for flexibility:

### Simple Field
```
{{departmentName}}
{{invoice.total}}
```

### Conditional
```
{{#if invoice.isPaid}}Paid{{else}}Unpaid{{/if}}
```

### Loops (Tables)
```
{{#each invoiceItems}}
  {{name}} - {{amount}}
{{/each}}
```

### Helpers
```
{{formatCurrency invoice.total}}
{{formatDate invoice.date}}
```

---

## Available Data Fields

### Invoice Template
```javascript
{
  invoice: {
    number: string,
    date: Date,
    dueDate: Date,
    total: number,
    subtotal: number,
    tax: number
  },
  project: {
    name: string,
    poNumber: string,
    manager: string
  },
  company: {
    name: string,
    address: string,
    phone: string
  },
  items: [
    {
      description: string,
      quantity: number,
      rate: number,
      amount: number
    }
  ]
}
```

### Report Templates
```javascript
{
  department: {
    name: string,
    code: string
  },
  contract: {
    number: string,
    name: string
  },
  reportDate: Date,
  projects: [...],
  totals: {...}
}
```

---

## User Workflow

### Creating a New Template

1. Click "Design Template" button
2. Select template type (Invoice, Report, Cover Page, Custom)
3. Choose page size and orientation
4. **Design:**
   - Drag elements from toolbox to canvas
   - Position and resize elements
   - Edit properties (font, color, etc.)
   - Bind data fields using {{syntax}}
   - Add tables with column configuration
5. **Preview:**
   - Click "Preview" to see with sample data
   - Adjust as needed
6. **Save:**
   - Name the template
   - Save to library

### Using a Template

1. Go to invoice/report generation
2. Select "Use Template" option
3. Choose from template library
4. Template is applied with live data
5. PDF is generated

---

## Migration Strategy

### Existing Templates
- Keep uploaded PDF templates as-is
- Add `category: 'uploaded'` flag
- Visual templates have `category: 'visual'`
- Both work side-by-side

### Gradual Adoption
1. **Week 1:** Launch visual designer
2. **Week 2:** Create visual versions of common templates
3. **Week 3:** User training and feedback
4. **Week 4:** Migrate power users
5. **Week 5+:** Phase out uploaded templates (optional)

---

## Success Metrics

- ✅ Template creation time < 15 minutes
- ✅ No code required for customization
- ✅ 90%+ of use cases covered
- ✅ PDF generation < 2 seconds
- ✅ Mobile-friendly editor
- ✅ Templates reusable across reports

---

## Next Steps

1. ✅ Install Fabric.js: `npm install fabric@5.3.0`
2. ✅ Install types: `npm install @types/fabric --save-dev`
3. ✅ Install Handlebars: `npm install handlebars`
4. Create TemplateDesignerDialog component
5. Implement basic canvas
6. Build toolbox
7. Add property panel
8. Integrate data binding

---

## Resources

- [Fabric.js Documentation](http://fabricjs.com/docs/)
- [Handlebars.js Guide](https://handlebarsjs.com/guide/)
- [pdf-lib Examples](https://pdf-lib.js.org/)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)

---

*Last Updated: 2025-12-01*
*Implementation Status: Planning Complete, Ready to Build*
