import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit } from '@/lib/auth-middleware';
import { adminDb, getAdminStorage } from '@/lib/firebase-admin';
import { sanitizeForLog } from '@/lib/security-utils';
import { generateCoverPage } from '@/lib/coverpage-generator';
import { generateDepartmentalProjectReportPdf } from '@/lib/departmental-project-report-pdf';
import { extractId } from '@/lib/document-reference-utils';
import JSZip from 'jszip';

interface Body {
  departmentId: string;
  fromDate: string; // ISO
  toDate: string;   // ISO
  includeInactive?: boolean;
  manualData?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const authed = await withAuth(async (req) => {
    try {
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }

      const { departmentId, fromDate, toDate, includeInactive = false, manualData } = (await req.json()) as Body;
      if (!departmentId || !fromDate || !toDate) {
        return NextResponse.json({ error: 'departmentId, fromDate, and toDate are required' }, { status: 400 });
      }

      const start = new Date(fromDate);
      const end = new Date(toDate);

      // 1) Cover Page (honor manualData for template-driven fields)
      const coverPageBuffer = await generateCoverPage({ departmentId, fromDate, toDate, manualData: manualData || {} });

      // 2) Department Summary data build
      // Department
      const depDoc = await adminDb!.collection('departments').doc(departmentId).get();
      const departmentName = depDoc.exists ? ((depDoc.data() as any)?.departmentName || departmentId) : departmentId;

      // Projects by department (handle both ref and string)
      const depRef = adminDb!.doc(`departments/${departmentId}`);
      const [projByRefSnap, projByIdSnap] = await Promise.all([
        adminDb!.collection('projects').where('departmentId', '==', depRef).get(),
        adminDb!.collection('projects').where('departmentId', '==', departmentId).get(),
      ]);
      const projectsRaw = [...projByRefSnap.docs, ...projByIdSnap.docs]
        .reduce((acc: any[], d) => { if (!acc.find(x => x.id === d.id)) acc.push({ id: d.id, ...d.data() }); return acc; }, []);
      const projects = (includeInactive ? projectsRaw : projectsRaw.filter((p: any) => !p.isInactive));

      // Contracts map for names/numbers
      const contractIds = Array.from(new Set(projects.map((p: any) => extractId(p.contractId)).filter(Boolean)));
      const contractDocs = await Promise.all(contractIds.map(id => adminDb!.collection('contracts').doc(id!).get()));
      const contractsMap = new Map<string, any>();
      contractDocs.forEach(doc => { if (doc.exists) contractsMap.set(doc.id, { id: doc.id, ...doc.data() }); });

      // Compute report groupings and totals
      const contractGroups: any[] = [];
      const byContract = new Map<string, any>();
      projects.forEach((p: any) => {
        const cId = extractId(p.contractId) || 'unknown';
        const contract = contractsMap.get(cId) || { id: cId, contractName: 'Unknown', contractNumber: '—' };
        if (!byContract.has(cId)) {
          byContract.set(cId, {
            contractId: cId,
            contractName: contract.contractName || 'Unknown',
            contractNumber: String(contract.contractNumber ?? '—'),
            projects: [] as any[],
            totals: { originalPoAmount: 0, changeOrderAmount: 0, newPoAmount: 0, previouslyInvoiced: 0, remainingPoAmount: 0 },
          });
        }
        const group = byContract.get(cId);
        const entry = {
          poNumber: p.poNumber || p.id,
          projectName: p.projectName || '',
          projectManager: p.projectManager || '',
          approvingSupervisor: p.approvingSupervisor || '',
          ipmssiStaff: p.ipmssiStaff || '',
          originalPoAmount: Number(p.originalPoAmount || 0),
          changeOrderAmount: Number(p.changeOrderAmount || 0),
          newPoAmount: Number(p.newPoAmount || (Number(p.originalPoAmount || 0) + Number(p.changeOrderAmount || 0))),
          previouslyInvoiced: Number(p.previouslyInvoicedAmount || 0),
          remainingPoAmount: Number(p.remainingPoAmount || 0),
          contractId: cId,
          contractName: group.contractName,
          isInactive: Boolean(p.isInactive),
        };
        group.projects.push(entry);
        group.totals.originalPoAmount += entry.originalPoAmount;
        group.totals.changeOrderAmount += entry.changeOrderAmount;
        group.totals.newPoAmount += entry.newPoAmount;
        group.totals.previouslyInvoiced += entry.previouslyInvoiced;
        group.totals.remainingPoAmount += entry.remainingPoAmount;
      });
      byContract.forEach((v) => contractGroups.push(v));

      const grandTotals = contractGroups.reduce((acc, g) => {
        acc.totalContracts += 1;
        acc.totalProjects += g.projects.length;
        acc.totalActiveProjects += g.projects.filter((p: any) => !p.isInactive).length;
        acc.totalInactiveProjects += g.projects.filter((p: any) => p.isInactive).length;
        acc.originalPoAmount += g.totals.originalPoAmount;
        acc.changeOrderAmount += g.totals.changeOrderAmount;
        acc.newPoAmount += g.totals.newPoAmount;
        acc.previouslyInvoiced += g.totals.previouslyInvoiced;
        acc.remainingPoAmount += g.totals.remainingPoAmount;
        return acc;
      }, { totalContracts: 0, totalProjects: 0, totalActiveProjects: 0, totalInactiveProjects: 0, originalPoAmount: 0, changeOrderAmount: 0, newPoAmount: 0, previouslyInvoiced: 0, remainingPoAmount: 0 });

      const reportInfo = {
        departmentName,
        reportingPeriod: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        generatedDate: new Date().toLocaleString(),
        includeInactiveProjects: includeInactive,
        contractGroups,
        grandTotals,
      };

      const summaryBuffer = await generateDepartmentalProjectReportPdf(reportInfo);

      // 3) Per-project invoices and labor reports within date range
      const zip = new JSZip();
      zip.file('Cover Page.pdf', coverPageBuffer);
      zip.file('Department Summary.pdf', summaryBuffer);

      // Preload employees/companies for labor report generation
      const [employeesSnap, companiesSnap] = await Promise.all([
        adminDb.collection('employees').get(),
        adminDb.collection('companies').get(),
      ]);
      const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const companies = companiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      for (const p of projects) {
        const pId = p.id;

        // Query invoices by project, then filter by date in memory
        const projRef = adminDb.doc(`projects/${pId}`);
        const [invByRef, invById] = await Promise.all([
          adminDb.collection('invoices').where('projectId', '==', projRef).get(),
          adminDb.collection('invoices').where('projectId', '==', pId).get(),
        ]);
        const invoices = [...invByRef.docs, ...invById.docs]
          .reduce((acc: any[], d) => { if (!acc.find(x => x.id === d.id)) acc.push({ id: d.id, ...d.data() }); return acc; }, [])
          .filter((inv: any) => {
            const invFrom = (inv.fromDate?.toDate?.() || (inv.fromDate?.seconds ? new Date(inv.fromDate.seconds * 1000) : new Date(inv.fromDate))) as Date;
            const invTo = (inv.toDate?.toDate?.() || (inv.toDate?.seconds ? new Date(inv.toDate.seconds * 1000) : new Date(inv.toDate))) as Date;
            return invFrom <= end && invTo >= start; // overlaps range
          });

        if (!invoices.length) {
          // Skip creating a folder for projects without invoices in range
          continue;
        }

        // Create folders only when we have invoices to include
        const projectFolder = zip.folder(`Projects/${(p.contractNumber ?? 'C')}_${p.poNumber || pId}_${(p.projectName || '').replace(/[^a-zA-Z0-9 _-]/g, '')}`)!;
        const invoicesFolder = projectFolder.folder('Invoices')!;
        const reportsFolder = projectFolder.folder('Reports')!;
        const attachmentsFolder = projectFolder.folder('Attachments')!;

        for (const inv of invoices) {
          try {
            const { generateClientSidePdf } = await import('@/lib/pdf-generator');
            const result = await generateClientSidePdf(inv.id, {
              category: 'Invoice',
              userContext: { displayName: 'Department Packet', email: 'noreply@cti.local' },
              projectId: pId,
              contractId: extractId(p.contractId) || '',
              departmentId,
            });
            if (result.pdfBuffer) {
              const fileName = `${inv.invoiceNumber || inv.id}.pdf`;
              invoicesFolder.file(fileName, result.pdfBuffer);
            }
            if (result.laborReportBuffer) {
              const lrName = `Labor Report - ${inv.invoiceNumber || inv.id}.pdf`;
              reportsFolder.file(lrName, result.laborReportBuffer);
            }

            // Attachments
            if (Array.isArray(inv.uploadedFiles)) {
              for (const f of inv.uploadedFiles) {
                const safeName = String(f.fileName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
                try {
                  const resp = await fetch(f.fileUrl);
                  if (resp.ok) {
                    const ab = await resp.arrayBuffer();
                    attachmentsFolder.file(safeName, Buffer.from(ab));
                  }
                } catch (e) {
                  console.warn('Failed to fetch attachment', sanitizeForLog(e));
                }
              }
            }
          } catch (e) {
            console.warn('Failed to generate invoice PDF', sanitizeForLog(e));
          }
        }
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="Department-Packet-${departmentName.replace(/[^a-zA-Z0-9_-]/g, '')}.zip"`,
        },
      });
    } catch (error) {
      console.error('Department packet generation error:', sanitizeForLog(error));
      return NextResponse.json({ error: 'Failed to generate department packet' }, { status: 500 });
    }
  }, { requiredRole: 'Admin' });

  const limited = withRateLimit(authed);
  return limited(request);
}
