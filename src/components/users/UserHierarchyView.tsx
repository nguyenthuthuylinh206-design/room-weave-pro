import { useState } from 'react'
import { UserWithRelations } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from './UserAvatar'
import { Crown, Users, User as UserIcon, MoreVertical, Pencil, Trash2, Shield } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteUser } from '@/hooks/useUsers'
import { UserPermissionsDialog } from './UserPermissionsDialog'

interface UserHierarchyViewProps {
  users: UserWithRelations[]
  onEdit: (user: UserWithRelations) => void
}

export function UserHierarchyView({ users, onEdit }: UserHierarchyViewProps) {
  const deleteUserMutation = useDeleteUser()
  const [permissionsUser, setPermissionsUser] = useState<UserWithRelations | null>(null)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)

  const deleteUser = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
      deleteUserMutation.mutate(id)
    }
  }

  const openPermissionsDialog = (user: UserWithRelations) => {
    setPermissionsUser(user)
    setPermissionsDialogOpen(true)
  }

  // Group users by level
  const owner = users.find((u) => u.user_level_code === 'tenant_owner')
  const managers = users.filter((u) => u.user_level_code === 'manager')
  const staff = users.filter((u) => u.user_level_code === 'staff')

  const UserCard = ({ user, icon: Icon }: { user: UserWithRelations; icon: any }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <UserAvatar user={user} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.full_name}</span>
            {user.is_primary_owner && (
              <Badge variant="default">Chủ sở hữu chính</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
          {user.position_id && (
            <Badge variant="secondary" className="mt-1">
              {user.position?.name || 'Chưa có chức vụ'}
            </Badge>
          )}
        </div>
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
          {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
        </Badge>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="h-4 w-4 mr-2" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openPermissionsDialog(user)}>
            <Shield className="h-4 w-4 mr-2" />
            Phân quyền
          </DropdownMenuItem>
          {!user.is_primary_owner && (
            <DropdownMenuItem
              onClick={() => deleteUser(user.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Owner Section */}
      {owner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Chủ sở hữu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserCard user={owner} icon={Crown} />
          </CardContent>
        </Card>
      )}

      {/* Managers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Quản lý
            </div>
            <Badge variant="secondary">{managers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {managers.length > 0 ? (
            <div className="space-y-2">
              {managers.map((user) => (
                <UserCard key={user.id} user={user} icon={Users} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có quản lý nào
            </p>
          )}
        </CardContent>
      </Card>

      {/* Staff Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-green-500" />
              Nhân viên
            </div>
            <Badge variant="secondary">{staff.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length > 0 ? (
            <div className="space-y-2">
              {staff.map((user) => (
                <UserCard key={user.id} user={user} icon={UserIcon} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có nhân viên nào
            </p>
          )}
        </CardContent>
      </Card>

      <UserPermissionsDialog
        user={permissionsUser}
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
      />
    </div>
  )
}
