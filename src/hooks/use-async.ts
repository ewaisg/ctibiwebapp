import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface AsyncReturn<T> extends AsyncState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for managing async operations with loading, error, and data states.
 * Handles component unmounting to prevent setState on unmounted component.
 *
 * @template T - The type of data returned by the async function
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute the function immediately on mount (default: false)
 * @returns AsyncReturn object with state and control functions
 *
 * @example
 * const { data, isLoading, error, execute } = useAsync(fetchInvoices, false);
 *
 * // Execute manually
 * const handleFetch = async () => {
 *   await execute(userId);
 * };
 *
 * // Auto-execute on mount
 * const { data, isLoading } = useAsync(() => fetchInvoices(userId), true);
 */
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate = false
): AsyncReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: immediate,
    isSuccess: false,
    isError: false,
  });

  // Track if component is mounted to prevent setState after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      if (!mountedRef.current) return null;

      setState({
        data: null,
        error: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      try {
        const response = await asyncFunction(...args);

        if (mountedRef.current) {
          setState({
            data: response,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false,
          });
        }

        return response;
      } catch (error) {
        if (mountedRef.current) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            isLoading: false,
            isSuccess: false,
            isError: true,
          });
        }

        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState({
        data: null,
        error: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
      });
    }
  }, []);

  // Execute immediately on mount if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
  };
}
