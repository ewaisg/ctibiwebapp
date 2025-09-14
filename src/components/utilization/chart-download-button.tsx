
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Image as ImageIcon, FileText, Loader2, FileSpreadsheet } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface ChartDownloadButtonProps {
  targetRef?: React.RefObject<HTMLDivElement | null>;
  filterText: string;
  onExport?: (format: 'xlsx') => void;
}

export function ChartDownloadButton({ targetRef, filterText, onExport }: ChartDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async (format: 'png' | 'pdf') => {
    setIsLoading(true);
    const element = targetRef?.current;
    if (!element) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find the chart element to download.',
      });
      setIsLoading(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const originalDesc = element.querySelector('[data-card-description]');
      const filterEl = document.createElement('p');
      filterEl.className = "text-xs text-muted-foreground pt-1";
      filterEl.textContent = filterText;

      // For PNG, temporarily add the filter text to the card description
      if (format === 'png' && originalDesc) {
        originalDesc.appendChild(filterEl);
      }

      const dataUrl = await toPng(element, { 
          cacheBust: true, 
          quality: 1.0, 
          pixelRatio: 2,
          backgroundColor: 'hsl(var(--background))',
          skipFonts: true,
          // This filter function excludes the download button itself from the capture
          filter: (node) => {
            if (node instanceof HTMLElement) {
                return node.getAttribute('data-download-button') !== 'true';
            }
            return true;
          }
      });
      
      // Clean up the temporarily added filter text for PNG
      if (format === 'png' && originalDesc && originalDesc.contains(filterEl)) {
         originalDesc.removeChild(filterEl);
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const cardTitle = element.querySelector('[data-card-title]')?.textContent || 'chart';
      const safeFilename = cardTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${safeFilename}-${timestamp}.png`;
        link.href = dataUrl;
        link.click();
        toast({ title: 'Success', description: 'Chart downloaded as PNG.' });
      } else if (format === 'pdf') {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: 'a4',
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgAspectRatio = img.width / img.height;
            const margin = 40;

            let imgWidth = pdfWidth - (margin * 2);
            let imgHeight = imgWidth / imgAspectRatio;

            if (imgHeight > pdfHeight - margin) {
                imgHeight = pdfHeight - margin;
                imgWidth = imgHeight * imgAspectRatio;
            }
            
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;
            
            pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
            pdf.save(`${safeFilename}-${timestamp}.pdf`);
            toast({ title: 'Success', description: 'Chart downloaded as PDF.' });
        };
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'There was an error while generating the file.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportClick = (format: 'png' | 'pdf' | 'xlsx') => {
    if (format === 'xlsx' && onExport) {
        onExport(format);
    } else if (format === 'png' || format === 'pdf') {
        handleDownload(format);
    }
  }

  return (
    <div data-download-button="true">
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            Download
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            {targetRef && (
                <>
                    <DropdownMenuItem onSelect={() => handleExportClick('png')}>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        <span>Download as PNG</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExportClick('pdf')}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Download as PDF</span>
                    </DropdownMenuItem>
                </>
            )}
            {onExport && (
                 <DropdownMenuItem onSelect={() => handleExportClick('xlsx')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Download as XLSX</span>
                </DropdownMenuItem>
            )}
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
