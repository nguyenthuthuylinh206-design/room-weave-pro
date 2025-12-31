import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="pb-2 border-b">
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('description', 'Quản lý người dùng, vai trò và quyền truy cập')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="users" className="h-7 text-xs gap-1.5 px-3">
            <Users className="h-3 w-3" />
            {t('tabs.users', 'Người dùng')}
          </TabsTrigger>
          <TabsTrigger value="roles" className="h-7 text-xs gap-1.5 px-3">
            <Shield className="h-3 w-3" />
            {t('tabs.roles', 'Vai trò')}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="h-7 text-xs gap-1.5 px-3">
            <Settings className="h-3 w-3" />
            {t('tabs.permissions', 'Cấu hình Quyền')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UserManagementTab onManagePermissions={handleManagePermissions} />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <RolesOverviewTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <PermissionConfigurationTab preSelectedUserId={preSelectedUserId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
