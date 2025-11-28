"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsPageSkeleton() {
  return (
    <>
      {/* Breadcrumbs Skeleton */}
      <div className="mb-4">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Page Header Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24 mb-2" />
              <div className="absolute top-4 right-4">
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-6">
        {/* Pie Chart Skeleton */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-2">
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            <div className="flex items-center justify-center h-[260px]">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>
        </Card>

        {/* Bar Chart Skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 h-[320px] flex flex-col justify-around py-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Skeleton className="h-4 w-48" />
          </div>
        </Card>
      </div>

      {/* Filters and Data Table Skeleton */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar Skeleton */}
          <Skeleton className="h-10 w-full" />

          {/* Filters Skeleton */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[160px]" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>

          {/* Table Skeleton */}
          <div className="rounded-lg border overflow-hidden">
            {/* Table Header */}
            <div className="bg-muted/30 p-4 border-b">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            </div>
            {/* Table Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="p-4 border-b last:border-0">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-8 rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between pt-4">
            <Skeleton className="h-5 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-9" />
                ))}
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function ProjectDetailPageSkeleton() {
  return (
    <>
      {/* Breadcrumbs Skeleton */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-40" />
        <div className="flex-1">
          <Skeleton className="h-9 w-64 mb-2" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24 mb-2" />
              <div className="absolute top-4 right-4">
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="mb-4">
        <div className="flex items-center gap-2 border-b">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Tab Content Skeleton */}
      <div className="space-y-6">
        {/* Progress Bars */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-3" />
              <Skeleton className="h-2 w-full rounded-full" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-3" />
              <Skeleton className="h-2 w-full rounded-full" />
            </CardHeader>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40 mb-1" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
