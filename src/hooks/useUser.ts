import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { UserWithRelations, AppRole } from '@/types/database.types'

export const useUser = () => {
  const { user: authUser } = useAuth()

  const { data: userData, isLoading, error, refetch } = useQuery({
    queryKey: ['user', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return null

      // Fetch user data with relations
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          tenant:tenants(*),
          hotel:hotels!users_hotel_id_fkey(*)
        `)
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authUser.id)

      if (rolesError) throw rolesError

      // Get primary role (highest priority)
      const roleOrder: AppRole[] = ['super_admin', 'owner', 'hotel_manager', 'department_manager', 'staff']
      const primaryRole = roles
        ?.map(r => r.role as AppRole)
        .sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b))[0]

      return {
        ...user,
        roles,
        primaryRole,
      } as UserWithRelations
    },
    enabled: !!authUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const hasRole = (role: AppRole): boolean => {
    return userData?.roles?.some((r) => r.role === role) || false
  }

  const hasAnyRole = (roles: AppRole[]): boolean => {
    return roles.some((role) => hasRole(role))
  }

  return {
    user: userData,
    isLoading,
    error,
    refetch,
    hasRole,
    hasAnyRole,
    role: userData?.primaryRole,
    tenantId: userData?.tenant_id,
    hotelId: userData?.hotel_id,
  }
}
