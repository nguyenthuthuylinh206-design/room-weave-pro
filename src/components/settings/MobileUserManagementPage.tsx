import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUsers } from '@/hooks/useUsers'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { Plus, Search, Users as UsersIcon, Mail, Building2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const USER_LEVEL_CONFIG = {
  owner: { label: 'Chủ sở hữu', color: 'bg-purple-100 text-purple-800' },
  manager: { label: 'Quản lý', color: 'bg-blue-100 text-blue-800' },
  staff: { label: 'Nhân viên', color: 'bg-gray-100 text-gray-800' },
}

export const MobileUserManagementPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  
  const { users = [], isLoading } = useUsers()

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    toast.success('Đã cập nhật!')
  }

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Quản lý người dùng"
        onBack={() => navigate('/settings')}
        action={{
          icon: Plus,
          onClick: () => navigate('/settings/users/create'),
          label: 'Thêm người dùng'
        }}
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Tổng số</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">
                  {users.filter(u => u.user_level_code === 'owner').length}
                </p>
                <p className="text-xs text-muted-foreground">Chủ</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">
                  {users.filter(u => u.user_level_code === 'staff').length}
                </p>
                <p className="text-xs text-muted-foreground">Nhân viên</p>
              </CardContent>
            </Card>
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Không tìm thấy người dùng' : 'Chưa có người dùng'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const levelConfig = USER_LEVEL_CONFIG[user.user_level_code as keyof typeof USER_LEVEL_CONFIG] || USER_LEVEL_CONFIG.staff

                return (
                  <Card 
                    key={user.id}
                    className="active:scale-[0.98] transition-transform cursor-pointer"
                    onClick={() => navigate(`/settings/users/${user.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UsersIcon className="h-6 w-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{user.full_name}</span>
                            <Badge className={levelConfig.color} variant="secondary">
                              {levelConfig.label}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            
                            {user.hotel_id && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate text-xs">Hotel ID: {user.hotel_id.substring(0, 8)}...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}
