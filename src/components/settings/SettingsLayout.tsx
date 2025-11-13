import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Briefcase, 
  Plug, 
  Lock,
  Menu,
  X,
  Building2,
  FolderTree,
  Zap,
  TestTube2,
  CreditCard,
  BarChart3,
  KeyRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

const settingsNavigation = [
  { name: 'Cài đặt chung', href: '/settings/general', icon: Settings },
  { name: 'Khách sạn', href: '/settings/hotels', icon: Building2 },
  { name: 'Danh mục', href: '/settings/categories', icon: FolderTree },
  { name: 'Người dùng', href: '/settings/users', icon: Users },
  { name: 'Đổi mật khẩu', href: '/settings/change-password', icon: KeyRound },
  { name: 'Đăng ký & Thanh toán', href: '/settings/subscription', icon: CreditCard },
  { name: 'Mức sử dụng', href: '/settings/usage', icon: BarChart3 },
  { name: 'Vai trò', href: '/settings/roles', icon: Shield },
  { name: 'Quyền hạn', href: '/settings/permissions', icon: Shield },
  { name: 'Thông báo', href: '/settings/notifications', icon: Bell },
  { name: 'Cấu hình nghiệp vụ', href: '/settings/business', icon: Briefcase },
  { name: 'Tự động hóa', href: '/settings/workflows', icon: Zap },
  { name: 'Tích hợp & API', href: '/settings/integrations', icon: Plug },
  { name: 'Hệ thống & Bảo mật', href: '/settings/security', icon: Lock },
  { name: 'Kiểm thử hệ thống', href: '/settings/system-test', icon: TestTube2 },
]

function SettingsSidebar({ className }: { className?: string }) {
  const location = useLocation()

  return (
    <nav className={cn('space-y-1', className)}>
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
  )
}

export function SettingsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Mobile header */}
      <div className="lg:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SettingsSidebar className="mt-6" />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <SettingsSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
