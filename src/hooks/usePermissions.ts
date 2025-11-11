import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { toast } from '@/hooks/use-toast'
import type {
  Permission,
  RolePermission,
  RolePermissionInsert,
  UserPermission,
  PermissionModule,
} from '@/types/permission.types'

// Fetch all permissions
export const useAllPermissions = () => {
  return useQuery({
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module')
        .order('action')

      if (error) throw error
      return data as Permission[]
    },
  })
}

// Fetch permissions grouped by module
export const usePermissionsByModule = () => {
  return useQuery({
    queryKey: ['permissions-by-module'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module')
        .order('action')

      if (error) throw error

      const permissions = data as Permission[]
      const grouped = permissions.reduce((acc, permission) => {
        const existing = acc.find((m) => m.module === permission.module)
        if (existing) {
          existing.permissions.push(permission)
        } else {
          acc.push({
            module: permission.module,
            permissions: [permission],
          })
        }
        return acc
      }, [] as PermissionModule[])

      return grouped
    },
  })
}

// Fetch user's permissions
export const useUserPermissions = () => {
  const { user } = useUser()

  return useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id,
      })

      if (error) throw error
      
      // Map the response to UserPermission format
      return (data || []).map((item: any) => ({
        code: item.code,
        module: item.module,
        action: item.action,
        name: item.name,
      })) as UserPermission[]
    },
    enabled: !!user?.id,
  })
}

// Check if user has a specific permission
export const useHasPermission = (permissionCode: string) => {
  const { user } = useUser()

  return useQuery({
    queryKey: ['has-permission', user?.id, permissionCode],
    queryFn: async () => {
      if (!user?.id) return false

      // Use direct query instead of RPC for better type safety
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role,
          roles!inner (
            role_permissions!inner (
              permissions!inner (
                code
              )
            )
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Check if permission code exists in user's permissions
      return data?.some((userRole: any) => {
        return userRole.roles?.role_permissions?.some((rp: any) => {
          return rp.permissions?.code === permissionCode
        })
      }) || false
    },
    enabled: !!user?.id && !!permissionCode,
  })
}

// Check if user has module permission
export const useHasModulePermission = (module: string, action: string) => {
  const { user } = useUser()

  return useQuery({
    queryKey: ['has-module-permission', user?.id, module, action],
    queryFn: async () => {
      if (!user?.id) return false

      // Use direct query for better type safety
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role,
          roles!inner (
            role_permissions!inner (
              permissions!inner (
                module,
                action
              )
            )
          )
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Check if module/action combination exists in user's permissions
      return data?.some((userRole: any) => {
        return userRole.roles?.role_permissions?.some((rp: any) => {
          return rp.permissions?.module === module && rp.permissions?.action === action
        })
      }) || false
    },
    enabled: !!user?.id && !!module && !!action,
  })
}

// Fetch role permissions
export const useRolePermissions = (roleId?: string) => {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return []

      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          permission:permission_id (*)
        `)
        .eq('role_id', roleId)

      if (error) throw error
      return data
    },
    enabled: !!roleId,
  })
}

// Assign permissions to role
export const useAssignPermissionsToRole = () => {
  const queryClient = useQueryClient()
  const { user } = useUser()

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionIds,
    }: {
      roleId: string
      permissionIds: string[]
    }) => {
      if (!user?.id) throw new Error('User not found')

      // First, remove all existing permissions for this role
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      if (deleteError) throw deleteError

      // Then, insert new permissions
      const rolePermissions: RolePermissionInsert[] = permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
        granted_by: user.id,
      }))

      const { data, error } = await supabase
        .from('role_permissions')
        .insert(rolePermissions)
        .select()

      if (error) throw error
      return data as RolePermission[]
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] })
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] })
      toast({
        title: 'Thành công',
        description: 'Quyền hạn đã được cập nhật',
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

// Add single permission to role
export const useAddPermissionToRole = () => {
  const queryClient = useQueryClient()
  const { user } = useUser()

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionId,
    }: {
      roleId: string
      permissionId: string
    }) => {
      if (!user?.id) throw new Error('User not found')

      const { data, error } = await supabase
        .from('role_permissions')
        .insert({
          role_id: roleId,
          permission_id: permissionId,
          granted_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as RolePermission
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] })
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] })
      toast({
        title: 'Thành công',
        description: 'Quyền đã được thêm',
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

// Remove permission from role
export const useRemovePermissionFromRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionId,
    }: {
      roleId: string
      permissionId: string
    }) => {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] })
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] })
      toast({
        title: 'Thành công',
        description: 'Quyền đã được xóa',
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
