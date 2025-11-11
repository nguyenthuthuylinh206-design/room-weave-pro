import { useState } from 'react'
import { Shield, Users, List } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PermissionMatrix } from '@/components/settings/permissions/PermissionMatrix'
import { PermissionHierarchy } from '@/components/settings/permissions/PermissionHierarchy'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAllPermissions, useUserPermissions } from '@/hooks/usePermissions'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function PermissionManagementPage() {
  const [selectedTab, setSelectedTab] = useState('matrix')
  const { data: allPermissions } = useAllPermissions()
  const { data: userPermissions } = useUserPermissions()

  const permissionStats = {
    total: allPermissions?.length || 0,
    user: userPermissions?.length || 0,
    modules: new Set(allPermissions?.map(p => p.module) || []).size,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Quyền hạn"
        description="Quản lý vai trò và phân quyền cho người dùng trong hệ thống"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số Quyền
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissionStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Trong {permissionStats.modules} module
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quyền của Bạn
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissionStats.user}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((permissionStats.user / permissionStats.total) * 100)}% tổng quyền
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Module
            </CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissionStats.modules}</div>
            <p className="text-xs text-muted-foreground">
              Module có quyền hạn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix" className="gap-2">
            <Shield className="h-4 w-4" />
            Ma trận Quyền
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="gap-2">
            <Users className="h-4 w-4" />
            Phân cấp
          </TabsTrigger>
          <TabsTrigger value="my-permissions" className="gap-2">
            <List className="h-4 w-4" />
            Quyền của Tôi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <PermissionHierarchy />
        </TabsContent>

        <TabsContent value="my-permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quyền hạn của Bạn</CardTitle>
              <CardDescription>
                Danh sách các quyền mà tài khoản của bạn được phép thực hiện
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {Object.entries(
                    (userPermissions || []).reduce((acc, perm) => {
                      if (!acc[perm.module]) {
                        acc[perm.module] = []
                      }
                      acc[perm.module].push(perm)
                      return acc
                    }, {} as Record<string, typeof userPermissions>)
                  ).map(([module, permissions]) => (
                    <div key={module} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <h3 className="font-semibold text-lg capitalize">
                          {module}
                        </h3>
                        <Badge variant="outline">
                          {permissions.length} quyền
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {permissions.map((perm) => (
                          <div
                            key={perm.code}
                            className="flex items-center gap-2 p-3 rounded-lg border bg-primary/5 border-primary/20"
                          >
                            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{perm.name}</p>
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {perm.action}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {(!userPermissions || userPermissions.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có quyền hạn nào được gán cho tài khoản này</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
