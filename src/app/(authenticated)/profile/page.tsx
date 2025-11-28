import { ProfileClientPage } from "./client-page";
import { ProtectedRoute } from "@/components/protected-route";

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  return (
    <ProtectedRoute requiredPermission="canAccessDashboard">
      <ProfileClientPage />
    </ProtectedRoute>
  );
}