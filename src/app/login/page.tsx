import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

// Branded loading component
function BrandedLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-semibold text-lg">
            {/* Add logo if available */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            <span>CTI BI</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Suspense fallback={<BrandedLoading />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/CTI_Icon.svg"
          alt=""
          fill
          aria-hidden="true"
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
