import { useState, Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useTenant } from '@/hooks/useTenant'
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions'
import { usePendingCounts, type PendingCounts } from '@/hooks/usePendingCounts'
import { useUsageMode, type UsageMode } from '@/hooks/useUsageMode'
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
  Tag,
  Truck,
  BarChart3,
  Inbox,
  CalendarDays,
  CreditCard,
  KeyRound,
  MessageCircle,
  HelpCircle,
  PackageSearch,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AppRole } from '@/types/database.types'

type PendingCountKey = keyof PendingCounts

interface NavItem {
  titleKey: string
  href?: string
  icon: React.ElementType
  badge?: string
  badgeKey?: PendingCountKey
  roles?: AppRole[]
  minMode?: UsageMode
  group?: string
  children?: Omit<NavItem, 'children'>[]
}

// Navigation for all roles (operational details)
const navigation: NavItem[] = [
  {
    titleKey: 'dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    minMode: 'homestay',
  },
  {
    titleKey: 'superAdmin',
    icon: Shield,
    roles: ['super_admin'],
    children: [
      { titleKey: 'adminDashboard', href: '/admin/dashboard', icon: LayoutDashboard, group: 'Tổng quan' },
      { titleKey: 'tenants', href: '/admin/tenants', icon: Users, group: 'Tổng quan' },
      { titleKey: 'payments', href: '/admin/payments', icon: CreditCard, group: 'Tài chính' },
      { titleKey: 'promoCodes', href: '/admin/promo-codes', icon: Tag, group: 'Tài chính' },
      { titleKey: 'pricingPlans', href: '/admin/pricing', icon: DollarSign, group: 'Tài chính' },
      { titleKey: 'campaigns', href: '/admin/campaigns', icon: TrendingUp, group: 'Marketing' },
      { titleKey: 'reminders', href: '/admin/reminders', icon: Bell, group: 'Marketing' },
    ],
  },
  {
    titleKey: 'inventory',
    icon: Warehouse,
    badgeKey: 'inventoryTotal',
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    minMode: 'standard',
    children: [
      { titleKey: 'dashboard', href: '/inventory', icon: LayoutDashboard, group: 'Tổng quan' },
      { titleKey: 'transactions', href: '/inventory/transactions', icon: List, group: 'Tổng quan' },
      { titleKey: 'itemsList', href: '/items', icon: List, group: 'Sản phẩm' },
      { titleKey: 'categories', href: '/items/categories', icon: Grid, group: 'Sản phẩm' },
      { titleKey: 'addItem', href: '/items/new', icon: Plus, group: 'Sản phẩm' },
      { titleKey: 'inbound', href: '/inventory/inbound/new', icon: ArrowDownToLine, group: 'Xuất nhập kho' },
      { titleKey: 'outbound', href: '/inventory/outbound/new', icon: ArrowUpFromLine, group: 'Xuất nhập kho' },
      { titleKey: 'transfer', href: '/inventory/transfer/new', icon: GitCompare, group: 'Xuất nhập kho' },
      { titleKey: 'adjustment', href: '/inventory/adjustments', icon: ClipboardCheck, badgeKey: 'adjustments', group: 'Xuất nhập kho' },
      { titleKey: 'distribution', href: '/inventory/distributions', icon: Truck, badgeKey: 'distributions', group: 'Xuất nhập kho' },
      { titleKey: 'supplements', href: '/supplements', icon: Package, badgeKey: 'supplements', group: 'Thiết lập' },
      { titleKey: 'warehouses', href: '/settings/warehouses', icon: Warehouse, group: 'Thiết lập' },
    ],
  },
  {
    titleKey: 'rooms',
    icon: Hotel,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    minMode: 'homestay',
    children: [
      { titleKey: 'roomsList', href: '/rooms', icon: List, group: 'Quản lý phòng' },
      { titleKey: 'roomStandards', href: '/rooms/standards', icon: Settings, minMode: 'standard', group: 'Quản lý phòng' },
      { titleKey: 'addRoom', href: '/rooms/new', icon: Plus, group: 'Quản lý phòng' },
      { titleKey: 'bookings', href: '/bookings', icon: CalendarDays, group: 'Đặt phòng & Khách' },
      { titleKey: 'guests', href: '/guests', icon: Users, group: 'Đặt phòng & Khách' },
      { titleKey: 'guestInvoices', href: '/guest-invoices', icon: FileText, group: 'Đặt phòng & Khách' },
      { titleKey: 'lostFound', href: '/lost-found', icon: PackageSearch, group: 'Khác' },
    ],
  },
  {
    titleKey: 'laundry',
    icon: Wind,
    badgeKey: 'laundryTotal',
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    minMode: 'standard',
    children: [
      { titleKey: 'laundryOverview', href: '/laundry', icon: LayoutDashboard, group: 'Vận hành' },
      { titleKey: 'laundryRequests', href: '/laundry?tab=requests', icon: Inbox, badgeKey: 'laundryRequests', group: 'Vận hành' },
      { titleKey: 'laundryBatches', href: '/laundry/batches', icon: Package, group: 'Vận hành' },
      { titleKey: 'newBatch', href: '/laundry/batches/new', icon: Plus, group: 'Vận hành' },
      { titleKey: 'laundryVendors', href: '/laundry/vendors', icon: Building2, group: 'Nhà cung cấp' },
      { titleKey: 'addVendor', href: '/laundry/vendors/new', icon: Plus, group: 'Nhà cung cấp' },
    ],
  },
  {
    titleKey: 'vendors',
    icon: Building,
    roles: ['owner', 'hotel_manager'],
    minMode: 'full',
    children: [
      { titleKey: 'vendorsList', href: '/vendors', icon: List, group: 'Nhà cung cấp' },
      { titleKey: 'addNewVendor', href: '/vendors/new', icon: Plus, group: 'Nhà cung cấp' },
      { titleKey: 'compareVendors', href: '/vendors/compare', icon: GitCompare, group: 'Nhà cung cấp' },
      { titleKey: 'purchaseOrders', href: '/purchase-orders', icon: ShoppingCart, group: 'Đơn hàng' },
      { titleKey: 'newPO', href: '/purchase-orders/new', icon: Plus, group: 'Đơn hàng' },
    ],
  },
  {
    titleKey: 'maintenance',
    icon: Wrench,
    badgeKey: 'maintenanceTotal',
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    minMode: 'standard',
    children: [
      { titleKey: 'maintenanceDashboard', href: '/maintenance', icon: LayoutDashboard },
      { titleKey: 'maintenanceRequests', href: '/maintenance/requests', icon: AlertCircle, badgeKey: 'maintenance' },
      { titleKey: 'recurringIssues', href: '/maintenance/recurring-issues', icon: TrendingUp },
    ],
  },
  {
    titleKey: 'staffManagement',
    href: '/staff',
    icon: Users,
    roles: ['owner', 'hotel_manager', 'department_manager'],
    minMode: 'standard',
  },
  {
    titleKey: 'reports',
    icon: BarChart3,
    roles: ['owner', 'hotel_manager', 'department_manager'],
    minMode: 'standard',
    children: [
      { titleKey: 'reportsDashboard', href: '/reports', icon: LayoutDashboard },
      { titleKey: 'inventoryReport', href: '/reports/inventory', icon: Warehouse },
      { titleKey: 'roomsReport', href: '/reports/rooms', icon: Hotel },
      { titleKey: 'laundryReport', href: '/reports/laundry', icon: Wind },
      { titleKey: 'maintenanceReport', href: '/reports/maintenance', icon: Wrench },
      { titleKey: 'operationsReport', href: '/reports/operations', icon: TrendingUp },
    ],
  },
  {
    titleKey: 'settings',
    icon: Settings,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    minMode: 'homestay',
    children: [
      { titleKey: 'generalSettings', href: '/settings/general', icon: Settings, group: 'Hệ thống' },
      { titleKey: 'hotels', href: '/settings/hotels', icon: Building2, group: 'Hệ thống' },
      { titleKey: 'usersPermissions', href: '/settings/users', icon: Users, minMode: 'standard', group: 'Tài khoản' },
      { titleKey: 'changePassword', href: '/settings/change-password', icon: KeyRound, group: 'Tài khoản' },
      { titleKey: 'subscription', href: '/settings/subscription', icon: CreditCard, group: 'Thanh toán' },
      { titleKey: 'usage', href: '/settings/usage', icon: BarChart3, minMode: 'standard', group: 'Thanh toán' },
      { titleKey: 'notifications', href: '/settings/notifications', icon: Bell, group: 'Thông báo' },
      { titleKey: 'telegram', href: '/settings/telegram', icon: MessageCircle, group: 'Thông báo' },
      { titleKey: 'businessConfig', href: '/settings/business', icon: Briefcase, minMode: 'standard', group: 'Nghiệp vụ' },
      { titleKey: 'pricingRules', href: '/settings/pricing-rules', icon: DollarSign, minMode: 'standard', group: 'Nghiệp vụ' },
      { titleKey: 'automation', href: '/settings/workflows', icon: Zap, minMode: 'full', group: 'Nghiệp vụ' },
    ],
  },
]

