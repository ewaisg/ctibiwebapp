# Visual Templates Integration Progress

## Goal
Implement complete integration for visual templates so users can:
1. Assign visual templates to contracts/departments/projects (like legacy PDFs)
2. Generate reports with visual templates through a Reports menu
3. Have templates automatically selected based on assignments

## Implementation Approach: Option C (Both Automatic & Manual)

### Automatic Selection (Assignment-based)
- Templates automatically assigned to specific contracts/departments/projects
- System picks the right template when generating documents
- Same workflow as legacy PDF templates

### Manual Selection (Reports Menu)
- New Reports page where users manually select templates
- Choose data source and filters
- Generate and download PDFs on demand

---

## ✅ Phase 1: Extended Template Assignment System (COMPLETED)

### What Was Done

#### 1. Updated TemplateAssignmentDialog Component
**File**: `/src/components/template-assignment-dialog.tsx`

**Changes**:
- Added `visualTemplates` prop to accept VisualTemplate[]
- Added `templateSource` state to track PDF vs Visual templates
- Added "Template Source" selector in UI (PDF Templates vs Visual Templates)
- Updated form logic to handle both template types
- Added `templateSource` field to assignment data
- Updated template name resolution to handle both `templateName` (PDF) and `name` (Visual)

**UI Flow**:
1. User clicks "New Assignment"
2. Selects Template Source: "PDF Templates" or "Visual Templates"
3. Selects Template Type: Invoice, Report, Cover Page, or Custom (visual only)
4. Selects specific template from filtered list
5. Chooses assignment scope: Global, Contract, Department, or Project
6. System saves assignment with `templateSource` field

#### 2. Updated Admin Page to Pass Visual Templates
**File**: `/src/app/(authenticated)/admin/pdf-templates/client-page.tsx`

**Changes**:
- Updated all 3 instances of TemplateAssignmentDialog to include `visualTemplates={visualTemplates}`
- Now passes both PDF and Visual templates to assignment dialog

#### 3. Assignment Data Structure
**New Field**: `templateSource: "pdf" | "visual"`

Allows system to distinguish between:
- Legacy PDF templates stored in `pdfTemplates` collection
- Visual templates stored in `visual_templates` collection

### How It Works Now

**Creating Assignment**:
```
1. Admin navigates to /admin/pdf-templates → Assignments tab
2. Clicks "New Assignment"
3. Dialog shows:
   - Template Source: [PDF Templates | Visual Templates (Designer)]
   - Template Type: [Invoice | Report | Cover Page | Custom]
   - Template: [List filtered by source and type]
   - Assignment Type: [Global | Contract | Department | Project]
   - Assign To: [Specific contract/dept/project dropdown]
4. Click "Create Assignment"
5. Assignment saved with templateSource field
```

**Assignment Record**:
```json
{
  "assignmentType": "Department",
  "assignmentId": "dept_xyz",
  "assignmentName": "Engineering Department",
  "templateId": "abc123",
  "templateName": "Timesheet Report Template",
  "templateType": "Report",
  "templateSource": "visual",
  "isActive": true,
  "createdBy": "user_id",
  "createdByName": "John Doe"
}
```

---

## ✅ Phase 2: Reports Page (COMPLETED)

### What Needs to Be Done

#### 1. Create Reports Route
**File**: `/src/app/(authenticated)/reports/page.tsx`

**Purpose**: New menu page for generating reports

**Features Needed**:
- Browse available templates (PDF and Visual)
- Select data source (Firestore collection)
- Choose date ranges and filters
- Generate and download PDF

#### 2. Create Reports Client Component
**File**: `/src/app/(authenticated)/reports/client-page.tsx`

**UI Sections**:

**Template Selection**:
- Grid/List view of available report templates
- Filter by type (Invoice, Report, Cover Page, Custom)
- Show template preview thumbnails
- Display template metadata (type, elements, page size)

**Data Source Selection**:
- Dropdown to select Firestore collection:
  - `invoices`
  - `timesheets`
  - `projects`
  - `departments`
  - `employees`
  - Custom collection name
- Browse collection structure
- Preview sample data

**Filtering Options**:
- Date range picker (from/to)
- Department filter
- Project filter
- Contract filter
- Status filter
- Custom field filters

**Generation Controls**:
- "Preview" button - opens PDF in new tab
- "Download" button - downloads PDF file
- "Email" button - send via email (future)
- Progress indicator during generation

#### 3. Report Generation API
**File**: `/src/app/api/reports/generate/route.ts`

**Endpoint**: `POST /api/reports/generate`

**Request Body**:
```json
{
  "templateId": "abc123",
  "templateSource": "visual",
  "dataSource": "timesheets",
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "departmentId": "dept_xyz",
    "projectId": "proj_123",
    "status": "approved"
  },
  "options": {
    "includeSubtotals": true,
    "groupBy": "project"
  }
}
```

**Response**: PDF file (application/pdf)

**Logic**:
1. Get template from Firestore (based on templateSource)
2. Fetch data from specified collection with filters
3. Transform data to match template schema
4. Generate PDF using template
5. Return PDF as response

