import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { getInvoicePdfTemplate } from '@/lib/pdf-template';
import type { Employee, Company, Service, Project, User } from '@/types';

const formatDate = (dateValue: unknown): string => {
    if (!dateValue) return '';
    
    if (dateValue instanceof Timestamp) {
        const date = dateValue.toDate();
        return format(date, 'MM/dd/yyyy');
    }
    
    const date = new Date(dateValue as string | number | Date);
    if (!isNaN(date.getTime())) {
        return format(date, 'MM/dd/yyyy');
    }
    
    return '';
};

interface EnrichedInvoiceItem {
    employeeId: string;
    companyId: string;
    serviceId: string;
    hours: number;
    billingRate: number;
    markdown: number;
    amount: number;
    notes?: string;
    name: string;
    companyName: string;
    title: string;
}

interface EnrichedReimbursableExpense {
    description: string;
    amount: number;
    date?: Timestamp | Date | string | null;
    companyId: string;
    companyName: string;
}

interface EnrichedInvoiceData {
    projectName: string;
    invoiceItems: EnrichedInvoiceItem[];
    reimbursableExpenses: EnrichedReimbursableExpense[];
    contractNumber: string;
    invoiceNumber: string;
    fromDate: Timestamp | Date | string;
    toDate: Timestamp | Date | string;
    dueDate: Timestamp | Date | string;
    termOfWeek?: string;
    pmisNumber: string;
    approvingSupervisor?: string;
    poNumber: string;
    invoiceItemsTotal: number;
    reimbursableExpensesTotal: number;
    invoiceTotal: number;
    contractSummary?: {
        originalContractPoAmount: number;
        previouslyInvoiced: number;
        remainingPoAmount: number;
    };
    totalBudgetedHours?: number;
}

