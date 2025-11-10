import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { toast } from 'sonner'
import type { RoomWithStats, RoomFilters } from '@/types/rooms.types'

export function useRooms(filters: RoomFilters = {}) {
  const { tenantId, hotelId } = useUser()
  
  return useQuery({
    queryKey: ['rooms', tenantId, hotelId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase.rpc('get_rooms_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: hotelId || null,
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
      
      const { data, error } = await supabase
        .rpc('get_room_detail', { p_room_id: roomId })
      
      if (error) throw error
      return data
    },
    enabled: !!roomId,
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