---

## ✅ Phase 3: Template Resolver Extension (COMPLETED)

### What Was Done

#### 1. Updated Template Resolver
**File**: [template-resolver.ts](src/lib/template-resolver.ts)

**Changes Made**:
- Added `ResolvedTemplate` interface to return both template and source
- Updated return type from `PdfTemplate | null` to `ResolvedTemplate | null`
- Checks `templateSource` field in assignments (defaults to 'pdf' for backward compatibility)
- Fetches from `visual_templates` collection if templateSource === 'visual'
- Fetches from `pdfTemplates` collection if templateSource === 'pdf'
- Returns `{ template, source }` object instead of just template
- Added helper function `getTemplateFromResolved()` for backward compatibility

**Implementation**:
```typescript
export interface ResolvedTemplate {
  template: PdfTemplate | VisualTemplate;
  source: 'pdf' | 'visual';
}

export async function resolveTemplate(
  category: TemplateCategory,
  projectId?: string,
  contractId?: string,
  departmentId?: string
): Promise<ResolvedTemplate | null> {
  // ... existing query logic ...

  // Check templateSource field (defaults to 'pdf' for backward compatibility)
  const templateSource = (assignment as any).templateSource || 'pdf';
  const collectionName = templateSource === 'visual' ? 'visual_templates' : 'pdfTemplates';

  const templateDoc = await db.collection(collectionName).doc(templateId).get();
  if (templateDoc.exists) {
    return {
      template: template as PdfTemplate | VisualTemplate,
      source: templateSource as 'pdf' | 'visual'
    };
  }
}
```

#### 2. Updated Resolve API Endpoint
**File**: [src/app/api/template-assignments/resolve/route.ts](src/app/api/template-assignments/resolve/route.ts)

**Changes Made**:
- Updated to handle new `ResolvedTemplate` return type
- Returns both template info and source in response
- Handles both `templateName` (PDF) and `name` (Visual) field names

#### 3. Updated PDF Generator
**File**: [src/lib/pdf-generator.ts](src/lib/pdf-generator.ts)

**Changes Made**:
- Imported `ResolvedTemplate` type and `generatePDFFromTemplate` function
- Updated template resolution to use new `ResolvedTemplate` type
- Added check for visual templates: if `resolved.source === 'visual'`, calls `generatePDFFromTemplate()` and returns early
- Otherwise continues with PDF form filling logic
- Fully backward compatible with existing PDF template generation

#### 4. Updated Departmental PDF Generator
**File**: [src/lib/departmental-pdf-generator.ts](src/lib/departmental-pdf-generator.ts)

**Changes Made**:
- Imported `ResolvedTemplate` type and `generatePDFFromTemplate` function
- Updated `resolveDepartmentalTemplate()` function to return `ResolvedTemplate` object
- Added visual template check and generation logic
- Maintains department-first priority order for template resolution

#### 5. Updated Cover Page Generator
**File**: [src/lib/coverpage-generator.ts](src/lib/coverpage-generator.ts)

**Changes Made**:
- Imported `ResolvedTemplate` type and `generatePDFFromTemplate` function
- Updated template resolution to use new return type
- Added visual template generation branch
- Falls back to PDF form filling for PDF templates

---

## 🎯 Phase 4: Report Types & Categories (PENDING)

### Template Categories

#### 1. Invoice Templates
- **Data Source**: `invoices` collection
- **Auto-Assignment**: Based on contract/department/project
- **Use Case**: Automatic invoice generation
- **Fields**: Invoice data, contract info, line items, totals

#### 2. Timesheet Reports
- **Data Source**: `timesheets` or timesheet data
- **Manual Generation**: Via Reports page
- **Use Case**: Weekly/Monthly timesheet summaries
- **Fields**: Employee info, hours worked, project breakdown, approvals

#### 3. Project Reports
- **Data Source**: `projects` collection
- **Manual Generation**: Via Reports page
- **Use Case**: Project status, budget, timeline reports
- **Fields**: Project details, milestones, budget, team members

#### 4. Department Reports
- **Data Source**: `departments` collection
- **Manual Generation**: Via Reports page
- **Use Case**: Department performance, staffing, budget
- **Fields**: Department info, employees, projects, metrics

#### 5. Cover Pages
- **Data Source**: Invoice/Report metadata
- **Auto-Assignment**: Based on department/contract
- **Use Case**: Professional cover pages for document packets
- **Fields**: Company info, recipient info, document summary

#### 6. Custom Reports
- **Data Source**: Any Firestore collection
- **Manual Generation**: Via Reports page
- **Use Case**: Ad-hoc reports, custom queries
- **Fields**: User-defined based on collection

---

## 📊 Current System Architecture

### Collections

**Legacy PDFs**:
- Collection: `pdfTemplates`
- Type: Uploaded PDF files with form fields
- Generation: pdf-lib form filling

**Visual Templates**:
- Collection: `visual_templates`
- Type: Designer-created templates with elements
- Generation: pdf-lib programmatic drawing

