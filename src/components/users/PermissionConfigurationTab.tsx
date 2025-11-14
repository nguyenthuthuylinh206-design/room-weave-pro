import { useState, useEffect } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { UserListSidebar } from '@/components/permissions/UserListSidebar'
import { UserPermissionPanel } from '@/components/permissions/UserPermissionPanel'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface PermissionConfigurationTabProps {
  preSelectedUserId?: string | null
}

export function PermissionConfigurationTab({ preSelectedUserId }: PermissionConfigurationTabProps) {
  const { users, isLoading } = useUsers()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Set pre-selected user if provided
  useEffect(() => {
    if (preSelectedUserId) {
      setSelectedUserId(preSelectedUserId)
    }
  }, [preSelectedUserId])

  const selectedUser = users?.find((u) => u.id === selectedUserId) || null

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['user-permission-configuration'] })
    toast.success('Đã làm mới dữ liệu')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Chọn người dùng để cấu hình quyền truy cập module
        </p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      <div className="flex gap-6 min-h-[600px]">
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
