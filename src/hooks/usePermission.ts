import { useUser } from './useUser'
import { useUserPermissions } from './usePermissions'

export type PermissionModule = 
  | 'dashboard'
  | 'items'
  | 'rooms'
  | 'laundry'
  | 'inventory'
  | 'reports'
  | 'vendors'
  | 'maintenance'
  | 'settings'
  | 'users'
  | 'subscription'
  | 'hotels'
  | 'purchase_orders'

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'assign' | 'manage'

interface Permission {
  module: PermissionModule
  actions: Record<PermissionAction, boolean>
}

// Default permissions based on role (legacy support)
const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 
    'reports', 'vendors', 'maintenance', 'settings', 'users', 'subscription', 'hotels', 'purchase_orders'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: true, export: true, approve: true, assign: true, manage: true }
  })),
  owner: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 
    'reports', 'vendors', 'maintenance', 'settings', 'users', 'subscription', 'hotels', 'purchase_orders'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: true, export: true, approve: true, assign: true, manage: true }
  })),
  hotel_manager: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 
    'reports', 'vendors', 'maintenance', 'purchase_orders'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: false, export: true, approve: true, assign: true, manage: false }
  })),
  department_manager: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 'maintenance'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: false, export: false, approve: false, assign: true, manage: false }
  })),
  staff: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 'maintenance'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: false, edit: false, delete: false, export: false, approve: false, assign: false, manage: false }
  })),
}

export function usePermissions() {
  const { role, isLoading: userLoading } = useUser()
  const { data: dbPermissions, isLoading: dbLoading } = useUserPermissions()

  // Use database permissions if available, otherwise fall back to default
  const permissions = role ? DEFAULT_PERMISSIONS[role] || [] : []

  const can = (module: PermissionModule, action: PermissionAction): boolean => {
    // First check database permissions
    if (dbPermissions && dbPermissions.length > 0) {
      return dbPermissions.some(p => p.module === module && p.action === action)
    }

    // Fall back to default permissions
    if (!permissions) return false
    
    const modulePermission = permissions.find(p => p.module === module)
    if (!modulePermission) return false
    
    return modulePermission.actions[action] || false
  }

  const canAny = (module: PermissionModule): boolean => {
    // First check database permissions
    if (dbPermissions && dbPermissions.length > 0) {
      return dbPermissions.some(p => p.module === module)
    }

    // Fall back to default permissions
    if (!permissions) return false
    
    const modulePermission = permissions.find(p => p.module === module)
    if (!modulePermission) return false
    
    return Object.values(modulePermission.actions).some(allowed => allowed)
  }

  return {
    permissions,
    can,
    canAny,
    isLoading: userLoading || dbLoading,
  }
}

export function useHasPermission(module: PermissionModule, action: PermissionAction) {
  const { can, isLoading } = usePermissions()
  return { hasPermission: can(module, action), isLoading }
}
