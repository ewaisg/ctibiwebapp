# INVOICING FEATURE DEMO SCRIPT
**Presentation Guide for Manager Meeting**

---

## Pre-Demo Preparation Checklist

Before the meeting:
- [ ] Open the application and log in
- [ ] Have sample timesheet Excel file ready
- [ ] Prepare a test project with assigned employees and services
- [ ] Clear your screen of unrelated windows/tabs
- [ ] Test your screen sharing
- [ ] Have this script open on a second monitor or printed
- [ ] Set up test data: at least one draft, one submitted, and one approved invoice

---

## Meeting Opening (2 minutes)

**YOU:**
> "Good morning/afternoon! Today I'm excited to show you our invoicing system. This is a comprehensive tool that handles the entire invoicing workflow from start to finish."

**Show the main dashboard/invoices page**

> "What you're seeing is the main invoices page where all invoices are managed. Before we dive in, let me give you a quick overview of what we'll cover today."

---

## Demo Overview (1 minute)

**YOU:**
> "We'll walk through the complete invoicing process in the order you'd typically use it:"

**Point to or show each section as you mention it:**

1. **Timesheet Import** - Getting employee hours into the system
2. **Invoice Creation** - Building invoices either automatically or manually
3. **Draft Management** - Saving work in progress
4. **Approval Workflow** - Submitting and approving invoices
5. **PDF Generation** - Creating professional invoice documents
6. **Payment Tracking** - Recording payments and managing status
7. **Monthly Reporting** - Generating comprehensive billing packets

> "The whole process is designed to be simple and efficient. Let's start from the beginning."

---

## Part 1: Timesheet Import (5 minutes)

**YOU:**
> "First, we need employee hours in the system. This is optional but saves a lot of time. Let me show you how we import timesheets."

**Navigate to Timesheets page**

> "Here's the timesheets section. To import data, I simply click 'Upload Timesheets.'"

**Click the Upload Timesheets button**

> "Now I can either drag and drop an Excel file or click to browse."

**Show the Excel file before uploading**

> "This is a standard timesheet export. It has columns for employee number, name, date, hours, and project information. The system is smart enough to figure out which columns are which."

**Select and upload the file**

> "Watch what happens as the file uploads..."

**Point out the progress indicators:**

1. **Current Entry Counter** - "See how it's processing entry by entry"
2. **Employee Names** - "It shows which employee it's currently processing"
3. **Totals** - "These counters show processed, duplicates, and errors"

**When complete:**

> "Great! The system processed all entries and automatically detected duplicates so we don't double-bill. Notice it only imported billable hours - regular time, overtime, and salary hours. Non-billable codes like PTO or sick leave are automatically filtered out."

**Key Points to Emphasize:**
- ✅ Simple drag-and-drop
- ✅ Real-time progress tracking
- ✅ Automatic duplicate detection
- ✅ Smart filtering (only billable hours)

---

## Part 2: Creating an Invoice with Autofill (7 minutes)

**YOU:**
> "Now that we have timesheet data, let's create an invoice. This is where the system really shines."

**Navigate to Invoices page, click Create Invoice**

> "When I click 'Create Invoice,' the system walks me through a simple wizard."

---

### Step 1: Department Selection

**YOU:**
> "First, I select which department this invoice is for. This step only appears for administrators and prime contractors. Subcontractors skip this since they're automatically assigned to their company."

**Select a department**

---

### Step 2: Project Selection

**YOU:**
> "Next, I choose the project. The system only shows projects I have access to."

**Select a project**

> "Notice how the list is filtered based on the department I selected."

---

### Step 3: Date Range

**YOU:**
> "Now I set the billing period - from date and to date."

**Enter date range that matches uploaded timesheets**

> "Here's where the magic happens. As soon as I set these dates, the system searches for timesheet entries matching this project and date range."

**Point out the success message if timesheets are found**

> "See this? 'Timesheet entries found for this period.' The system is ready to autofill."

**Click Continue or Next**

---

### Step 4: Invoice Form

**YOU:**
> "Now we're on the main invoice form. Let me walk you through what just happened automatically."

**Point to the top section:**

> "All these fields were automatically filled from the project settings:"
- **Contract Number** - "From the project contract"
- **PO Number** - "The purchase order"
- **PMIS Number** - "Project management system ID"
- **Invoice Number** - "Auto-generated, but I can customize it"
- **Approving Supervisor** - "Pulled from project settings"
- **Due Date** - "Automatically calculated - end of next month"

