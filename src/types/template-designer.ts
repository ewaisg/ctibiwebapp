/**
 * Template Designer Data Models
 *
 * Defines types for visual PDF template designer
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export type PageSize = 'letter' | 'legal' | 'a4';
export type PageOrientation = 'portrait' | 'landscape';
export type TemplateCategory = 'visual' | 'uploaded';
export type TemplateType = 'invoice' | 'report' | 'cover-page' | 'custom';

// ============================================================================
// VISUAL TEMPLATE
// ============================================================================

export interface VisualTemplate {
  id: string;
  name: string;
  type: TemplateType;
  category: TemplateCategory;

  // Page settings
  pageSize: PageSize;
  orientation: PageOrientation;
  width: number;  // in points (1/72 inch)
  height: number; // in points

  // Template content
  elements: TemplateElement[];

  // Metadata
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: string;
  isActive: boolean;

  // Preview
  thumbnailUrl?: string;
  description?: string;
}

// ============================================================================
// TEMPLATE ELEMENTS
// ============================================================================

export type TemplateElement =
  | TextElement
  | ImageElement
  | TableElement
  | LineElement
  | RectangleElement
  | PageBreakElement;

export interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  locked?: boolean;
}

// Text Element
export interface TextElement extends BaseElement {
  type: 'text';
  content: string;  // Can include {{dataBind}}
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  padding?: number;
}

// Image Element
export interface ImageElement extends BaseElement {
  type: 'image';
  imageUrl: string;
  altText?: string;
  imageData?: string; // Base64 encoded
  preserveAspectRatio?: boolean;
  opacity?: number;
}

// Table Element
export interface TableElement extends BaseElement {
  type: 'table';
  dataSource?: string; // e.g., '{{invoiceItems}}'
  columns: TableColumn[];
  showBorders?: boolean;
  borderColor?: string;
  borderWidth?: number;
}

export interface TableColumn {
  header: string;
  dataKey: string;  // e.g., '{{item.name}}'
  width: number;
}

// Line Element
export interface LineElement extends BaseElement {
  type: 'line';
  color: string;
  lineWidth: number;
}

// Rectangle Element
export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  borderColor: string;
  borderWidth: number;
  fillColor: string;
  cornerRadius?: number;
}

// Page Break Element
export interface PageBreakElement extends BaseElement {
  type: 'pageBreak';
  // Forces a new page at this position
}

// ============================================================================
// CANVAS STATE
// ============================================================================

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

// ============================================================================
// DATA BINDING
// ============================================================================

export interface DataField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description?: string;
  children?: DataField[];
  example?: any;
}

export interface DataSchema {
  templateType: TemplateType;
  fields: DataField[];
}

// ============================================================================
// PAGE DIMENSIONS (in points, 1/72 inch)
// ============================================================================

export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },   // 8.5 x 11 inches
  legal: { width: 612, height: 1008 },   // 8.5 x 14 inches
  a4: { width: 595, height: 842 },       // 210 x 297 mm
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPageDimensions(
  pageSize: PageSize,
  orientation: PageOrientation
): { width: number; height: number } {
  const { width, height } = PAGE_DIMENSIONS[pageSize];

  if (orientation === 'landscape') {
    return { width: height, height: width };
  }

  return { width, height };
}

export function createDefaultTemplate(type: TemplateType = 'custom'): VisualTemplate {
  const { width, height } = getPageDimensions('letter', 'portrait');

  return {
    id: '',
    name: 'Untitled Template',
    type,
    category: 'visual',
    pageSize: 'letter',
    orientation: 'portrait',
    width,
    height,
    elements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '',
    isActive: true,
  };
}

export function createElement(type: TemplateElement['type']): TemplateElement {
  const baseId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const base: BaseElement = {
    id: baseId,
    type,
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    zIndex: 0,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        content: 'Text',
        fontSize: 12,
        fontFamily: 'Helvetica',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#000000',
        textAlign: 'left',
      };

    case 'image':
      return {
        ...base,
        type: 'image',
        imageUrl: '',
        imageType: 'custom',
        preserveAspectRatio: true,
      };

    case 'table':
      return {
        ...base,
        type: 'table',
        height: 200,
        dataSource: '{{items}}',
        columns: [
          { header: 'Column 1', field: '{{name}}', width: 100, align: 'left' },
        ],
        headerStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          color: '#FFFFFF',
          backgroundColor: '#2B3674',
          padding: 4,
        },
        rowStyle: {
          fontSize: 9,
          fontWeight: 'normal',
          color: '#000000',
          backgroundColor: '#FFFFFF',
          padding: 4,
        },
        showBorders: true,
        borderColor: '#CCCCCC',
        borderWidth: 1,
        rowHeight: 20,
      };

    case 'line':
      return {
        ...base,
        type: 'line',
        height: 0,
        x2: 300,
        y2: 100,
        strokeColor: '#000000',
        strokeWidth: 1,
      };

    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
        borderColor: '#000000',
        borderWidth: 1,
        fillColor: '#FFFFFF',
      };

    case 'pageBreak':
      return {
        ...base,
        type: 'pageBreak',
        width: 500,
        height: 20,
      };

    default:
      return base as TemplateElement;
  }
}
