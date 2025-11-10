import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useTenant } from '@/hooks/useTenant'
import { useState } from 'react'
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AppRole } from '@/types/database.types'

interface NavItem {
  title: string
  href?: string
  icon: React.ElementType
  badge?: string
  roles?: AppRole[]
  children?: Omit<NavItem, 'children'>[]
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
    icon: Wind,
    children: [
      {
        title: 'Tổng quan',
        href: '/laundry',
        icon: LayoutDashboard,
      },
      {
        title: 'Danh sách lô giặt',
        href: '/laundry/batches',
        icon: Package,
      },
      {
        title: 'Nhà cung cấp',
        href: '/laundry/vendors',
        icon: Building2,
      },
    ],
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
  const { user, role, isLoading: userLoading } = useUser()
  const { tenant, isLoading: tenantLoading } = useTenant()
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Auto-expand parent if a child route is active
    const expanded: string[] = []
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.href && location.pathname.startsWith(child.href)
        )
        if (hasActiveChild) {
          expanded.push(item.title)
        }
      }
    })
    return expanded
  })

  const isLoading = userLoading || tenantLoading

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(role || 'staff')
  })

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  if (isLoading) {
    return (
      <div className="flex w-64 flex-col border-r bg-card">
        {/* Logo & Tenant Info Skeleton */}
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>

        {/* Navigation Skeleton */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </nav>

        {/* User Info Skeleton */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-64 flex-col border-r bg-card">
      {/* Logo & Tenant Info */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.name || 'Tenant'}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <p className="truncate font-semibold text-sm">{tenant?.name || 'Hotel Management'}</p>
          <Badge variant="outline" className="text-xs">
            {tenant?.subscription_plan || 'trial'}
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isExpanded = expandedItems.includes(item.title)
          const hasChildren = item.children && item.children.length > 0

          if (hasChildren) {
            const hasActiveChild = item.children!.some(
              (child) => child.href && location.pathname.startsWith(child.href)
            )

            return (
              <div key={item.title} className="space-y-1">
                <button
                  onClick={() => toggleExpanded(item.title)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    hasActiveChild
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary">
                      {item.badge}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-4 space-y-1 border-l border-border pl-4">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon
                      const isChildActive = child.href && location.pathname === child.href

                      return (
                        <Link
                          key={child.href}
                          to={child.href!}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            isChildActive
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <ChildIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1">{child.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = item.href && location.pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href!}
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
                .toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-medium text-sm">{user?.full_name || 'User'}</p>
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
