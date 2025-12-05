'use client';

/**
 * PDF Viewer with Field Overlays
 * Displays PDF and shows clickable field rectangles
 */

import React, { useEffect, useRef, useState } from 'react';
import type { PdfFieldInfo } from '@/types/pdf-field-mapper';

interface PdfViewerProps {
  pdfUrl: string;
  fields: PdfFieldInfo[];
  mappedFields: string[]; // Field names that have been mapped
  onFieldClick: (field: PdfFieldInfo) => void;
}

export function PdfViewer({ pdfUrl, fields, mappedFields, onFieldClick }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF.js dynamically from CDN to avoid Next.js bundling issues
  useEffect(() => {
    let mounted = true;
    let scriptElement: HTMLScriptElement | null = null;

    const loadPdfJs = async () => {
      if (typeof window !== 'undefined' && pdfUrl) {
        try {
          console.log('[PdfViewer] Starting PDF load from:', pdfUrl);

          // Check if PDF.js is already loaded from CDN
          if (!(window as any).pdfjsLib) {
            console.log('[PdfViewer] Loading PDF.js from CDN...');

            // Load PDF.js from CDN using script tag
            await new Promise<void>((resolve, reject) => {
              scriptElement = document.createElement('script');
              scriptElement.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              scriptElement.async = true;
              scriptElement.onload = () => {
                console.log('[PdfViewer] PDF.js loaded from CDN');
                resolve();
              };
              scriptElement.onerror = () => {
                reject(new Error('Failed to load PDF.js from CDN'));
              };
              document.head.appendChild(scriptElement);
            });
          }

          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            throw new Error('PDF.js library not available');
          }

          console.log('[PdfViewer] pdfjs-dist loaded, version:', pdfjsLib.version);

          // Set worker path
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          console.log('[PdfViewer] Worker path set');

          // Add timeout to detect stuck loading
          const timeoutId = setTimeout(() => {
            if (mounted) {
              console.error('[PdfViewer] PDF loading timeout after 30 seconds');
              setError('PDF loading timeout - file may be too large or corrupted');
              setIsLoading(false);
            }
          }, 30000);

          console.log('[PdfViewer] Calling getDocument...');
          const loadingTask = pdfjsLib.getDocument(pdfUrl);

          loadingTask.onProgress = (progress: any) => {
            console.log('[PdfViewer] Loading progress:', progress.loaded, '/', progress.total);
          };

          const pdf = await loadingTask.promise;
          clearTimeout(timeoutId);

          if (!mounted) return;

          console.log('[PdfViewer] PDF loaded successfully, pages:', pdf.numPages);

          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setIsLoading(false);
        } catch (error: any) {
          console.error('[PdfViewer] Error loading PDF:', error);
          if (mounted) {
            setError(error?.message || String(error) || 'Failed to load PDF');
            setIsLoading(false);
          }
        }
      }
    };

    loadPdfJs();

    return () => {
      mounted = false;
      // Note: We don't remove the script since it might be used by other instances
    };
  }, [pdfUrl]);

  // Store viewport for coordinate conversion
  const [viewport, setViewport] = useState<any>(null);

  // Render PDF page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const pageViewport = page.getViewport({ scale });
      setViewport(pageViewport);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = pageViewport.height;
      canvas.width = pageViewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: pageViewport,
      };

      await page.render(renderContext).promise;
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Get fields for current page
  const currentPageFields = fields.filter((f) => f.page === currentPage - 1);

  // Convert PDF coordinates to canvas coordinates
  const pdfToCanvas = (rect: any) => {
    if (!viewport || !rect) return null;

    // Scale the rect values based on current zoom scale
    const scaledX = rect.x * scale;
    const scaledY = rect.y * scale;
    const scaledWidth = rect.width * scale;
    const scaledHeight = rect.height * scale;

    // PDF coordinates: origin at bottom-left
    // Canvas coordinates: origin at top-left
    // Need to flip Y axis
    // viewport.height is already scaled
    const x = scaledX;
    const y = viewport.height - scaledY - scaledHeight;

    return {
      left: x,
      top: y,
      width: scaledWidth,
      height: scaledHeight,
    };
  };

  // Handle field click
  const handleFieldClick = (field: PdfFieldInfo, event: React.MouseEvent) => {
    event.stopPropagation();
    onFieldClick(field);
  };

  const fitToWidth = async () => {
    if (!containerRef.current || !pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = containerRef.current.clientWidth;
    const newScale = (containerWidth - 40) / viewport.width;
    setScale(newScale);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded">
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 rounded border border-red-200">
        <p className="text-red-600 font-medium mb-2">Failed to load PDF</p>
        <p className="text-sm text-red-500">{error}</p>
        <p className="text-xs text-muted-foreground mt-4">Check browser console for details</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fitToWidth}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
          >
            Fit Width
          </button>
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            -
          </button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Canvas with Field Overlays */}
      <div ref={containerRef} className="relative border rounded bg-gray-50 overflow-auto" style={{ height: '75vh' }}>
        <div className="relative min-w-full min-h-full flex justify-center bg-gray-200/50 p-4">
          <div className="relative shadow-lg">
            <canvas ref={canvasRef} className="block bg-white" />

            {/* Field Overlays */}
          {currentPageFields.map((field) => {
            const canvasRect = pdfToCanvas(field.rect);
            if (!canvasRect) return null;

            const isMapped = mappedFields.includes(field.name);

            return (
              <div
                key={field.name}
                onClick={(e) => handleFieldClick(field, e)}
                className={`absolute cursor-pointer transition-all ${
                  isMapped
                    ? 'border-2 border-green-500 bg-green-100 bg-opacity-30 hover:bg-opacity-50'
                    : 'border-2 border-blue-500 bg-blue-100 bg-opacity-30 hover:bg-opacity-50'
                }`}
                style={{
                  left: `${canvasRect.left}px`,
                  top: `${canvasRect.top}px`,
                  width: `${canvasRect.width}px`,
                  height: `${canvasRect.height}px`,
                }}
                title={field.name}
              >
                {/* Field label */}
                <div
                  className={`absolute -top-5 left-0 px-1 text-xs font-mono whitespace-nowrap rounded-t ${
                    isMapped ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                  }`}
                >
                  {field.name}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 bg-blue-100" />
          <span>Unmapped Field</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-green-500 bg-green-100" />
          <span>Mapped Field</span>
        </div>
      </div>
    </div>
  );
}
