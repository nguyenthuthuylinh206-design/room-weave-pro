import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { User, UserWithRelations } from '@/types/database.types'
import { toast } from 'sonner'
import { UserFormData } from '@/lib/validations/user.schemas'
import { logCreate, logUpdate, logDelete } from '@/lib/activityLogger'

export function useUsers() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          position:positions(id, code, name, user_level_code, department)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as UserWithRelations[]
    },
  })

  return {
    users,
    isLoading,
    error,
  }
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserFormData) => {
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          full_name: data.fullName,
          email: data.email,
          phone: data.phone || null,
          user_level_code: data.userLevelCode,
          hotel_id: data.hotelId || null,
          position_id: data.positionId || null,
          department: data.department || null,
          status: data.status,
          notes: data.notes || null,
        } as any)
        .select()
        .single()

      if (error) throw error

      await logCreate('user', user.id, user.full_name, data)
      return user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Người dùng đã được tạo thành công')
    },
    onError: (error: Error) => {
      toast.error('Không thể tạo người dùng: ' + error.message)
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UserFormData }) => {
      const { data: oldData } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      const { data: user, error } = await supabase
        .from('users')
        .update({
          full_name: data.fullName,
          phone: data.phone || null,
          user_level_code: data.userLevelCode,
          hotel_id: data.hotelId || null,
          position_id: data.positionId || null,
          department: data.department || null,
          status: data.status,
          notes: data.notes || null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await logUpdate('user', user.id, user.full_name, oldData, data)
      return user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Người dùng đã được cập nhật thành công')
    },
    onError: (error: Error) => {
      toast.error('Không thể cập nhật người dùng: ' + error.message)
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      if (user) {
        await logDelete('user', id, user.full_name, user)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Người dùng đã được xóa thành công')
    },
    onError: (error: Error) => {
      toast.error('Không thể xóa người dùng: ' + error.message)
    },
  })
}
