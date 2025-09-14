# CTI BI Web Application — PDF Templates Overview

To understand the PDF Templates feature in the CTI BI web application, it helps to first grasp CTI’s business model and operating context.

---

## Company Overview

**Civil Technology, Inc. (CTI)** is a professional services and consulting firm that partners with clients to execute complex initiatives across multiple industries. CTI delivers end-to-end solutions spanning project management, contract administration, engineering, technical services, and administrative support.

### Core Business Model

CTI operates a **hybrid delivery model** to maximize client value:

**Prime Contractor Operations**
- **Dedicated Team:** CTI’s professional staff delivers core services and manages projects.  
- **Strategic Partnerships:** We engage specialized subconsultants to add targeted expertise or capacity.  
- **Integrated Billing:** We invoice clients for both CTI and subconsultant work with appropriate markups to ensure profitability.  
- **Value-Added Oversight:** Even when subconsultants perform the primary scope, CTI provides project management and coordination services (with markup).

**Subconsultant Operations**
- **Specialized Services:** CTI also serves as a subconsultant to other prime contractors where our capabilities align.  
- **Direct Billing:** In these cases, CTI invoices the prime contractor for services rendered.  
- **Flexible Capacity:** This mode optimizes utilization and strengthens strategic relationships.

This dual-role model requires sophisticated financial management to support complex billing scenarios, subconsultant relationships, and diverse project structures—while protecting margins and client satisfaction.

---

## CTI’s Internal Structure

CTI is organized into three primary layers:

1. **Divisions**  
2. **Departments**  
3. **Projects**

Each Division can contain multiple Departments, and each Department can manage multiple Projects. Projects are the core delivery units for client services.

---

## Primary Database Collections

1. **Clients:** Client profiles and related metadata.  
2. **Contracts:** Terms, rates, and conditions governing client engagements.  
3. **Projects:** Project records under specific contracts.  
4. **Departments:** Organizational units that manage one or more projects, often aligned to a client or contract.  
5. **Divisions:** Higher-level organizational units encompassing multiple Departments.  
6. **Employees:** CTI personnel and subconsultant personnel records.  
7. **CTI Timesheets:** Timesheets submitted by CTI employees.  
8. **Companies:** Profile data for CTI and subconsultant companies.  
9. **Invoices:** Invoices issued by CTI to clients; invoices from subconsultants to CTI; and, where applicable, CTI invoices issued to subconsultants.  
10. **Resource Allocations:** Assignment of CTI employees to specific Divisions/Departments/Projects.  
11. **Services:** Catalog of services and roles offered by CTI.  
12. **PDF Templates:** Reusable layouts for invoices, reports, and related documents.  
13. **Permissions:** User roles and access control settings.

---

## Key Relationships

- **Clients** have multiple **Contracts**.  
- Each **Contract** can have multiple **Projects**.  
- **Departments** are associated with specific **Clients** and/or **Contracts**.  
- **Divisions** can encompass multiple **Departments**.  
- **Employees** include both CTI and subconsultant personnel.  
- **CTI Timesheets** link to **Employees** and to **Divisions/Departments/Projects**.  
- **Invoices** may be issued to **Clients** (including subconsultant charges) and, where applicable, to or from **Subconsultants**. Invoice data pulls from **Contracts**, **Projects**, **Employees**, **Companies**, and **Services**.  
- **Resource Allocations** map **Employees** to specific **Divisions/Departments/Projects**.  
- **PDF Templates** generate invoices and reports by pulling data from the collections above; different templates can be defined per client and/or contract.

---

## PDF Templates — Overview

PDF Templates provide reusable document layouts and structures that map dynamic data fields to placeholders. They enable consistent, scalable generation of invoices, reports, and supporting artifacts.

### Primary Use Cases

1. **Invoicing:** Standardized invoice templates parameterized by client, contract, project, rates, and markups.  
2. **Reporting:** Consistent formats for financial summaries, purchase-order (PO) detail, project status updates, and other management reports.

---

## Monthly Invoicing Workflow (Context)

At month-end, CTI generates an **invoice packet** for each client. Packets include project-level invoices, supporting backup, and a consolidated summary. Because projects can sit under different contracts—with distinct rates, markups, and report templates—the system selects the appropriate PDF Template for each contract and project. Invoices may include CTI labor, subconsultant charges, and—where applicable—CTI-to-subconsultant invoicing.

Typical report components include: a cover letter, a contract-level summary of projects, detailed PO reports, project status updates, and other required exhibits. The completed packet is sent to the client for payment processing.

---

## Template Assignment Logic

PDF Templates are assigned by contract level ONLY using the **contract number** (`contractNumber`). Since a single contract can govern multiple projects—with unique rates, markups, and reporting requirements—the template binding occurs at the contract level.

When generating invoices and reports for a project, the system:
1. Looks up the project’s `contractNumber`.  
2. Resolves the corresponding PDF Templates (invoice, timecard, and any required reports).  
3. Generates the **project-level invoice** and **timecard report** during invoice submission.

---

## Department-Level Packet Generation & Output

After billing is completed, users can generate **department-level invoice packets**. Projects sharing the same `contractNumber` are grouped under the relevant Department. The system then:

1. Generates the **contract cover letter**.  
2. Produces the **department summary report**, including detailed **PO summaries** and **status updates** for all projects.  
3. Assembles **project artifacts**: invoices, timecard reports, and required attachments/backups.

All outputs are compiled into a single **ZIP file** for the Department. The ZIP includes:
- The cover letter (PDF).  
- The department summary report (PDF).  
- A folder per project containing the invoice (PDF), timecard report (PDF), and any attachments or backup documents.

---
