/**
 * PDF Report Design Tokens
 * Consistent design standards for all reports
 * Based on Civil Technology invoice design
 */

export const REPORT_COLORS = {
  // Primary header background (dark purple/slate)
  PRIMARY_HEADER_BG:'#272863',
  PRIMARY_HEADER_TEXT: '#FFFFFF', // White

  // Secondary header background (light grayish blue)
  SECONDARY_HEADER_BG: '#dedfea',
  SECONDARY_HEADER_TEXT: '#000000', // Black

  // Body content
  BODY_TEXT: '#000000',
  BODY_TEXT_LIGHT: '#333333',
  BODY_TEXT_MUTED: '#666666',

  // Table borders
  BORDER_COLOR: '#000000',
  BORDER_LIGHT: '#CCCCCC',

  // Background
  PAGE_BACKGROUND: '#FFFFFF',
  TABLE_ROW_ALT: '#F9F9F9', // Optional alternating row color

  // Status colors (optional)
  SUCCESS: '#28a745',
  WARNING: '#ffc107',
  DANGER: '#dc3545',
  INFO: '#17a2b8',
} as const;

export const REPORT_TYPOGRAPHY = {
  // Font sizes
  SIZE_TITLE: 14,
  SIZE_SUBTITLE: 12,
  SIZE_HEADER: 9,
  SIZE_BODY: 9,
  SIZE_SMALL: 8,
  SIZE_FOOTER: 7,

  // Font family
  FONT_FAMILY: 'Helvetica',
  FONT_FAMILY_BOLD: 'Helvetica-Bold',
} as const;

export const REPORT_LAYOUT = {
  // Page margins (in points, 72 points = 1 inch)
  MARGIN_TOP: 50,
  MARGIN_BOTTOM: 50,
  MARGIN_LEFT: 50,
  MARGIN_RIGHT: 50,

  // Logo dimensions (maintains 5:1 aspect ratio from source 1920x380)
  LOGO_WIDTH: 150,
  LOGO_HEIGHT: 30,
  LOGO_PATH: '/CTI_Horizontal.png',

  // Spacing
  SECTION_SPACING: 20,
  LINE_SPACING: 12,
  HEADER_SPACING: 25,
  LOGO_BOTTOM_SPACING: 15,
  FOOTER_HEIGHT: 30,

  // Table settings
  TABLE_BORDER_WIDTH: 0.5,
  ROW_HEIGHT: 18,
  HEADER_ROW_HEIGHT: 20,
  SECONDARY_HEADER_ROW_HEIGHT: 18,
} as const;

// Company information
export const COMPANY_INFO = {
  NAME: 'CIVIL TECHNOLOGY',
  ADDRESS_LINE1: '2413 Washington Street',
  ADDRESS_LINE2: 'Denver, Colorado 80205',
  PHONE: 'Tel: 303-292-0348',
  FAX: 'Fax: 303-388-9512',
  TAGLINE: 'Integrated Project Management & Support Service/ Infrastructure',
} as const;

// RGB color conversion helper
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}
