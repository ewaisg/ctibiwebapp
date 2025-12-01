# Template Designer Enhancements

## New Features Added

### 1. Firestore Data Browser 🔍

**Location:** Left sidebar "Browse" tab

**Features:**
- Browse actual Firestore collections (invoices, projects, employees, etc.)
- View real field structure from sample documents
- See example values for each field
- Search functionality to find fields quickly
- Click any field to insert `{{fieldPath}}` binding
- Automatic insertion into selected text elements
- Nested object and array support

**How it Works:**
- Select a collection from the dropdown
- Browse the field tree with real data examples
- Click on any field to insert it
- If a text element is selected, the binding is inserted directly
- Otherwise, it's copied to clipboard

**API Endpoint:** `/api/firestore/structure?collection=collectionName`

### 2. Image Upload 📸

**Location:** Property Panel when image element is selected

**Features:**
- Drag & drop or click to upload images
- Upload to Firebase Storage automatically
- Preview uploaded images
- Support for PNG, JPG, GIF formats
- Max file size: 5MB
- Images stored in `template-images/` folder
- Public URLs generated automatically
- Option to use URL or data binding instead

**How it Works:**
- Add an image element to canvas
- Select the image element
- Click upload area in property panel
- Image uploads to Firebase Storage
- URL is automatically set on the element
- Can still use manual URLs or `{{fieldName}}` bindings

**API Endpoint:** `/api/upload/image`

### 3. Enhanced Left Sidebar Tabs

The left sidebar now has 3 tabs:
1. **Elements** - Drag & drop element library (existing)
2. **Browse** - Firestore data browser (NEW)
3. **Schema** - Data binding schema reference (existing)

## Files Created

### Frontend Components
- `/src/components/template-designer/FirestoreDataBrowser.tsx` - Data browser component
- `/src/components/template-designer/ImageUploader.tsx` - Image upload component

### Backend APIs
- `/src/app/api/firestore/structure/route.ts` - Collection structure endpoint
- `/src/app/api/upload/image/route.ts` - Image upload endpoint

### Modified Files
- `/src/components/template-designer/TemplateDesignerDialog.tsx` - Added Browse tab and field selection handler
- `/src/components/template-designer/PropertyPanel.tsx` - Integrated ImageUploader

## User Benefits

### Non-Technical Users
✅ No need to memorize field names
✅ No need to type `{{}}` syntax manually
✅ See real data examples before selecting fields
✅ Upload images without knowing Firebase Storage
✅ Visual, click-based workflow

### Technical Users
✅ Still have full control with manual field entry
✅ Can use data binding expressions
✅ Can use external image URLs
✅ Full schema reference still available

## Usage Examples

### Example 1: Adding Invoice Number
1. Add a text element to canvas
2. Select the text element
3. Click "Browse" tab in left sidebar
4. Select "invoices" collection
5. Click on "invoiceNumber" field
6. Field binding `{{invoiceNumber}}` is inserted automatically

### Example 2: Adding Company Logo
1. Add an image element to canvas
2. Select the image element
3. In property panel, click upload area
4. Select logo file from computer
5. Image uploads and URL is set automatically
6. Logo appears on canvas

### Example 3: Table with Items
1. Add a table element to canvas
2. Click "Browse" tab
3. Select "invoices" collection
4. Expand "items" array field
5. Click on "description", "quantity", "amount" to set table columns

## Technical Details

### Firestore Structure API
```typescript
GET /api/firestore/structure?collection=invoices
Response: {
  name: "invoices",
  fields: [
    {
      name: "invoiceNumber",
      type: "string",
      value: "INV-2025-001"
    },
    {
      name: "items",
      type: "array<object>",
      children: [...]
    }
  ]
}
```

### Image Upload API
```typescript
POST /api/upload/image
Body: FormData {
  file: File,
  folder: "template-images"
}
Response: {
  success: true,
  url: "https://storage.googleapis.com/bucket/template-images/123-logo.png",
  filename: "template-images/123-logo.png"
}
```

## Security

- All endpoints use `withAuth` middleware
- Rate limiting applied via `withRateLimit`
- File type validation (images only)
- File size validation (5MB max)
- Firebase Storage ACL: public read access
- Firestore: read-only access to structure

## Future Enhancements

- [ ] Image cropping/resizing before upload
- [ ] Bulk field insertion for tables
- [ ] Custom data source connections
- [ ] Template variables/constants
- [ ] Conditional field rendering
- [ ] Field transformations (formatters)
