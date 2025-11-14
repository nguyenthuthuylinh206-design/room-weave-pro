import { useState, useEffect } from 'react'
import { useRolesManagement } from '@/hooks/useRolesManagement'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
      <div className="flex items-center justify-center h-96">
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
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Các vai trò được định nghĩa sẵn trong hệ thống. Để tùy chỉnh quyền cho từng người dùng, sử dụng tab <strong>Cấu hình Quyền</strong>.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rolesWithPermissions.map((role) => {
          const modules = getModulesForRole(role.permissions)
          
          return (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>{role.name}</CardTitle>
                </div>
                {role.description && (
                  <CardDescription>{role.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Cấp độ:</span>
                  <Badge variant="outline">{role.hierarchy_level}</Badge>
                </div>
                
                <div className="space-y-2">
                  <span className="text-sm font-medium">Modules ({modules.length}):</span>
                  <div className="flex flex-wrap gap-2">
                    {modules.map((module) => (
                      <Badge key={module} variant="secondary">
                        {MODULE_NAMES[module] || module}
                      </Badge>
                    ))}
                  </div>
                </div>

                {role.is_system && (
                  <Badge variant="outline" className="w-fit">
                    Hệ thống
                  </Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
