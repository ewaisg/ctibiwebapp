# Admin & Settings Guide

Administer system configuration, roles, financial settings, and guardrails.

[!NOTE]
Admin access is required for most actions in this guide.

## 1. Overview

Administrators configure roles, review logs, maintain financial settings, and ensure compliance. Use this module to keep data accurate and access controlled.

## 2. Administration

### Users & Roles
- Create, disable, and manage user accounts
- Assign roles (least privilege)
- Review role changes periodically

### Audit & Error Review
- Monitor audit logs (if available)
- Review reported errors and follow up with module owners

## 3. Financial Administration

- Maintain pay items, rate templates, and financial parameters
- Ensure alignment between services, contracts, and rates
- Coordinate updates with Finance and Project Managers

## 4. Security & Compliance (Info)

- Enforce strong roles, rotate access as needed
- CSRF protection and rate limiting are built-in
- Ensure environment variables (secrets) are configured in hosting platform

[!WARNING]
Never store secrets in client-visible settings.

## 5. Configuration

- Organization settings: divisions, departments, and codes
- Service and activity catalogs
- Templates for PDF generation and imports

## 6. Workflows

- New environment setup:
  1. Configure companies, divisions, departments
  2. Add services and pay items
  3. Create rate templates and contracts
  4. Verify roles and user access

- Quarterly access review:
  1. Export user list
  2. Validate roles against responsibilities
  3. Revoke stale access

## 7. Troubleshooting

- Users can’t access modules: verify role and sign-out/in
- Rates not reflected: refresh rate templates and contracts
- Template issues: ensure latest versions are uploaded

## 8. FAQs

- Can admins see all data?
  - Yes, but apply least-privilege where possible.

- How do I roll back a template?
  - Upload the prior version and confirm affected modules.

- How do I enforce naming conventions?
  - Use import validation and training; document conventions in the org guide.

## 9. Best Practices

- Document configuration changes with dates/reasons
- Separate duties between Admin, Finance, and PMs
- Review access quarterly and after org changes
- Keep templates and rate catalogs versioned and auditable
