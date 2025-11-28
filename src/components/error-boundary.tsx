'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for graceful error handling in React components.
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // Custom fallback
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <h2>Something went wrong</h2>
 *       <p>{error.message}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With error logging
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     console.error('Error caught by boundary:', error, errorInfo);
 *     // Send to error tracking service
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. Please try again or contact support if the problem persists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="rounded-md bg-muted p-3 text-sm font-mono overflow-auto max-h-[200px]">
                  <div className="font-semibold text-destructive mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.reset} variant="default" className="flex-1">
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for specific features.
 * Shows a simpler inline error message instead of full-page error.
 *
 * @example
 * <FeatureErrorBoundary featureName="Invoice Form">
 *   <InvoiceForm />
 * </FeatureErrorBoundary>
 */
export function FeatureErrorBoundary({
  children,
  featureName = 'Feature'
}: {
  children: ReactNode;
  featureName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-semibold text-sm">{featureName} Error</h3>
                <p className="text-sm text-muted-foreground">
                  {process.env.NODE_ENV === 'development'
                    ? error.message
                    : 'An error occurred while loading this feature.'
                  }
                </p>
              </div>
              <Button onClick={reset} size="sm" variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
