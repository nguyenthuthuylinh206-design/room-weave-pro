import { useState } from 'react'
import { Check, X, Shield, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useRolesManagement } from '@/hooks/useRolesManagement'
import { usePermissionsByModule, useRolePermissions, useAssignPermissionsToRole } from '@/hooks/usePermissions'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PermissionMatrixProps {
  onRoleSelect?: (roleId: string) => void
}

export function PermissionMatrix({ onRoleSelect }: PermissionMatrixProps) {
  const { roles, isLoading: rolesLoading } = useRolesManagement()
  const { data: permissionModules, isLoading: permissionsLoading } = usePermissionsByModule()
  const [selectedRoleId, setSelectedRoleId] = useState<string>()
  const { data: rolePermissions } = useRolePermissions(selectedRoleId)
  const assignPermissions = useAssignPermissionsToRole()

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId)
    onRoleSelect?.(roleId)
  }

  const handlePermissionToggle = (roleId: string, permissionId: string, currentlyHas: boolean) => {
    if (!rolePermissions) return

    const currentPermissionIds = rolePermissions.map((rp: any) => rp.permission_id)
    
    let newPermissionIds: string[]
    if (currentlyHas) {
      // Remove permission
      newPermissionIds = currentPermissionIds.filter((id: string) => id !== permissionId)
    } else {
      // Add permission
      newPermissionIds = [...currentPermissionIds, permissionId]
    }

    assignPermissions.mutate({
      roleId,
      permissionIds: newPermissionIds,
    })
  }

  const hasPermission = (roleId: string, permissionId: string): boolean => {
    if (!rolePermissions || selectedRoleId !== roleId) return false
    return rolePermissions.some((rp: any) => rp.permission_id === permissionId)
  }

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const nonSystemRoles = roles?.filter(r => !r.is_system) || []
  const systemRoles = roles?.filter(r => r.is_system) || []

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Chọn Vai trò</CardTitle>
          <CardDescription>
            Chọn vai trò để xem và chỉnh sửa quyền hạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {systemRoles.map((role) => (
              <Button
                key={role.id}
                variant={selectedRoleId === role.id ? 'default' : 'outline'}
                className={cn(
                  'justify-start h-auto py-3',
                  selectedRoleId === role.id && 'ring-2 ring-primary'
                )}
                onClick={() => handleRoleSelect(role.id)}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">{role.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Hệ thống
                  </Badge>
                </div>
              </Button>
            ))}
            {nonSystemRoles.map((role) => (
              <Button
                key={role.id}
                variant={selectedRoleId === role.id ? 'default' : 'outline'}
                className={cn(
                  'justify-start h-auto py-3',
                  selectedRoleId === role.id && 'ring-2 ring-primary'
                )}
                onClick={() => handleRoleSelect(role.id)}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="font-medium">{role.name}</span>
                  {role.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {role.description}
                    </span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      {selectedRoleId && (
        <Card>
          <CardHeader>
            <CardTitle>Ma trận Quyền hạn</CardTitle>
            <CardDescription>
              Quản lý quyền hạn cho vai trò đã chọn. Click vào checkbox để bật/tắt quyền.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="space-y-6">
                {permissionModules?.map((module) => (
                  <div key={module.module} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <h3 className="font-semibold text-lg capitalize">
                        {module.module}
                      </h3>
                      <Badge variant="outline">
                        {module.permissions.length} quyền
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {module.permissions.map((permission) => {
                        const hasThis = hasPermission(selectedRoleId, permission.id)
                        const isSystem = systemRoles.some(r => r.id === selectedRoleId)

                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                              hasThis ? 'bg-primary/5 border-primary/20' : 'bg-background',
                              !isSystem && 'hover:bg-accent cursor-pointer'
                            )}
                            onClick={() => {
                              if (!isSystem) {
                                handlePermissionToggle(selectedRoleId, permission.id, hasThis)
                              }
                            }}
                          >
                            <Checkbox
                              checked={hasThis}
                              disabled={isSystem || assignPermissions.isPending}
                              onCheckedChange={() => {
                                if (!isSystem) {
                                  handlePermissionToggle(selectedRoleId, permission.id, hasThis)
                                }
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {permission.name}
                                </span>
                                {hasThis && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              {permission.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                              )}
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {permission.action}
                              </Badge>
                            </div>
                            {isSystem && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Vai trò hệ thống không thể chỉnh sửa</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {!selectedRoleId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Chọn một vai trò để xem và quản lý quyền hạn
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
