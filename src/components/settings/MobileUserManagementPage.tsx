import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUsers } from '@/hooks/useUsers'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Input } from '@/components/ui/input'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { Plus, Search, Users as UsersIcon, Mail, Building2, ChevronRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const USER_LEVEL_CONFIG = {
  tenant_owner: { label: 'Chủ', color: 'text-amber-600' },
  owner: { label: 'Chủ', color: 'text-amber-600' },
  manager: { label: 'Quản lý', color: 'text-blue-600' },
  staff: { label: 'Nhân viên', color: 'text-muted-foreground' },
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

  const ownerCount = users.filter(u => u.user_level_code === 'tenant_owner' || u.user_level_code === 'owner').length
  const staffCount = users.filter(u => u.user_level_code === 'staff').length

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
        <div className="p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="border rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold">{users.length}</p>
              <p className="text-[10px] text-muted-foreground">Tổng số</p>
            </div>
            <div className="border rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-amber-600">{ownerCount}</p>
              <p className="text-[10px] text-muted-foreground">Chủ/Quản lý</p>
            </div>
            <div className="border rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold">{staffCount}</p>
              <p className="text-[10px] text-muted-foreground">Nhân viên</p>
            </div>
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="border rounded-lg p-8 text-center">
              <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Không tìm thấy người dùng' : 'Chưa có người dùng'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {filteredUsers.map((user) => {
                const levelConfig = USER_LEVEL_CONFIG[user.user_level_code as keyof typeof USER_LEVEL_CONFIG] || USER_LEVEL_CONFIG.staff

                return (
                  <div 
                    key={user.id}
                    className="flex items-center gap-3 p-3 active:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/settings/users/${user.id}`)}
                  >
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UsersIcon className="h-4 w-4 text-primary" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-medium truncate">{user.full_name}</span>
                        <span className={`text-[10px] ${levelConfig.color}`}>
                          • {levelConfig.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                          {user.email}
                        </span>
                        
                        {user.hotel_id && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate max-w-[80px]">{user.hotel_id.substring(0, 8)}...</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}
