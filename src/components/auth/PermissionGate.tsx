import { ReactNode } from 'react'
import { useHasPermission, PermissionModule, PermissionAction } from '@/hooks/usePermission'

interface PermissionGateProps {
  children: ReactNode
  module: PermissionModule
  action: PermissionAction
  fallback?: ReactNode
}

/**
 * PermissionGate - Component to conditionally render UI based on user permissions
 * Uses module + action pattern for consistency with the permission system
 * 
 * @example
 * <PermissionGate module="items" action="create">
 *   <Button>Thêm tài sản</Button>
 * </PermissionGate>
 * 
 * @example with fallback
 * <PermissionGate module="users" action="delete" fallback={<span>Không có quyền</span>}>
 *   <DeleteButton />
 * </PermissionGate>
 */
export function PermissionGate({ children, module, action, fallback = null }: PermissionGateProps) {
  const { hasPermission, isLoading } = useHasPermission(module, action)

  if (isLoading) {
    return null
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

// Re-export types for convenience
export type { PermissionModule, PermissionAction } from '@/hooks/usePermission'
