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
  
  // IMPORTANT: Wait for user data to load first before any checks
  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // If no user after loading complete, redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />
  }
  
  // Check if user is admin - MUST happen AFTER user is confirmed loaded
  const isAdmin = user.user_level_code === 'super_admin' || user.user_level_code === 'tenant_owner'
  
  // Admin users ALWAYS have access - bypass all permission checks
  if (isAdmin) {
    return <>{children}</>
  }
  
  // For non-admin users, check permissions via RPC
  return (
    <NonAdminPermissionCheck 
      userId={user.id} 
      module={module} 
      action={action}
      fallback={fallback}
    >
      {children}
    </NonAdminPermissionCheck>
  )
}

/**
 * Separate component for non-admin permission checking
 * This ensures hooks are called consistently
 */
function NonAdminPermissionCheck({ 
  userId, 
  module, 
  action, 
  fallback, 
  children 
}: { 
  userId: string
  module: PermissionModule
  action: PermissionAction
  fallback?: ReactNode
  children: ReactNode 
}) {
  const { data: hasPermission, isLoading } = useQuery({
    queryKey: ['route-permission', userId, module, action],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_user_permission', {
        p_user_id: userId,
        p_module: module,
        p_action: action,
      })
      
      if (error) {
        console.error('Permission check error:', error)
        return false
      }
      
      return data as boolean
    },
    staleTime: 5 * 60 * 1000,
  })
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
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
