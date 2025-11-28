# Template Systems Testing Guide

## Overview

Your CTI BI Web App now has **TWO template systems** for different purposes:

### 1. **Invoice Templates** (Existing - in Admin Panel)
- Location: `/admin` → "PDF Templates" tab
- Purpose: Simple invoice template configuration
- Type: `InvoiceTemplate` (from types)
- Collection: `invoice_templates`
- Features: Basic template management

### 2. **PDF Template Manager** (NEW - Phase 1)
- Location: `/admin/templates` (separate page)
- Purpose: Advanced PDF form field mapping system
- Type: `PdfTemplate` (from types)
- Collection: `pdfTemplates`
- Features: Field detection, mapping, assignments

---

## System Comparison

| Feature | Invoice Templates (Existing) | PDF Template Manager (NEW) |
|---------|----------------------------|---------------------------|
| **Access** | Admin Panel → PDF Templates tab | Sidebar → Templates link |
| **Purpose** | Simple invoice templates | Advanced PDF field mapping |
| **Field Detection** | ❌ No | ✅ Yes - Auto-detects PDF form fields |
| **Field Mapping** | ❌ No | ✅ Yes - Map to Invoice/Project/Contract data |
| **Assignments** | Basic | Advanced (Project/Dept/Contract/Global) |
| **Preview** | ❌ No | 🔄 Coming in Phase 2 |
| **Use Case** | Quick invoice templates | Complex forms with data mapping |

---

## Complete Testing Checklist

### Part 1: Admin Panel - PDF Templates Tab (Existing System)

#### Access & Navigation
- [ ] Navigate to `/admin`
- [ ] Click "PDF Templates" tab
- [ ] Page loads without errors
- [ ] See two sub-tabs: "Templates" and "Assignments"

#### Templates Tab (Existing)
- [ ] Click "Templates" sub-tab
- [ ] See list of existing invoice templates (if any)
- [ ] Click "Upload New Template" button
- [ ] Dialog opens for uploading
- [ ] Can select PDF file
- [ ] Can enter template name and type
- [ ] Can upload successfully
- [ ] Template appears in list
- [ ] Can delete template (dropdown menu → Delete)

#### Assignments Tab (Existing)
- [ ] Click "Assignments" sub-tab
- [ ] See list of template assignments
- [ ] Can create new assignment
- [ ] Can assign template to project/contract/department
- [ ] Can edit existing assignment
- [ ] Can delete assignment

---

### Part 2: Template Manager - NEW System (Phase 1)

#### Access & Navigation
- [ ] Look in sidebar navigation
- [ ] See "Templates" link under Admin section (with FileType icon)
- [ ] Click "Templates" in sidebar
- [ ] Navigate to `/admin/templates`
- [ ] Page loads successfully
- [ ] See "PDF Template Manager" heading
- [ ] See description: "Upload, configure, and manage PDF templates"

#### Templates Tab
- [ ] See two main tabs: "Templates" and "Assignments"
- [ ] "Templates" tab is active by default
- [ ] See "Upload Template" button in top-right

#### Upload New Template
- [ ] Click "Upload Template" button
- [ ] Dialog opens with drag & drop area
- [ ] **Test drag & drop:**
  - [ ] Drag a PDF file over the area
  - [ ] Border changes to blue/highlighted
  - [ ] Drop the file
  - [ ] File name appears
  - [ ] File size shows in KB
  - [ ] Detected fields count shows (if PDF has form fields)
- [ ] **Test file picker:**
  - [ ] Click "Choose PDF File" button
  - [ ] File picker opens
  - [ ] Select a PDF file
  - [ ] File appears in preview
- [ ] **Test form fields:**
  - [ ] Template Name auto-filled from filename
  - [ ] Can edit Template Name
  - [ ] Can select Template Type (Invoice/CoverPage/Report/Custom)
  - [ ] Can enter Version (defaults to 1.0.0)
  - [ ] Can enter Description
- [ ] **Test detected fields:**
  - [ ] If PDF has form fields, see "Detected Form Fields" box
  - [ ] See field count and field names
  - [ ] Field names shown in gray pills
- [ ] **Test upload:**
  - [ ] Click "Upload Template" button
  - [ ] Loading state shows
  - [ ] Success toast appears
  - [ ] Dialog closes
  - [ ] New template appears in grid

#### Template List View
- [ ] Templates display in grid (3 columns on desktop)
- [ ] Each template card shows:
  - [ ] FileText icon
  - [ ] Template type badge (colored)
  - [ ] Template name as title
  - [ ] Description
  - [ ] Field count
  - [ ] Creation date
  - [ ] Version number
  - [ ] Edit button
  - [ ] Delete button (trash icon)

#### Search & Filter
- [ ] **Test search:**
  - [ ] Type in search box
  - [ ] Results filter in real-time
  - [ ] Try partial matches
  - [ ] Clear search shows all
- [ ] **Test type filter:**
  - [ ] Click "All Types" dropdown
  - [ ] Select "Invoice"
  - [ ] Only Invoice templates show
  - [ ] Try other types
  - [ ] Return to "All Types"

