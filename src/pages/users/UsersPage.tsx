import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagementTab } from '@/components/users/UserManagementTab'
import { RolesOverviewTab } from '@/components/users/RolesOverviewTab'
import { PermissionConfigurationTab } from '@/components/users/PermissionConfigurationTab'
import { Users, Shield, Settings } from 'lucide-react'
import { MobileUserManagementPage } from '@/components/settings/MobileUserManagementPage'
import { useBreakpoint } from '@/lib/breakpoints'

export default function UsersPage() {
  const { t } = useTranslation('users')
  const { isMobile } = useBreakpoint()
  const [activeTab, setActiveTab] = useState('users')
  const [preSelectedUserId, setPreSelectedUserId] = useState<string | null>(null)

  const handleManagePermissions = (userId: string) => {
    setPreSelectedUserId(userId)
    setActiveTab('permissions')
  }

  if (isMobile) {
    return <MobileUserManagementPage />
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('title')}
        description={t('description', 'Quản lý người dùng, vai trò và quyền truy cập')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            {t('tabs.users', 'Người dùng')}
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            {t('tabs.roles', 'Vai trò')}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Settings className="h-4 w-4" />
            {t('tabs.permissions', 'Cấu hình Quyền')}
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
