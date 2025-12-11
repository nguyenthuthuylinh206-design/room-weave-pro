import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useUser } from '@/hooks/useUser'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

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

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'export' | 'approve' | 'assign' | 'manage'

interface PermissionRouteProps {
  children: ReactNode
  module: PermissionModule
  action?: PermissionAction
  fallback?: ReactNode
}

/**
 * PermissionRoute - Route protection component based on user permissions
 * Admin users (super_admin, tenant_owner) bypass all permission checks
 */
export function PermissionRoute({ 
  children, 
  module, 
  action = 'view',
  fallback 
}: PermissionRouteProps) {
  const { user, isLoading: userLoading } = useUser()
  
  // Check if user is admin (bypass all permissions)
  const isAdmin = user?.user_level_code === 'super_admin' || user?.user_level_code === 'tenant_owner'
  
  // Only check permissions for non-admin users
  const { data: hasPermission, isLoading: permLoading } = useQuery({
    queryKey: ['route-permission', user?.id, module, action],
    queryFn: async () => {
      if (!user?.id) return false
      
      const { data, error } = await supabase.rpc('has_user_permission', {
        p_user_id: user.id,
        p_module: module,
        p_action: action,
      })
      
      if (error) {
        console.error('Permission check error:', error)
        return false
      }
      
      return data as boolean
    },
    enabled: !!user?.id && !isAdmin, // Only run for non-admin users
    staleTime: 5 * 60 * 1000,
  })
  
  // Show loading while user data is loading
  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // Admin users always have access
  if (isAdmin) {
    return <>{children}</>
  }
  
  // Show loading while checking permission for non-admin users
  if (permLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // Check permission result
  if (!hasPermission) {
    return fallback ? <>{fallback}</> : <Navigate to="/unauthorized" replace />
  }
  
  return <>{children}</>
}

/**
 * Hook to check multiple permissions at once
 */
export function useCanAccess(module: PermissionModule, actions: PermissionAction[]) {
  const { user, isLoading: userLoading } = useUser()
  const isAdmin = user?.user_level_code === 'super_admin' || user?.user_level_code === 'tenant_owner'
  
  // For admin, return all true immediately
  if (isAdmin && !userLoading) {
    return {
      permissions: actions.reduce((acc, action) => {
        acc[action] = true
        return acc
      }, {} as Record<PermissionAction, boolean>),
      isLoading: false,
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    }
  }
  
  // For non-admin, we'd need to check each permission
  // This is a simplified version that returns loading while user loads
  return {
    permissions: actions.reduce((acc, action) => {
      acc[action] = false
      return acc
    }, {} as Record<PermissionAction, boolean>),
    isLoading: userLoading,
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  }
}
