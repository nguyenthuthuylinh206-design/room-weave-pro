import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'
import type { RoomWithStats, RoomFilters } from '@/types/rooms.types'

export function useRooms(filters: RoomFilters = {}) {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: ['rooms', tenantId, selectedHotel?.id, isAllHotelsMode, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const hotelIdToFilter = isAllHotelsMode ? null : (selectedHotel?.id || null)
      
      const { data, error } = await supabase.rpc('get_rooms_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: hotelIdToFilter,
        p_floor: filters.floor || null,
        p_room_type: filters.roomType || null,
        p_status: filters.status || null,
        p_search: filters.search || null,
        p_missing_items_only: filters.missingItemsOnly || false,
      })
      
      if (error) throw error
      return data as RoomWithStats[]
    },
    enabled: !!tenantId,
  })

  // Realtime subscription for room_items changes
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel('room_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_items'
        },
        () => {
          // Invalidate rooms query to refetch with updated stats
          queryClient.invalidateQueries({ queryKey: ['rooms'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])

  return query
}

export function useRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      if (!roomId) throw new Error('No room ID')
      
      // Fetch room basic data
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select(`
          *,
          hotels(id, name, code, city)
        `)
        .eq('id', roomId)
        .single()
      
      if (roomError) throw roomError
      
      // Fetch room items with standards comparison
      const { data: itemsWithStandards, error: itemsError } = await supabase
        .rpc('get_room_items_with_standards', { p_room_id: roomId })
      
      if (itemsError) {
        console.error('Error fetching room items:', itemsError)
      }
      
      // Fetch recent checks
      const { data: recentChecks, error: checksError } = await supabase
        .from('room_checks')
        .select(`
          id,
          check_type,
          cleanliness_score,
          items_complete,
          items_missing,
          items_damaged,
          notes,
          checked_at,
          users(full_name, avatar_url)
        `)
        .eq('room_id', roomId)
        .order('checked_at', { ascending: false })
        .limit(20)
      
      if (checksError) {
        console.error('Error fetching room checks:', checksError)
      }
      
      // Transform items data
      const items = (itemsWithStandards || []).map((item: any) => ({
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        item_thumbnail: item.item_thumbnail,
        category_name: item.category_name,
        standard_quantity: item.standard_quantity,
        current_quantity: item.current_quantity,
        missing_quantity: item.missing_quantity,
        condition: item.condition,
        is_verified: item.is_verified,
        verified_at: item.verified_at,
        verified_by: item.verified_by,
        room_item_id: item.room_item_id,
        has_standard: item.has_standard,
      }))
      
      // Transform checks data
      const recent_checks = (recentChecks || []).map((check: any) => ({
        id: check.id,
        check_type: check.check_type,
        cleanliness_score: check.cleanliness_score,
        items_complete: check.items_complete,
        items_missing: check.items_missing,
        items_damaged: check.items_damaged,
        notes: check.notes,
        checked_at: check.checked_at,
        checked_by_name: check.users?.full_name || 'Unknown',
        checked_by_avatar: check.users?.avatar_url,
      }))
      
      return {
        room,
        hotel: room.hotels,
        items,
        recent_checks,
      }
    },
    enabled: !!roomId,
    refetchOnMount: 'always',
    staleTime: 0,
  })
}

export function useRoomStats(tenantId: string | undefined, hotelId: string | undefined) {
  return useQuery({
    queryKey: ['room-stats', tenantId, hotelId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase.rpc('get_rooms_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: hotelId || null,
        p_floor: null,
        p_room_type: null,
        p_status: null,
        p_search: null,
        p_missing_items_only: false,
      })
      
      if (error) throw error
      
      const rooms = data as RoomWithStats[]
      
      return {
        vacant: rooms.filter(r => r.status === 'vacant').length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
        cleaning: rooms.filter(r => r.status === 'cleaning').length,
        maintenance: rooms.filter(r => r.status === 'maintenance').length,
        total: rooms.length,
      }
    },
    enabled: !!tenantId,
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: room, error } = await supabase
        .from('rooms')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return room
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Đã thêm phòng mới')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: room, error } = await supabase
        .from('rooms')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return room
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', variables.id] })
      toast.success('Đã cập nhật phòng')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (roomId: string) => {
      // Check if room has room_items
      const { count: itemsCount } = await supabase
        .from('room_items')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
      
      if (itemsCount && itemsCount > 0) {
        throw new Error('Không thể xóa phòng có đồ dùng. Vui lòng xóa đồ dùng trước.')
      }
      
      // Check if room has checks
      const { count: checksCount } = await supabase
        .from('room_checks')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
      
      if (checksCount && checksCount > 0) {
        throw new Error('Không thể xóa phòng có lịch sử kiểm tra')
      }
      
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Đã xóa phòng')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
