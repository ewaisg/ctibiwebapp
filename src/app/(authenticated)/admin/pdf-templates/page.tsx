import { ProtectedRoute } from "@/components/protected-route";
import { PdfTemplatesClientPage } from "./client-page";

export const dynamic = 'force-dynamic';

export default async function PdfTemplatesPage() {
  return (
    <ProtectedRoute requiredPermission="canAccessAdmin">
      <PdfTemplatesClientPage showBackButton={true} showTitle={true} />
    </ProtectedRoute>
  );
}