"use client";

import { IconBriefcase, IconCash, IconUsers, IconTrendingUp } from "@tabler/icons-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { KpiMetric } from "@/types/dashboard";

interface SectionCardsProps {
  loading?: boolean;
  kpis: KpiMetric[];
  projectCount: number;
  employeesCount: number;
}

const skeletonArray = Array.from({ length: 4 });

export function SectionCards({ loading = false, kpis, projectCount, employeesCount }: SectionCardsProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

  const getKpi = (label: string): KpiMetric | undefined => kpis.find(kpi => kpi.label === label);

  const totalInvoiced = getKpi("Total Invoiced");
  const utilization = getKpi("Utilization");

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {skeletonArray.map((_, index) => (
          <Card key={index} className="@container/card">
            <CardHeader>
              <CardDescription>Loading...</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">--</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Projects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {projectCount}
          </CardTitle>
          <CardAction>
            <IconBriefcase />
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Invoiced</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(totalInvoiced?.value ?? 0)}
          </CardTitle>
          <CardAction>
            <IconCash />
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Employees</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {employeesCount}
          </CardTitle>
          <CardAction>
            <IconUsers />
          </CardAction>
        </CardHeader>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Utilization Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {utilization ? `${Math.round(utilization.value ?? 0)}${utilization.unit ?? '%'}` : '0%'}
          </CardTitle>
          <CardAction>
            <IconTrendingUp />
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}

