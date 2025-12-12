import { useNavigate } from 'react-router-dom'
import { useUser } from '@/hooks/useUser'
import { useAuth } from '@/contexts/AuthContext'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, User, Building2, Users, Mail, Globe, Shield, Database, Bell, LogOut } from 'lucide-react'

interface SettingsItem {
  id: string
  title: string
  description: string
  icon: typeof User
  route: string
  badge?: string
  requireAdmin?: boolean
}

const SETTINGS_SECTIONS = [
  {
    title: 'Tài khoản',
    items: [
      {
        id: 'profile',
        title: 'Thông tin cá nhân',
        description: 'Cập nhật thông tin và mật khẩu',
        icon: User,
        route: '/settings/profile',
      },
    ] as SettingsItem[],
  },
  {
    title: 'Quản lý',
    items: [
      {
        id: 'hotels',
        title: 'Khách sạn',
        description: 'Quản lý danh sách khách sạn',
        icon: Building2,
        route: '/settings/hotels',
        requireAdmin: true,
      },
      {
        id: 'users',
        title: 'Người dùng',
        description: 'Quản lý nhân viên và quyền hạn',
        icon: Users,
        route: '/settings/users',
        requireAdmin: true,
      },
      {
        id: 'categories',
        title: 'Danh mục',
        description: 'Quản lý danh mục sản phẩm',
        icon: Database,
        route: '/settings/categories',
      },
    ] as SettingsItem[],
  },
  {
    title: 'Hệ thống',
    items: [
      {
        id: 'email-templates',
        title: 'Email Templates',
        description: 'Quản lý mẫu email',
        icon: Mail,
        route: '/settings/email-templates',
        requireAdmin: true,
      },
      {
        id: 'notifications',
        title: 'Thông báo',
        description: 'Cài đặt thông báo',
        icon: Bell,
        route: '/settings/notifications',
      },
      {
        id: 'localization',
        title: 'Ngôn ngữ',
        description: 'Cài đặt ngôn ngữ và múi giờ',
        icon: Globe,
        route: '/settings/localization',
      },
      {
        id: 'roles',
        title: 'Vai trò & Quyền',
        description: 'Quản lý phân quyền',
        icon: Shield,
        route: '/settings/roles',
        requireAdmin: true,
        badge: 'Admin',
      },
    ] as SettingsItem[],
  },
]

export const MobileSettingsPage = () => {
  const navigate = useNavigate()
  const { user } = useUser()
  const { signOut } = useAuth()

  const isAdmin = user?.user_level_code === 'owner' || user?.user_level_code === 'manager'

  const handleLogout = async () => {
    await signOut()
    navigate('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Cài đặt"
        showBack={false}
      />

      <div className="p-4 space-y-6">
        {/* User Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Badge variant="secondary">{user?.user_level_code}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Settings Sections */}
        {SETTINGS_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(item => 
            !item.requireAdmin || isAdmin
          )

          if (visibleItems.length === 0) return null

          return (
            <div key={section.title} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground px-1">
                {section.title}
              </h3>
              
              <Card>
                <CardContent className="p-0">
                  {visibleItems.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.route)}
                        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors ${
                          index !== visibleItems.length - 1 ? 'border-b' : ''
                        }`}
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{item.title}</p>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )
        })}

        {/* Logout Button */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors text-destructive"
            >
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Đăng xuất</p>
                <p className="text-xs text-muted-foreground">
                  Đăng xuất khỏi tài khoản
                </p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
