"use client";

import { useEffect, useRef, useState } from 'react';
import type { VisualTemplate, TemplateElement, TextElement, ImageElement, RectangleElement, LineElement, TableElement } from '@/types/template-designer';

// Dynamically import fabric only on client side
let fabric: any = null;
if (typeof window !== 'undefined') {
  fabric = require('fabric').fabric;
}

interface DesignerCanvasProps {
  template: VisualTemplate;
  zoom: number;
  showGrid: boolean;
  selectedElement: TemplateElement | null;
  onSelectElement: (element: TemplateElement | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<TemplateElement>) => void;
  onDeleteElement: (elementId: string) => void;
}

export function DesignerCanvas({
  template,
  zoom,
  showGrid,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
}: DesignerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!fabric || !canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: template.width,
      height: template.height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    setIsInitialized(true);

    // Cleanup
    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [template.width, template.height]);

  // Update canvas dimensions when template changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setDimensions({
      width: template.width,
      height: template.height,
    });
  }, [template.width, template.height]);

  // Apply zoom
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setZoom(zoom);
    canvas.setDimensions({
      width: template.width * zoom,
      height: template.height * zoom,
    });
  }, [zoom, template.width, template.height]);

  // Render grid
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Remove existing grid
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (obj.data?.isGrid) {
        canvas.remove(obj);
      }
    });

    if (!showGrid) return;

    const gridSize = 20;
    const gridColor = '#e0e0e0';

    // Vertical lines
    for (let i = 0; i < template.width / gridSize; i++) {
      const line = new fabric.Line(
        [i * gridSize, 0, i * gridSize, template.height],
        {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          data: { isGrid: true },
        }
      );
      canvas.add(line);
      canvas.sendToBack(line);
    }

    // Horizontal lines
    for (let i = 0; i < template.height / gridSize; i++) {
      const line = new fabric.Line(
        [0, i * gridSize, template.width, i * gridSize],
        {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          data: { isGrid: true },
        }
      );
      canvas.add(line);
      canvas.sendToBack(line);
    }

    canvas.renderAll();
  }, [showGrid, template.width, template.height]);

  // Render template elements
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isInitialized) return;

    // Remove existing non-grid objects
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (!obj.data?.isGrid) {
        canvas.remove(obj);
      }
    });

    // Add elements to canvas
    template.elements.forEach((element) => {
      let fabricObject: fabric.Object | null = null;

      switch (element.type) {
        case 'text': {
          const textEl = element as TextElement;
          fabricObject = new fabric.Textbox(textEl.content || 'Text', {
            left: textEl.x,
            top: textEl.y,
            width: textEl.width,
            height: textEl.height,
            fontSize: textEl.fontSize,
            fontFamily: textEl.fontFamily,
            fill: textEl.color,
            fontWeight: textEl.fontWeight,
            fontStyle: textEl.fontStyle,
            textAlign: textEl.textAlign,
          });
          break;
        }

        case 'image': {
          const imgEl = element as ImageElement;
          if (imgEl.imageUrl) {
            fabric.Image.fromURL(imgEl.imageUrl, (img: any) => {
              img.set({
                left: imgEl.x,
                top: imgEl.y,
                scaleX: imgEl.width / (img.width || 1),
                scaleY: imgEl.height / (img.height || 1),
              });
              img.data = { elementId: imgEl.id };
              canvas.add(img);
              canvas.renderAll();
            });
          }
          break;
        }

        case 'rectangle': {
          const rectEl = element as RectangleElement;
          fabricObject = new fabric.Rect({
            left: rectEl.x,
            top: rectEl.y,
            width: rectEl.width,
            height: rectEl.height,
            fill: rectEl.fillColor,
            stroke: rectEl.borderColor,
            strokeWidth: rectEl.borderWidth,
          });
          break;
        }

        case 'line': {
          const lineEl = element as LineElement;
          fabricObject = new fabric.Line(
            [lineEl.x, lineEl.y, lineEl.x + lineEl.width, lineEl.y + lineEl.height],
            {
              stroke: lineEl.color,
              strokeWidth: lineEl.lineWidth,
            }
          );
          break;
        }

        case 'table': {
          const tableEl = element as TableElement;
          // Create a group for table
          const tableObjects: fabric.Object[] = [];
          const cellWidth = tableEl.width / tableEl.columns.length;
          const rowHeight = 30;

          // Header row
          tableEl.columns.forEach((col, colIndex) => {
            const headerRect = new fabric.Rect({
              left: tableEl.x + colIndex * cellWidth,
              top: tableEl.y,
              width: cellWidth,
              height: rowHeight,
              fill: '#f3f4f6',
              stroke: '#d1d5db',
              strokeWidth: 1,
            });

            const headerText = new fabric.Text(col.header, {
              left: tableEl.x + colIndex * cellWidth + 5,
              top: tableEl.y + 8,
              fontSize: 12,
              fontWeight: 'bold',
              fill: '#000000',
            });

            tableObjects.push(headerRect, headerText);
          });

          const tableGroup = new fabric.Group(tableObjects, {
            left: tableEl.x,
            top: tableEl.y,
            selectable: true,
          });

          fabricObject = tableGroup;
          break;
        }
      }

      if (fabricObject) {
        fabricObject.data = { elementId: element.id };
        canvas.add(fabricObject);
      }
    });

    canvas.renderAll();
  }, [template.elements, isInitialized]);

  // Handle selection
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleSelection = (e: fabric.IEvent) => {
      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.data?.elementId) {
        const element = template.elements.find(
          (el) => el.id === activeObject.data.elementId
        );
        if (element) {
          onSelectElement(element);
        }
      } else {
        onSelectElement(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => onSelectElement(null));

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
    };
  }, [template.elements, onSelectElement]);

  // Handle object modifications
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleModified = (e: fabric.IEvent) => {
      const target = e.target;
      if (!target || !target.data?.elementId) return;

      const elementId = target.data.elementId;
      const updates: Partial<TemplateElement> = {
        x: target.left || 0,
        y: target.top || 0,
      };

      if (target.width) updates.width = target.width * (target.scaleX || 1);
      if (target.height) updates.height = target.height * (target.scaleY || 1);

      onUpdateElement(elementId, updates);
    };

    canvas.on('object:modified', handleModified);
    canvas.on('object:moved', handleModified);
    canvas.on('object:scaled', handleModified);
    canvas.on('object:rotated', handleModified);

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('object:moved', handleModified);
      canvas.off('object:scaled', handleModified);
      canvas.off('object:rotated', handleModified);
    };
  }, [onUpdateElement]);

  // Handle keyboard events
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.data?.elementId) {
          onDeleteElement(activeObject.data.elementId);
          canvas.remove(activeObject);
          canvas.renderAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDeleteElement]);

  return (
    <div className="flex items-center justify-center p-8">
      <div
        className="shadow-lg"
        style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 200px)',
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
