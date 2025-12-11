import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface TenantApprovalStatus {
  status: 'pending' | 'approved' | 'rejected' | null
  rejectionReason: string | null
  isApproved: boolean
  isPending: boolean
  isRejected: boolean
  isLoading: boolean
  userLevelCode: string | null
}

export function useTenantApprovalStatus(): TenantApprovalStatus {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-approval-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // Get user's tenant_id and user_level_code
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id, user_level_code')
        .eq('id', user.id)
        .single()

      if (userError || !userData?.tenant_id) {
        console.error('Error fetching user data:', userError)
        return null
      }

      // Get tenant's approval status
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('approval_status, rejection_reason')
        .eq('id', userData.tenant_id)
        .single()

      if (tenantError) {
        console.error('Error fetching tenant data:', tenantError)
        return null
      }

      return {
        status: tenantData?.approval_status as 'pending' | 'approved' | 'rejected' | null,
        rejectionReason: tenantData?.rejection_reason,
        userLevelCode: userData.user_level_code,
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const status = data?.status ?? null
  const userLevelCode = data?.userLevelCode ?? null

  return {
    status,
    rejectionReason: data?.rejectionReason ?? null,
    isApproved: status === 'approved',
    isPending: status === 'pending',
    isRejected: status === 'rejected',
    isLoading,
    userLevelCode,
  }
}
