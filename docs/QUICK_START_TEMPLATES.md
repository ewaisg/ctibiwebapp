# Quick Start: Template Systems

## Two Systems, Different Purposes

### 📋 System 1: Invoice Templates (Existing)
**Where:** `/admin` → Click "PDF Templates" tab
**Use for:** Simple invoice template storage
**Best for:** Basic templates without complex field mapping

### 🎯 System 2: PDF Template Manager (NEW - Phase 1)
**Where:** Sidebar → Click "Templates" link
**Direct URL:** `/admin/templates`
**Use for:** Advanced PDF forms with data field mapping
**Best for:** Templates that need Invoice/Project/Contract data filled in

---

## Quick Test - 5 Minutes

### NEW System Test (Recommended First)

1. **Access:**
   ```
   Click "Templates" in sidebar
   → Should open /admin/templates
   ```

2. **Upload:**
   ```
   Click "Upload Template"
   → Drag PDF or click to browse
   → Fill: Name, Type (Invoice), Description
   → Click "Upload Template"
   → Should see template in grid
   ```

3. **Map Fields:**
   ```
   Click "Edit" on template
   → Click any unmapped field button
   → Select "Data Source" → Invoice
   → Select "Field" → invoiceNumber
   → Toggle "Required"
   → Click "Save Mappings"
   → Should see success toast
   ```

4. **Search:**
   ```
   Type in search box
   → Results filter instantly
   ```

5. **Delete:**
   ```
   Click trash icon
   → Confirm deletion
   → Template disappears
   ```

**✅ If all 5 steps work, Phase 1 is successful!**

---

## Key Differences At-a-Glance

| What | Existing System | NEW System |
|------|----------------|------------|
| **Location** | `/admin` tab | `/admin/templates` |
| **Upload** | Basic | Drag & drop + field detection |
| **Fields** | None | Auto-detects + mapping |
| **Data Mapping** | ❌ | ✅ Invoice/Project/Contract |
| **Search** | Basic | Advanced filter |
| **Status** | Production | Phase 1 (testing) |

---

## When to Use Which System?

### Use Existing System When:
- ✅ You just need to store a PDF
- ✅ No data filling needed
- ✅ Simple invoice templates
- ✅ Legacy templates already there

### Use NEW System When:
- ✅ PDF has fillable form fields
- ✅ Need to map fields to database
- ✅ Want automated data filling
- ✅ Complex templates with relationships
- ✅ Need field validation (required fields)

---

## Test Files You Can Use

### Option 1: Use IRS Form (Has Form Fields)
- Download W-9 or any IRS form
- These have fillable fields
- Good for testing field detection

### Option 2: Create Test PDF in Adobe
- Add text fields: `invoice_number`, `total`, `date`
- Save as PDF
- Upload to test mapping

### Option 3: Use Any PDF (No Fields)
- Regular PDF still works
- Field detection shows "0 fields"
- Can manually add field names

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't see "Templates" link | Must be Admin user |
| Upload fails | Check file is PDF, check console |
| Field detection shows 0 | PDF has no form fields (OK) |
| Can't save mappings | Check source + field selected |
| Page won't load | Check imports, run build |

---

## What's Working Right Now ✅

- Template upload (drag & drop)
- Field detection from PDFs
- Field mapping interface
- Search & filter
- Edit & delete templates
- Data source mapping (6 sources)
- Required field toggle
- Relationship path display

## What's Coming in Phase 2 🔄

- Template preview with PDF viewer
- Assignment management (full UI)
- PDF generation from templates
- Computed fields
- Conditional fields
- Batch generation

---

## Need More Details?

- **Full Testing Guide:** `TEMPLATES_TESTING_GUIDE.md`
- **Field Mapping Reference:** `TEMPLATE_FIELD_MAPPING_GUIDE.md`
- **Setup & Troubleshooting:** `TEMPLATE_MANAGER_README.md`

---

## Report Issues

While testing, note:
1. What were you trying to do?
2. What happened instead?
3. Any console errors?
4. Screenshots help!

**Ready to test? Start with the "Quick Test - 5 Minutes" above! 🚀**
