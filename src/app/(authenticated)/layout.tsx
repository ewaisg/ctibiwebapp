import React from "react";
import { AuthenticatedLayoutWrapper } from "@/components/authenticated-layout-wrapper";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayoutWrapper>{children}</AuthenticatedLayoutWrapper>;
}
