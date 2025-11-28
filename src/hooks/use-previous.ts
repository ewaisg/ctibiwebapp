import { useEffect, useRef } from 'react';

/**
 * Hook that returns the previous value of a state or prop.
 * Useful for comparing current value with previous value in effects.
 *
 * @template T - The type of value to track
 * @param value - The current value
 * @returns The previous value (undefined on first render)
 *
 * @example
 * // Track previous count
 * const [count, setCount] = useState(0);
 * const previousCount = usePrevious(count);
 *
 * useEffect(() => {
 *   if (previousCount !== undefined) {
 *     console.log(`Count changed from ${previousCount} to ${count}`);
 *   }
 * }, [count, previousCount]);
 *
 * @example
 * // Track previous user to detect changes
 * const previousUser = usePrevious(user);
 *
 * useEffect(() => {
 *   if (previousUser?.id !== user?.id) {
 *     // User changed, fetch new data
 *     fetchUserData(user.id);
 *   }
 * }, [user, previousUser]);
 *
 * @example
 * // Track previous invoice status
 * const previousStatus = usePrevious(invoice?.status);
 *
 * useEffect(() => {
 *   if (previousStatus === 'draft' && invoice?.status === 'submitted') {
 *     toast.success('Invoice submitted successfully!');
 *   }
 * }, [invoice?.status, previousStatus]);
 */
export function usePrevious<T>(value: T): T | undefined {
  // The ref object is a generic container whose current property is mutable
  // and can hold any value, similar to an instance property on a class
  const ref = useRef<T | undefined>(undefined);

  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current;
}

/**
 * Hook that returns both the current and previous value.
 * Convenient when you need both values together.
 *
 * @template T - The type of value to track
 * @param value - The current value
 * @returns Tuple of [current, previous]
 *
 * @example
 * const [currentCount, previousCount] = useCurrentAndPrevious(count);
 *
 * if (previousCount !== undefined && currentCount > previousCount) {
 *   console.log('Count increased');
 * }
 */
export function useCurrentAndPrevious<T>(value: T): [T, T | undefined] {
  const previous = usePrevious(value);
  return [value, previous];
}

/**
 * Hook that tracks if a value has changed from its previous value.
 * Returns true if the value is different from the previous render.
 *
 * @template T - The type of value to track
 * @param value - The current value
 * @param compareFn - Optional custom comparison function (default: strict equality)
 * @returns true if value changed, false otherwise (undefined on first render)
 *
 * @example
 * // Simple change detection
 * const hasCountChanged = useHasChanged(count);
 *
 * @example
 * // Custom comparison for objects
 * const hasUserChanged = useHasChanged(user, (prev, curr) => prev?.id === curr?.id);
 *
 * if (hasUserChanged) {
 *   // React to user change
 *   fetchUserData(user.id);
 * }
 */
export function useHasChanged<T>(
  value: T,
  compareFn?: (previous: T | undefined, current: T) => boolean
): boolean | undefined {
  const previous = usePrevious(value);

  if (previous === undefined) {
    return undefined; // First render, no previous value
  }

  if (compareFn) {
    return !compareFn(previous, value);
  }

  return previous !== value;
}

/**
 * Hook that returns an object containing both current and previous values
 * of multiple tracked values. Useful for tracking multiple related values.
 *
 * @template T - Object type with values to track
 * @param values - Object with current values
 * @returns Object with current and previous values for each key
 *
 * @example
 * const { current, previous } = usePreviousDistinct({
 *   userId: user.id,
 *   invoiceId: invoice.id,
 *   status: invoice.status,
 * });
 *
 * if (previous.userId !== current.userId) {
 *   // User changed
 * }
 * if (previous.status !== current.status) {
 *   // Status changed
 * }
 */
export function usePreviousDistinct<T extends Record<string, any>>(
  values: T
): { current: T; previous: Partial<T> } {
  const ref = useRef<Partial<T>>({});

  useEffect(() => {
    ref.current = { ...values };
  });

  return {
    current: values,
    previous: ref.current,
  };
}
