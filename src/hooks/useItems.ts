import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { toast } from './use-toast'
import type { ItemWithCategory, ItemFilters } from '@/types/items.types'

export function useItems(
  filters: ItemFilters = {},
  page: number = 1,
  pageSize: number = 25
) {
  const { tenantId, hotelId } = useUser()
  const queryClient = useQueryClient()
  
  // Subscribe to realtime changes
  useEffect(() => {
    if (!tenantId) return
    
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['items'] })
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])
  
  return useQuery({
    queryKey: ['items', tenantId, hotelId, filters, page, pageSize],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase.rpc('get_items_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: filters.hotelId || hotelId || null,
        p_category_id: filters.categoryId || null,
        p_stock_status: filters.stockStatus || null,
        p_status: filters.status || 'active',
        p_search: filters.search || null,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      })
      
      if (error) throw error
      
      const items = (data || []) as unknown as ItemWithCategory[]
      
      // Fetch images for all items in this page
      if (items.length > 0) {
        const itemIds = items.map(item => item.id)
        const { data: images } = await supabase
          .from('item_images')
          .select('*')
          .in('item_id', itemIds)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true })
        
        // Attach images to items
        items.forEach(item => {
          item.item_images = images?.filter(img => img.item_id === item.id) || []
        })
      }
      
      return {
        items,
        total: data?.[0]?.total_count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((data?.[0]?.total_count || 0) / pageSize),
      }
    },
    enabled: !!tenantId,
  })
}

export function useItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item', itemId],
    queryFn: async () => {
      if (!itemId) throw new Error('No item ID')
      
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          item_images (
            id,
            url,
            file_name,
            file_size,
            is_primary,
            display_order
          )
        `)
        .eq('id', itemId)
        .single()
      
      if (error) throw error
      
      // Sort images by display_order and primary first
      if (data && data.item_images) {
        data.item_images = data.item_images.sort((a: any, b: any) => {
          if (a.is_primary) return -1
          if (b.is_primary) return 1
          return a.display_order - b.display_order
        })
      }
      
      return data
    },
    enabled: !!itemId,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: item, error } = await supabase
        .from('items')
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      return item
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast({
        title: 'Thành công',
        description: 'Đã thêm tài sản mới',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: item, error } = await supabase
        .from('items')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return item
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['item', variables.id] })
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật tài sản',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteItems() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { data, error } = await supabase.rpc('bulk_delete_items', {
        p_item_ids: itemIds,
        p_user_id: user?.id,
      })
      
      if (error) throw error
      return data
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      
      if (result.failed_count > 0) {
        toast({
          title: 'Hoàn thành với lỗi',
          description: `Đã xóa ${result.deleted_count} items. ${result.failed_count} items không thể xóa.`,
        })
      } else {
        toast({
          title: 'Thành công',
          description: `Đã xóa ${result.deleted_count} items`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