---

**Scroll to Invoice Items table:**

> "And here's the real time-saver. Look at this table."

**Point to each column:**

> "Every row here came from the timesheet data we imported:"
- **Company** - "The subcontractor company"
- **Employee** - "Employee names from timesheets"
- **Service** - "Type of work - engineering, project management, etc."
- **Hours** - "Total hours from the timesheet entries"
- **Billing Rate** - "Automatically pulled from our rate tables"
- **Amount** - "Calculated instantly: hours times rate"

**Point to the totals sidebar:**

> "And in real-time, the system calculates the total. Right now we're at [read the total]."

---

**YOU:**
> "But it's not just automatic - I have full control. Watch this."

**Click Add Item:**

> "I can add additional line items manually."

**Fill out a new item quickly:**

> "I just select an employee, choose the service, enter hours, and the system automatically fills the billing rate and calculates the amount."

**Click the remove icon on that item:**

> "And I can remove items just as easily."

---

**Scroll to Reimbursable Expenses:**

**YOU:**
> "If we have non-labor costs - like travel expenses or materials - we add them here."

**Add a quick expense:**

> "Amount, date, description. The system adds it to the grand total automatically."

---

**Scroll to File Attachments:**

**YOU:**
> "Finally, we can attach supporting documents. Timesheets, receipts, whatever backup documentation we need."

**Upload a file if you have one prepared:**

> "Just drag and drop or click to upload. Files are securely stored with the invoice."

---

**Point to the totals again:**

**YOU:**
> "See how the invoice total updates in real-time? Invoice items plus expenses equals grand total. No manual math needed."

**Key Points to Emphasize:**
- ✅ Wizard guides you through step-by-step
- ✅ Automatic population from timesheets
- ✅ Real-time calculations
- ✅ Full manual control when needed
- ✅ Support for expenses and attachments

---

## Part 3: Draft Management (3 minutes)

**YOU:**
> "Now, I have two options here at the bottom: 'Save as Draft' or 'Submit for Review.'"

**Point to both buttons:**

> "Let me show you the draft feature first. This is useful when you need to save your work and come back later."

**Click Save as Draft**

> "I'll save this as a draft."

**Navigate back to invoices list:**

> "Back on the invoices page, here's my draft."

**Point to the yellow DRAFT badge:**

> "See the yellow 'DRAFT' badge? That means it's saved but not submitted. Only I can see this draft - it's not visible to anyone else yet."

**Click the menu (three dots), select View/Edit:**

> "If I want to come back and make changes, I just click the menu and select 'View/Edit.'"

**Show the form loads with all data:**

> "Everything I entered is still here. I can make changes, add more items, or when I'm ready..."

**Point to Submit for Review button:**

> "...submit it for approval."

**Key Points to Emphasize:**
- ✅ Drafts save your work
- ✅ Private (only you can see them)
- ✅ Edit anytime before submitting
- ✅ Submit when ready

---

## Part 4: Submission and Approval Workflow (8 minutes)

**YOU:**
> "Let me create another invoice quickly so I can show you the approval process."

**Quickly create another invoice (can skip details, just get to the form):**

> "I'll fill this out quickly... project, dates, one line item... and now instead of saving as draft, I'll click 'Submit for Review.'"

**Click Submit for Review**

---

**Navigate to invoices list:**

**YOU:**
> "Now look at the status."

**Point to the blue SUBMITTED badge:**

> "It's changed to 'SUBMITTED' with a blue badge. This invoice is now locked - the creator can't edit it anymore. It's in the approval queue."

---

### For Subconsultant Invoices:

**YOU:**
> "When a subcontractor submits an invoice, here's what happens:"

**Show the invoice details:**

> "The invoice is visible to administrators and prime contractors who can now review it."

**Click on the menu, show the Approve and Reject options:**

> "As an approver, I have two options: Approve or Reject."

---

### Approving an Invoice:

**YOU:**
> "Let's say I review the invoice and everything looks good. I click 'Approve.'"

**Click Approve**

> "Watch what happens..."

**Point to the status change:**

> "Status changes to 'APPROVED' with a green badge. But that's not all."

**Navigate to the project details page (if accessible) or explain:**

> "Behind the scenes, the system updated the project financials:"
- "Added this invoice total to 'Previously Invoiced'"
- "Subtracted hours from 'Remaining Hours'"
- "Recalculated 'Remaining PO Amount'"

