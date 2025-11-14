import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUser } from './useUser'
import { MODULES } from './useUserPermissions'

export interface ModulePermissionState {
  module: string
  enabled: boolean
  source: 'role' | 'custom' | null
  actions?: Record<string, boolean> // Action-level permissions
}

export function useUserPermissionConfiguration(userId?: string) {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()

  // Fetch user permissions summary with action details
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['user-permission-configuration', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')

      // Fetch summary for enabled/disabled state
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_user_permissions_summary' as any, {
        p_user_id: userId,
      })

      if (summaryError) throw summaryError

      // Fetch detailed permissions for actions
      const { data: detailData, error: detailError } = await supabase
        .from('user_permissions' as any)
        .select('module, action, enabled')
        .eq('user_id', userId)

      if (detailError) throw detailError
      
      // Transform data to ModulePermissionState
      const moduleStates: Record<string, ModulePermissionState> = {}
      
      MODULES.forEach((module) => {
        const summary = summaryData?.find((p: any) => p.module === module.code)
        
        // Check if module has ANY permission enabled
        const hasAnyPermission = summary && (
          summary.can_view || 
          summary.can_create || 
          summary.can_update || 
          summary.can_delete || 
          summary.can_export || 
          summary.can_approve
        )

        // Get action-level details
        const modulePermissions = detailData?.filter((p: any) => p.module === module.code) || []
        const actions: Record<string, boolean> = {
          view: false,
          create: false,
          update: false,
          delete: false,
          export: false,
          approve: false,
        }

        modulePermissions.forEach((p: any) => {
          actions[p.action] = p.enabled
        })
        
        moduleStates[module.code] = {
          module: module.code,
          enabled: hasAnyPermission || false,
          source: null, // Will be determined by comparing with role defaults
          actions,
        }
      })
      
      return moduleStates
    },
    enabled: !!userId,
  })

  // Toggle module ON/OFF
  const toggleModule = useMutation({
    mutationFn: async ({ 
      userId, 
      module, 
      enabled 
    }: { 
      userId: string
      module: string
      enabled: boolean 
    }) => {
      if (!tenantId) throw new Error('No tenant')

      // Define all 6 actions
      const actions = ['view', 'create', 'update', 'delete', 'export', 'approve']
      
      // Delete existing permissions for this module
      await supabase
        .from('user_permissions' as any)
        .delete()
        .eq('user_id', userId)
        .eq('module', module)

      // If enabling, insert all 6 actions
      if (enabled) {
        const permissionsToInsert = actions.map((action) => ({
          user_id: userId,
          tenant_id: tenantId,
          module,
          action,
          enabled: true,
        }))

        const { error } = await supabase
          .from('user_permissions' as any)
          .insert(permissionsToInsert)

        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-permission-configuration', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-permissions', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-permissions-summary', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-module-permissions'] 
      })
    },
  })

  // Save all configuration
  const saveConfiguration = useMutation({
    mutationFn: async ({ 
      userId, 
      modules 
    }: { 
      userId: string
      modules: Record<string, boolean> 
    }) => {
      if (!tenantId) throw new Error('No tenant')

      const actions = ['view', 'create', 'update', 'delete', 'export', 'approve']
      
      // Delete all existing user permissions
      await supabase
        .from('user_permissions' as any)
        .delete()
        .eq('user_id', userId)

      // Insert enabled modules
      const permissionsToInsert: any[] = []
      Object.entries(modules).forEach(([module, enabled]) => {
        if (enabled) {
          actions.forEach((action) => {
            permissionsToInsert.push({
              user_id: userId,
              tenant_id: tenantId,
              module,
              action,
              enabled: true,
            })
          })
        }
      })

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions' as any)
          .insert(permissionsToInsert)

        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-permission-configuration', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-permissions', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-permissions-summary', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-module-permissions'] 
      })
      toast.success('Đã cập nhật cấu hình quyền')
    },
    onError: (error: Error) => {
      toast.error(`Không thể cập nhật: ${error.message}`)
    },
  })

  // Toggle individual action
  const toggleAction = useMutation({
    mutationFn: async ({
      userId,
      module,
      action,
      enabled,
    }: {
      userId: string
      module: string
      action: string
      enabled: boolean
    }) => {
      if (!tenantId) throw new Error('No tenant')

      // Always upsert with the enabled value (don't delete)
      const { error } = await supabase
        .from('user_permissions' as any)
        .upsert({
          user_id: userId,
          tenant_id: tenantId,
          module,
          action,
          enabled,
        }, {
          onConflict: 'user_id,module,action',
        })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-permission-configuration', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-permissions', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-permissions-summary', variables.userId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['user-module-permissions'] 
      })
      toast.success('Đã cập nhật quyền thành công')
    },
    onError: (error: Error) => {
      toast.error(`Không thể cập nhật quyền: ${error.message}`)
    },
  })

  return {
    permissionsData,
    isLoading,
    toggleModule: toggleModule.mutate,
    toggleAction: toggleAction.mutate,
    saveConfiguration: saveConfiguration.mutate,
    isSaving: saveConfiguration.isPending,
  }
}
