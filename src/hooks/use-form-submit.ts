import { useState } from "react";

/**
 * Hook for managing form submission state
 * Prevents double-submit and provides loading/error states
 */
export interface UseFormSubmitOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseFormSubmitReturn {
  isSubmitting: boolean;
  error: Error | null;
  submit: (submitFn: () => Promise<void>) => Promise<void>;
  reset: () => void;
}

export function useFormSubmit(options: UseFormSubmitOptions = {}): UseFormSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = async (submitFn: () => Promise<void>) => {
    // Prevent double-submit
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFn();
      options.onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setIsSubmitting(false);
    setError(null);
  };

  return {
    isSubmitting,
    error,
    submit,
    reset,
  };
}

/**
 * Hook for managing async button state
 * Similar to useFormSubmit but for individual button actions
 */
export interface UseButtonLoadingReturn {
  isLoading: boolean;
  execute: (fn: () => Promise<void>) => Promise<void>;
}

export function useButtonLoading(): UseButtonLoadingReturn {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (fn: () => Promise<void>) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await fn();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    execute,
  };
}
