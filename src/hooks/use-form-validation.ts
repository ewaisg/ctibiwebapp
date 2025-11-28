"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDebounce } from "./use-debounce";

/**
 * Validation rule
 */
export type ValidationRule<T> = {
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
};

/**
 * Field configuration
 */
export interface FieldConfig<T> {
  required?: boolean | string; // true or custom message
  rules?: ValidationRule<T>[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

/**
 * Field state
 */
export interface FieldState {
  error?: string;
  touched: boolean;
  validating: boolean;
  valid: boolean;
}

/**
 * Form validation hook
 * Provides real-time validation with debouncing
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  config: Partial<Record<keyof T, FieldConfig<T[keyof T]>>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [fieldStates, setFieldStates] = useState<Record<keyof T, FieldState>>(
    () => {
      const initial = {} as Record<keyof T, FieldState>;
      Object.keys(initialValues).forEach((key) => {
        initial[key as keyof T] = {
          touched: false,
          validating: false,
          valid: true,
        };
      });
      return initial;
    }
  );

  const validationTimeouts = useRef<Map<keyof T, NodeJS.Timeout>>(new Map());

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    async (name: keyof T, value: T[keyof T]): Promise<string | undefined> => {
      const fieldConfig = config[name];
      if (!fieldConfig) return undefined;

      // Check required
      if (fieldConfig.required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          const message =
            typeof fieldConfig.required === "string"
              ? fieldConfig.required
              : `${String(name)} is required`;
          return message;
        }
      }

      // Run validation rules
      if (fieldConfig.rules) {
        for (const rule of fieldConfig.rules) {
          const isValid = await rule.validate(value);
          if (!isValid) {
            return rule.message;
          }
        }
      }

      return undefined;
    },
    [config]
  );

  /**
   * Update field state
   */
  const updateFieldState = useCallback(
    (name: keyof T, updates: Partial<FieldState>) => {
      setFieldStates((prev) => ({
        ...prev,
        [name]: { ...prev[name], ...updates },
      }));
    },
    []
  );

  /**
   * Validate field with debouncing
   */
  const validateFieldDebounced = useCallback(
    async (name: keyof T, value: T[keyof T]) => {
      const fieldConfig = config[name];
      const debounceMs = fieldConfig?.debounceMs ?? 300;

      // Clear existing timeout
      const existingTimeout = validationTimeouts.current.get(name);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set validating state
      updateFieldState(name, { validating: true });

      // Create new timeout
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(async () => {
          const error = await validateField(name, value);
          updateFieldState(name, {
            error,
            validating: false,
            valid: !error,
          });
          validationTimeouts.current.delete(name);
          resolve();
        }, debounceMs);

        validationTimeouts.current.set(name, timeout);
      });
    },
    [config, validateField, updateFieldState]
  );

  /**
   * Handle field change
   */
  const handleChange = useCallback(
    async (name: keyof T, value: T[keyof T]) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      const fieldConfig = config[name];
      if (fieldConfig?.validateOnChange) {
        await validateFieldDebounced(name, value);
      }
    },
    [config, validateFieldDebounced]
  );

  /**
   * Handle field blur
   */
  const handleBlur = useCallback(
    async (name: keyof T) => {
      updateFieldState(name, { touched: true });

      const fieldConfig = config[name];
      if (fieldConfig?.validateOnBlur) {
        const value = values[name];
        const error = await validateField(name, value);
        updateFieldState(name, { error, valid: !error });
      }
    },
    [config, values, validateField, updateFieldState]
  );

  /**
   * Validate all fields
   */
  const validateAll = useCallback(async (): Promise<boolean> => {
    const errors = await Promise.all(
      Object.keys(values).map(async (key) => {
        const name = key as keyof T;
        const value = values[name];
        const error = await validateField(name, value);

        updateFieldState(name, {
          error,
          touched: true,
          valid: !error,
          validating: false,
        });

        return error;
      })
    );

    return errors.every((error) => !error);
  }, [values, validateField, updateFieldState]);

  /**
   * Reset form
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setFieldStates(() => {
      const initial = {} as Record<keyof T, FieldState>;
      Object.keys(initialValues).forEach((key) => {
        initial[key as keyof T] = {
          touched: false,
          validating: false,
          valid: true,
        };
      });
      return initial;
    });
  }, [initialValues]);

  /**
   * Set field error manually
   */
  const setFieldError = useCallback(
    (name: keyof T, error: string) => {
      updateFieldState(name, { error, valid: false, touched: true });
    },
    [updateFieldState]
  );

  /**
   * Get field props for input binding
   */
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      value: values[name],
      onChange: (value: T[keyof T]) => handleChange(name, value),
      onBlur: () => handleBlur(name),
      error: fieldStates[name]?.error,
      touched: fieldStates[name]?.touched,
      validating: fieldStates[name]?.validating,
    }),
    [values, fieldStates, handleChange, handleBlur]
  );

  /**
   * Check if form is valid
   */
  const isValid = Object.values(fieldStates).every(
    (state) => (state as FieldState).valid
  );

  /**
   * Check if form has been touched
   */
  const isTouched = Object.values(fieldStates).some(
    (state) => (state as FieldState).touched
  );

  /**
   * Check if any field is validating
   */
  const isValidating = Object.values(fieldStates).some(
    (state) => (state as FieldState).validating
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      validationTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return {
    values,
    fieldStates,
    isValid,
    isTouched,
    isValidating,
    handleChange,
    handleBlur,
    validateField,
    validateAll,
    reset,
    setFieldError,
    getFieldProps,
  };
}

/**
 * Common validation rules
 */
export const validators = {
  email: (message = "Invalid email address"): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  minLength: (
    min: number,
    message?: string
  ): ValidationRule<string> => ({
    validate: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (
    max: number,
    message?: string
  ): ValidationRule<string> => ({
    validate: (value) => value.length <= max,
    message: message || `Must be at most ${max} characters`,
  }),

  pattern: (
    regex: RegExp,
    message = "Invalid format"
  ): ValidationRule<string> => ({
    validate: (value) => regex.test(value),
    message,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: message || `Must be at most ${max}`,
  }),

  url: (message = "Invalid URL"): ValidationRule<string> => ({
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  phone: (message = "Invalid phone number"): ValidationRule<string> => ({
    validate: (value) =>
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(value),
    message,
  }),

  custom: <T>(
    validate: (value: T) => boolean | Promise<boolean>,
    message: string
  ): ValidationRule<T> => ({
    validate,
    message,
  }),
};
