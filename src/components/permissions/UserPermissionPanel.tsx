import { useState, useEffect } from 'react'
import { UserWithRelations } from '@/types/database.types'
import { UserAvatar } from '@/components/users/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ModuleToggle } from './ModuleToggle'
import { useUserPermissionConfiguration } from '@/hooks/useUserPermissionConfiguration'
import { MODULES } from '@/hooks/useUserPermissions'
import { Info } from 'lucide-react'

interface UserPermissionPanelProps {
  user: UserWithRelations | null
}

const USER_LEVEL_LABELS: Record<string, string> = {
  tenant_owner: 'Chủ sở hữu',
  manager: 'Quản lý',
  staff: 'Nhân viên',
  viewer: 'Người xem',
}

export function UserPermissionPanel({ user }: UserPermissionPanelProps) {
  const { permissionsData, isLoading, saveConfiguration, isSaving } =
    useUserPermissionConfiguration(user?.id)

  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({})

  // Initialize local state from fetched data
  useEffect(() => {
    if (permissionsData) {
      const initial: Record<string, boolean> = {}
      Object.entries(permissionsData).forEach(([module, state]) => {
        initial[module] = state.enabled
      })
      setLocalPermissions(initial)
    }
  }, [permissionsData])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Chọn người dùng để cấu hình quyền</p>
          <p className="text-sm mt-2">Chọn một người dùng từ danh sách bên trái</p>
        </div>
      </div>
    )
  }

  const handleToggle = (module: string, enabled: boolean) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [module]: enabled,
    }))
  }

  const handleSave = () => {
    if (!user) return
    saveConfiguration({ userId: user.id, modules: localPermissions })
  }

  const hasChanges = permissionsData 
    ? Object.keys(localPermissions).some(
        (module) => localPermissions[module] !== permissionsData[module]?.enabled
      )
    : false

  // Check if user is owner/super admin (cannot be edited)
  const isProtectedUser = user.user_level_code === 'tenant_owner' || user.user_level_code === 'super_admin'

  return (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user.full_name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {USER_LEVEL_LABELS[user.user_level_code] || user.user_level_code}
              </Badge>
              {user.hotel_id && (
                <Badge variant="outline" className="text-xs">
                  Khách sạn: {user.hotel_id}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {isProtectedUser && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Không thể chỉnh sửa quyền cho Chủ sở hữu hoặc Super Admin. Họ có toàn quyền truy cập.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Permissions Content */}
      <ScrollArea className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Cấu hình Quyền theo Module</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Bật/tắt quyền truy cập cho từng module. Khi bật một module, người dùng sẽ có toàn quyền
                (xem, tạo, sửa, xóa, xuất, phê duyệt) đối với module đó.
              </p>
            </div>

            <div className="grid gap-2">
              {MODULES.map((module) => (
                <ModuleToggle
                  key={module.code}
                  moduleName={module.name}
                  enabled={localPermissions[module.code] || false}
                  source={permissionsData?.[module.code]?.source || null}
                  onChange={(enabled) => handleToggle(module.code, enabled)}
                  disabled={isProtectedUser}
                />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Save Button */}
      <div className="p-6 border-t bg-background">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || isProtectedUser}
          className="w-full"
          size="lg"
        >
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  )
}