> "This keeps project budgets accurate in real-time."

---

### Rejecting an Invoice:

**YOU:**
> "But what if there's a problem? Let me show you rejection. I'll create another quick invoice to demonstrate."

**Quickly create and submit another test invoice**

**Click the menu, select Reject:**

> "When I click 'Reject,' a dialog opens."

**Show the rejection dialog:**

> "I'm required to enter a reason. This is important - the invoice creator will see this."

**Type a sample reason: "Missing timesheet backup documentation"**

**Point to the checkbox if visible:**

> "And if I'm rejecting an invoice that was previously approved, I have the option to reverse the financial rollups. This undoes the project budget changes."

**Click Confirm Rejection**

> "Now the status is 'REJECTED' with a red badge."

---

### Resubmitting After Rejection:

**YOU:**
> "Here's what the invoice creator sees."

**Show the invoice detail page:**

**Point to the red alert banner:**

> "There's a red alert showing the rejection reason: 'Missing timesheet backup documentation.'"

**Click View/Edit:**

> "They can now make corrections. Let me add an attachment to fix the issue."

**Upload a file:**

> "Add the missing documentation, and now I can click 'Resubmit for Review.'"

**Click Resubmit**

**Show the status:**

> "Status changes to 'RESUBMITTED' in blue. It's back in the approval queue, and the approver gets notified again."

---

### Auto-Approval for Admin/Prime:

**YOU:**
> "One more thing about the approval workflow - when administrators or prime contractors create and submit their own invoices, they're automatically approved. No waiting needed."

**Key Points to Emphasize:**
- ✅ Clear status indicators (yellow/blue/green/red)
- ✅ Locked after submission (maintains integrity)
- ✅ Automatic project financial updates
- ✅ Required rejection reasons
- ✅ Financial reversal option
- ✅ Resubmission workflow
- ✅ Auto-approval for admin/prime

---

## Part 5: PDF Generation (5 minutes)

**YOU:**
> "Once an invoice is approved, we can generate a professional PDF document. Let me show you."

**Navigate to an approved invoice:**

**Point to the green APPROVED badge:**

> "Here's an approved invoice. To generate the PDF, I click the menu and select 'Generate PDF.'"

**Click Generate PDF**

> "The system is now creating the PDF using our configured templates..."

**When complete:**

> "Done! Now I can click 'View PDF' to see the result."

**Click View PDF (opens in new tab):**

> "Here's the professional invoice document."

**Scroll through the PDF and point out features:**

- **Header:** "Company logo and information at the top"
- **Invoice Details:** "Invoice number, dates, contract number, PO number"
- **Recipient Information:** "Project details, supervisor"
- **Line Items Table:** "All our invoice items in a clean table format"
- **Totals:** "Clear breakdown of subtotals and grand total"
- **Expenses:** "Reimbursable expenses listed separately"
- **Footer:** "Company contact information and signature"

---

**YOU:**
> "Now, what if we need to make a change and regenerate the PDF?"

**Go back to the invoice, click menu, show Regenerate PDF:**

> "I can click 'Regenerate PDF' and the system creates a new version."

**After regenerating (if you do it):**

> "Here's what's really cool - the system keeps all versions."

**Click menu, show Restore Previous Version option:**

> "If I ever need to go back to an earlier version, I can click 'Restore Previous Version' and select from the history."

**Show the version history dialog if you open it:**

> "Each version shows when it was created, who created it, and any notes. This is a complete audit trail."

**Key Points to Emphasize:**
- ✅ Professional, branded PDF output
- ✅ One-click generation
- ✅ Automatic versioning
- ✅ Ability to restore previous versions
- ✅ Complete audit trail

---

## Part 6: Payment Tracking (6 minutes)

**YOU:**
> "Now let's talk about getting paid. The system tracks payment status for every invoice."

**Point to invoices with different payment status badges:**

> "See these colored badges?"
- **Green (PAID):** "Fully paid"
- **Red (UNPAID):** "Payment overdue"
- **Yellow (PENDING):** "Not yet due"
- **Blue (PARTIALLY PAID):** "Partial payment received"

---

**YOU:**
> "Let me show you how to record payments. I'll select this approved invoice."

**Click menu, select Manage Payment:**

> "When I click 'Manage Payment,' a drawer slides in from the right."

**Point to the summary at the top:**

> "Right at the top, I see the financial summary:"
- "Invoice Total: [amount]"
- "Paid Amount: [amount]"
- "Outstanding Amount: [amount]"
- "Current Status: [status]"

