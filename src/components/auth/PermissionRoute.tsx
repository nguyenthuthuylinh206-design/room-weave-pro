import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useHasPermission, PermissionModule, PermissionAction } from '@/hooks/usePermission'
import { Loader2 } from 'lucide-react'

interface PermissionRouteProps {
  children: ReactNode
  module: PermissionModule
  action?: PermissionAction
  fallback?: ReactNode
}

/**
 * PermissionRoute - Route protection component based on user permissions
 * 
 * @example
 * <Route path="/items" element={
 *   <PermissionRoute module="items" action="view">
 *     <ItemsPage />
 *   </PermissionRoute>
 * } />
 */
export function PermissionRoute({ 
  children, 
  module, 
  action = 'view',
  fallback 
}: PermissionRouteProps) {
  const { hasPermission, isLoading } = useHasPermission(module, action)
  
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
  const results = actions.map(action => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { hasPermission, isLoading } = useHasPermission(module, action)
    return { action, hasPermission, isLoading }
  })
  
  return {
    permissions: results.reduce((acc, { action, hasPermission }) => {
      acc[action] = hasPermission
      return acc
    }, {} as Record<PermissionAction, boolean>),
    isLoading: results.some(r => r.isLoading),
    canView: results.find(r => r.action === 'view')?.hasPermission ?? false,
    canCreate: results.find(r => r.action === 'create')?.hasPermission ?? false,
    canUpdate: results.find(r => r.action === 'update')?.hasPermission ?? false,
    canDelete: results.find(r => r.action === 'delete')?.hasPermission ?? false,
  }
}