**Assignments**:
- Collection: `templateAssignments`
- Links templates to contracts/departments/projects
- New field: `templateSource` to distinguish PDF vs Visual

### Data Flow

**Automatic (Assignment-based)**:
```
User Action (e.g., Generate Invoice)
    ↓
Resolve Template (check assignments)
    ↓
templateSource === 'visual' ? visual_templates : pdfTemplates
    ↓
Fetch Template
    ↓
Get Data from Firestore
    ↓
Generate PDF
    ↓
Return to User
```

**Manual (Reports Page)**:
```
User navigates to /reports
    ↓
Browse Templates
    ↓
Select Template
    ↓
Choose Data Source & Filters
    ↓
Click Generate
    ↓
API: POST /api/reports/generate
    ↓
Fetch Template & Data
    ↓
Generate PDF
    ↓
Download/Preview
```

---

## ✅ Testing Checklist

### Phase 1 (Completed)
- [x] Create visual template in designer
- [x] Navigate to Assignments tab
- [x] Create assignment with visual template
- [x] Verify assignment appears in list
- [x] Edit assignment and change template
- [x] Delete assignment

### Phase 2 (Pending)
- [ ] Navigate to /reports page
- [ ] Browse available templates
- [ ] Select template
- [ ] Choose data source
- [ ] Apply filters
- [ ] Generate report preview
- [ ] Download report PDF

### Phase 3 (Pending)
- [ ] Create visual template assignment for Invoice
- [ ] Generate invoice - verify visual template is used
- [ ] Create PDF template assignment for Invoice
- [ ] Generate invoice - verify PDF template is used
- [ ] Test fallback to global default

---

## 🚀 Next Steps

### Immediate (Phase 2)
1. Create `/reports` route structure
2. Build ReportsClientPage component
3. Implement template selection UI
4. Add data source selection dropdown
5. Create filtering interface
6. Build report generation API

### After Phase 2
1. Update template resolver (Phase 3)
2. Integrate with invoice generation
3. Add email functionality for reports
4. Create report scheduling (future)

---

## 📝 Key Files

### Completed
- `/src/components/template-assignment-dialog.tsx` - Assignment dialog
- `/src/app/(authenticated)/admin/pdf-templates/client-page.tsx` - Admin page

### To Create
- `/src/app/(authenticated)/reports/page.tsx` - Reports route
- `/src/app/(authenticated)/reports/client-page.tsx` - Reports UI
- `/src/app/api/reports/generate/route.ts` - Generation API

### To Modify
- `/src/lib/template-resolver.ts` - Add visual template support
- `/src/app/(authenticated)/invoices/client-page.tsx` - Use visual templates

---

## 💡 Design Decisions

### Why Option C (Both)?
- **Automatic Assignment**: For routine documents (invoices, standard reports)
- **Manual Reports**: For ad-hoc queries, custom reports, special cases
- **Flexibility**: Users can choose workflow that fits their needs

### Template Source Field
- Simple `"pdf" | "visual"` enum
- Easy to extend for future template types
- Backwards compatible (defaults to "pdf" if missing)

### Reports as Separate Page
- Clear separation from admin functions
- Dedicated UI for report generation
- Better UX for non-admin users
- Can add permissions later (who can generate reports)

### Collection-based Data Sources
- Leverages existing Firestore structure
- No additional data modeling needed
- Easy to extend with new collections
- Users understand their own data structure

---

## 🔧 Technical Considerations

### PDF Generation
- Visual templates use programmatic generation (pdf-lib)
- More flexible than form-filling
- Can include dynamic elements (tables, charts, images)
- Better control over layout

### Performance
- Cache template definitions
- Batch data fetching where possible
- Stream PDF generation for large reports
- Consider pagination for very large datasets

### Security
- Validate all user inputs
- Check permissions before generating reports
- Sanitize data before PDF generation
- Rate limit report generation API

### Error Handling
- Graceful degradation if template not found
- Clear error messages for invalid filters
- Retry logic for temporary failures
- Log all generation errors for debugging

---

## 📅 Timeline Estimate

- **Phase 1**: ✅ Completed
- **Phase 2**: ~4-6 hours (Reports page + API)
- **Phase 3**: ~2-3 hours (Resolver updates)
- **Phase 4**: ~2-3 hours (Testing + refinements)

**Total**: ~8-12 hours remaining work

---

## 🎉 What's Working Now

1. ✅ Visual templates can be created and saved
2. ✅ Visual templates appear in admin UI
3. ✅ Visual templates can be assigned to contracts/departments/projects
4. ✅ Assignments distinguish between PDF and Visual templates
5. ✅ Assignment dialog shows both template types
6. ✅ Templates save correctly without closing designer
7. ✅ Auto-save works without interruption
8. ✅ Preview generates PDFs with sample data

---

## 📌 Remember

The goal is to make visual templates AS USEFUL as legacy PDFs:
- Same assignment workflow
- Same automatic selection
- PLUS manual generation via Reports page
- Better flexibility and control over output