#### Edit Template - Field Mapping
- [ ] Click "Edit" on any template
- [ ] Dialog opens full-screen (max-w-6xl)
- [ ] See title: "Edit Template: [name]"
- [ ] See "Field Mappings" interface

#### Unmapped Fields Section
- [ ] If template has unmapped fields:
  - [ ] See orange warning box at top
  - [ ] Title: "Unmapped Fields"
  - [ ] Description explains what to do
  - [ ] Each field shows as button with "+" icon
  - [ ] Click a field button
  - [ ] Field moves to mapped section

#### Field Mapping Editor
- [ ] See mapped fields in grid format (4 columns)
- [ ] Each mapping row shows:
  - [ ] PDF Field name (gray, read-only)
  - [ ] Data Source dropdown
  - [ ] Field dropdown
  - [ ] Required toggle + Delete button

#### Test Data Source Selection
- [ ] Click "Data Source" dropdown
- [ ] See options:
  - [ ] Invoice
  - [ ] Project
  - [ ] Contract
  - [ ] Department
  - [ ] Company
  - [ ] Manual Entry
- [ ] Select "Invoice"
- [ ] Field dropdown becomes enabled

#### Test Field Selection
- [ ] After selecting data source
- [ ] Click "Field" dropdown
- [ ] See fields for that source (e.g., invoiceNumber, fromDate, etc.)
- [ ] Select a field
- [ ] Mapping is complete

#### Test Required Toggle
- [ ] Click Required toggle switch
- [ ] Toggle turns on/off
- [ ] Visual feedback shows state

#### Test Relationship Path
- [ ] Select "Project" as data source
- [ ] See "Relationship Path" section below
- [ ] Shows: "invoice → project → [field]"
- [ ] Same for Contract, Department, Company

#### Test Delete Mapping
- [ ] Click trash icon on a mapping
- [ ] Mapping row disappears
- [ ] Field returns to unmapped section

#### Test Save Mappings
- [ ] Make some mapping changes
- [ ] Click "Save Mappings" button
- [ ] Button shows loading state
- [ ] Success toast appears
- [ ] Mappings persist
- [ ] Close dialog and reopen
- [ ] Mappings still there

#### Mapping Summary
- [ ] See summary at bottom showing:
  - [ ] X / Y fields mapped
  - [ ] X required
  - [ ] X complete

#### Delete Template
- [ ] From template list
- [ ] Click trash icon on a card
- [ ] Confirmation dialog appears
- [ ] Dialog warns about assignments
- [ ] Click "Cancel" - nothing happens
- [ ] Click trash icon again
- [ ] Click "Delete" - template removes
- [ ] Success feedback
- [ ] Template gone from list

#### Empty States
- [ ] **No templates:**
  - [ ] If no templates exist
  - [ ] See empty state card
  - [ ] FileText icon
  - [ ] "No Templates Found" message
  - [ ] Helpful text
- [ ] **No search results:**
  - [ ] Search for non-existent template
  - [ ] See "No Templates Found"
  - [ ] "Try adjusting your filters" message

#### Assignments Tab (NEW System)
- [ ] Click "Assignments" tab
- [ ] See "Template Assignments" card
- [ ] See "New Assignment" button
- [ ] Currently shows: "Assignment management coming soon..."
- [ ] (This will be built in Phase 2)

---

## Edge Cases & Error Handling

### Upload Errors
- [ ] **Wrong file type:**
  - [ ] Try uploading .docx or .jpg
  - [ ] See error toast: "Please upload a PDF file"
- [ ] **No file selected:**
  - [ ] Click "Upload Template" without file
  - [ ] See error toast: "No file selected"
- [ ] **Missing template name:**
  - [ ] Upload file but clear name
  - [ ] Click upload
  - [ ] See error: "Template name required"

### Field Detection
- [ ] **PDF without form fields:**
  - [ ] Upload a regular PDF (no form fields)
  - [ ] Shows "Detected 0 form fields"
  - [ ] Can still upload
  - [ ] Can manually add mappings
- [ ] **PDF with form fields:**
  - [ ] Upload PDF with fillable fields
  - [ ] Shows field count > 0
  - [ ] Field names display correctly

### Mapping Validation
- [ ] **Incomplete mapping:**
  - [ ] Add mapping but don't select source
  - [ ] Dropdown shows "Select source..."
  - [ ] Field dropdown disabled
- [ ] **Save with unmapped fields:**
  - [ ] Leave some fields unmapped
  - [ ] Can still save
  - [ ] Orange warning persists

### Performance
- [ ] **Large PDF:**
  - [ ] Upload 5MB+ PDF
  - [ ] Upload shows progress
  - [ ] Completes successfully
- [ ] **Many templates:**
  - [ ] With 20+ templates
  - [ ] Grid renders smoothly
  - [ ] Search still fast
  - [ ] Filtering responsive

---

## Data Verification

### Firebase Collections

