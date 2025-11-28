import type { Role } from '@/types';

// Basic roles structure - you can expand this based on your needs
export async function getRoles(): Promise<Role[]> {
  // For now, return static roles. You can later implement Firestore-based roles
  return [
    {
      id: 'admin',
      name: 'Admin',
      description: 'Full system access',
      permissions: ['*']
    },
    {
      id: 'prime',
      name: 'Prime',
      description: 'Prime contractor access',
      permissions: ['dashboard', 'projects', 'invoices', 'timesheet', 'manpower', 'utilization', 'smart-tools']
    },
    {
      id: 'subconsultant',
      name: 'Subconsultant',
      description: 'Subconsultant access',
      permissions: ['invoices']
    }
  ];
}


