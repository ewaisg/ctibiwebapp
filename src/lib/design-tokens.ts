/**
 * Design System Tokens
 * Central place for design constants used throughout the application
 */

/**
 * Spacing scale (in pixels)
 * Based on 4px base unit for consistent spacing
 */
export const SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem',  // 8px
  md: '1rem',    // 16px
  lg: '1.5rem',  // 24px
  xl: '2rem',    // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
  '4xl': '6rem', // 96px
  '5xl': '8rem', // 128px
} as const;

/**
 * Border radius values
 */
export const RADIUS = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
} as const;

/**
 * Typography scale
 */
export const FONT_SIZE = {
  xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
  base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  '5xl': ['3rem', { lineHeight: '1' }],         // 48px
} as const;

/**
 * Font weights
 */
export const FONT_WEIGHT = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

/**
 * Z-index layers
 * Ensures consistent layering throughout the app
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

/**
 * Shadow values
 */
export const SHADOW = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Animation easings
 */
export const EASING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Touch target minimum sizes (for accessibility)
 */
export const TOUCH_TARGET = {
  min: '44px', // WCAG 2.1 Level AAA minimum
  recommended: '48px', // iOS HIG and Material Design recommendation
} as const;

/**
 * Focus ring styles for accessibility
 */
export const FOCUS_RING = {
  width: '2px',
  offset: '2px',
  style: 'solid',
  color: 'hsl(var(--ring))',
} as const;

/**
 * Container widths
 */
export const CONTAINER = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
} as const;

/**
 * Icon sizes
 */
export const ICON_SIZE = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '40px',
} as const;

/**
 * Button sizes
 */
export const BUTTON_SIZE = {
  sm: {
    height: '32px',
    padding: '0 12px',
    fontSize: FONT_SIZE.sm[0],
  },
  md: {
    height: '40px',
    padding: '0 16px',
    fontSize: FONT_SIZE.base[0],
  },
  lg: {
    height: '48px',
    padding: '0 24px',
    fontSize: FONT_SIZE.lg[0],
  },
} as const;

/**
 * Input sizes
 */
export const INPUT_SIZE = {
  sm: {
    height: '32px',
    padding: '0 12px',
    fontSize: FONT_SIZE.sm[0],
  },
  md: {
    height: '40px',
    padding: '0 16px',
    fontSize: FONT_SIZE.base[0],
  },
  lg: {
    height: '48px',
    padding: '0 20px',
    fontSize: FONT_SIZE.lg[0],
  },
} as const;

/**
 * Card padding
 */
export const CARD_PADDING = {
  sm: SPACING.md,
  md: SPACING.lg,
  lg: SPACING.xl,
} as const;

/**
 * Max widths for content
 */
export const MAX_WIDTH = {
  prose: '65ch',  // Optimal line length for readability
  form: '600px',  // Max width for forms
  dialog: '800px', // Max width for dialogs
} as const;

/**
 * Transition classes
 */
export const TRANSITION = {
  fast: `all ${DURATION.fast}ms ${EASING.easeInOut}`,
  normal: `all ${DURATION.normal}ms ${EASING.easeInOut}`,
  slow: `all ${DURATION.slow}ms ${EASING.easeInOut}`,
} as const;

/**
 * Layout grid
 */
export const GRID = {
  cols: {
    1: 'repeat(1, minmax(0, 1fr))',
    2: 'repeat(2, minmax(0, 1fr))',
    3: 'repeat(3, minmax(0, 1fr))',
    4: 'repeat(4, minmax(0, 1fr))',
    6: 'repeat(6, minmax(0, 1fr))',
    12: 'repeat(12, minmax(0, 1fr))',
  },
  gap: {
    sm: SPACING.sm,
    md: SPACING.md,
    lg: SPACING.lg,
  },
} as const;

/**
 * Utility function to get spacing value
 */
export function spacing(size: keyof typeof SPACING): string {
  return SPACING[size];
}

/**
 * Utility function to create responsive breakpoint media query
 */
export function breakpoint(size: keyof typeof BREAKPOINTS): string {
  return `@media (min-width: ${BREAKPOINTS[size]})`;
}

/**
 * Utility function to get z-index value
 */
export function zIndex(layer: keyof typeof Z_INDEX): number {
  return Z_INDEX[layer];
}
