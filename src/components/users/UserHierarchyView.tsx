import { useState } from 'react'
import { DeleteUserDialog } from './DeleteUserDialog'
import { UserWithRelations } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from './UserAvatar'
import { Crown, Users, User as UserIcon, MoreVertical, Pencil, Trash2, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteUser } from '@/hooks/useUsers'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface UserHierarchyViewProps {
  users: UserWithRelations[]
  onEdit: (user: UserWithRelations) => void
  onManagePermissions?: (userId: string) => void
}

export function UserHierarchyView({ users, onEdit, onManagePermissions }: UserHierarchyViewProps) {
  const [userToDelete, setUserToDelete] = useState<UserWithRelations | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    owner: true,
    managers: true,
    staff: true
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleDeleteClick = (user: UserWithRelations) => {
    setUserToDelete(user)
  }

  // Group users by level
  const owner = users.find((u) => u.user_level_code === 'tenant_owner')
  const managers = users.filter((u) => u.user_level_code === 'manager')
  const staff = users.filter((u) => u.user_level_code === 'staff')

  // Get creator name for a user
  const getCreatorName = (createdBy: string | null) => {
    if (!createdBy) return null
    const creator = users.find(u => u.id === createdBy)
    return creator?.full_name || 'Đã xóa'
  }

  // Count subordinates for a user
  const countSubordinates = (userId: string) => {
    return users.filter(u => u.created_by === userId).length
  }

  const UserCard = ({ 
    user, 
    icon: Icon, 
    showCreator = false 
  }: { 
    user: UserWithRelations
    icon: any
    showCreator?: boolean
  }) => {
    const subordinatesCount = countSubordinates(user.id)
    const creatorName = getCreatorName(user.created_by)

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors relative">
        {/* Connecting line for hierarchy */}
        {showCreator && (
          <div className="absolute left-0 top-0 w-4 h-1/2 border-l-2 border-b-2 border-dashed border-muted-foreground/30 -ml-4" />
        )}
        
        <div className="flex items-center gap-3 flex-1">
          <UserAvatar user={user} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{user.full_name}</span>
              {user.is_primary_owner && (
                <Badge variant="default" className="bg-yellow-500">Chủ sở hữu chính</Badge>
              )}
              {subordinatesCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {subordinatesCount} người dưới quyền
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {user.position_id && (
                <Badge variant="outline" className="text-xs">
                  {user.position?.name || 'Chưa có chức vụ'}
                </Badge>
              )}
              {user.hotel_id && (
                <Badge variant="outline" className="text-xs">
                  {user.hotel?.name || 'Khách sạn'}
                </Badge>
              )}
              {showCreator && creatorName && (
                <span className="text-xs text-muted-foreground">
                  Được tạo bởi: <strong>{creatorName}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
              {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
            </Badge>
            {user.created_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: vi })}
              </span>
            )}
          </div>
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
            {onManagePermissions && (
              <DropdownMenuItem onClick={() => onManagePermissions(user.id)}>
                <Shield className="h-4 w-4 mr-2" />
                Phân quyền
              </DropdownMenuItem>
            )}
            {!user.is_primary_owner && (
              <DropdownMenuItem
                onClick={() => handleDeleteClick(user)}
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
  }

  return (
    <div className="space-y-6">
      {/* Owner Section */}
      {owner && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => toggleSection('owner')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span>Chủ sở hữu</span>
                <Badge variant="outline">1</Badge>
              </div>
              {expandedSections.owner ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.owner && (
            <CardContent className="space-y-2">
              <Alert>
                <AlertDescription className="text-sm">
                  Chủ sở hữu có toàn quyền trong hệ thống và không thể bị xóa. Được tạo lúc khởi tạo doanh nghiệp.
                </AlertDescription>
              </Alert>
              <UserCard user={owner} icon={Crown} />
            </CardContent>
          )}
        </Card>
      )}

      {/* Managers Section */}
      {managers.length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => toggleSection('managers')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <span>Quản lý</span>
                <Badge variant="outline">{managers.length}</Badge>
              </div>
              {expandedSections.managers ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.managers && (
            <CardContent className="space-y-2">
              <Alert>
                <AlertDescription className="text-sm">
                  Quản lý có thể tạo Quản lý khác và Nhân viên. Họ quản lý các khách sạn cụ thể và có quyền phê duyệt yêu cầu.
                </AlertDescription>
              </Alert>
              <div className="space-y-2 relative">
                {managers.map((manager, index) => (
                  <div key={manager.id} className="relative ml-4">
                    <UserCard user={manager} icon={Users} showCreator />
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Staff Section */}
      {staff.length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => toggleSection('staff')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <span>Nhân viên</span>
                <Badge variant="outline">{staff.length}</Badge>
              </div>
              {expandedSections.staff ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.staff && (
            <CardContent className="space-y-2">
              <Alert>
                <AlertDescription className="text-sm">
                  Nhân viên thực hiện các công việc hàng ngày. Họ không có quyền tạo người dùng mới.
                </AlertDescription>
              </Alert>
              <div className="space-y-2 relative">
                {staff.map((staffMember) => (
                  <div key={staffMember.id} className="relative ml-4">
                    <UserCard user={staffMember} icon={UserIcon} showCreator />
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <DeleteUserDialog
        user={userToDelete}
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      />
    </div>
  )
}