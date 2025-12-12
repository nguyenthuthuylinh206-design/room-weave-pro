import { useMemo } from 'react'
import { useUserModulePermissions } from './useUserModulePermissions'
import { useUser } from './useUser'

// Thứ tự ưu tiên các route
const ROUTE_PRIORITY: { module: string; path: string; label: string }[] = [
  { module: 'dashboard', path: '/', label: 'Dashboard' },
  { module: 'items', path: '/items', label: 'Vật tư' },
  { module: 'rooms', path: '/rooms', label: 'Phòng' },
  { module: 'inventory', path: '/inventory', label: 'Kho' },
  { module: 'laundry', path: '/laundry', label: 'Giặt là' },
  { module: 'maintenance', path: '/maintenance', label: 'Bảo trì' },
  { module: 'reports', path: '/reports', label: 'Báo cáo' },
  { module: 'hotels', path: '/hotels', label: 'Khách sạn' },
  { module: 'users', path: '/settings/users', label: 'Nhân viên' },
  { module: 'vendors', path: '/vendors', label: 'Nhà cung cấp' },
]

export function useFirstAccessibleRoute() {
  const { user, hasAnyRole, isLoading: isUserLoading } = useUser()
  const { data: permissions, isLoading: isPermissionsLoading } = useUserModulePermissions()

  // Đợi cả user VÀ permissions load xong
  const isLoading = isUserLoading || isPermissionsLoading

  const firstAccessibleRoute = useMemo(() => {
    // Nếu đang loading, return null (chờ tiếp)
    if (isUserLoading || isPermissionsLoading) {
      return null
    }

    // Super admin và owner có quyền truy cập tất cả
    if (hasAnyRole(['super_admin', 'owner'])) {
      return '/'
    }

    // Nếu chưa có permissions data, return null
    if (!permissions || permissions.length === 0) {
      return null
    }

    // Tìm route đầu tiên user có quyền view
    for (const route of ROUTE_PRIORITY) {
      const permission = permissions.find(p => p.module === route.module)
      if (permission?.can_view) {
        return route.path
      }
    }

    // Không có quyền gì → unauthorized
    return '/unauthorized'
  }, [permissions, hasAnyRole, isUserLoading, isPermissionsLoading])

  const hasAnyPermission = useMemo(() => {
    if (hasAnyRole(['super_admin', 'owner'])) return true
    if (!permissions || permissions.length === 0) return false
    return permissions.some(p => p.can_view)
  }, [permissions, hasAnyRole])

  return {
    firstAccessibleRoute,
    hasAnyPermission,
    isLoading,
    permissions,
  }
}