---

### Recording a Payment:

**YOU:**
> "To record a payment, I click 'Add Payment Entry.'"

**Click Add Payment Entry:**

> "Now I fill out the payment details."

**Walk through the form:**

1. **Entry Type:** "First, I select what type of entry this is."
   - **Payment:** "Money received from the client"
   - **Write-Off:** "Bad debt we're writing off"
   - **Credit:** "Credit memo being applied"
   - **Refund:** "Money we're returning to the client"

**Select Payment**

2. **Amount:** "Enter the amount received."

**Enter an amount (e.g., $5000)**

3. **Date:** "When was it received? Defaults to today."

4. **Payment Method:** "How did they pay?"

**Show the dropdown:** "Check, ACH, Wire Transfer, or Credit Card"

**Select one (e.g., Check)**

5. **Reference:** "Check number or transaction ID"

**Enter a sample check number: CHK-12345**

6. **Notes:** "Any additional details"

**Enter: "Payment for first half of invoice"**

**Click Save Entry**

---

**YOU:**
> "And just like that, the payment is recorded."

**Point to the updated summary:**

> "Look at the summary - it updated instantly:"
- "Paid Amount increased"
- "Outstanding Amount decreased"
- "Status changed to 'PARTIALLY PAID'"

**Scroll down to payment history:**

> "And here in the payment history, there's a complete record."

**Point to the entry:**

> "Shows the date, amount, type, and running balances. This is a complete audit trail."

---

### Other Payment Actions:

**YOU:**
> "I have several options for managing payments."

**Point to the Edit and Void buttons:**

**Edit:**
> "If I made a mistake, I can click 'Edit' to correct the entry."

**Void:**
> "Or if a payment fell through - say a check bounced - I can 'Void' the entry. This doesn't delete it, it just marks it as voided. The audit trail is preserved."

**Point to Delete Latest Entry:**
> "And if I just recorded something by mistake, I can quickly delete the latest entry."

---

**YOU:**
> "Let me record the remaining payment to show the full payment."

**Add another payment entry for the remaining amount:**

> "Same process - amount, method, reference..."

**Click Save**

**Point to the updated status:**

> "Now the status changed to 'PAID' with a green badge. The invoice is fully paid."

---

### Write-Offs:

**YOU:**
> "One more scenario - sometimes we need to write off an amount. Let me show you."

**Create or find another invoice with outstanding balance**

**Open payment management:**

> "If a client can't pay or we're waiving a charge, I select 'Write-Off' as the entry type."

**Select Write-Off, enter amount:**

> "Enter the amount, add a reason in the notes, and save."

**Show the result:**

> "The status updates, and the amount is removed from accounts receivable. But again, complete audit trail."

**Key Points to Emphasize:**
- ✅ Clear visual status indicators
- ✅ Complete payment tracking
- ✅ Multiple entry types (payment, write-off, credit, refund)
- ✅ Full payment history with audit trail
- ✅ Edit and void capabilities
- ✅ Automatic status updates

---

## Part 7: Monthly Reporting (8 minutes)

**YOU:**
> "The final piece is monthly reporting. This is where we pull everything together for client billing. Let me show you the three types of reports."

---

### Report 1: Cover Page

**YOU:**
> "First, we can generate a standalone cover page. This is the front page for a billing packet."

**Navigate to Invoices, click Reports dropdown, select Generate Cover Pages:**

> "I select the department and date range."

**Fill out the form:**

> "The system uses a configured template. If the template has manual fields, I fill them out here."

**Show example fields if they appear:**
- "Text fields for things like project manager name"
- "Date pickers for reporting period"
- "Signature field where I can draw with my mouse"

**Click Generate:**

> "One click and the PDF downloads. This is a professional cover page ready to include in the billing packet."

---

### Report 2: Department PDF Compilation

**YOU:**
> "Second, we can compile all invoice PDFs for a department into one ZIP file."

**Click Reports, select Compile Department PDFs:**

> "Again, select department and date range."

**Click Generate:**

> "The system gathers all approved invoice PDFs for that department in the date range and packages them into a single ZIP file."

**Show the downloaded ZIP if quick:**

> "Download complete. Inside this ZIP are all the individual invoice PDFs. Makes it easy to share with accounting or the client."

---

### Report 3: Monthly Billing Packet (The Big One)