#### Check `pdfTemplates` Collection:
```
Go to Firebase Console → Firestore
Look for collection: pdfTemplates
Each document should have:
- templateName: string
- templateType: 'Invoice' | 'CoverPage' | 'Report' | 'Custom'
- description: string
- version: string
- base64Data: string (long)
- fileName: string
- fileSize: number
- detectedFields: string[]
- fieldMappings: array of objects
- isActive: boolean
- createdAt: timestamp
- createdBy: string
- createdByName: string
```

#### Check Field Mappings Structure:
```javascript
fieldMappings: [
  {
    fieldName: "invoice_number",
    sourceCollection: "invoice",
    sourceField: "invoiceNumber",
    isRequired: true
  },
  // ... more mappings
]
```

---

## Browser Console Tests

### Test API Endpoints
Open browser console and check:

#### 1. Upload Endpoint:
```javascript
// Watch Network tab
// POST /api/templates/upload
// Should return: { id, templateName, ... }
```

#### 2. Field Detection:
```javascript
// POST /api/templates/detect-fields
// Should return: { fields: [], count: number }
```

#### 3. Update Mappings:
```javascript
// POST /api/templates/update-mappings
// Should return: { success: true }
```

#### 4. Delete Template:
```javascript
// DELETE /api/templates/delete
// Should return: { success: true }
```

### Check for Errors
- [ ] No console errors on page load
- [ ] No console errors on template upload
- [ ] No console errors on field mapping
- [ ] No console errors on save
- [ ] No network errors (404, 500, etc.)

---

## Comparison Testing

### Test Both Systems Side-by-Side

1. **Upload to existing system:**
   - [ ] Go to `/admin` → PDF Templates tab
   - [ ] Upload a template
   - [ ] Note the process

2. **Upload to new system:**
   - [ ] Go to `/admin/templates`
   - [ ] Upload same template
   - [ ] Compare the experience

3. **Verify isolation:**
   - [ ] Templates in old system don't appear in new system
   - [ ] Templates in new system don't appear in old system
   - [ ] Both systems work independently

---

## Recommended Test Scenarios

### Scenario 1: Basic Invoice Template
```
1. Upload standard invoice PDF with fields:
   - invoice_number
   - invoice_date
   - total
   - project_name
2. Map to Invoice and Project data
3. Mark invoice_number and total as required
4. Save mappings
5. Verify in Firebase
```

### Scenario 2: Complex Multi-Source Template
```
1. Upload form with fields from multiple sources:
   - invoice_number → Invoice
   - project_name → Project
   - contract_number → Contract
   - department_name → Department
2. Map all fields
3. Verify relationship paths display
4. Save and verify
```

### Scenario 3: Template Without Form Fields
```
1. Upload regular PDF (non-form)
2. See "0 form fields detected"
3. Still able to create template
4. Manually add field names in editor
5. Map to data sources
```

---

## Known Limitations (Expected Behavior)

- ❌ Template preview not yet available (Phase 2)
- ❌ Cannot test PDF generation yet (Phase 2)
- ❌ Assignment management basic (Phase 2)
- ❌ No computed fields (Phase 2)
- ❌ No conditional fields (Phase 2)
- ❌ Manual entry fields not fully implemented
- ⚠️ Two template systems exist (by design - different use cases)

---

## Success Criteria

### Minimum Viable Test (Quick Check)
- ✅ Can access `/admin/templates`
- ✅ Can upload a PDF
- ✅ Can see detected fields (if PDF has forms)
- ✅ Can add field mapping
- ✅ Can save mappings
- ✅ Can search/filter templates
- ✅ Can delete template

### Complete Test (Full Validation)
All checkboxes above marked ✅

---

## Troubleshooting

### "Templates" link not visible
- Ensure logged in as Admin
- Check `canAccessAdmin` permission
- Try logging out and back in
- Clear browser cache

### Build errors
- Check browser console
- Verify all imports are correct
- Run `npm run build` locally
- Check for TypeScript errors

### Upload fails
- Check file is valid PDF
- Verify file size < 10MB
- Check Firebase storage rules
- Look at Network tab for errors

### Field detection returns 0
- PDF may not have form fields
- This is expected for regular PDFs
- You can still use the template
- Fields can be added manually

### Mappings not saving
- Check browser console for errors
- Verify Firebase permissions
- Check network requests
- Try refreshing the page

---

## Next Steps After Testing

1. ✅ Report any bugs or issues
2. ✅ Note any confusing UX
3. ✅ Suggest improvements
4. 🔄 Move to Phase 2 (Preview, Assignments, Generation)

---

## Questions to Consider

While testing, think about:
1. Should we merge the two template systems?
2. Which system do you prefer for your workflow?
3. What features from the old system should we add to the new?
4. What's missing that you need?
5. How intuitive is the field mapping interface?

---

## Support

If you encounter issues:
1. Check this guide first
2. Review browser console
3. Check Firebase console
4. Check `TEMPLATE_MANAGER_README.md`
5. Check `TEMPLATE_FIELD_MAPPING_GUIDE.md`
6. Report specific error messages

---

**Good luck testing! 🚀**
