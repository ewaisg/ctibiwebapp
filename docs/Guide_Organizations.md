# Organizations Guide (Companies, Departments, Divisions, Contracts)

Keep organizational data clean and consistent to support projects, timesheets, and invoicing.

[!NOTE]
If you don’t see Organizations in the sidebar, you may not have permission. Contact an administrator.

## 1. Overview

Organizational records structure your data. Companies, departments, and divisions help categorize work and reporting. Contracts define legal and financial terms linked to projects and services.

### Who uses it
- Administrators: maintain org master data and contracts
- Finance: review contracts and rate templates
- Project Managers: align projects to the correct org units

## 2. Companies

### Create or edit
1. Open Companies
2. Click “New Company” or select an existing one
3. Fill fields:
   - Company Code (unique)
   - Name
   - Contact and billing details
   - Notes
4. Save

### Import (optional)
- Use Company Import with the latest template (CSV/XLSX)
- Review validation results, fix errors, re-upload

## 3. Departments & Divisions

- Departments: operational units within a company/division
- Divisions: higher-level grouping of departments

### Manage hierarchy
1. Open Divisions and create a division
2. Open Departments and create departments
3. Use the Division-Department view to link departments to divisions

### Fields
- Department Code (unique)
- Name
- Division: parent grouping

[!TIP]
Plan codes and names before bulk import to avoid rework.

## 4. Contracts

Contracts define terms for billing and services.

### Create or edit
1. Open Contracts
2. Click “New Contract” or select an existing one
3. Enter details:
   - Contract ID (auto or manual)
   - Client/Company
   - Effective dates
   - Rate templates and service mappings
   - Notes or special terms
4. Save

### Import (optional)
- Use Contract Import if enabled
- Validate rates and service codes carefully

## 5. Linking to Projects & Services

- When creating a project, select the Company/Department
- Add Services under the project and reference the proper contract terms
- Ensure rate templates match services to prevent invoice errors

## 6. Workflows

- New org setup:
  1. Add companies and codes
  2. Create divisions
  3. Create departments and link to divisions
  4. Create contracts and rate templates

- Bulk updates:
  1. Export current data (if available)
  2. Update offline
  3. Re-import with the latest template

## 7. Troubleshooting

- Duplicate codes: choose unique Company/Department codes
- Mislinked departments: use Division-Department management to fix parents
- Invoice rate mismatches: verify contract rate templates and service codes

## 8. FAQs

- Can I change a department’s division?
  - Yes, use the Division-Department view to update links.

- What happens if I rename a company?
  - References update, but confirm with projects and invoicing for consistency.

- Can contracts overlap in dates?
  - Avoid overlapping unless clearly distinguished; set effective dates carefully.

## 9. Best Practices

- Use stable codes for companies and departments
- Keep contracts current and expire old terms
- Align services and rate templates with finance policies
- Document changes in notes for audit trails
