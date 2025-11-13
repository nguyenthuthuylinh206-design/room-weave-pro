import { ReactNode } from 'react'
import { useCheckUserPermission } from '@/hooks/useUserPermissions'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface PermissionGuardProps {
  module: string
  action: string
  children: ReactNode
  fallback?: ReactNode
  showLoading?: boolean
}

export function PermissionGuard({
  module,
  action,
  children,
  fallback = null,
  showLoading = false,
}: PermissionGuardProps) {
  const { data: hasPermission, isLoading } = useCheckUserPermission(module, action)

  if (isLoading && showLoading) {
    return <LoadingSpinner />
  }

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook version for use in components
export function usePermission(module: string, action: string) {
  const { data: hasPermission, isLoading } = useCheckUserPermission(module, action)
  
  return {
    hasPermission: hasPermission || false,
    isLoading,
  }
}
