import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { useUser } from './useUser'

export interface UserPermission {
  id: string
  user_id: string
  tenant_id: string
  module: string
  action: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface PermissionSummary {
  module: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
  can_export: boolean
  can_approve: boolean
}

export const MODULES = [
  { code: 'dashboard', name: 'Trang chủ', icon: 'LayoutDashboard' },
  { code: 'items', name: 'Tài sản', icon: 'Package' },
  { code: 'rooms', name: 'Phòng', icon: 'DoorClosed' },
  { code: 'laundry', name: 'Giặt là', icon: 'Shirt' },
  { code: 'inventory', name: 'Kho', icon: 'Warehouse' },
  { code: 'maintenance', name: 'Bảo trì', icon: 'Wrench' },
  { code: 'vendors', name: 'Nhà cung cấp', icon: 'Store' },
  { code: 'purchase_orders', name: 'Đơn mua hàng', icon: 'ShoppingCart' },
  { code: 'reports', name: 'Báo cáo', icon: 'FileText' },
  { code: 'users', name: 'Người dùng', icon: 'Users' },
  { code: 'settings', name: 'Cài đặt', icon: 'Settings' },
  { code: 'hotels', name: 'Khách sạn', icon: 'Building2' },
]

export const ACTIONS = [
  { code: 'view', name: 'Xem', color: 'blue' },
  { code: 'create', name: 'Tạo mới', color: 'green' },
  { code: 'update', name: 'Chỉnh sửa', color: 'yellow' },
  { code: 'delete', name: 'Xóa', color: 'red' },
  { code: 'export', name: 'Xuất dữ liệu', color: 'purple' },
  { code: 'approve', name: 'Phê duyệt', color: 'indigo' },
]

export function useUserPermissionsDetail(userId?: string) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')

      const { data, error } = await supabase
        .from('user_permissions' as any)
        .select('*')
        .eq('user_id', userId)
        .order('module')

      if (error) throw error
      return data as unknown as UserPermission[]
    },
    enabled: !!userId,
  })
}

export function useUserPermissionsSummary(userId?: string) {
  return useQuery({
    queryKey: ['user-permissions-summary', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')

      const { data, error } = await supabase.rpc('get_user_permissions_summary' as any, {
        p_user_id: userId,
      })

      if (error) throw error
      return data as unknown as PermissionSummary[]
    },
    enabled: !!userId,
  })
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()

  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string
      permissions: { module: string; action: string; enabled: boolean }[]
    }) => {
      if (!tenantId) throw new Error('No tenant')

      // Delete all existing permissions for this user
      await supabase.from('user_permissions' as any).delete().eq('user_id', userId)

      // Insert new permissions
      const permissionsToInsert = permissions.map((p) => ({
        user_id: userId,
        tenant_id: tenantId,
        module: p.module,
        action: p.action,
        enabled: p.enabled,
      }))

      const { error } = await supabase.from('user_permissions' as any).insert(permissionsToInsert)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] })
      queryClient.invalidateQueries({
        queryKey: ['user-permissions-summary', variables.userId],
      })
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật phân quyền người dùng',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      })
    },
  })
}

export function useCheckUserPermission(module: string, action: string) {
  const { user } = useUser()

  return useQuery({
    queryKey: ['check-permission', user?.id, module, action],
    queryFn: async () => {
      if (!user?.id) return false

      const { data, error } = await supabase.rpc('has_user_permission' as any, {
        p_user_id: user.id,
        p_module: module,
        p_action: action,
      })

      if (error) throw error
      return data as boolean
    },
    enabled: !!user?.id,
  })
}
