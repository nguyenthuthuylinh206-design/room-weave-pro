import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'

interface PermissionGateProps {
  children: ReactNode
  permission: string
  fallback?: ReactNode
}

/**
 * PermissionGate - Component to conditionally render UI based on user permissions
 * 
 * @example
 * <PermissionGate permission="items.create">
 *   <Button>Thêm tài sản</Button>
 * </PermissionGate>
 */
export function PermissionGate({ children, permission, fallback = null }: PermissionGateProps) {
  const { user } = useUser()

  const { data: hasPermission, isLoading } = useQuery({
    queryKey: ['permission', user?.id, permission],
    queryFn: async () => {
      if (!user?.id) return false

      const { data, error } = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission_code: permission,
      })

      if (error) {
        console.error('Permission check error:', error)
        return false
      }

      return data as boolean
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  if (isLoading) {
    return null
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: string) {
  const { user } = useUser()

  const { data: hasPermission, isLoading } = useQuery({
    queryKey: ['permission', user?.id, permission],
    queryFn: async () => {
      if (!user?.id) return false

      const { data, error } = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission_code: permission,
      })

      if (error) {
        console.error('Permission check error:', error)
        return false
      }

      return data as boolean
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  return {
    hasPermission: hasPermission || false,
    isLoading,
  }
}

/**
 * Hook to get all user permissions
 */
export function useUserPermissions() {
  const { user } = useUser()

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id,
      })

      if (error) {
        console.error('Get permissions error:', error)
        return []
      }

      return data || []
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  return {
    permissions: permissions || [],
    isLoading,
  }
}
