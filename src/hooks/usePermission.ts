import { useUser } from './useUser'

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

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export'

interface Permission {
  module: PermissionModule
  actions: Record<PermissionAction, boolean>
}

// Default permissions based on role
const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    // All permissions
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 
    'reports', 'vendors', 'maintenance', 'settings', 'users'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: true, export: true }
  })),
  owner: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 
    'reports', 'vendors', 'maintenance', 'settings', 'users'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: true, export: true }
  })),
  hotel_manager: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 
    'reports', 'vendors', 'maintenance'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: false, export: true }
  })),
  department_manager: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 'maintenance'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: true, edit: true, delete: false, export: false }
  })),
  staff: [
    'dashboard', 'items', 'rooms', 'laundry', 'inventory', 'maintenance'
  ].map(module => ({
    module: module as PermissionModule,
    actions: { view: true, create: false, edit: false, delete: false, export: false }
  })),
}

export function usePermissions() {
  const { role, isLoading: userLoading } = useUser()

  // Use default permissions based on role
  // In a real app, these would be fetched from a database table
  const permissions = role ? DEFAULT_PERMISSIONS[role] || [] : []

  const can = (module: PermissionModule, action: PermissionAction): boolean => {
    if (!permissions) return false
    
    const modulePermission = permissions.find(p => p.module === module)
    if (!modulePermission) return false
    
    return modulePermission.actions[action] || false
  }

  const canAny = (module: PermissionModule): boolean => {
    if (!permissions) return false
    
    const modulePermission = permissions.find(p => p.module === module)
    if (!modulePermission) return false
    
    return Object.values(modulePermission.actions).some(allowed => allowed)
  }

  return {
    permissions,
    can,
    canAny,
    isLoading: userLoading,
  }
}

export function useHasPermission(module: PermissionModule, action: PermissionAction) {
  const { can, isLoading } = usePermissions()
  return { hasPermission: can(module, action), isLoading }
}
