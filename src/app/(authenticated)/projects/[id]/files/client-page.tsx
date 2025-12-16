'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Folder, UploadCloud } from 'lucide-react';
import type { Invoice, Project } from '@/types';
import ProjectFileManager from '@/components/project-file-manager';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-hot-toast';

type FolderKey = 'uploads' | 'invoices';

export function ProjectFilesClientPage({ project, invoices }: { project: Project; invoices: Invoice[] }) {
  const router = useRouter();
  const { user } = useAuth();

  const [activeFolder, setActiveFolder] = useState<FolderKey>('uploads');
  const [projectFiles, setProjectFiles] = useState(project.files || []);

  const [invoiceSearch, setInvoiceSearch] = useState('');

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const num = (inv.invoiceNumber || '').toLowerCase();
      const status = (inv.status || '').toLowerCase();
      const po = (inv.poNumber || '').toLowerCase();
      return num.includes(q) || status.includes(q) || po.includes(q);
    });
  }, [invoiceSearch, invoices]);

  const openUrl = (url: string) => {
    const sanitized = url.replace(/[<>"']/g, '');
    window.open(sanitized, '_blank', 'noopener,noreferrer');
  };

  const handleViewInvoicePdf = async (invoice: Invoice) => {
    const pdfUrl = (invoice as any).pdfUrl as string | undefined;
    if (pdfUrl) {
      openUrl(pdfUrl);
      return;
    }

    const invoiceId = (invoice as any).id as string | undefined;
    if (!invoiceId) {
      toast.error('Invoice ID missing');
      return;
    }

    if (!user?.uid) {
      toast.error('You must be signed in');
      return;
    }

    try {
      const { generateInvoicePdf } = await import('@/app/(authenticated)/invoices/actions');
      const res = await generateInvoicePdf(invoiceId, user.uid);
      const newUrl = (res as any)?.pdfUrl as string | undefined;
      if (newUrl) {
        openUrl(newUrl);
      } else {
        toast.error('PDF not available');
      }
    } catch (err) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.projectName, href: `/projects/${project.id}` },
          { label: 'Files' },
        ]}
        className="mb-4"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Project Files</h1>
          <p className="text-sm text-muted-foreground">Upload, find, and view documents for this project.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/projects/${project.id}?tab=files`)}>
          Back to Project
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Folders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={activeFolder === 'uploads' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder('uploads')}
            >
              <UploadCloud className="h-4 w-4" />
              Uploads
              <span className="ml-auto text-xs text-muted-foreground">{projectFiles.length}</span>
            </Button>
            <Button
              variant={activeFolder === 'invoices' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveFolder('invoices')}
            >
              <FileText className="h-4 w-4" />
              Invoices
              <span className="ml-auto text-xs text-muted-foreground">{invoices.length}</span>
            </Button>

            <div className="pt-2 text-xs text-muted-foreground flex items-center gap-2">
              <Folder className="h-3.5 w-3.5" />
              Invoices are read-only here.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {activeFolder === 'uploads' ? (
            <ProjectFileManager
              projectId={project.id}
              files={projectFiles as any}
              onFilesUpdated={(updated) => setProjectFiles(updated as any)}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Invoices</CardTitle>
                  <Input
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search invoices..."
                    className="w-56"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredInvoices.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No invoices found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Period End</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Document</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={(invoice as any).id || invoice.invoiceNumber}>
                          <TableCell className="font-medium">{invoice.invoiceNumber || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invoice.status || '—'}</Badge>
                          </TableCell>
                          <TableCell>
                            {invoice.toDate ? new Date(invoice.toDate as any).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                              invoice.invoiceTotal || 0
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="secondary" onClick={() => handleViewInvoicePdf(invoice)}>
                              View PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
