import { useState, useEffect } from 'react'
import { useRolesManagement } from '@/hooks/useRolesManagement'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Info, Shield } from 'lucide-react'

const MODULE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Người dùng',
  hotels: 'Khách sạn',
  rooms: 'Phòng',
  items: 'Vật phẩm',
  inventory: 'Kho',
  laundry: 'Giặt là',
  maintenance: 'Bảo trì',
  vendors: 'Nhà cung cấp',
  purchase_orders: 'Đơn mua hàng',
  reports: 'Báo cáo',
  settings: 'Cài đặt',
}

export function RolesOverviewTab() {
  const { roles, isLoading, fetchRoleWithPermissions } = useRolesManagement()
  const [rolesWithPermissions, setRolesWithPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRolesWithPermissions = async () => {
      if (!roles) return
      
      setLoading(true)
      try {
        const loaded = await Promise.all(
          roles.map(role => fetchRoleWithPermissions(role.id))
        )
        setRolesWithPermissions(loaded)
      } catch (error) {
        console.error('Error loading roles:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRolesWithPermissions()
  }, [roles, fetchRoleWithPermissions])

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    )
  }

  // Group permissions by module
  const getModulesForRole = (permissions: any[]) => {
    const modules = new Set(permissions.map(p => p.module))
    return Array.from(modules)
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Các vai trò được định nghĩa sẵn trong hệ thống. Để tùy chỉnh quyền cho từng người dùng, sử dụng tab <span className="font-medium text-foreground">Cấu hình Quyền</span>.
        </p>
      </div>

      {/* Roles Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rolesWithPermissions.map((role) => {
          const modules = getModulesForRole(role.permissions)
          
          return (
            <div key={role.id} className="border rounded-lg p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{role.name}</span>
                {role.is_system && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Hệ thống
                  </span>
                )}
              </div>
              
              {role.description && (
                <p className="text-xs text-muted-foreground">{role.description}</p>
              )}

              {/* Level */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Cấp độ:</span>
                <span className="font-medium">{role.hierarchy_level}</span>
              </div>
              
              {/* Modules */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Modules ({modules.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {modules.map((module) => (
                    <span 
                      key={module} 
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-foreground"
                    >
                      {MODULE_NAMES[module] || module}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
