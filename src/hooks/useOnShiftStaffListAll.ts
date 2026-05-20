import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import {
  getPresenceState,
  isOnShift,
  PRESENCE_SORT_ORDER,
  type StaffPresenceState,
} from '@/lib/staffPresence'

export interface OnShiftStaffMember {
  id: string
  full_name: string
  avatar_url: string | null
  email: string | null
  phone: string | null
  user_level_code: string | null
  position_name: string | null
  hotel_id: string | null
  hotel_name: string | null
  telegram_username: string | null
  telegram_chat_id: string | null
  shift_start_at: string | null
  last_seen_at: string | null
  presence_state: StaffPresenceState
}

/**
 * Hook to get all on-shift staff across all hotels for the tenant
 * Used for manager dashboard in ShiftHistoryTab
 */
export function useOnShiftStaffListAll() {
  const { tenantId } = useUser()
  const queryClient = useQueryClient()

  // Realtime: cập nhật ngay khi có người vào/ra ca
  useEffect(() => {
    if (!tenantId) return
    const channel = supabase
      .channel(`on-shift-staff-list-all-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_status',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['on-shift-staff-list-all', tenantId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])

  return useQuery({
    queryKey: ['on-shift-staff-list-all', tenantId],
    queryFn: async () => {
      if (!tenantId) return []

      // Get all users in tenant with their staff status
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          avatar_url,
          email,
          phone,
          user_level_code,
          role,
          hotel_id,
          telegram_username,
          hotels!users_hotel_id_fkey(name),
          telegram_connections(chat_id, is_active)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')

      if (usersError) throw usersError

      // Get staff_status for all users
      const userIds = users?.map(u => u.id).filter(Boolean) || []

      if (userIds.length === 0) return []

      const { data: statuses, error: statusError } = await supabase
        .from('staff_status')
        .select('user_id, shift_start_at, shift_end_at')
        .in('user_id', userIds)

      if (statusError) throw statusError

      const statusMap = new Map(statuses?.map(s => [s.user_id, s]) || [])

      // Filter only on-shift staff
      const onShiftStaff: OnShiftStaffMember[] = users
        .filter(user => {
          const status = statusMap.get(user.id)
          return isCurrentlyOnShift(status || null)
        })
        .map(user => {
          const status = statusMap.get(user.id)
          const activeConnection = (user as any).telegram_connections?.find((tc: any) => tc.is_active)

          return {
            id: user.id,
            full_name: user.full_name || 'Không tên',
            avatar_url: user.avatar_url,
            email: user.email,
            phone: user.phone,
            user_level_code: user.user_level_code,
            position_name: user.role || null,
            hotel_id: user.hotel_id,
            hotel_name: (user.hotels as any)?.name || null,
            telegram_username: (user as any).telegram_username || null,
            telegram_chat_id: activeConnection?.chat_id || null,
            shift_start_at: status?.shift_start_at || null,
          }
        })

      // Sort by shift start time (most recent first)
      return onShiftStaff.sort((a, b) => {
        if (!a.shift_start_at) return 1
        if (!b.shift_start_at) return -1
        return new Date(b.shift_start_at).getTime() - new Date(a.shift_start_at).getTime()
      })
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30s — realtime sẽ invalidate khi có shift thay đổi
  })
}
