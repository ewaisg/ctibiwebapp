# File Uploads & Templates Guide

Ensure smooth imports and consistent outputs with the right formats and templates.

[!NOTE]
Always use the latest templates provided in the app to avoid formatting issues.

## 1. Overview

Uploads are used for timesheets and master data (companies, employees, contracts). Templates ensure fields and formats match system expectations.

## 2. Supported Formats

- CSV and XLSX (Excel)
- UTF-8 encoding recommended for CSV

## 3. Template Rules

- Column names must match exactly (case-sensitive where noted)
- Required fields cannot be empty
- Dates in YYYY-MM-DD format
- Numeric fields without extra symbols (e.g., hours/rates)

[!TIP]
Download templates from the respective import dialogs (Timesheets, Companies, Employees, Contracts).

## 4. Upload Process

1. Open the module (e.g., Timesheets or Company Import)
2. Click “Upload” and select your prepared file
3. Review validation results
4. Submit valid rows; fix invalid rows and re-upload

## 5. Validation Messages

- Missing column: add or correct the column name
- Invalid date: use YYYY-MM-DD
- Non-numeric value: remove symbols or text
- Unknown code: verify project PO, department code, or service code

## 6. Timesheet Uploads

- Use the Timesheet Upload dialog
- Required columns typically: Employee, Project PO, Date, Hours, Service
- Notes are optional but helpful for special cases

## 7. Template Uploads

- Use Template Upload for report templates
- Assign templates to departments or projects via Template Assignment
- Keep versions labeled and documented

## 8. Troubleshooting

- Upload fails: verify template structure and encoding
- Many invalid rows: check data source and re-export using the template
- Codes not found: ensure master data (projects, departments, services) exists

## 9. FAQs

- Can I change column order?
  - Follow the template order unless the module allows flexible ordering.

- Do I need to include optional fields?
  - No, but they can improve clarity and future reporting.

## 10. Best Practices

- Start from the latest template every time
- Validate data before upload
- Keep a changelog of imports for audit purposes
- Coordinate bulk imports with admins to avoid conflicts
