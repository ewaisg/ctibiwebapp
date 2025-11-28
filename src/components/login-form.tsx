'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

// Whitelist of allowed redirect paths
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/projects',
  '/invoices',
  '/invoicing',
  '/timesheets',
  '/manpower',
  '/utilization',
  '/profile',
  '/admin',
];

function isValidRedirectPath(path: string): boolean {
  try {
    // Check if it's a relative path (starts with /)
    if (!path.startsWith('/')) return false;

    // Check if it matches any allowed path or is a sub-path
    return ALLOWED_REDIRECT_PATHS.some(allowed =>
      path === allowed || path.startsWith(allowed + '/')
    );
  } catch {
    return false;
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { signInWithEmail, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await signInWithEmail(email, password, rememberMe);

      // Show success message
      toast.success(`Welcome back, ${user.displayName}!`);

      // Get redirect URL from search params and sanitize
      const redirectParam = searchParams.get('redirect');
      let redirectUrl: string | null = null;

      if (redirectParam && isValidRedirectPath(redirectParam)) {
        redirectUrl = redirectParam;
      }

      if (redirectUrl) {
        router.replace(redirectUrl);
      } else {
        // Redirect based on user role
        if (user.role === 'Subconsultant') {
          router.replace('/invoices');
        } else {
          router.replace('/dashboard');
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email); // Pre-fill with current email
    setShowResetDialog(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      await resetPassword(resetEmail);
      toast.success('Password reset email sent! Check your inbox.');
      setShowResetDialog(false);
      setResetEmail('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@ctidigitech.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          <div className="grid gap-3">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
            />
            <Label
              htmlFor="remember-me"
              className="text-sm font-normal cursor-pointer"
            >
              Remember me
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </div>
        <div className="text-center text-sm">
          Can&apos;t access your account?{" "}
          <button
            type="button"
            onClick={handleForgotPassword}
            className="underline underline-offset-4 hover:text-primary transition-colors"
            disabled={isLoading}
          >
            Reset password
          </button>
        </div>
      </form>

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="user@ctidigitech.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={isResetting}
                  autoComplete="email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetDialog(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
