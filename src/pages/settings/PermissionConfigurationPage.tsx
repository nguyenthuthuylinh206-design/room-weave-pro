import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useUsers } from '@/hooks/useUsers'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { UserListSidebar } from '@/components/permissions/UserListSidebar'
import { UserPermissionPanel } from '@/components/permissions/UserPermissionPanel'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function PermissionConfigurationPage() {
  const { users, isLoading } = useUsers()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const selectedUser = users?.find((u) => u.id === selectedUserId) || null

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['user-permission-configuration'] })
    toast.success('Đã làm mới dữ liệu')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background p-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Cấu hình Quyền hạn"
            description="Quản lý quyền truy cập cho tất cả người dùng"
          />
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - 30% */}
        <div className="w-[30%] min-w-[320px]">
          <UserListSidebar
            users={users || []}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
          />
        </div>

        {/* Main Content - 70% */}
        <div className="flex-1">
          <UserPermissionPanel user={selectedUser} />
        </div>
      </div>
    </div>
  )
}
