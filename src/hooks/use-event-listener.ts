import { useEffect, useRef } from 'react';

/**
 * Hook for safely managing event listeners with automatic cleanup.
 * Handles SSR, proper TypeScript typing, and cleanup on unmount.
 *
 * @template K - The event type (keyof WindowEventMap, HTMLElementEventMap, etc.)
 * @param eventName - The name of the event to listen for
 * @param handler - The event handler function
 * @param element - The target element (default: window)
 * @param options - Event listener options (capture, once, passive, signal)
 *
 * @example
 * // Listen to window resize
 * useEventListener('resize', () => {
 *   console.log('Window resized');
 * });
 *
 * @example
 * // Listen to keypress
 * useEventListener('keydown', (e) => {
 *   if (e.key === 'Escape') {
 *     closeModal();
 *   }
 * });
 *
 * @example
 * // Listen to element click
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * useEventListener('click', handleClick, buttonRef);
 *
 * @example
 * // With options
 * useEventListener('scroll', handleScroll, undefined, { passive: true });
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: undefined,
  options?: boolean | AddEventListenerOptions
): void;

export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement = HTMLDivElement>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  element: React.RefObject<T>,
  options?: boolean | AddEventListenerOptions
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  element: React.RefObject<Document>,
  options?: boolean | AddEventListenerOptions
): void;

export function useEventListener<
  KW extends keyof WindowEventMap,
  KH extends keyof HTMLElementEventMap,
  T extends HTMLElement | void = void
>(
  eventName: KW | KH,
  handler: (event: WindowEventMap[KW] | HTMLElementEventMap[KH] | Event) => void,
  element?: React.RefObject<T>,
  options?: boolean | AddEventListenerOptions
) {
  // Create a ref that stores handler
  const savedHandler = useRef(handler);

  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler
  // without us needing to pass it in effect deps array
  // and potentially cause effect to re-run every render.
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // SSR guard: no window/document on server
    if (typeof window === 'undefined') return;

    // Define the listening target
    const targetElement: T | Window = element?.current ?? window;

    if (!targetElement?.addEventListener) {
      return;
    }

    // Create event listener that calls handler function stored in ref
    const eventListener: typeof handler = (event) => savedHandler.current(event);

    // Add event listener
    targetElement.addEventListener(eventName, eventListener as any, options);

    // Remove event listener on cleanup
    return () => {
      targetElement.removeEventListener(eventName, eventListener as any, options);
    };
  }, [eventName, element, options]); // Re-run if eventName, element, or options changes
}

/**
 * Hook for listening to multiple events on the same element.
 *
 * @example
 * useEventListeners({
 *   resize: () => console.log('resized'),
 *   scroll: () => console.log('scrolled'),
 * });
 */
export function useEventListeners<K extends keyof WindowEventMap>(
  events: Partial<Record<K, (event: WindowEventMap[K]) => void>>,
  element?: undefined,
  options?: boolean | AddEventListenerOptions
): void;

export function useEventListeners<K extends keyof HTMLElementEventMap, T extends HTMLElement = HTMLDivElement>(
  events: Partial<Record<K, (event: HTMLElementEventMap[K]) => void>>,
  element: React.RefObject<T>,
  options?: boolean | AddEventListenerOptions
): void;

export function useEventListeners<
  KW extends keyof WindowEventMap,
  KH extends keyof HTMLElementEventMap,
  T extends HTMLElement | void = void
>(
  events: Partial<Record<KW | KH, (event: any) => void>>,
  element?: React.RefObject<T>,
  options?: boolean | AddEventListenerOptions
) {
  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    const targetElement: T | Window = element?.current ?? window;

    if (!targetElement?.addEventListener) {
      return;
    }

    // Add all event listeners
    const cleanupFunctions: (() => void)[] = [];

    Object.entries(events).forEach(([eventName, handler]) => {
      if (handler) {
        targetElement.addEventListener(eventName, handler as any, options);
        cleanupFunctions.push(() => {
          targetElement.removeEventListener(eventName, handler as any, options);
        });
      }
    });

    // Cleanup all listeners
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [events, element, options]);
}
