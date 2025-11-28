"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CompanyHealthCardProps {
  title: string;
  value: string | number;
  description?: string;
}

function CompanyHealthCard({ title, value, description }: CompanyHealthCardProps) {
  return (
    <Card className="p-4">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{String(value)}</CardTitle>
        {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
      </CardHeader>
    </Card>
  );
}

export default memo(CompanyHealthCard);
