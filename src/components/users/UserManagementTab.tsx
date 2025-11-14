import { useState } from 'react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { useUser } from '@/hooks/useUser'
import { UserHierarchyView } from './UserHierarchyView'
import { UserTable } from './UserTable'
import { UserFormDialog } from './UserFormDialog'
import { UserStatsCards } from './UserStatsCards'
import { UserFilters } from './UserFilters'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserWithRelations } from '@/types/database.types'
import { UserFormData } from '@/lib/validations/user.schemas'
import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UserManagementTabProps {
  onManagePermissions?: (userId: string) => void
}

export function UserManagementTab({ onManagePermissions }: UserManagementTabProps) {
  const { users, isLoading } = useUsers()
  const { user: currentUser } = useUser()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [filters, setFilters] = useState({
    search: '',
    userLevel: 'all',
    status: 'all',
    hotelId: 'all',
    positionId: 'all',
    department: 'all',
    createdByMe: false,
  })
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table'>('hierarchy')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRelations | null>(null)

  const canAddUser = currentUser?.user_level_code === 'tenant_owner' || 
                     currentUser?.user_level_code === 'manager'

  const handleOpenDialog = (user?: UserWithRelations) => {
    if (user) {
      setEditingUser(user)
    } else {
      setEditingUser(null)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (data: UserFormData) => {
    if (editingUser) {
      await updateUser.mutateAsync({ id: editingUser.id, data })
    } else {
      await createUser.mutateAsync(data)
    }
    setIsDialogOpen(false)
    setEditingUser(null)
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = filters.search === '' || 
      user.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase())
    
    const matchesUserLevel = filters.userLevel === 'all' || user.user_level_code === filters.userLevel
    const matchesHotel = filters.hotelId === 'all' || user.hotel_id === filters.hotelId
    const matchesPosition = filters.positionId === 'all' || user.position_id === filters.positionId
    const matchesStatus = filters.status === 'all' || user.status === filters.status
    const matchesDepartment = filters.department === 'all' || user.department === filters.department
    const matchesCreatedByMe = !filters.createdByMe || user.created_by === currentUser?.id

    return matchesSearch && matchesUserLevel && matchesHotel && matchesPosition && matchesStatus && matchesDepartment && matchesCreatedByMe
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UserStatsCards users={users || []} />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <UserFilters 
            filters={filters} 
            onFiltersChange={setFilters}
          />
        </div>
        
        {canAddUser && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm người dùng
          </Button>
        )}
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'hierarchy' | 'table')}>
        <TabsList>
          <TabsTrigger value="hierarchy">Phân cấp</TabsTrigger>
          <TabsTrigger value="table">Bảng</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="mt-6">
          <UserHierarchyView
            users={filteredUsers}
            onEdit={handleOpenDialog}
            onManagePermissions={onManagePermissions}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <UserTable
            users={filteredUsers}
            onEdit={handleOpenDialog}
            onManagePermissions={onManagePermissions}
          />
        </TabsContent>
      </Tabs>

      {filteredUsers.length === 0 && (
        <EmptyState
          icon={Users}
          title="Không tìm thấy người dùng"
          description="Không có người dùng nào phù hợp với bộ lọc của bạn"
        />
      )}

      <UserFormDialog
        user={editingUser}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
