import { useUser } from './useUser'
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions'

export const usePermissions = () => {
  const { role } = useUser()

  return {
    hasPermission: (permission: Permission) => hasPermission(role, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(role, permissions),
  }
}
