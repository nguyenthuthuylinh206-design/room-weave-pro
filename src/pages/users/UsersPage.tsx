import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/useUsers'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users, Plus, Settings, LayoutGrid, Table as TableIcon, Info } from 'lucide-react'
import { UserTable } from '@/components/users/UserTable'
import { UserHierarchyView } from '@/components/users/UserHierarchyView'
import { UserFilters } from '@/components/users/UserFilters'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { UserStatsCards } from '@/components/users/UserStatsCards'
import { PositionManagementDialog } from '@/components/users/PositionManagementDialog'
import { UserWithRelations } from '@/types/database.types'
import { UserFormData } from '@/lib/validations/user.schemas'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'

export default function UsersPage() {
  const { users, isLoading } = useUsers()
  const { user: currentUser } = useUser()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRelations | null>(null)
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table'>('hierarchy')

  // Check if current user can add users
  const canAddUser = currentUser?.user_level_code === 'tenant_owner' || currentUser?.user_level_code === 'manager'

  const handleOpenDialog = (user?: UserWithRelations) => {
    setSelectedUser(user || null)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: UserFormData) => {
    try {
      if (selectedUser) {
        await updateUser.mutateAsync({ id: selectedUser.id, data })
      } else {
        await createUser.mutateAsync(data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra')
    }
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = user.full_name
      .toLowerCase()
      .includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase())
    
    const matchesRole = filters.role === 'all' || user.role === filters.role
    const matchesStatus = filters.status === 'all' || user.status === filters.status

    return matchesSearch && matchesRole && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        description="Quản lý tài khoản và phân quyền người dùng theo cấp bậc: Chủ sở hữu > Quản lý > Nhân viên"
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPositionDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Quản lý chức vụ
          </Button>
          {canAddUser && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm người dùng
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Hierarchy Explanation */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Hệ thống phân cấp</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 text-sm mt-2">
            <div>👑 <strong>Chủ sở hữu</strong> (1 người duy nhất) - Toàn quyền trong hệ thống</div>
            <div className="ml-4">└─ 👥 <strong>Quản lý</strong> (nhiều người) - Quản lý khách sạn, tạo Quản lý và Nhân viên</div>
            <div className="ml-8">└─ 👤 <strong>Nhân viên</strong> (nhiều người) - Thực hiện công việc hàng ngày</div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      {users && users.length > 0 && <UserStatsCards users={users} />}

      <div className="flex items-center justify-between">
        <UserFilters filters={filters} onFiltersChange={setFilters} />
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="hierarchy" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Cấp bậc
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <TableIcon className="h-4 w-4" />
              Bảng
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!filteredUsers || filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có người dùng"
          description="Bắt đầu bằng cách thêm người dùng mới vào hệ thống"
          action={{
            label: 'Thêm người dùng',
            onClick: () => handleOpenDialog(),
          }}
        />
      ) : viewMode === 'hierarchy' ? (
        <UserHierarchyView users={filteredUsers} onEdit={handleOpenDialog} />
      ) : (
        <UserTable users={filteredUsers} onEdit={handleOpenDialog} />
      )}

      <UserFormDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <PositionManagementDialog
        open={positionDialogOpen}
        onOpenChange={setPositionDialogOpen}
      />
    </div>
  )
}
