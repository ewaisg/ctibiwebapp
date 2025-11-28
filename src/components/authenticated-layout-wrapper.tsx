'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarLayout } from './sidebar-layout';

export function AuthenticatedLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(false);
      return;
    }

    if (!user) {
      // Don't render anything, redirect immediately
      setShouldRender(false);
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // User is authenticated, render the layout
    setShouldRender(true);
  }, [user, isLoading, router, pathname]);

  // Show nothing while checking auth or redirecting
  if (isLoading || !user || !shouldRender) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}
