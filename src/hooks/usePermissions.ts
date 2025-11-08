import { useCallback } from 'react'
import { useUser } from './useUser'
import { AppRole, Department } from '@/types/database.types'

// Permission constants
export const PERMISSIONS = {
  // Users
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // Hotels
  MANAGE_HOTELS: 'manage_hotels',
  VIEW_HOTELS: 'view_hotels',
  
  // Items
  MANAGE_ITEMS: 'manage_items',
  VIEW_ITEMS: 'view_items',
  EXPORT_ITEMS: 'export_items',
  
  // Rooms
  MANAGE_ROOMS: 'manage_rooms',
  CHECK_ROOMS: 'check_rooms',
  
  // Laundry
  MANAGE_LAUNDRY: 'manage_laundry',
  RECEIVE_LAUNDRY: 'receive_laundry',
  
  // Inventory
  MANAGE_INVENTORY: 'manage_inventory',
  ADJUST_INVENTORY: 'adjust_inventory',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  
  // Settings
  MANAGE_SETTINGS: 'manage_settings',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role hierarchy for comparison
const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 5,
  owner: 4,
  hotel_manager: 3,
  department_manager: 2,
  staff: 1,
}

// Permission rules - more maintainable and flexible
const PERMISSION_RULES: Record<Permission, (role: AppRole, department?: Department) => boolean> = {
  // Users
  [PERMISSIONS.MANAGE_USERS]: (role) => 
    ['super_admin', 'owner'].includes(role),
  [PERMISSIONS.VIEW_USERS]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.staff,
  
  // Hotels
  [PERMISSIONS.MANAGE_HOTELS]: (role) => 
    ['super_admin', 'owner'].includes(role),
  [PERMISSIONS.VIEW_HOTELS]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.staff,
  
  // Items
  [PERMISSIONS.MANAGE_ITEMS]: (role, department) => 
    ['super_admin', 'owner', 'hotel_manager'].includes(role) ||
    (role === 'department_manager' && department === 'housekeeping'),
  [PERMISSIONS.VIEW_ITEMS]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.staff,
  [PERMISSIONS.EXPORT_ITEMS]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.hotel_manager,
  
  // Rooms
  [PERMISSIONS.MANAGE_ROOMS]: (role, department) => 
    ['super_admin', 'owner', 'hotel_manager'].includes(role) ||
    (role === 'department_manager' && department === 'housekeeping'),
  [PERMISSIONS.CHECK_ROOMS]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.staff,
  
  // Laundry
  [PERMISSIONS.MANAGE_LAUNDRY]: (role, department) => 
    ['super_admin', 'owner', 'hotel_manager'].includes(role) ||
    (role === 'department_manager' && department === 'housekeeping'),
  [PERMISSIONS.RECEIVE_LAUNDRY]: (role, department) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.department_manager ||
    (role === 'staff' && department === 'housekeeping'),
  
  // Inventory
  [PERMISSIONS.MANAGE_INVENTORY]: (role, department) => 
    ['super_admin', 'owner', 'hotel_manager'].includes(role) ||
    (role === 'department_manager' && department === 'housekeeping'),
  [PERMISSIONS.ADJUST_INVENTORY]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.hotel_manager,
  
  // Reports
  [PERMISSIONS.VIEW_REPORTS]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.department_manager,
  [PERMISSIONS.EXPORT_REPORTS]: (role) => 
    ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.hotel_manager,
  
  // Settings
  [PERMISSIONS.MANAGE_SETTINGS]: (role) => 
    ['super_admin', 'owner'].includes(role),
}

export const usePermissions = () => {
  const { user, role, isLoading } = useUser()
  
  const can = useCallback((permission: Permission): boolean => {
    if (!role || isLoading) return false
    
    const rule = PERMISSION_RULES[permission]
    if (!rule) return false
    
    return rule(role, user?.department as Department)
  }, [role, user?.department, isLoading])
  
  const hasRole = useCallback((requiredRole: AppRole): boolean => {
    if (!role || isLoading) return false
    return role === requiredRole
  }, [role, isLoading])
  
  const hasMinRole = useCallback((minRole: AppRole): boolean => {
    if (!role || isLoading) return false
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
  }, [role, isLoading])
  
  return { 
    can,
    hasRole,
    hasMinRole,
    isLoading,
  }
}
