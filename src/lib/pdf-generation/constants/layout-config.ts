/**
 * PDF Layout Configuration
 * Page sizes and layout helpers
 */

export type PageOrientation = 'portrait' | 'landscape';

export interface PageSize {
  width: number;
  height: number;
}

// Standard page sizes (in points)
export const PAGE_SIZES = {
  LETTER_PORTRAIT: {
    width: 612, // 8.5 inches
    height: 792, // 11 inches
  },
  LETTER_LANDSCAPE: {
    width: 792,
    height: 612,
  },
  A4_PORTRAIT: {
    width: 595,
    height: 842,
  },
  A4_LANDSCAPE: {
    width: 842,
    height: 595,
  },
} as const;

export function getPageSize(orientation: PageOrientation = 'portrait'): PageSize {
  return orientation === 'portrait'
    ? PAGE_SIZES.LETTER_PORTRAIT
    : PAGE_SIZES.LETTER_LANDSCAPE;
}

export function getContentWidth(orientation: PageOrientation = 'portrait', marginLeft: number = 50, marginRight: number = 50): number {
  const pageSize = getPageSize(orientation);
  return pageSize.width - marginLeft - marginRight;
}

export function getContentHeight(orientation: PageOrientation = 'portrait', marginTop: number = 50, marginBottom: number = 50): number {
  const pageSize = getPageSize(orientation);
  return pageSize.height - marginTop - marginBottom;
}