**YOU:**
> "Now, the comprehensive report - the Monthly Billing Packet. This is everything you need for client billing in one package."

**Click Reports, select Generate Monthly Billing Packet:**

> "Let me show you what this creates."

**Fill out the form:**

1. **Department** - "Select the department"
2. **Date Range** - "Billing period"
3. **Include Inactive Projects** - "Toggle this if you want to include projects that are marked inactive"

**Show the template name:**

> "The system tells me which cover page template it will use."

**Fill out manual fields if any:**

> "If there are manual fields, fill them out just like the cover page."

**Click Generate:**

> "This takes a moment because it's creating a comprehensive package..."

---

**YOU:**
> "Okay, download complete. Let me show you what's inside."

**Open the ZIP file:**

> "Here's the structure:"

**Show/explain the folder structure:**

```
Department-Packet-Engineering.zip
│
├── Cover Page.pdf
│
├── Department Summary.pdf
│
└── Projects/
    │
    ├── ABC-123_PO45678_Highway-Expansion/
    │   │
    │   ├── Invoices/
    │   │   ├── INV-001.pdf
    │   │   └── INV-002.pdf
    │   │
    │   ├── Reports/
    │   │   ├── Labor Report - INV-001.pdf
    │   │   └── Labor Report - INV-002.pdf
    │   │
    │   └── Attachments/
    │       ├── Timesheet-Week1.xlsx
    │       └── Receipt-Travel.pdf
    │
    └── ABC-124_PO45679_Bridge-Repair/
        └── ...
```

**Point out each component:**

1. **Cover Page.pdf:**
   > "Professional cover page with all the manual data we entered."

2. **Department Summary.pdf:**
   > "Let me open this one. This is a comprehensive summary."

   **Open the Department Summary PDF:**

   > "Look at this - it shows:"
   - "All contracts in the department"
   - "All projects under each contract"
   - "Financial details: PO amounts, change orders, previously invoiced, remaining balance"
   - "Totals at the contract level"
   - "Grand totals at the bottom"

   > "This is essentially a financial snapshot of the entire department for the billing period."

3. **Projects Folder:**
   > "Inside the Projects folder, there's a subfolder for each project that has invoices in the billing period."

4. **Project Subfolders:**
   > "Each project folder has three sections:"

   - **Invoices folder:** "All invoice PDFs for this project"
   - **Reports folder:** "Labor reports showing employee hours breakdown"
   - **Attachments folder:** "All supporting documents - timesheets, receipts, anything that was attached to the invoices"

---

**YOU:**
> "So with one click, I generated a complete, organized billing packet. Everything the client needs to review and approve our invoices:"
- "Professional cover page"
- "Financial summary"
- "All invoice PDFs"
- "Detailed labor reports"
- "Supporting documentation"

> "All organized by contract and project, ready to send to the client."

**Key Points to Emphasize:**
- ✅ Three types of reports for different needs
- ✅ Monthly Billing Packet is comprehensive and professional
- ✅ Automatic organization by contract and project
- ✅ Includes all supporting documentation
- ✅ One-click generation
- ✅ Ready to deliver to client

---

## Summary and Q&A (5 minutes)

**YOU:**
> "Let me quickly recap what we just saw."

**Recap the workflow:**

1. **Import Timesheets:** "Upload Excel files with employee hours"

2. **Create Invoices:** "Wizard guides you through, autofills from timesheets, real-time calculations"

3. **Drafts:** "Save work in progress, private, edit anytime"

4. **Approval Workflow:** "Submit, approve, or reject with reasons. Financial rollups update automatically"

5. **PDF Generation:** "Professional branded PDFs, versioning, audit trail"

6. **Payment Tracking:** "Record payments, write-offs, credits, refunds. Full audit trail with status indicators"

7. **Monthly Reporting:** "Comprehensive billing packets with cover pages, summaries, invoices, reports, and attachments"

---

**YOU:**
> "The key benefits of this system are:"

**Enumerate clearly:**

1. **Efficiency:** "Autofill from timesheets saves hours of manual data entry"

2. **Accuracy:** "Automatic calculations prevent math errors. Real-time totals"

3. **Transparency:** "Clear status indicators, approval workflow, complete audit trail"

4. **Integration:** "Project financials update automatically. No manual reconciliation"

5. **Professionalism:** "Branded PDF invoices, comprehensive billing packets"

6. **Flexibility:** "Manual override for everything. Drafts for work in progress"

