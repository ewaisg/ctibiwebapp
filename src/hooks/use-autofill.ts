import { useRef, useCallback, useState } from "react";

export interface AutofillController {
  inProgress: boolean;
  lastKey: string | null;
  error: Error | null;
  run: (key: string, task: () => Promise<void>) => Promise<{ success: boolean; error?: Error }>;
  canRun: (key: string) => boolean;
  reset: () => void;
}

/**
 * Hook for managing autofill operations with deduplication and error handling.
 * Prevents duplicate operations with the same key from running concurrently.
 *
 * @example
 * const autofill = useAutofill();
 *
 * const handleAutofill = async () => {
 *   const { success, error } = await autofill.run('populate-invoice', async () => {
 *     const data = await fetchData();
 *     setFormData(data);
 *   });
 *
 *   if (success) {
 *     toast.success('Data populated');
 *   } else {
 *     toast.error(error?.message || 'Failed to populate');
 *   }
 * };
 */
export function useAutofill(): AutofillController {
  const inProgressRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);

  // Use state for reactive values that components need to observe
  const [inProgress, setInProgress] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const canRun = useCallback((key: string) => {
    // Can run if: not in progress OR in progress with a different key
    return !(inProgressRef.current && lastKeyRef.current === key);
  }, []);

  const run = useCallback(
    async (key: string, task: () => Promise<void>): Promise<{ success: boolean; error?: Error }> => {
      // Check if we can run
      if (!canRun(key)) {
        return { success: false, error: new Error('Autofill already in progress for this key') };
      }

      // Set in-progress state
      inProgressRef.current = true;
      lastKeyRef.current = key;
      setInProgress(true);
      setLastKey(key);
      setError(null);

      try {
        await task();
        setError(null);
        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error(`Autofill error for key "${key}":`, error);
        return { success: false, error };
      } finally {
        // Always clear in-progress state
        inProgressRef.current = false;
        setInProgress(false);
      }
    },
    [canRun]
  );

  const reset = useCallback(() => {
    inProgressRef.current = false;
    lastKeyRef.current = null;
    setInProgress(false);
    setLastKey(null);
    setError(null);
  }, []);

  return {
    inProgress,
    lastKey,
    error,
    run,
    canRun,
    reset,
  };
}
