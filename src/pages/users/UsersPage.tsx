import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagementTab } from '@/components/users/UserManagementTab'
import { RolesOverviewTab } from '@/components/users/RolesOverviewTab'
import { PermissionConfigurationTab } from '@/components/users/PermissionConfigurationTab'
import { Users, Shield, Settings } from 'lucide-react'

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('users')
  const [preSelectedUserId, setPreSelectedUserId] = useState<string | null>(null)

  const handleManagePermissions = (userId: string) => {
    setPreSelectedUserId(userId)
    setActiveTab('permissions')
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Quản lý Người dùng & Phân quyền"
        description="Quản lý người dùng, vai trò và quyền truy cập"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Người dùng
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Vai trò
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Settings className="h-4 w-4" />
            Cấu hình Quyền
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagementTab onManagePermissions={handleManagePermissions} />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesOverviewTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionConfigurationTab preSelectedUserId={preSelectedUserId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
