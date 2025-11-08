import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useTenant } from '@/hooks/useTenant'
import {
  LayoutDashboard,
  Package,
  Hotel,
  Wind,
  Warehouse,
  FileText,
  Settings,
  Users,
  Building2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AppRole } from '@/types/database.types'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  roles?: AppRole[]
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Tài sản',
    href: '/items',
    icon: Package,
  },
  {
    title: 'Phòng',
    href: '/rooms',
    icon: Hotel,
  },
  {
    title: 'Giặt là',
    href: '/laundry',
    icon: Wind,
  },
  {
    title: 'Kho',
    href: '/inventory',
    icon: Warehouse,
  },
  {
    title: 'Báo cáo',
    href: '/reports',
    icon: FileText,
    roles: ['owner', 'hotel_manager', 'super_admin'],
  },
  {
    title: 'Người dùng',
    href: '/users',
    icon: Users,
    roles: ['owner', 'super_admin'],
  },
  {
    title: 'Khách sạn',
    href: '/hotels',
    icon: Building2,
    roles: ['owner', 'super_admin'],
  },
  {
    title: 'Cài đặt',
    href: '/settings',
    icon: Settings,
  },
]

export const Sidebar = () => {
  const location = useLocation()
  const { user, role } = useUser()
  const { tenant } = useTenant()

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(role || 'staff')
  })

  return (
    <div className="flex w-64 flex-col border-r bg-card">
      {/* Logo & Tenant Info */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.name}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <p className="truncate font-semibold text-sm">{tenant?.name}</p>
          <Badge variant="outline" className="text-xs">
            {tenant?.subscription_plan}
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback>
              {user?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-medium text-sm">{user?.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {role === 'super_admin' && 'Super Admin'}
              {role === 'owner' && 'Chủ sở hữu'}
              {role === 'hotel_manager' && 'Quản lý KS'}
              {role === 'department_manager' && 'Quản lý bộ phận'}
              {role === 'staff' && 'Nhân viên'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
