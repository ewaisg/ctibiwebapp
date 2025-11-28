# Timesheets Guide

A complete guide for uploading, validating, correcting, approving, and reporting on timesheets.

[!NOTE]
If you don’t see Timesheets in the sidebar, you may not have permission. Contact an administrator.

## 1. Overview

Timesheets capture work logs used for utilization metrics and invoicing. This module helps employees upload data, and managers/finance review and approve entries.

### Who uses it
- Employees: upload timesheet files and correct validation errors
- Managers: review submissions, request corrections, approve entries
- Finance: verify approved timesheets for invoicing

## 2. Access & Roles

- Administrators: full access
- Managers/Finance: review and approve
- Employees: upload and correct their entries

## 3. Supported File Formats

- CSV or XLSX (Excel)
- Required columns typically include:
  - Employee ID / Name
  - Project PO Number
  - Date (YYYY-MM-DD)
  - Hours (decimal)
  - Service / Activity code
  - Notes (optional)

[!TIP]
Download the latest template from the Timesheet Upload dialog to avoid format issues.

## 4. Uploading Timesheets

1. Go to Timesheets
2. Click “Upload Timesheet”
3. Select your prepared CSV/XLSX file
4. The app parses entries and shows validation results
5. Confirm to submit valid rows; fix invalid rows and re-upload

## 5. Validation Rules

Common checks include:
- Required fields must be present
- Dates must be valid and within allowed ranges
- Hours must be numeric and within policy limits
- Project PO Numbers must exist and be active
- Service/Activity codes must match configured values

Invalid rows are flagged with messages indicating the problem and the cell/row involved.

## 6. Correcting Errors

- Download or open your original file
- Fix issues flagged in the validation results
- Re-upload and ensure the previously invalid rows pass

[!NOTE]
You can submit valid rows and correct invalid ones later. Approval only applies to valid, submitted entries.

## 7. Approvals

- Managers/Finance can approve entries after review
- Approved entries feed into utilization dashboards and invoicing
- Rejected entries should be corrected and resubmitted

### Approval flow
1. Employee uploads
2. Validation runs
3. Manager/Finance reviews
4. Approve or request corrections

## 8. Reports & PDFs

- Generate timesheet PDFs for a date range, department, or project
- Download PDFs for sharing or archiving
- Some views allow drill-down to entries for auditing

## 9. Common Workflows

- Employee upload:
  1. Prepare file using the template
  2. Upload and review validation
  3. Submit valid rows

- Manager review:
  1. Open submitted timesheets
  2. Filter by team, project, or date
  3. Approve valid entries; note corrections for invalid ones

- Finance invoicing prep:
  1. Ensure approvals are complete for the billing period
  2. Cross-check services and rates

## 10. Troubleshooting

- Upload fails: ensure file matches the latest template and required columns
- Invalid project: confirm correct PO number and active status
- Hours rejected: confirm numeric values and policy limits
- Date issues: ensure format is YYYY-MM-DD and within the allowed range

[!WARNING]
Never change the template structure (columns/order) unless instructed by an administrator.

## 11. FAQs

- Can I upload partial weeks?
  - Yes, as long as entries follow the template and date rules.

- Who approves my timesheets?
  - Your manager or designated finance reviewer.

- Why don’t my hours appear in utilization?
  - Only approved entries are included. Check approval status.

## 12. Best Practices

- Always start from the latest template
- Validate data before upload to reduce corrections
- Use clear notes for unusual entries
- Coordinate approval timings with invoicing cycles
