"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InvoiceTemplate, GlobalRate, FinancialReport, PaymentTracking, Service, User } from "@/types";

interface FinancialAdministrationProps {
  invoiceTemplates: InvoiceTemplate[];
  globalRates: GlobalRate[];
  financialReports: FinancialReport[];
  paymentTrackings: PaymentTracking[];
  services: Service[];
  users: User[];
}

export function FinancialAdministration({
  invoiceTemplates,
  globalRates,
  financialReports,
  paymentTrackings,
  services,
  users
}: FinancialAdministrationProps) {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Financial Administration</h2>
        <p className="text-muted-foreground">
          Manage invoice templates, global rates, and financial reporting
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Invoice Templates</TabsTrigger>
          <TabsTrigger value="rates">Global Rates</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Templates</CardTitle>
              <CardDescription>
                Manage invoice templates for different company types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {invoiceTemplates.length} template(s) configured
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Rates</CardTitle>
              <CardDescription>
                Manage standard billing rates for services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {globalRates.length} rate(s) configured
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Tracking</CardTitle>
              <CardDescription>
                Monitor invoice payments and outstanding amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {paymentTrackings.length} payment record(s)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Generate and view financial reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {financialReports.length} report(s) available
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}