// Map navigation titles to permission modules
const NAVIGATION_MODULE_MAP: Record<string, string> = {
  'dashboard': 'dashboard',
  'inventory': 'inventory,items',
  'rooms': 'rooms',
  'laundry': 'laundry',
  'maintenance': 'maintenance',
  'vendors': 'vendors,purchase_orders',
  'hotels': 'hotels',
  'users': 'users',
  'settings': 'settings',
  'reports': 'reports',
}

// Map child item keywords to required actions
const getRequiredAction = (childTitleKey: string): 'view' | 'create' | null => {
  const lowerKey = childTitleKey.toLowerCase()
  if (lowerKey.includes('add') || lowerKey.includes('new')) return 'create'
  if (lowerKey.includes('list') || lowerKey.includes('overview') || lowerKey.includes('dashboard')) return 'view'
  return 'view'
}

export const Sidebar = () => {
  const { t } = useTranslation('navigation')
  const location = useLocation()
  const { user, role, isLoading: userLoading } = useUser()
  const { tenant, isLoading: tenantLoading } = useTenant()
  const { data: modulePermissions, isLoading: permissionsLoading } = useUserModulePermissions()
  const { data: pendingCounts } = usePendingCounts()
  const { hasMode } = useUsageMode()
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const expanded: string[] = []
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.href && location.pathname.startsWith(child.href)
        )
        if (hasActiveChild) {
          expanded.push(item.titleKey)
        }
      }
    })
    return expanded
  })

  const isLoading = userLoading || tenantLoading || permissionsLoading

  // Check if user has access to a module
  const hasModuleAccess = (navigationTitleKey: string): boolean => {
    if (role === 'super_admin' || role === 'owner') return true
    
    const moduleCode = NAVIGATION_MODULE_MAP[navigationTitleKey]
    if (!moduleCode) return true
    
    const modules = moduleCode.split(',')
    return modules.some(module => {
      const permission = modulePermissions?.find(p => p.module === module)
      if (!permission) return false
      return permission.can_view || permission.can_create || permission.can_update || permission.can_delete
    })
  }

  // Check if user has access to a child item
  const hasChildAccess = (parentTitleKey: string, childTitleKey: string): boolean => {
    if (role === 'super_admin' || role === 'owner') return true
    
    const moduleCode = NAVIGATION_MODULE_MAP[parentTitleKey]
    if (!moduleCode) return true
    
    const modules = moduleCode.split(',')
    
    return modules.some(module => {
      const permission = modulePermissions?.find(p => p.module === module)
      if (!permission) return false
      
      const requiredAction = getRequiredAction(childTitleKey)
      if (requiredAction === 'create') return permission.can_create
      if (requiredAction === 'view') return permission.can_view
      
      return permission.can_view
    })
  }

  // Select navigation based on role
  const effectiveNavigation = navigation

  // Filter navigation based on permissions and usage mode
  const filteredNavigation = effectiveNavigation.filter((item) => {
    if (item.roles && !item.roles.includes(role || 'staff')) return false
    if (item.minMode && !hasMode(item.minMode)) return false
    return hasModuleAccess(item.titleKey)
  }).map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => {
          if ((child as NavItem).minMode && !hasMode((child as NavItem).minMode!)) return false
          return hasChildAccess(item.titleKey, child.titleKey)
        })
      }
    }
    return item
  }).filter((item) => {
    if (item.children !== undefined && item.children.length === 0 && !item.href) {
      return false
    }
    return true
  })

  const toggleExpanded = (titleKey: string) => {
    setExpandedItems((prev) =>
      prev.includes(titleKey) ? [] : [titleKey]
    )
  }

  const normalizePath = (path: string) => path.replace(/\/$/, '')
  const currentPath = normalizePath(location.pathname)

  if (isLoading) {
    return (
      <div className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </nav>
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
      <div className="flex items-center gap-3 border-b px-6 py-3">
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.name || 'Tenant'}
            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <p className="truncate font-semibold text-sm" title={tenant?.name || 'Hotel Management'}>
            {tenant?.name || 'Hotel Management'}
          </p>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {(() => {
                const planMap: Record<string, string> = { basic: 'Cơ bản', standard: 'Tiêu chuẩn', premium: 'Cao cấp', trial: 'Dùng thử' }
                return planMap[tenant?.subscription_plan || 'trial'] || tenant?.subscription_plan || 'Dùng thử'
              })()}
            </Badge>
            <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
              tenant?.subscription_status === 'active' ? 'bg-green-600' :
              tenant?.subscription_status === 'expired' ? 'bg-red-600' : 'bg-amber-600'
            }`} />
            {tenant?.registered_rooms != null && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{tenant.registered_rooms} phòng</span>
            )}
          </div>
          {(() => {
            if (!tenant?.subscription_end_date) return null
            const endDate = new Date(tenant.subscription_end_date)
            const now = new Date()
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            if (daysLeft > 30) return null
            return (
              <p className="text-xs text-amber-600 mt-0.5">
                Hết hạn: {endDate.toLocaleDateString('vi-VN')}
              </p>
            )
          })()}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isExpanded = expandedItems.includes(item.titleKey)
          const hasChildren = item.children && item.children.length > 0
          const title = t(item.titleKey)

          if (hasChildren) {
            const hasActiveChild = item.children!.some(
              (child) => child.href && currentPath.startsWith(normalizePath(child.href))
            )

            const parentBadgeCount = item.badgeKey && pendingCounts ? pendingCounts[item.badgeKey] : 0

            return (
              <div key={item.titleKey} className="space-y-1">
                <button
                  onClick={() => toggleExpanded(item.titleKey)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    hasActiveChild
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{title}</span>
                  {!isExpanded && parentBadgeCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {parentBadgeCount > 99 ? '99+' : parentBadgeCount}
                    </Badge>
                  )}
                  {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    isExpanded ? "rotate-0" : "-rotate-90"
                  )} />
                </button>

                <div className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-in-out",
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}>
                  <div className="overflow-hidden">
                    <div className="ml-4 space-y-1 border-l border-border pl-4 py-1">
                      {(() => {
                        let lastGroup = ''
                        return item.children!.map((child) => {
                          const ChildIcon = child.icon
                          const isChildActive = child.href && currentPath === normalizePath(child.href)
                          const childTitle = t(child.titleKey)
                          const childBadgeCount = child.badgeKey && pendingCounts ? pendingCounts[child.badgeKey] : 0
                          const showGroup = child.group && child.group !== lastGroup
                          if (child.group) lastGroup = child.group

                          return (
                            <Fragment key={child.titleKey}>
                              {showGroup && (
                                <div className="pt-4 pb-1 px-3 first:pt-1">
                                  <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                    {child.group}
                                  </span>
                                </div>
                              )}
                              <Link
                                to={child.href || '#'}
                                className={cn(
                                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                  isChildActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                              >
                                <ChildIcon className="h-4 w-4 flex-shrink-0" />
                                <span className="flex-1">{childTitle}</span>
                                {childBadgeCount > 0 && (
                                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                                    {childBadgeCount > 99 ? '99+' : childBadgeCount}
                                  </Badge>
                                )}
                                {child.badge && (
                                  <Badge variant="secondary" className="ml-auto">
                                    {child.badge}
                                  </Badge>
                                )}
                              </Link>
                            </Fragment>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          const isActive = item.href && currentPath === normalizePath(item.href)

          return (
            <Link
              key={item.titleKey}
              to={item.href || '#'}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{title}</span>
              {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
            </Link>
          )
        })}
      </nav>

      {/* Help Link */}
      <div className="px-4 pb-1">
        <Link
          to="/help"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            currentPath === '/help'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">Hướng dẫn sử dụng</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="border-t p-4">
        <Link
          to="/settings/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url || ''} alt={user?.full_name || 'User'} />
            <AvatarFallback>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-medium text-sm">{user?.full_name || 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
