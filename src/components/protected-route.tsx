'use client';

import { useAuth } from '@/hooks/use-auth';
import { UserRole, RolePermissions } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof RolePermissions;
  allowedRoles?: UserRole[];
  fallbackRoute?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  allowedRoles}: ProtectedRouteProps) {
  const { user, isLoading, hasPermission, isRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // If no user is authenticated, redirect to login
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check if user has required permission
    if (requiredPermission && !hasPermission(requiredPermission)) {
      // Redirect based on user role
      if (isRole('Subconsultant')) {
        router.replace('/invoices');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    // Check if user has allowed role
    if (allowedRoles && !allowedRoles.some(role => isRole(role))) {
      // Redirect based on user role
      if (isRole('Subconsultant')) {
        router.replace('/invoices');
      } else {
        router.replace('/dashboard');
      }
      return;
    }
  }, [user, isLoading, requiredPermission, allowedRoles, hasPermission, isRole, router, pathname]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not authenticated, don't render children
  if (!user) {
    return null;
  }

  // If permission check fails, don't render children
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  // If role check fails, don't render children
  if (allowedRoles && !allowedRoles.some(role => isRole(role))) {
    return null;
  }

  return <>{children}</>;
}
