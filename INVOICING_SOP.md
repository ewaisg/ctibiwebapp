# INVOICING FEATURE - USER GUIDE
**Standard Operating Procedure for Invoice Management**

---

## Table of Contents
1. [Getting Started with Timesheets](#1-getting-started-with-timesheets)
2. [Creating an Invoice](#2-creating-an-invoice)
3. [Working with Drafts](#3-working-with-drafts)
4. [Submitting for Approval](#4-submitting-for-approval)
5. [Approval Process](#5-approval-process)
6. [Generating PDF Invoices](#6-generating-pdf-invoices)
7. [Managing Payments](#7-managing-payments)
8. [Generating Monthly Reports](#8-generating-monthly-reports)

---

## 1. Getting Started with Timesheets

### Why Import Timesheets?
Timesheets allow you to automatically fill invoice line items with employee hours, saving time and reducing errors.

### Step-by-Step: Uploading Timesheets

**Prerequisites:**
- Excel file (.xlsx) with timesheet data
- Columns should include: Employee Number, Name, Date, Hours, Pay Code, Division, Customer, Project

**Steps:**
1. Click on **"Timesheets"** in the navigation menu
2. Click the **"Upload Timesheets"** button
3. Select your Excel file
4. Watch the progress indicator:
   - Shows current entry being processed
   - Displays employee names as they're imported
   - Counts: Total entries, Processed, Duplicates, Errors
5. Review the summary when complete
6. Click **"Done"**

**What Happens:**
- System checks for duplicate entries (won't import the same timesheet twice)
- Only billable hours are imported (Regular, Overtime, Salary hours)
- Data is stored for use when creating invoices

**Note:** Duplicate entries are automatically skipped to prevent double-billing.

---

## 2. Creating an Invoice

### Two Ways to Create an Invoice:

#### Option A: Manual Entry (Empty Invoice)
Use this when you don't have timesheet data or need to create a custom invoice.

#### Option B: Autofill from Timesheets (Recommended)
Use this when you have imported timesheet data for the project and date range.

---

### Step-by-Step: Creating an Invoice with Autofill

1. **Navigate to Invoices**
   - Click **"Invoices"** in the navigation menu
   - Click **"Create Invoice"** button

2. **Select Department** (Admin/Prime users only)
   - Choose the department this invoice belongs to
   - Subconsultants skip this step (automatically assigned)

3. **Select Project**
   - Choose from the dropdown list
   - Only shows projects you have access to
   - Projects are filtered by department (if selected)

4. **Set Date Range**
   - **From Date:** Start of invoice period
   - **To Date:** End of invoice period
   - System automatically checks for timesheet data in this range

5. **Review Auto-populated Information**
   - **Contract Number:** Pulled from project settings
   - **PO Number:** Purchase Order number from project
   - **PMIS Number:** Project Management Information System ID
   - **Invoice Number:** Auto-generated (or enter custom)
   - **Approving Supervisor:** From project settings
   - **Due Date:** Automatically calculated (end of next month)

6. **Invoice Items Table**
   - If timesheets exist: Automatically filled with employee hours
   - Each row shows:
     - **Company:** The subcontractor company
     - **Employee:** Name from timesheet
     - **Service:** Type of work (Engineering, Project Management, etc.)
     - **Hours:** Total hours from timesheet entries
     - **Billing Rate:** Rate from project or rate table
     - **Markdown %:** Optional discount (default 0%)
     - **Amount:** Automatically calculated (Hours × Rate × Discount)
     - **Notes:** Additional details

7. **Edit Items** (if needed)
   - Click **"Add Item"** to add more rows
   - Click **"Remove"** (trash icon) to delete a row
   - Edit any field by clicking on it
   - Amounts update automatically

8. **Add Reimbursable Expenses** (optional)
   - Click **"Add Expense"**
   - Enter: Amount, Company, Date, Description
   - Used for non-labor costs (travel, materials, etc.)

9. **Attach Supporting Documents** (optional)
   - Click **"Choose Files"** or drag-and-drop
   - Upload receipts, timesheets, or other documentation
   - Files are securely stored with the invoice

10. **Review Totals** (shown on right sidebar)
    - **Invoice Items Total:** Sum of all line items
    - **Reimbursable Expenses Total:** Sum of expenses
    - **Invoice Total:** Grand total

11. **Save or Submit**
    - **"Save as Draft":** Saves without submitting (can edit later)
    - **"Submit for Review":** Sends to approver (cannot edit after)

---

### Step-by-Step: Creating a Manual Invoice (No Timesheets)

Follow steps 1-5 above, then:

6. **Manually Add Invoice Items**
   - Click **"Add Item"**
   - Select **Employee** from dropdown
   - Select **Service** from dropdown
   - Enter **Hours** worked
   - **Billing Rate** fills automatically (or enter manually)
   - Enter **Markdown %** if applying a discount
   - **Amount** calculates automatically
   - Add **Notes** if needed

7. Continue with steps 8-11 above

---

## 3. Working with Drafts

### What is a Draft?
A draft is a saved invoice that hasn't been submitted for approval yet. You can edit it anytime.

### Viewing Your Drafts

1. Go to **"Invoices"** page
2. Look for invoices with a **yellow "DRAFT"** badge
3. Only you can see your drafts

### Editing a Draft

1. Find your draft invoice
2. Click the **menu icon** (three dots)
3. Select **"View/Edit"**
4. Make your changes
5. Click **"Save Changes"**
6. Or click **"Submit for Review"** when ready

### Deleting a Draft

1. Find your draft invoice
2. Click the **menu icon** (three dots)
3. Select **"Delete"**
4. Confirm deletion

**Note:** Only drafts can be deleted. Once submitted, invoices cannot be deleted (they can be rejected instead).

---

## 4. Submitting for Approval

### When to Submit
Submit your invoice when:
- All line items are accurate
- Expenses are added (if any)
- Supporting documents are attached
- Totals look correct

### How to Submit

**From Draft:**
1. Open the draft invoice
2. Review all information
3. Click **"Submit for Review"**
4. Confirmation message appears

**From New Invoice:**
1. Fill out invoice form completely
2. Click **"Submit for Review"** (instead of "Save as Draft")

### What Happens After Submission?

**For Subconsultants:**
- Invoice status changes to **"SUBMITTED"** (blue badge)
- Notification sent to Admin/Prime users
- Invoice is locked (you cannot edit)
- Wait for approval or rejection

**For Admin/Prime Users:**
- Invoice is automatically approved
- Status changes to **"APPROVED"** (green badge)
- Ready for PDF generation

---

## 5. Approval Process

### For Approvers (Admin/Prime Users)

#### Reviewing Submitted Invoices

1. Go to **"Invoices"** page
2. Look for **"SUBMITTED"** or **"RESUBMITTED"** invoices
3. Click the **menu icon** (three dots)
4. Select **"View Details"**

5. Review:
   - Invoice details (dates, PO number, contract)
   - Line items (employees, hours, rates)
   - Expenses
   - Totals
   - Attached files

#### Approving an Invoice

1. If everything looks correct, click **"Approve"**
2. System updates project financials:
   - Adds invoice total to "Previously Invoiced"
   - Deducts hours from "Remaining Hours"
   - Recalculates "Remaining PO Amount"
3. Status changes to **"APPROVED"** (green badge)
4. Notification sent to invoice creator
5. Invoice is now ready for PDF generation

#### Rejecting an Invoice

1. If there are errors or issues, click **"Reject"**
2. Dialog box opens
3. **Required:** Enter reason for rejection
4. **Optional:** If invoice was previously approved, check **"Reverse prior approval rollups"** to undo financial changes
5. Click **"Confirm Rejection"**
6. Status changes to **"REJECTED"** (red badge)
7. Notification sent to invoice creator with rejection reason

---

### For Invoice Creators (After Rejection)

#### Viewing Rejection Reason

1. Go to **"Invoices"** page
2. Find invoice with **"REJECTED"** badge
3. Red alert banner shows rejection reason

#### Resubmitting After Rejection

1. Click **"View/Edit"** on rejected invoice
2. Make necessary corrections
3. Click **"Resubmit for Review"**
4. Status changes to **"RESUBMITTED"** (blue badge)
5. Notification sent to approvers

---

### Approval Status Summary

| Status | Badge Color | Who Can Act | Available Actions |
|--------|-------------|-------------|-------------------|
| **DRAFT** | Yellow | Invoice Creator | Edit, Submit, Delete |
| **SUBMITTED** | Blue | Approvers | Approve, Reject |
| **APPROVED** | Green | Admin/Prime | Generate PDF, Reject (with reversal) |
| **REJECTED** | Red | Invoice Creator | Edit, Resubmit |
| **RESUBMITTED** | Blue | Approvers | Approve, Reject |

---

## 6. Generating PDF Invoices

### Prerequisites
- Invoice must be **APPROVED**
- Only Admin/Prime users can generate PDFs

### Step-by-Step: Generating a PDF

1. Go to **"Invoices"** page
2. Find approved invoice
3. Click the **menu icon** (three dots)
4. Select **"Generate PDF"** (or "Regenerate PDF" if one exists)
5. System creates PDF using configured template
6. PDF is automatically saved and linked to invoice
7. Click **"View PDF"** to open in new tab

### What's Included in the PDF?
- Company logo and information
- Invoice number and dates
- Project details (Contract, PO, PMIS numbers)
- Approving supervisor
- Line items table with employee names, services, hours, rates
- Subtotals
- Reimbursable expenses (if any)
- Grand total
- Company signature and contact information

### PDF Versions
- Each time you regenerate, a new version is created
- All versions are saved (audit trail)
- Current version is always displayed
- Click **"Restore Previous Version"** to revert if needed

---

## 7. Managing Payments

### Prerequisites
- Invoice must be **APPROVED**
- Only Admin/Prime users can manage payments

### Payment Status Badges

| Status | Badge Color | Meaning |
|--------|-------------|---------|
| **PAID** | Green | Fully paid |
| **UNPAID** | Red | Payment overdue |
| **PENDING** | Yellow | Not yet due |
| **PARTIALLY PAID** | Blue | Partial payment received |
| **WRITE OFF** | Gray | Amount written off |

---

### Step-by-Step: Recording a Payment

1. Go to **"Invoices"** page
2. Find the invoice
3. Click the **menu icon** (three dots)
4. Select **"Manage Payment"**
5. Payment drawer opens on the right side

6. **Review Current Status:**
   - Invoice Total
   - Paid Amount
   - Outstanding Amount
   - Payment Status

7. **Add Payment Entry:**
   - Click **"Add Payment Entry"**
   - Select **Entry Type:**
     - **Payment:** Money received from client
     - **Write-Off:** Bad debt or waived amount
     - **Credit:** Credit memo applied
     - **Refund:** Money returned to client
   - Enter **Amount** (cannot exceed outstanding for payments)
   - Select **Date** (optional, defaults to today)
   - Select **Payment Method** (Check, ACH, Wire, Credit Card)
   - Enter **Reference** (check number, transaction ID, etc.)
   - Add **Notes** (optional)
   - Click **"Save Entry"**

8. **Review Payment History:**
   - All entries shown in chronological order
   - Each entry shows:
     - Type (Payment, Write-Off, etc.)
     - Date
     - Amount
     - Running balances
     - Actions (Edit, Void)

---

### Editing a Payment Entry

1. Find entry in payment history
2. Click **"Edit"**
3. Modify any field
4. Click **"Save Changes"**

### Voiding a Payment Entry

Use this to cancel an entry without deleting it (maintains audit trail).

1. Find entry in payment history
2. Click **"Void"**
3. Entry marked as **"VOIDED"** (red badge)
4. Balances automatically recalculated

**Note:** Voided entries cannot be un-voided.

### Deleting the Latest Entry

Use this only for immediate corrections.

1. Click **"Delete Latest Entry"** button
2. Entry is permanently removed
3. Balances automatically recalculated

---

### Payment Validation Rules

**When Recording Payments:**
- Cannot exceed outstanding amount
- Blocked if invoice already fully paid

**When Recording Refunds:**
- Cannot exceed total paid amount
- Blocked if no payments have been recorded

**When Recording Write-Offs/Credits:**
- Cannot exceed outstanding amount
- Blocked if no outstanding balance

---

## 8. Generating Monthly Reports

### Available Reports

#### A. Cover Page
Stand-alone cover page for department invoice packets.

#### B. Department PDF Compilation
ZIP file containing all invoice PDFs for a department.

#### C. Monthly Billing Packet
Comprehensive ZIP file with cover page, summary, invoices, reports, and attachments.

---

### Step-by-Step: Generating a Cover Page

1. Go to **"Invoices"** page
2. Click **"Reports"** dropdown
3. Select **"Generate Cover Pages"**
4. Dialog opens
5. Select **Department**
6. Select **From Date** and **To Date**
7. If template has manual fields, fill them out:
   - Text fields
   - Dates (use calendar picker)
   - Dropdowns
   - Checkboxes
   - Signatures (draw with mouse/touch)
   - Images (upload files)
8. Required fields marked with **\***
9. Click **"Generate"**
10. PDF downloads automatically
11. Filename: `coverpage-{dept}-{fromDate}-{toDate}.pdf`

---

### Step-by-Step: Generating Department PDF Compilation

1. Go to **"Invoices"** page
2. Click **"Reports"** dropdown
3. Select **"Compile Department PDFs"**
4. Dialog opens
5. Select **Department**
6. Select **From Date** and **To Date**
7. Click **"Generate"**
8. ZIP file downloads with all invoice PDFs for that department
9. Filename: `departmental-compilation-{dept}-{date}.zip`

---

### Step-by-Step: Generating Monthly Billing Packet

This creates a comprehensive package with everything needed for monthly billing.

1. Go to **"Invoices"** page
2. Click **"Reports"** dropdown
3. Select **"Generate Monthly Billing Packet"**
4. Dialog opens
5. Select **Department**
6. Select **From Date** and **To Date**
7. Toggle **"Include Inactive Projects"** if needed
8. Review template name shown
9. Fill out manual fields (if required)
10. Click **"Generate"**
11. ZIP file downloads automatically

---

### What's in the Monthly Billing Packet?

```
Department-Packet-{DepartmentName}.zip
│
├── Cover Page.pdf
│   └── Department cover page with manual data
│
├── Department Summary.pdf
│   └── Financial summary of all projects
│
└── Projects/
    │
    ├── {Contract}_{PO}_{ProjectName}/
    │   │
    │   ├── Invoices/
    │   │   ├── Invoice-12345.pdf
    │   │   └── Invoice-12346.pdf
    │   │
    │   ├── Reports/
    │   │   ├── Labor Report - Invoice-12345.pdf
    │   │   └── Labor Report - Invoice-12346.pdf
    │   │
    │   └── Attachments/
    │       ├── Timesheet-Week1.xlsx
    │       └── Receipt-Travel.pdf
    │
    └── {Contract}_{PO}_{ProjectName}/
        └── ... (same structure)
```

---

### Department Summary PDF Contents

**Header:**
- Department name
- Reporting period (From Date - To Date)
- Generated date and timestamp

**Grouped by Contract:**
- Contract name and number
- Table of projects showing:
  - PO Number
  - Project Name
  - Project Manager
  - Approving Supervisor
  - IPMSS Staff
  - Original PO Amount
  - Change Order Amount
  - New PO Amount
  - Previously Invoiced
  - Remaining PO Amount
- Contract subtotals

**Grand Totals:**
- Total number of contracts
- Total number of projects (active/inactive)
- Sum of all financial columns

---

## Tips and Best Practices

### Creating Invoices
- Always import timesheets first if available
- Double-check employee and service selections
- Review billing rates before submitting
- Add notes to line items for clarity
- Attach supporting documents for faster approval

### Working with Drafts
- Use drafts to save progress on complex invoices
- Review drafts before submitting (they're only visible to you)
- Don't leave drafts unsubmitted for too long

### Approval Process
- Provide clear rejection reasons
- Use the reversal option when rejecting approved invoices
- Review project financials after approval

### Payment Management
- Record payments promptly
- Use descriptive references (check numbers, transaction IDs)
- Add notes for unusual entries
- Void entries instead of deleting (maintains audit trail)
- Reconcile payment status regularly

### Generating Reports
- Generate monthly billing packets at the same time each month
- Include inactive projects if they have invoices in the period
- Keep generated packets organized by date and department
- Share ZIP files via secure methods

---

## Troubleshooting

### Common Issues

**Issue: Timesheet import shows errors**
- Check that Excel file has all required columns
- Verify employee numbers match system records
- Ensure dates are in correct format

**Issue: Cannot find employee in dropdown**
- Verify employee is assigned to the project
- Check that employee is marked as active
- Ensure you're creating invoice for correct project

**Issue: Billing rate is $0 or incorrect**
- Check project's assigned services have rates
- Verify rate table has entry for company + service
- Manually enter correct rate if needed

**Issue: Cannot submit invoice**
- Review validation errors (shown in red)
- Ensure at least one invoice item exists
- Check that all required fields are filled

**Issue: Cannot generate PDF**
- Verify invoice is approved
- Check that you have Admin/Prime permissions
- Ensure PDF template is configured for department

**Issue: Payment entry blocked**
- Check validation rules (cannot exceed outstanding, etc.)
- Verify invoice has outstanding balance
- Ensure you have correct permissions

---

## Glossary

**Autofill:** Automatically populate invoice items from timesheet data

**Billing Rate:** The hourly rate charged for a service

**Change Order:** Modification to original contract amount

**Cover Page:** Front page for monthly billing packet

**Draft:** Saved but not submitted invoice

**Line Item:** Single row in invoice items table (employee + hours + rate)

**Markdown:** Discount percentage applied to billing rate

**PO (Purchase Order):** Contract document with budget amount

**PMIS:** Project Management Information System identification number

**Reimbursable Expense:** Non-labor cost billed to client (travel, materials)

**Rollup:** Aggregate financial totals for a project

**Service:** Type of work performed (Engineering, PM, Admin, etc.)

**Subconsultant:** Third-party company providing services on a project

**Timesheet:** Record of employee hours worked

**Void:** Cancel a payment entry without deleting (audit trail)

**Write-Off:** Amount removed from accounts receivable (bad debt)

---

## Support

If you encounter issues not covered in this guide:
1. Check with your system administrator
2. Review error messages carefully
3. Verify your user permissions
4. Contact technical support with:
   - What you were trying to do
   - What happened instead
   - Any error messages
   - Screenshots if helpful

---

**Last Updated:** December 4, 2024
**Version:** 1.0
