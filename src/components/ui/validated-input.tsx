"use client";

import { forwardRef, useState } from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ValidatedInputBaseProps {
  label?: string;
  description?: string;
  error?: string;
  touched?: boolean;
  validating?: boolean;
  required?: boolean;
  className?: string;
  containerClassName?: string;
}

interface ValidatedInputProps
  extends ValidatedInputBaseProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  showValidIcon?: boolean;
}

/**
 * Input component with built-in validation display
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      description,
      error,
      touched,
      validating,
      required,
      className,
      containerClassName,
      showValidIcon = true,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s/g, "-")}`;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const showError = touched && error;
    const showValid = touched && !error && !validating && showValidIcon && props.value;

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label && (
          <Label htmlFor={inputId} className="flex items-center gap-1">
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
        )}

        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={showError ? true : undefined}
            aria-required={required}
            className={cn(
              showError && "border-destructive focus-visible:ring-destructive",
              (showValid || validating) && "pr-10",
              className
            )}
            {...props}
          />

          {/* Validation icons */}
          {validating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {showValid && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          )}
        </div>

        {/* Error message */}
        {showError && (
          <div
            id={errorId}
            className="flex items-center gap-1 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

interface ValidatedTextareaProps
  extends ValidatedInputBaseProps,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  showValidIcon?: boolean;
}

/**
 * Textarea component with built-in validation display
 */
export const ValidatedTextarea = forwardRef<
  HTMLTextAreaElement,
  ValidatedTextareaProps
>(
  (
    {
      label,
      description,
      error,
      touched,
      validating,
      required,
      className,
      containerClassName,
      showValidIcon = true,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${label?.toLowerCase().replace(/\s/g, "-")}`;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const showError = touched && error;
    const showValid = touched && !error && !validating && showValidIcon && props.value;

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label && (
          <Label htmlFor={inputId} className="flex items-center gap-1">
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
        )}

        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <div className="relative">
          <Textarea
            ref={ref}
            id={inputId}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={showError ? true : undefined}
            aria-required={required}
            className={cn(
              showError && "border-destructive focus-visible:ring-destructive",
              (showValid || validating) && "pr-10",
              className
            )}
            {...props}
          />

          {/* Validation icons */}
          {validating && (
            <div className="absolute right-3 top-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {showValid && (
            <div className="absolute right-3 top-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          )}
        </div>

        {/* Error message */}
        {showError && (
          <div
            id={errorId}
            className="flex items-center gap-1 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = "ValidatedTextarea";

/**
 * Input with character counter
 */
interface InputWithCounterProps extends ValidatedInputProps {
  maxLength: number;
  showCounter?: boolean;
}

export const InputWithCounter = forwardRef<
  HTMLInputElement,
  InputWithCounterProps
>(({ maxLength, showCounter = true, containerClassName, ...props }, ref) => {
  const [count, setCount] = useState(
    (props.value as string)?.length || (props.defaultValue as string)?.length || 0
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCount(e.target.value.length);
    props.onChange?.(e);
  };

  const isNearLimit = count / maxLength > 0.8;
  const isAtLimit = count >= maxLength;

  return (
    <ValidatedInput
      ref={ref}
      {...props}
      maxLength={maxLength}
      onChange={handleChange}
      containerClassName={cn(containerClassName, showCounter && "pb-6")}
    >
      {showCounter && (
        <div
          className={cn(
            "absolute right-0 bottom-0 text-xs",
            isAtLimit
              ? "text-destructive"
              : isNearLimit
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          )}
        >
          {count} / {maxLength}
        </div>
      )}
    </ValidatedInput>
  );
});

InputWithCounter.displayName = "InputWithCounter";

/**
 * Textarea with character counter
 */
interface TextareaWithCounterProps extends ValidatedTextareaProps {
  maxLength: number;
  showCounter?: boolean;
}

export const TextareaWithCounter = forwardRef<
  HTMLTextAreaElement,
  TextareaWithCounterProps
>(({ maxLength, showCounter = true, containerClassName, ...props }, ref) => {
  const [count, setCount] = useState(
    (props.value as string)?.length || (props.defaultValue as string)?.length || 0
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCount(e.target.value.length);
    props.onChange?.(e);
  };

  const isNearLimit = count / maxLength > 0.8;
  const isAtLimit = count >= maxLength;

  return (
    <div className={cn("relative", containerClassName)}>
      <ValidatedTextarea
        ref={ref}
        {...props}
        maxLength={maxLength}
        onChange={handleChange}
      />
      {showCounter && (
        <div
          className={cn(
            "absolute right-3 bottom-3 text-xs",
            isAtLimit
              ? "text-destructive"
              : isNearLimit
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          )}
        >
          {count} / {maxLength}
        </div>
      )}
    </div>
  );
});

TextareaWithCounter.displayName = "TextareaWithCounter";
