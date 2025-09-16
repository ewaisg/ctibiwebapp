import { useAuth } from '@/hooks/use-auth';
import type { RolePermissions, UserRole } from '@/types';

// This hook derives permissions exclusively from users.role in Firestore.
// Valid roles: 'Admin' | 'Prime' | 'Subconsultant'.
// It proxies to useAuth(), which loads the user and maps role -> ROLE_PERMISSIONS.
export function usePermissions() {
  const { user, permissions, isLoading } = useAuth();

  const role: UserRole | undefined = user?.role;
  const hasPermission = (perm: keyof RolePermissions): boolean => {
    return Boolean(permissions?.[perm]);
  };

  const isRole = (r: UserRole): boolean => role === r;

  return {
    isLoading,
    role,
    user,
    permissions: permissions ?? ({} as RolePermissions),
    hasPermission,
    isRole,
  };
}
