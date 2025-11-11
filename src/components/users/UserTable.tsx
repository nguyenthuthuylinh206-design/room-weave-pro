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
import { User } from '@/types/database.types'
import { UserAvatar } from './UserAvatar'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useDeleteUser } from '@/hooks/useUsers'

interface UserTableProps {
  users: User[]
  onEdit?: (user: User) => void
}

const roleLabels = {
  super_admin: 'Super Admin',
  owner: 'Chủ sở hữu',
  hotel_manager: 'Quản lý KS',
  department_manager: 'Quản lý BP',
  staff: 'Nhân viên',
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
                <Badge variant="outline">
                  {roleLabels[user.role as keyof typeof roleLabels] || 'N/A'}
                </Badge>
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
