import { Button } from "./button";
import { Card, CardContent } from "./card";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import {
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  WifiOff,
  ServerCrash,
  XCircle,
  type LucideIcon
} from "lucide-react";

interface ErrorStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  error?: Error | string;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  className?: string;
}

/**
 * Generic error state component
 */
export function ErrorState({
  icon: Icon = AlertCircle,
  title,
  description,
  error,
  onRetry,
  onGoBack,
  onGoHome,
  showDetails = false,
  className
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <Icon className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>

        {showDetails && errorMessage && (
          <Alert variant="destructive" className="mb-6 max-w-md text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="font-mono text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          {onGoBack && (
            <Button variant="outline" onClick={onGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          )}
          {onGoHome && (
            <Button variant="outline" onClick={onGoHome}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Error state for failed API requests
 */
interface ApiErrorStateProps {
  error?: Error | string;
  onRetry: () => void;
  operation?: string;
  showDetails?: boolean;
}

export function ApiErrorState({
  error,
  onRetry,
  operation = "load data",
  showDetails = false
}: ApiErrorStateProps) {
  return (
    <ErrorState
      icon={ServerCrash}
      title={`Failed to ${operation}`}
      description="We encountered an error while processing your request. Please try again in a moment."
      error={error}
      onRetry={onRetry}
      showDetails={showDetails}
    />
  );
}

/**
 * Error state for network errors
 */
interface NetworkErrorStateProps {
  onRetry: () => void;
}

export function NetworkErrorState({ onRetry }: NetworkErrorStateProps) {
  return (
    <ErrorState
      icon={WifiOff}
      title="Connection lost"
      description="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

/**
 * Error state for permission/authorization errors
 */
interface PermissionErrorStateProps {
  resource?: string;
  onGoBack?: () => void;
  onGoHome?: () => void;
}

export function PermissionErrorState({
  resource = "this resource",
  onGoBack,
  onGoHome
}: PermissionErrorStateProps) {
  return (
    <ErrorState
      icon={XCircle}
      title="Access denied"
      description={`You don't have permission to access ${resource}. Please contact your administrator if you believe this is an error.`}
      onGoBack={onGoBack}
      onGoHome={onGoHome}
    />
  );
}

/**
 * Error state for not found (404) errors
 */
interface NotFoundErrorStateProps {
  resource?: string;
  onGoBack?: () => void;
  onGoHome?: () => void;
}

export function NotFoundErrorState({
  resource = "page",
  onGoBack,
  onGoHome
}: NotFoundErrorStateProps) {
  return (
    <ErrorState
      icon={AlertCircle}
      title="Not found"
      description={`The ${resource} you're looking for doesn't exist or has been removed.`}
      onGoBack={onGoBack}
      onGoHome={onGoHome}
    />
  );
}

/**
 * Inline error alert for forms
 */
interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
}

export function InlineError({ message, onDismiss }: InlineErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-0 hover:bg-transparent"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Error toast notification content
 */
interface ErrorToastProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ErrorToast({ title, description, action }: ErrorToastProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="w-full mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Warning state (less severe than error)
 */
interface WarningStateProps {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
  onDismiss?: () => void;
}

export function WarningState({
  title,
  description,
  onAction,
  actionLabel = "Continue",
  onDismiss
}: WarningStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-amber-500/10 p-3 mb-4">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>

        <div className="flex gap-3">
          {onAction && (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inline warning alert
 */
interface InlineWarningProps {
  message: string;
  onDismiss?: () => void;
}

export function InlineWarning({ message, onDismiss }: InlineWarningProps) {
  return (
    <Alert className="border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between text-amber-900 dark:text-amber-100">
        <span>{message}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-0 hover:bg-transparent"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Error boundary fallback component
 */
interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorBoundaryFallback({ error, resetError }: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ErrorState
        icon={AlertCircle}
        title="Something went wrong"
        description="We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists."
        error={error}
        onRetry={resetError}
        showDetails={process.env.NODE_ENV === "development"}
      />
    </div>
  );
}