7. **Compliance:** "Complete audit trail. Versioned PDFs. Payment history"

---

**YOU:**
> "And it's all designed to be simple. No technical knowledge required. The wizard guides you through each step."

**Pause for questions:**

> "What questions do you have? I can show you anything again or dive deeper into any area."

---

## Handling Common Questions

### Q: "What if we don't have timesheets?"

**A:**
> "No problem! The autofill is optional. You can create invoices completely manually. Just skip the timesheet import step and add invoice items one by one. The system still handles all the calculations and workflow."

---

### Q: "Can we customize the PDF templates?"

**A:**
> "Absolutely! The PDFs are generated from templates that can be customized with your branding, logos, and layout preferences. We can configure different templates for different departments or clients."

---

### Q: "What if someone makes a mistake after approval?"

**A:**
> "Great question. Approvers can reject previously approved invoices. When they do, there's an option to reverse the financial rollups, which undoes the project budget changes. Then the invoice creator can fix it and resubmit."

---

### Q: "How do we know what changes were made?"

**A:**
> "Every invoice has a complete history log. Every status change, approval, rejection, submission - all recorded with who did it and when. Plus the PDF versioning system keeps every generated version with timestamps."

---

### Q: "Can subcontractors see each other's invoices?"

**A:**
> "No. Subcontractors can only see their own invoices. Only administrators and prime contractors can see all invoices. This maintains confidentiality and security."

---

### Q: "What happens if we lose internet connection while creating an invoice?"

**A:**
> "Drafts are saved to the server, so once you click 'Save as Draft,' your data is safe. But if you lose connection before saving, there's a warning system that detects unsaved changes and alerts you before you close the browser."

---

### Q: "How long are the PDFs and attachments stored?"

**A:**
> "Indefinitely. All PDFs and attachments are stored in secure cloud storage with backups. Even old versions are retained for audit purposes. Nothing is automatically deleted."

---

### Q: "Can we export the data to accounting software?"

**A:**
> "The monthly billing packet includes PDFs and reports that can be provided to accounting. For direct integration with accounting software, that would be a custom development based on which system you use."

---

### Q: "How do we handle change orders?"

**A:**
> "Change orders are managed at the project level. When you add a change order to a project, it updates the 'New PO Amount.' Then invoices against that project can bill up to the new total. The department summary shows original PO, change orders, and new total."

---

## Closing (2 minutes)

**YOU:**
> "This invoicing system streamlines the entire billing process from timesheet import through payment tracking. It saves time, reduces errors, and provides complete transparency."

> "I've prepared a comprehensive user guide that walks through each of these features step-by-step with screenshots. It's written in plain language - no technical jargon - so anyone can follow along."

**Show or mention the INVOICING_SOP.md document:**

> "This document covers everything we just saw plus troubleshooting tips and best practices."

---

**YOU:**
> "Is there anything you'd like to see again or any features you'd like to explore further?"

**After discussion:**

> "Thank you for your time. I'm excited about this system and I think it will make a big difference in our invoicing efficiency."

---

## Post-Demo Action Items

After the meeting:
- [ ] Send the INVOICING_SOP.md document to manager
- [ ] Provide any additional screenshots they requested
- [ ] Schedule training sessions for team members if needed
- [ ] Gather feedback on additional features or improvements
- [ ] Document any questions you couldn't answer for follow-up

---

## Demo Tips

**Pacing:**
- Don't rush. This is a 45-60 minute demo.
- Pause after each major section to ask "Does this make sense?" or "Any questions so far?"
- Watch for signs of confusion and be ready to slow down or repeat

**Engagement:**
- Make eye contact (if in person) or watch the camera (if remote)
- Use their name when addressing questions
- Ask if they have similar processes today and relate features to their experience

**Technical Issues:**
- Have backup screenshots prepared in case of technical issues
- If something doesn't work, don't panic - show the SOP document instead
- Test everything beforehand

**Storytelling:**
- Use a consistent example project throughout the demo
- Frame features in terms of "Here's the problem, here's how this solves it"
- Use real-world scenarios: "Imagine it's month-end and you need to bill 20 projects..."

**Body Language (if in person):**
- Point to screen elements clearly
- Use hand gestures to emphasize key points
- Maintain open, confident posture
- Smile and show enthusiasm

**Follow-Up:**
- Take notes during Q&A
- Offer to schedule one-on-one sessions
- Provide your contact info for questions

---

**Good luck with your demo! You've got this!**
