"use client";

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class InvoicingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Invoicing Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/invoicing';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[600px] p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred while processing your invoice
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive mb-2">Error Details:</p>
                  <p className="text-sm font-mono text-muted-foreground">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This error has been logged and we'll investigate the issue.</p>
                <p>You can try the following:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Click the button below to restart the invoicing workflow</li>
                  <li>Check your internet connection</li>
                  <li>Try refreshing your browser</li>
                  <li>Contact support if the problem persists</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={this.handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Start New Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/invoices'}
                >
                  Go to Invoices List
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
