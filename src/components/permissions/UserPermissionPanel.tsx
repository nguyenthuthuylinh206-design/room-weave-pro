import { useState, useEffect } from 'react'
import { UserWithRelations } from '@/types/database.types'
import { UserAvatar } from '@/components/users/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ModuleToggle } from './ModuleToggle'
import { HotelAssignmentSection } from './HotelAssignmentSection'
import { useUserPermissionConfiguration } from '@/hooks/useUserPermissionConfiguration'
import { MODULES } from '@/hooks/useUserPermissions'
import { Info } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const { permissionsData, isLoading, toggleAction, saveConfiguration, isSaving } =
    useUserPermissionConfiguration(user?.id)

  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({})
  const [localActions, setLocalActions] = useState<Record<string, Record<string, boolean>>>({})
  const [hasActionChanges, setHasActionChanges] = useState(false)
  // Initialize local state from fetched data
  useEffect(() => {
    if (permissionsData) {
      const initial: Record<string, boolean> = {}
      const initialActions: Record<string, Record<string, boolean>> = {}
      
      Object.entries(permissionsData).forEach(([module, state]) => {
        initial[module] = state.enabled
        if (state.actions) {
          initialActions[module] = { ...state.actions }
        }
      })
      
      setLocalPermissions(initial)
      setLocalActions(initialActions)
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

    // When enabling module, enable all actions
    if (enabled) {
      setLocalActions((prev) => ({
        ...prev,
        [module]: {
          view: true,
          create: true,
          update: true,
          delete: true,
          export: true,
          approve: true,
        },
      }))
    } else {
      // When disabling module, clear actions
      setLocalActions((prev) => ({
        ...prev,
        [module]: {
          view: false,
          create: false,
          update: false,
          delete: false,
          export: false,
          approve: false,
        },
      }))
    }
  }

  const handleActionToggle = (module: string, action: string, enabled: boolean) => {
    if (!user) return
    
    setLocalActions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: enabled,
      },
    }))

    // Track that we have action changes
    setHasActionChanges(true)
  }

  const handleSave = () => {
    if (!user) return
    
    // Save all module and action permissions in one call
    saveConfiguration({ 
      userId: user.id, 
      modules: localPermissions,
      actions: localActions,
    })
    
    setHasActionChanges(false)
  }

  const hasModuleChanges = permissionsData 
    ? Object.keys(localPermissions).some(
        (module) => localPermissions[module] !== permissionsData[module]?.enabled
      )
    : false

  const hasChanges = hasModuleChanges || hasActionChanges

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

      {/* Tabbed Content - Module Permissions & Hotel Assignment */}
      <Tabs defaultValue="modules" className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList className="h-10">
            <TabsTrigger value="modules">Quyền Module</TabsTrigger>
            <TabsTrigger value="hotels">Khách sạn</TabsTrigger>
          </TabsList>
        </div>
        
        <ScrollArea className="flex-1">
          <TabsContent value="modules" className="p-6 mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Cấu hình Quyền theo Module</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Bật module để cho phép truy cập. Mặc định khi bật sẽ có toàn quyền.
                    Click mũi tên để tùy chỉnh chi tiết từng quyền.
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
                      actions={localActions[module.code]}
                      onActionChange={(action, enabled) => handleActionToggle(module.code, action, enabled)}
                    />
                  ))}
                </div>

                {/* Save Button for Module Permissions */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving || isProtectedUser}
                    className="w-full"
                    size="lg"
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi quyền module'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="hotels" className="p-6 mt-0">
            <HotelAssignmentSection user={user} disabled={isProtectedUser} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
