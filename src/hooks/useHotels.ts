import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { toast } from 'sonner'
import { logCreate, logUpdate, logDelete } from '@/lib/activityLogger'

export interface Hotel {
  id: string
  tenant_id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  total_rooms: number
  total_floors: number
  status: 'active' | 'inactive'
  settings: any
  created_at: string
  updated_at: string
}

export interface HotelFormData {
  name: string
  address?: string
  phone?: string
  email?: string
  total_rooms: number
  total_floors: number
  status: 'active' | 'inactive'
}

export const useHotels = () => {
  const { tenantId } = useUser()

  return useQuery({
    queryKey: ['hotels', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID')

      const { data, error } = await supabase
        .from('hotels')
        .select(`
          *,
          users:users(count)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Hotel[]
    },
    enabled: !!tenantId,
  })
}

export const useHotel = (hotelId: string | undefined) => {
  return useQuery({
    queryKey: ['hotel', hotelId],
    queryFn: async () => {
      if (!hotelId) throw new Error('No hotel ID')

      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', hotelId)
        .single()

      if (error) throw error
      return data as Hotel
    },
    enabled: !!hotelId,
  })
}

export const useCreateHotel = () => {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()

  return useMutation({
    mutationFn: async (data: HotelFormData) => {
      if (!tenantId) throw new Error('No tenant ID')

      const { data: hotel, error } = await supabase
        .from('hotels')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          total_rooms: data.total_rooms,
          total_floors: data.total_floors,
          status: data.status,
        } as any)
        .select()
        .single()

      if (error) throw error

      await logCreate('hotel', hotel.id, hotel.name, data)
      return hotel
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      toast.success('Hotel created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create hotel: ' + error.message)
    },
  })
}

export const useUpdateHotel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HotelFormData> }) => {
      const { data: oldData } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', id)
        .single()

      const { data: hotel, error } = await supabase
        .from('hotels')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await logUpdate('hotel', hotel.id, hotel.name, oldData, data)
      return hotel
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      queryClient.invalidateQueries({ queryKey: ['hotel'] })
      toast.success('Hotel updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update hotel: ' + error.message)
    },
  })
}

export const useDeleteHotel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if hotel has any users
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', id)

      if (count && count > 0) {
        throw new Error('Cannot delete hotel with assigned users')
      }

      const { data: hotel } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('hotels')
        .delete()
        .eq('id', id)

      if (error) throw error

      if (hotel) {
        await logDelete('hotel', id, hotel.name, hotel)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      toast.success('Hotel deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete hotel: ' + error.message)
    },
  })
}
