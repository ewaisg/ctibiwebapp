# Visual Templates Display Fix

## Issue Summary

Templates were saving successfully to Firestore (HTTP 200 responses) but weren't appearing in the admin UI at `/admin/pdf-templates`. The designer would close after save, and users couldn't see their saved templates.

## Root Cause

The admin page was only fetching from `/api/pdf-templates` (legacy PDF templates) but not from `/api/visual-templates` (new visual designer templates). These are two separate systems:

- **Legacy System**: PDF templates uploaded as files (`pdf_templates` collection)
- **Visual System**: Templates created with the visual designer (`visual_templates` collection)

## Changes Made

### 1. Updated Data Fetching in `client-page.tsx`

**File**: `/src/app/(authenticated)/admin/pdf-templates/client-page.tsx`

#### Added State for Visual Templates
```typescript
const [visualTemplates, setVisualTemplates] = useState<VisualTemplate[]>([]);
```

#### Updated `loadData()` Function
Changed from fetching 2 endpoints to 3 endpoints:

```typescript
const fetchTriplet = async () => {
  return Promise.all([
    secureRequest('/api/pdf-templates'),        // Legacy PDF templates
    secureRequest('/api/visual-templates'),     // NEW: Visual templates
    secureRequest('/api/template-assignments')
  ] as const);
};
```

Added parsing for visual templates response:
```typescript
if (visualTemplatesRes.ok) {
  const rawVT = await visualTemplatesRes.json();
  const listVT = Array.isArray(rawVT?.items) ? rawVT.items : (Array.isArray(rawVT) ? rawVT : []);
  setVisualTemplates(listVT as unknown as VisualTemplate[]);
}
```

### 2. Added Visual Template Management Functions

#### Delete Visual Template
```typescript
const deleteVisualTemplate = async (templateId: string) => {
  if (!confirm('Are you sure you want to delete this visual template?')) return;

  try {
    const response = await secureRequest(`/api/visual-templates/${templateId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      loadData();
    }
  } catch (error) {
    console.error('Error deleting visual template:', error);
    alert('Failed to delete template. Please try again.');
  }
};
```

#### Preview Visual Template
```typescript
const previewVisualTemplate = async (templateId: string) => {
  try {
    const response = await secureRequest(`/api/visual-templates/${templateId}/generate-pdf`, {
      method: 'GET'
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Error previewing visual template:', error);
    alert('Failed to preview template. Please try again.');
  }
};
```

#### Edit Visual Template
```typescript
const editVisualTemplate = (template: VisualTemplate) => {
  setEditingTemplate(template);
  setDesignerOpen(true);
};
```

### 3. Added Visual Templates UI Section

Added a new section in the Templates tab to display visual templates separately from uploaded PDF templates:

```tsx
{/* Visual Templates Section */}
<div className="flex justify-between items-center">
  <h3 className="text-lg font-medium">Visual Templates</h3>
  <Button variant="outline" onClick={handleOpenDesigner}>
    <Edit className="mr-2 h-4 w-4" />
    Design New Template
  </Button>
</div>

{visualTemplates.length === 0 ? (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-12">
      <Edit className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Visual Templates Yet</h3>
      <p className="text-muted-foreground text-center mb-4">
        Design your first visual template using our drag-and-drop designer.
      </p>
      <Button onClick={handleOpenDesigner}>
        <Plus className="mr-2 h-4 w-4" />
        Create First Visual Template
      </Button>
    </CardContent>
  </Card>
) : (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {visualTemplates.map((template) => (
      <Card key={template.id}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <Badge variant={template.isActive ? "default" : "secondary"}>
              {template.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription>
            {template.type} • {template.elements.length} elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => editVisualTemplate(template)}>
              <Edit className="mr-2 h-3 w-3" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => previewVisualTemplate(template.id)}>
              <Eye className="mr-2 h-3 w-3" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={() => deleteVisualTemplate(template.id)}>
              <Trash2 className="mr-2 h-3 w-3" />
              Delete
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {template.pageSize} • {template.orientation}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)}
```

### 4. Updated Template Saved Handler

Changed to properly await data reload:
```typescript
const handleTemplateSaved = async (template: VisualTemplate) => {
  console.log('Template saved:', template);
  await loadData();
};
```

## How It Works Now

1. **Save Template**: User designs and saves a template via the Template Designer
2. **API Call**: Template is saved to Firestore via `POST /api/visual-templates`
3. **Callback**: `onTemplateSaved` callback is triggered
4. **Reload Data**: `loadData()` fetches from 3 endpoints including `/api/visual-templates`
5. **Update UI**: Visual templates state is updated, triggering re-render
6. **Display**: Templates appear in the "Visual Templates" section with Edit, Preview, and Delete buttons

## UI Layout

The Templates tab now has two sections:

### Visual Templates Section
- Shows templates created with the visual designer
- Displays: Name, Type, Element Count, Page Size, Orientation
- Actions: Edit, Preview, Delete
- Empty state with "Create First Visual Template" button

### Uploaded PDF Templates Section
- Shows legacy PDF templates uploaded as files
- Displays: Name, Type, Field Mappings Count
- Actions: Preview, Delete
- Empty state with "Upload First Template" button

## Verification Steps

1. Navigate to `/admin/pdf-templates`
2. Click "Design New Template" button
3. Design a template with elements
4. Add a name and click Save
5. Template should now appear in the "Visual Templates" section
6. Click Edit to modify the template
7. Click Preview to generate and view PDF
8. Click Delete to remove the template

## API Endpoints Used

- `GET /api/visual-templates` - Fetch all visual templates
- `POST /api/visual-templates` - Create/update visual template
- `GET /api/visual-templates/[templateId]` - Get specific template
- `DELETE /api/visual-templates/[templateId]` - Delete template
- `GET /api/visual-templates/[templateId]/generate-pdf` - Preview template
- `POST /api/visual-templates/[templateId]/generate-pdf` - Generate PDF with data

## Related Files

- `/src/app/(authenticated)/admin/pdf-templates/client-page.tsx` - Main UI component
- `/src/components/template-designer/TemplateDesignerDialog.tsx` - Template designer
- `/src/app/api/visual-templates/route.ts` - GET/POST endpoints
- `/src/app/api/visual-templates/[templateId]/route.ts` - GET/DELETE endpoints
- `/src/app/api/visual-templates/[templateId]/generate-pdf/route.ts` - PDF generation
- `/src/lib/visual-template-firestore.ts` - Firestore operations

## Next Steps

The visual templates are now properly displayed in the UI. Future enhancements could include:

1. **Filtering**: Filter templates by type (invoice, report, cover-page, custom)
2. **Sorting**: Sort by name, date created, date modified
3. **Search**: Search templates by name
4. **Duplicate**: Add duplicate template functionality
5. **Bulk Actions**: Select multiple templates for bulk operations
6. **Template Preview Cards**: Show thumbnail previews of templates
7. **Usage Stats**: Show which templates are assigned to contracts/departments
