import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value, delaying updates until after a specified delay.
 * Useful for optimizing search inputs, form validation, and API calls.
 *
 * @template T - The type of value to debounce
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * // Search input optimization
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     // API call only happens 500ms after user stops typing
 *     fetchSearchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 *
 * @example
 * // Form validation
 * const [email, setEmail] = useState('');
 * const debouncedEmail = useDebounce(email, 300);
 *
 * useEffect(() => {
 *   // Validate email only after user stops typing for 300ms
 *   validateEmail(debouncedEmail);
 * }, [debouncedEmail]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that provides a debounced callback function.
 * The callback will only execute after the specified delay since the last call.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns A debounced version of the callback
 *
 * @example
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   fetchSearchResults(query);
 * }, 500);
 *
 * // In component
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}
