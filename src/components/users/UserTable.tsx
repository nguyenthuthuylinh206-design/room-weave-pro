import { useState } from 'react'
import { DeleteUserDialog } from './DeleteUserDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Shield, Crown, Users as UsersIcon, UserCheck } from 'lucide-react'
import { UserWithRelations } from '@/types/database.types'
import { UserAvatar } from './UserAvatar'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useDeleteUser } from '@/hooks/useUsers'

interface UserTableProps {
  users: UserWithRelations[]
  onEdit?: (user: UserWithRelations) => void
  onManagePermissions?: (userId: string) => void
}

const userLevelLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_owner: 'Chủ sở hữu',
  manager: 'Quản lý',
  staff: 'Nhân viên',
}

const userLevelIcons: Record<string, any> = {
  tenant_owner: Crown,
  manager: UsersIcon,
  staff: UserCheck,
}

const userLevelColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  tenant_owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  manager: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  staff: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

export function UserTable({ users, onEdit, onManagePermissions }: UserTableProps) {
  const [userToDelete, setUserToDelete] = useState<UserWithRelations | null>(null)

  const handleDeleteClick = (user: UserWithRelations) => {
    setUserToDelete(user)
  }

  // Get creator name
  const getCreatorName = (createdBy: string | null) => {
    if (!createdBy) return '-'
    const creator = users.find(u => u.id === createdBy)
    return creator?.full_name || 'Đã xóa'
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Cấp bậc</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Khách sạn</TableHead>
              <TableHead>Người tạo</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Đăng nhập gần nhất</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const LevelIcon = userLevelIcons[user.user_level_code || 'staff']
              
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.full_name}
                          {user.is_primary_owner && (
                            <Badge variant="default" className="bg-yellow-500 text-xs">
                              Chính
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={userLevelColors[user.user_level_code || 'staff']}
                    >
                      {LevelIcon && <LevelIcon className="h-3 w-3 mr-1" />}
                      {userLevelLabels[user.user_level_code || 'staff']}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.position?.name ? (
                      <Badge variant="secondary">{user.position.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.hotel?.name ? (
                      <span className="text-sm">{user.hotel.name}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{getCreatorName(user.created_by)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                      {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.last_login_at ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.last_login_at), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Chưa đăng nhập</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Mở menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                        )}
                        {onManagePermissions && (
                          <DropdownMenuItem onClick={() => onManagePermissions(user.id)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Phân quyền
                          </DropdownMenuItem>
                        )}
                        {!user.is_primary_owner && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(user)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <DeleteUserDialog
        user={userToDelete}
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      />
    </>
  )
}