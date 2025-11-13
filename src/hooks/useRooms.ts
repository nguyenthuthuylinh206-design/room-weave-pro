import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'
import type { RoomWithStats, RoomFilters } from '@/types/rooms.types'

export function useRooms(filters: RoomFilters = {}) {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  
  return useQuery({
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
      
      // Fetch room items WITH standards using new RPC
      const { data: roomItems, error: itemsError } = await supabase
        .rpc('get_room_items_with_standards', { p_room_id: roomId })
      
      if (itemsError) {
        console.error('Error fetching room items with standards:', itemsError)
      }
      
      // Fetch recent checks (non-blocking)
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
      
      // Transform items data - now includes ALL standards
      const items = (roomItems || []).map((ri: any) => ({
        id: ri.room_item_id || ri.standard_id, // Use room_item_id if exists, otherwise standard_id
        standard_id: ri.standard_id,
        room_item_id: ri.room_item_id,
        item_id: ri.item_id,
        item_code: ri.item_code || '',
        item_name: ri.item_name || '',
        item_thumbnail: ri.item_thumbnail,
        category_name: ri.category_name,
        quantity: ri.current_quantity || 0, // Current quantity from room_items
        standard_quantity: ri.standard_quantity, // Standard quantity from room_type_standards
        condition: ri.condition || 'good',
        is_verified: ri.is_verified || false,
        verified_at: ri.verified_at,
        verified_by: ri.verified_by,
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
