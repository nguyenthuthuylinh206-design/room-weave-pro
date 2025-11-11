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
  Plus,
  List,
  Grid,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  ShoppingCart,
  GitCompare,
  Building,
  DollarSign,
  Wrench,
  AlertCircle,
  TrendingUp,
  Shield,
  FolderTree,
  Bell,
  Briefcase,
  Zap,
  Plug,
  Lock,
  TestTube2,
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
    title: 'Super Admin',
    href: '/admin/dashboard',
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    title: 'Tài sản',
    icon: Package,
    children: [
      {
        title: 'Danh sách tài sản',
        href: '/items',
        icon: List,
      },
      {
        title: 'Danh mục',
        href: '/items/categories',
        icon: Grid,
      },
      {
        title: 'Thêm tài sản mới',
        href: '/items/new',
        icon: Plus,
      },
    ],
  },
  {
    title: 'Phòng',
    icon: Hotel,
    children: [
      {
        title: 'Danh sách phòng',
        href: '/rooms',
        icon: List,
      },
      {
        title: 'Thiết lập chuẩn',
        href: '/rooms/standards',
        icon: Settings,
      },
      {
        title: 'Thêm phòng mới',
        href: '/rooms/new',
        icon: Plus,
      },
    ],
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
        title: 'Tạo lô mới',
        href: '/laundry/batches/new',
        icon: Plus,
      },
      {
        title: 'Nhà cung cấp',
        href: '/laundry/vendors',
        icon: Building2,
      },
      {
        title: 'Thêm đơn vị',
        href: '/laundry/vendors/new',
        icon: Plus,
      },
    ],
  },
  {
    title: 'Kho',
    icon: Warehouse,
    children: [
      {
        title: 'Dashboard kho',
        href: '/inventory',
        icon: LayoutDashboard,
      },
      {
        title: 'Giao dịch',
        href: '/inventory/transactions',
        icon: List,
      },
      {
        title: 'Nhập kho',
        href: '/inventory/inbound/new',
        icon: ArrowDownToLine,
      },
      {
        title: 'Xuất kho',
        href: '/inventory/outbound/new',
        icon: ArrowUpFromLine,
      },
      {
        title: 'Kiểm kê',
        href: '/inventory/adjustments',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: 'Nhà Cung Cấp',
    icon: Building,
    roles: ['owner', 'hotel_manager', 'super_admin'],
    children: [
      {
        title: 'Danh sách NCC',
        href: '/vendors',
        icon: List,
      },
      {
        title: 'Thêm NCC mới',
        href: '/vendors/new',
        icon: Plus,
      },
      {
        title: 'So sánh NCC',
        href: '/vendors/compare',
        icon: GitCompare,
      },
      {
        title: 'Đơn đặt hàng',
        href: '/purchase-orders',
        icon: ShoppingCart,
      },
      {
        title: 'Tạo đơn mới',
        href: '/purchase-orders/new',
        icon: Plus,
      },
    ],
  },
  {
    title: 'Bảo trì',
    icon: Wrench,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff', 'super_admin'],
    children: [
      {
        title: 'Dashboard',
        href: '/maintenance',
        icon: LayoutDashboard,
      },
      {
        title: 'Yêu cầu bảo trì',
        href: '/maintenance/requests',
        icon: AlertCircle,
      },
      {
        title: 'Vấn đề lặp lại',
        href: '/maintenance/recurring-issues',
        icon: TrendingUp,
      },
    ],
  },
  {
    title: 'Báo cáo',
    icon: FileText,
    roles: ['owner', 'hotel_manager', 'super_admin'],
    children: [
      {
        title: 'Dashboard',
        href: '/reports',
        icon: LayoutDashboard,
      },
      {
        title: 'Báo cáo Tồn kho',
        href: '/reports/inventory',
        icon: Package,
      },
      {
        title: 'Báo cáo Tài chính',
        href: '/reports/financial',
        icon: DollarSign,
      },
      {
        title: 'Báo cáo Giặt là',
        href: '/reports/laundry',
        icon: Wind,
      },
    ],
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
    icon: Settings,
    children: [
      {
        title: 'Tổng quan',
        href: '/settings/general',
        icon: LayoutDashboard,
      },
      {
        title: 'Khách sạn',
        href: '/settings/hotels',
        icon: Building2,
        roles: ['owner', 'super_admin'],
      },
      {
        title: 'Danh mục',
        href: '/settings/categories',
        icon: FolderTree,
      },
      {
        title: 'Người dùng',
        href: '/settings/users',
        icon: Users,
        roles: ['owner', 'super_admin'],
      },
      {
        title: 'Vai trò & Phân quyền',
        href: '/settings/roles',
        icon: Shield,
        roles: ['owner', 'super_admin'],
      },
      {
        title: 'Thông báo',
        href: '/settings/notifications',
        icon: Bell,
      },
      {
        title: 'Cấu hình nghiệp vụ',
        href: '/settings/business',
        icon: Briefcase,
      },
      {
        title: 'Tự động hóa',
        href: '/settings/workflows',
        icon: Zap,
        roles: ['owner', 'hotel_manager', 'super_admin'],
      },
      {
        title: 'Tích hợp & API',
        href: '/settings/integrations',
        icon: Plug,
        roles: ['owner', 'super_admin'],
      },
      {
        title: 'Hệ thống & Bảo mật',
        href: '/settings/security',
        icon: Lock,
        roles: ['owner', 'super_admin'],
      },
      {
        title: 'Kiểm thử hệ thống',
        href: '/settings/system-test',
        icon: TestTube2,
        roles: ['owner', 'super_admin'],
      },
    ],
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

  // Helper to normalize paths for comparison
  const normalizePath = (path: string) => path.replace(/\/$/, '')
  const currentPath = normalizePath(location.pathname)

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
              (child) => child.href && currentPath.startsWith(normalizePath(child.href))
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
                    {item.children!
                      .filter((child) => {
                        if (!child.roles) return true
                        return child.roles.includes(role || 'staff')
                      })
                      .map((child) => {
                        const ChildIcon = child.icon
                        const isChildActive = child.href && currentPath === normalizePath(child.href)

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

          const isActive = item.href && currentPath === normalizePath(item.href)

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