async function fillPdfTemplate(invoiceData: EnrichedInvoiceData): Promise<Buffer> {
    const pdfTemplateBytes = await getInvoicePdfTemplate(invoiceData.contractNumber);
    const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
    const form = pdfDoc.getForm();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fields = form.getFields();
    fields.forEach(field => {
        try {
            const da = field.acroField.getDefaultAppearance();
            if (!da) {
                field.acroField.setDefaultAppearance('/Helv 8 Tf 0 g');
            }
            (field as any).setFontSize?.(8);
        } catch {
            try {
               field.acroField.setDefaultAppearance('/Helv 8 Tf 0 g');
            } catch {
                // Ignore fields that don't support default appearance
            }
        }
    });
    form.updateFieldAppearances(helveticaFont);

    // Fill fields with data
    form.getTextField('date').setText(formatDate(new Date()));
    form.getTextField('DueDate').setText(formatDate(invoiceData.dueDate));
    form.getTextField('invoiceNumber').setText(invoiceData.invoiceNumber);
    form.getTextField('projectName').setText(invoiceData.projectName);
    form.getTextField('BillingFrom').setText(formatDate(invoiceData.fromDate));
    form.getTextField('BillingTo').setText(formatDate(invoiceData.toDate));
    
    if (invoiceData.contractNumber !== '202262512') {
        form.getTextField('TermOfWeeks').setText(invoiceData.termOfWeek || '');
        form.getTextField('PMISNumber').setText(invoiceData.pmisNumber);
        form.getTextField('ApprovingSupervisor').setText(invoiceData.approvingSupervisor || '');
    } else {
        const originalContractPoAmount = invoiceData.contractSummary?.originalContractPoAmount || 0;
        form.getTextField('poAmount').setText(originalContractPoAmount.toFixed(2));
        form.getTextField('totalBudgetedHours').setText(
            typeof invoiceData.totalBudgetedHours === 'number'
                ? invoiceData.totalBudgetedHours.toFixed(2)
                : ''
        );
    }
    form.getTextField('ContractNumber').setText(invoiceData.contractNumber);
    form.getTextField('poNumber').setText(invoiceData.poNumber);

    // Fill line items
    invoiceData.invoiceItems.forEach((item, index) => {
        const i = index + 1;
        form.getTextField(`ProfessionalServices_Personnel_${i}`).setText(item.name || '');
        form.getTextField(`ProfessionalServices_Company_${i}`).setText(item.companyName || '');
        form.getTextField(`ProfessionalServices_Description_${i}`).setText(item.title || '');
        form.getTextField(`ProfessionalServices_Hours_${i}`).setText(item.hours.toString());
        form.getTextField(`ProfessionalServices_Rate_${i}`).setText(item.billingRate.toFixed(2));
        form.getTextField(`ProfessionalServices_Amount_${i}`).setText(item.amount.toFixed(2));
    });

    // Fill expenses
    invoiceData.reimbursableExpenses.forEach((exp, index) => {
        const i = index + 1;
        form.getTextField(`Expenses_Company_${i}`).setText(exp.companyName || '');
        form.getTextField(`Expenses_Description_${i}`).setText(exp.description);
        form.getTextField(`Expenses_Date_${i}`).setText(formatDate(exp.date));
        form.getTextField(`Expenses_Amount_${i}`).setText(exp.amount.toFixed(2));
    });

    // Fill totals
    const contractSummary = invoiceData.contractSummary || {
        originalContractPoAmount: 0,
        previouslyInvoiced: 0,
        remainingPoAmount: 0
    };
    
    form.getTextField('ProfessionalServices_total').setText(invoiceData.invoiceItemsTotal.toFixed(2));
    form.getTextField('Expenses_Total').setText(invoiceData.reimbursableExpensesTotal.toFixed(2));
    form.getTextField('InvoiceTotal').setText(invoiceData.invoiceTotal.toFixed(2));
    form.getTextField('ContractPOAmount').setText(contractSummary.originalContractPoAmount.toFixed(2));
    form.getTextField('PreviouslyInvoiced').setText(contractSummary.previouslyInvoiced.toFixed(2));
    form.getTextField('AmountThisInvoice').setText(invoiceData.invoiceTotal.toFixed(2));
    form.getTextField('RemainingPOAmount').setText(contractSummary.remainingPoAmount.toFixed(2));

    form.flatten();
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

export async function generateInvoicePdfs(
    invoiceId: string, 
    options: {
        saveToFirebase?: boolean;
        versionType?: 'initial' | 'internal-revision' | 'regeneration';
        notes?: string;
        user?: User;
    } = {}
): Promise<{
    invoicePdfBuffer: Buffer;
    invoicePdfUrl?: string;
    fileName?: string;
    storageWarning?: string;
}> {
    const { saveToFirebase = true, versionType = 'regeneration', notes = '', user } = options;

    if (!adminDb) {
        throw new Error("Firebase Admin not initialized.");
    }

    const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();
    
    if (!invoiceDoc.exists) {
        throw new Error("Invoice not found.");
    }
    
    const invoiceData = invoiceDoc.data() as any;

    // Fetch lookup data for PDF generation
    const [employees, companies, services, projects] = await Promise.all([
        adminDb.collection('employees').get().then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee))),
        adminDb.collection('companies').get().then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company))),
        adminDb.collection('services').get().then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service))),
        adminDb.collection('projects').get().then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project))),
    ]);

    const projectId = typeof invoiceData.projectId === 'string' ? invoiceData.projectId : invoiceData.projectId?.id;
    const project = projects.find(p => p.id === projectId);

    // Enrich invoice data for PDF generation
    const enrichedInvoiceItems = invoiceData.invoiceItems.map((item: any) => ({
        ...item,
        name: employees.find(e => e.id === item.employeeId)?.formalName || 'N/A',
        companyName: companies.find(c => c.id === item.companyId)?.companyName || 'N/A',
        title: services.find(s => s.id === item.serviceId)?.serviceName || 'N/A',
    }));

    const enrichedExpenses = invoiceData.reimbursableExpenses.map((exp: any) => ({
        ...exp,
        date: exp.date || new Date(),
        companyName: companies.find(c => c.id === exp.companyId)?.companyName || 'N/A',
    }));

    // Calculate contract summary
    const toNum = (v: any) => (typeof v === 'number' ? v : Number(v)) || 0;
    const originalContractPoAmountNum = toNum(project?.originalPoAmount ?? project?.originalPoAmount);
    
    // Calculate previously invoiced amount dynamically
    const approvedInvoicesQuery = await adminDb.collection('invoices')
        .where('projectId', '==', projectId)
        .where('status', 'in', ['approved', 'paid'])
        .get();
    
    const previouslyInvoicedDynamic = approvedInvoicesQuery.docs
        .filter(doc => doc.id !== invoiceId)
        .reduce((sum, doc) => {
            const data = doc.data();
            return sum + toNum(data.invoiceTotal);
        }, 0);
    
    const remainingPoAfterThisNum = originalContractPoAmountNum - previouslyInvoicedDynamic - toNum(invoiceData.invoiceTotal);

    const fullInvoiceData: EnrichedInvoiceData = {
        ...invoiceData,
        invoiceItems: enrichedInvoiceItems,
        reimbursableExpenses: enrichedExpenses,
        projectName: project?.projectName || 'N/A',
        totalBudgetedHours: project?.budgetedHours,
        contractSummary: {
            originalContractPoAmount: originalContractPoAmountNum,
            previouslyInvoiced: previouslyInvoicedDynamic,
            remainingPoAmount: remainingPoAfterThisNum,
        }
    };

    // Generate invoice PDF
    const invoicePdfBuffer = await fillPdfTemplate(fullInvoiceData);

    if (!saveToFirebase) {
        return { invoicePdfBuffer };
    }

    // Skip Firebase Storage since adminStorage is not available
    // Just update the invoice document with generation timestamp
    const fileName = `Invoice_${invoiceData.invoiceNumber || 'NA'}_${Date.now()}.pdf`;
    
    await invoiceRef.update({
        pdfGeneratedAt: Timestamp.now(),
        lastPdfGeneration: 'server-side'
    });

    return {
        invoicePdfBuffer,
        fileName
    };
}