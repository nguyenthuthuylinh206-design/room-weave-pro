import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { toast } from './use-toast'
import type { CategoryWithStats, CategoryFormData } from '@/types/items.types'

export function useCategories() {
  const { tenantId } = useUser()
  
  return useQuery({
    queryKey: ['categories', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase
        .rpc('get_categories_with_stats', {
          p_tenant_id: tenantId,
        })
      
      if (error) throw error
      return data as CategoryWithStats[]
    },
    enabled: !!tenantId,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()
  
  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!tenantId) {
        throw new Error('Thiếu tenant_id. Vui lòng đăng nhập lại hoặc tạo tenant từ trang System Test.')
      }
      
      const { data: category, error } = await supabase
        .from('item_categories')
        .insert({
          ...data,
          tenant_id: tenantId,
        })
        .select()
        .single()
      
      if (error) throw error
      return category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({
        title: 'Thành công',
        description: 'Đã thêm danh mục mới',
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

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const { data: category, error } = await supabase
        .from('item_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật danh mục',
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

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (categoryId: string) => {
      // Check if category has items
      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
      
      if (count && count > 0) {
        throw new Error(`Không thể xóa danh mục có ${count} items`)
      }
      
      const { error } = await supabase
        .from('item_categories')
        .delete()
        .eq('id', categoryId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({
        title: 'Thành công',
        description: 'Đã xóa danh mục',
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
