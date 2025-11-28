/**
 * Accessibility Utilities
 * Helper functions for improving application accessibility
 */

/**
 * Generate a unique ID for ARIA attributes
 */
let idCounter = 0;
export function generateId(prefix: string = 'id'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * ARIA label generators for common UI patterns
 */
export const ariaLabels = {
  /**
   * Generate label for icon-only button
   */
  iconButton: (action: string, target?: string): string => {
    return target ? `${action} ${target}` : action;
  },

  /**
   * Generate label for close button
   */
  closeButton: (context?: string): string => {
    return context ? `Close ${context}` : 'Close';
  },

  /**
   * Generate label for menu button
   */
  menuButton: (target?: string): string => {
    return target ? `Open ${target} menu` : 'Open menu';
  },

  /**
   * Generate label for pagination
   */
  pagination: {
    previous: () => 'Go to previous page',
    next: () => 'Go to next page',
    page: (page: number) => `Go to page ${page}`,
    current: (page: number) => `Current page, page ${page}`,
  },

  /**
   * Generate label for sorting
   */
  sort: (column: string, direction?: 'asc' | 'desc'): string => {
    if (!direction) return `Sort by ${column}`;
    return `${column}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}`;
  },

  /**
   * Generate label for search
   */
  search: (context?: string): string => {
    return context ? `Search ${context}` : 'Search';
  },

  /**
   * Generate label for filters
   */
  filter: (type: string): string => {
    return `Filter by ${type}`;
  },

  /**
   * Generate label for actions on items
   */
  itemAction: (action: string, item: string, identifier?: string): string => {
    return identifier ? `${action} ${item} ${identifier}` : `${action} ${item}`;
  },

  /**
   * Generate label for loading states
   */
  loading: (context?: string): string => {
    return context ? `Loading ${context}` : 'Loading';
  },

  /**
   * Generate label for status badges
   */
  status: (status: string, context?: string): string => {
    return context ? `${context} status: ${status}` : `Status: ${status}`;
  },
};

/**
 * ARIA live region announcer
 * For announcing dynamic content changes to screen readers
 */
export class LiveRegionAnnouncer {
  private static instance: LiveRegionAnnouncer;
  private politeRegion: HTMLDivElement | null = null;
  private assertiveRegion: HTMLDivElement | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.createRegions();
    }
  }

  static getInstance(): LiveRegionAnnouncer {
    if (!LiveRegionAnnouncer.instance) {
      LiveRegionAnnouncer.instance = new LiveRegionAnnouncer();
    }
    return LiveRegionAnnouncer.instance;
  }

  private createRegions(): void {
    // Create polite live region
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('role', 'status');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.className = 'sr-only';
    document.body.appendChild(this.politeRegion);

    // Create assertive live region
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('role', 'alert');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.className = 'sr-only';
    document.body.appendChild(this.assertiveRegion);
  }

  /**
   * Announce a message politely (waits for screen reader to finish)
   */
  announcePolite(message: string): void {
    if (!this.politeRegion) return;
    this.politeRegion.textContent = '';
    setTimeout(() => {
      if (this.politeRegion) this.politeRegion.textContent = message;
    }, 100);
  }

  /**
   * Announce a message assertively (interrupts screen reader)
   */
  announceAssertive(message: string): void {
    if (!this.assertiveRegion) return;
    this.assertiveRegion.textContent = '';
    setTimeout(() => {
      if (this.assertiveRegion) this.assertiveRegion.textContent = message;
    }, 100);
  }
}

/**
 * Hook-friendly announcer functions
 */
export const announce = {
  polite: (message: string) => {
    LiveRegionAnnouncer.getInstance().announcePolite(message);
  },
  assertive: (message: string) => {
    LiveRegionAnnouncer.getInstance().announceAssertive(message);
  },
};

/**
 * Keyboard navigation helpers
 */
export const keyboard = {
  /**
   * Check if key is Enter or Space (for button-like elements)
   */
  isActionKey: (event: React.KeyboardEvent): boolean => {
    return event.key === 'Enter' || event.key === ' ';
  },

  /**
   * Check if key is an arrow key
   */
  isArrowKey: (event: React.KeyboardEvent): boolean => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
  },

  /**
   * Check if key is Escape
   */
  isEscape: (event: React.KeyboardEvent): boolean => {
    return event.key === 'Escape';
  },

  /**
   * Handle list navigation with arrow keys
   */
  handleListNavigation: (
    event: React.KeyboardEvent,
    currentIndex: number,
    itemCount: number,
    onNavigate: (newIndex: number) => void
  ): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : 0;
      onNavigate(newIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const newIndex = currentIndex > 0 ? currentIndex - 1 : itemCount - 1;
      onNavigate(newIndex);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onNavigate(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      onNavigate(itemCount - 1);
    }
  },
};

/**
 * Focus management utilities
 */
export const focus = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    );
  },

  /**
   * Focus the first focusable element in a container
   */
  focusFirst: (container: HTMLElement): void => {
    const elements = focus.getFocusableElements(container);
    if (elements.length > 0) {
      elements[0].focus();
    }
  },

  /**
   * Create a focus trap (returns cleanup function)
   */
  createTrap: (container: HTMLElement): (() => void) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const elements = focus.getFocusableElements(container);
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  },
};

/**
 * Screen reader only CSS class
 * Add this to your global CSS:
 * .sr-only {
 *   position: absolute;
 *   width: 1px;
 *   height: 1px;
 *   padding: 0;
 *   margin: -1px;
 *   overflow: hidden;
 *   clip: rect(0, 0, 0, 0);
 *   white-space: nowrap;
 *   border-width: 0;
 * }
 */
export const SR_ONLY_CLASS = 'sr-only';

/**
 * Generate ARIA attributes for form fields
 */
export function getFormFieldAria(
  id: string,
  options: {
    label?: string;
    error?: string;
    description?: string;
    required?: boolean;
  }
) {
  const describedBy: string[] = [];

  if (options.description) {
    describedBy.push(`${id}-description`);
  }
  if (options.error) {
    describedBy.push(`${id}-error`);
  }

  return {
    id,
    'aria-label': options.label,
    'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
    'aria-invalid': options.error ? true : undefined,
    'aria-required': options.required ? true : undefined,
  };
}

/**
 * Generate ARIA attributes for tables
 */
export function getTableAria(
  label: string,
  description?: string
) {
  return {
    role: 'table',
    'aria-label': label,
    'aria-describedby': description ? `${generateId('table')}-description` : undefined,
  };
}

/**
 * Skip to main content link
 * Place this at the top of your layout
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
    >
      Skip to main content
    </a>
  );
}
