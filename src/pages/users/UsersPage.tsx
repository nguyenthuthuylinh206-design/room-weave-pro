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
    userLevel: 'all',
    status: 'all',
    hotelId: 'all',
    positionId: 'all',
    department: 'all',
    createdByMe: false,
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
    setDialogOpen(false)
    try {
      if (selectedUser) {
        await updateUser.mutateAsync({ id: selectedUser.id, data })
        toast.success('Cập nhật người dùng thành công')
      } else {
        await createUser.mutateAsync(data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra')
    }
  }

  const filteredUsers = users?.filter((user) => {
    // Search filter
    const matchesSearch = 
      filters.search === '' ||
      user.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      (user.phone && user.phone.toLowerCase().includes(filters.search.toLowerCase()))
    
    // User level filter
    const matchesUserLevel = 
      filters.userLevel === 'all' || 
      user.user_level_code === filters.userLevel
    
    // Status filter
    const matchesStatus = 
      filters.status === 'all' || 
      user.status === filters.status
    
    // Hotel filter
    const matchesHotel = 
      filters.hotelId === 'all' || 
      user.hotel_id === filters.hotelId
    
    // Position filter
    const matchesPosition = 
      filters.positionId === 'all' || 
      user.position_id === filters.positionId
    
    // Department filter
    const matchesDepartment = 
      filters.department === 'all' || 
      user.department === filters.department
    
    // Created by me filter
    const matchesCreatedByMe = 
      !filters.createdByMe || 
      user.created_by === currentUser?.id

    return (
      matchesSearch &&
      matchesUserLevel &&
      matchesStatus &&
      matchesHotel &&
      matchesPosition &&
      matchesDepartment &&
      matchesCreatedByMe
    )
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
      {users && users.length > 0 && (
        <UserStatsCards users={filteredUsers || users} />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <UserFilters filters={filters} onFiltersChange={setFilters} />
        </div>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full lg:w-auto">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
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
          title={filters.search || filters.userLevel !== 'all' || filters.status !== 'all' || filters.hotelId !== 'all' || filters.positionId !== 'all' || filters.department !== 'all' || filters.createdByMe
            ? "Không tìm thấy người dùng"
            : "Chưa có người dùng"}
          description={filters.search || filters.userLevel !== 'all' || filters.status !== 'all' || filters.hotelId !== 'all' || filters.positionId !== 'all' || filters.department !== 'all' || filters.createdByMe
            ? "Thử điều chỉnh bộ lọc để xem kết quả khác"
            : "Bắt đầu bằng cách thêm người dùng mới vào hệ thống"}
          action={canAddUser && !filters.search && filters.userLevel === 'all' ? {
            label: 'Thêm người dùng',
            onClick: () => handleOpenDialog(),
          } : undefined}
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
