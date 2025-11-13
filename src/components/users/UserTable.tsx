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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { UserWithRelations } from '@/types/database.types'
import { UserAvatar } from './UserAvatar'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useDeleteUser } from '@/hooks/useUsers'

interface UserTableProps {
  users: UserWithRelations[]
  onEdit?: (user: UserWithRelations) => void
}

const userLevelLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_owner: 'Chủ sở hữu',
  manager: 'Quản lý',
  staff: 'Nhân viên',
}

const userLevelColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  tenant_owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  manager: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  staff: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

export function UserTable({ users, onEdit }: UserTableProps) {
  const deleteUserMutation = useDeleteUser()

  const deleteUser = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
      deleteUserMutation.mutate(id)
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Người dùng</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Bộ phận</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Đăng nhập gần nhất</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} />
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={userLevelColors[user.user_level_code || 'staff']}
                >
                  {userLevelLabels[user.user_level_code || 'staff']}
                </Badge>
                {user.is_super_admin && (
                  <Badge variant="destructive" className="ml-2">
                    Platform
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {user.department ? (
                  <Badge variant="secondary">{user.department}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                </Badge>
              </TableCell>
              <TableCell>
                {user.last_login_at ? (
                  <span className="text-sm">
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
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit?.(user)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteUser(user.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
