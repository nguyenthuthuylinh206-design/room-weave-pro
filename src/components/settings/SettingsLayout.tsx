import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Briefcase, 
  Plug, 
  Lock 
} from 'lucide-react'

const settingsNavigation = [
  { name: 'Cài đặt chung', href: '/settings/general', icon: Settings },
  { name: 'Người dùng', href: '/settings/users', icon: Users },
  { name: 'Vai trò & Phân quyền', href: '/settings/roles', icon: Shield },
  { name: 'Thông báo', href: '/settings/notifications', icon: Bell },
  { name: 'Cấu hình nghiệp vụ', href: '/settings/business', icon: Briefcase },
  { name: 'Tích hợp & API', href: '/settings/integrations', icon: Plug },
  { name: 'Hệ thống & Bảo mật', href: '/settings/security', icon: Lock },
]

export function SettingsLayout() {
  const location = useLocation()

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <nav className="space-y-1">
          {settingsNavigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
