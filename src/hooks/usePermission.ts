import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
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
  | 'subscription'
  | 'hotels'
  | 'purchase_orders'

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'assign' | 'manage'

// Map 'edit' to 'update' for database compatibility
const mapActionToDb = (action: PermissionAction): string => {
  return action === 'edit' ? 'update' : action
}

export function usePermissions() {
  const { user, isLoading: userLoading } = useUser()
  
  // Super admin and tenant owner bypass - they have all permissions
  const isAdmin = user?.user_level_code === 'super_admin' || user?.user_level_code === 'tenant_owner'

  const can = (module: PermissionModule, action: PermissionAction): boolean => {
    if (isAdmin) return true
    return false // Will be checked via useHasPermission for individual checks
  }

  const canAny = (module: PermissionModule): boolean => {
    if (isAdmin) return true
    return false
  }

  return {
    permissions: [],
    can,
    canAny,
    isLoading: userLoading,
    isAdmin,
  }
}

export function useHasPermission(module: PermissionModule, action: PermissionAction) {
  const { user, isLoading: userLoading } = useUser()
  
  // Super admin and tenant owner bypass
  const isAdmin = user?.user_level_code === 'super_admin' || user?.user_level_code === 'tenant_owner'
  
  const { data: hasPermission, isLoading: permLoading } = useQuery({
    queryKey: ['has-permission', user?.id, module, action],
    queryFn: async () => {
      if (!user?.id) return false
      if (isAdmin) return true
      
      const dbAction = mapActionToDb(action)
      
      const { data, error } = await supabase.rpc('has_user_permission', {
        p_user_id: user.id,
        p_module: module,
        p_action: dbAction,
      })
      
      if (error) {
        console.error('Permission check error:', error)
        return false
      }
      
      return data as boolean
    },
    enabled: !!user?.id && !isAdmin,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
  
  return { 
    hasPermission: isAdmin || (hasPermission ?? false), 
    isLoading: userLoading || permLoading 
  }
}
