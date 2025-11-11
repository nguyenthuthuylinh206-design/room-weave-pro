import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'

export interface ItemCategory {
  id: string
  tenant_id: string
  name: string
  name_en?: string
  code?: string
  description?: string
  icon?: string
  color?: string
  parent_id?: string
  level: number
  min_stock_level?: number
  max_stock_level?: number
  reorder_point?: number
  preferred_vendor_id?: string
  depreciable: boolean
  depreciation_rate?: number
  useful_life_months?: number
  track_serial_numbers: boolean
  require_inspection: boolean
  sort_order: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  _count?: {
    items: number
    subcategories: number
  }
}

export const useItemCategories = () => {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()

  return useQuery({
    queryKey: ['item-categories', tenantId, selectedHotel?.id, isAllHotelsMode],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')

      let query: any = supabase
        .from('item_categories')
        .select('*')
        .eq('tenant_id', tenantId)
      
      // Filter by hotel unless in "All Hotels" mode
      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }
      
      query = query.order('sort_order')

      const { data, error } = await query

      if (error) throw error
      return data as ItemCategory[]
    },
    enabled: !!tenantId,
  })
}

export const useCreateItemCategory = () => {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()

  return useMutation({
    mutationFn: async (category: Partial<ItemCategory>) => {
      const { data, error } = await supabase
        .from('item_categories')
        .insert([{ ...category, tenant_id: tenantId } as any])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] })
      toast.success('Category created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category')
    },
  })
}

export const useUpdateItemCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ItemCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('item_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] })
      toast.success('Category updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category')
    },
  })
}

export const useDeleteItemCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('item_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] })
      toast.success('Category deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category')
    },
  })
}

export const useUpdateCategoryOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categories: Array<{ id: string; sort_order: number }>) => {
      const updates = categories.map(({ id, sort_order }) =>
        supabase
          .from('item_categories')
          .update({ sort_order })
          .eq('id', id)
      )

      await Promise.all(updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] })
    },
  })
}
