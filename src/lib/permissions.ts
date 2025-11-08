import { AppRole } from '@/types/database.types'

// Permission definitions
export type Permission =
  | 'view_dashboard'
  | 'manage_items'
  | 'view_items'
  | 'manage_rooms'
  | 'view_rooms'
  | 'manage_laundry'
  | 'view_laundry'
  | 'manage_maintenance'
  | 'view_maintenance'
  | 'manage_users'
  | 'view_users'
  | 'manage_settings'
  | 'view_reports'

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [
    'view_dashboard',
    'manage_items',
    'view_items',
    'manage_rooms',
    'view_rooms',
    'manage_laundry',
    'view_laundry',
    'manage_maintenance',
    'view_maintenance',
    'manage_users',
    'view_users',
    'manage_settings',
    'view_reports',
  ],
  owner: [
    'view_dashboard',
    'manage_items',
    'view_items',
    'manage_rooms',
    'view_rooms',
    'manage_laundry',
    'view_laundry',
    'manage_maintenance',
    'view_maintenance',
    'manage_users',
    'view_users',
    'manage_settings',
    'view_reports',
  ],
  hotel_manager: [
    'view_dashboard',
    'manage_items',
    'view_items',
    'manage_rooms',
    'view_rooms',
    'manage_laundry',
    'view_laundry',
    'manage_maintenance',
    'view_maintenance',
    'view_users',
    'view_reports',
  ],
  department_manager: [
    'view_dashboard',
    'manage_items',
    'view_items',
    'view_rooms',
    'view_laundry',
    'view_maintenance',
    'view_users',
  ],
  staff: ['view_dashboard', 'view_items', 'view_rooms'],
}

export const hasPermission = (role: AppRole | null | undefined, permission: Permission): boolean => {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

export const hasAnyPermission = (
  role: AppRole | null | undefined,
  permissions: Permission[]
): boolean => {
  if (!role) return false
  return permissions.some((p) => hasPermission(role, p))
}

export const hasAllPermissions = (
  role: AppRole | null | undefined,
  permissions: Permission[]
): boolean => {
  if (!role) return false
  return permissions.every((p) => hasPermission(role, p))
}
