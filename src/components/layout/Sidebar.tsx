import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useTenant } from '@/hooks/useTenant'
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions'
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
  Tag,
  Truck,
  BarChart3,
  CalendarDays,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AppRole } from '@/types/database.types'

interface NavItem {
  titleKey: string
  href?: string
  icon: React.ElementType
  badge?: string
  roles?: AppRole[]
  children?: Omit<NavItem, 'children'>[]
}

const navigation: NavItem[] = [
  {
    titleKey: 'dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
  },
  {
    titleKey: 'superAdmin',
    icon: Shield,
    roles: ['super_admin'],
    children: [
      { titleKey: 'adminDashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { titleKey: 'tenants', href: '/admin/tenants', icon: Users },
      { titleKey: 'promoCodes', href: '/admin/promo-codes', icon: Tag },
      { titleKey: 'campaigns', href: '/admin/campaigns', icon: TrendingUp },
      { titleKey: 'reminders', href: '/admin/reminders', icon: Bell },
      { titleKey: 'pricingPlans', href: '/admin/pricing', icon: DollarSign },
    ],
  },
  {
    titleKey: 'inventory',
    icon: Warehouse,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      { titleKey: 'dashboard', href: '/inventory', icon: LayoutDashboard },
      { titleKey: 'itemsList', href: '/items', icon: List },
      { titleKey: 'categories', href: '/items/categories', icon: Grid },
      { titleKey: 'addItem', href: '/items/new', icon: Plus },
      { titleKey: 'transactions', href: '/inventory/transactions', icon: List },
      { titleKey: 'inbound', href: '/inventory/inbound/new', icon: ArrowDownToLine },
      { titleKey: 'outbound', href: '/inventory/outbound/new', icon: ArrowUpFromLine },
      { titleKey: 'adjustment', href: '/inventory/adjustments', icon: ClipboardCheck },
      { titleKey: 'distribution', href: '/inventory/distributions', icon: Truck },
    ],
  },
  {
    titleKey: 'rooms',
    icon: Hotel,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      { titleKey: 'roomsList', href: '/rooms', icon: List },
      { titleKey: 'bookings', href: '/bookings', icon: CalendarDays },
      { titleKey: 'roomStandards', href: '/rooms/standards', icon: Settings },
      { titleKey: 'addRoom', href: '/rooms/new', icon: Plus },
    ],
  },
  {
    titleKey: 'laundry',
    icon: Wind,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      { titleKey: 'laundryOverview', href: '/laundry', icon: LayoutDashboard },
      { titleKey: 'laundryBatches', href: '/laundry/batches', icon: Package },
      { titleKey: 'newBatch', href: '/laundry/batches/new', icon: Plus },
      { titleKey: 'laundryVendors', href: '/laundry/vendors', icon: Building2 },
      { titleKey: 'addVendor', href: '/laundry/vendors/new', icon: Plus },
    ],
  },
  {
    titleKey: 'vendors',
    icon: Building,
    roles: ['owner', 'hotel_manager'],
    children: [
      { titleKey: 'vendorsList', href: '/vendors', icon: List },
      { titleKey: 'addNewVendor', href: '/vendors/new', icon: Plus },
      { titleKey: 'compareVendors', href: '/vendors/compare', icon: GitCompare },
      { titleKey: 'purchaseOrders', href: '/purchase-orders', icon: ShoppingCart },
      { titleKey: 'newPO', href: '/purchase-orders/new', icon: Plus },
    ],
  },
  {
    titleKey: 'maintenance',
    icon: Wrench,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      { titleKey: 'maintenanceDashboard', href: '/maintenance', icon: LayoutDashboard },
      { titleKey: 'maintenanceRequests', href: '/maintenance/requests', icon: AlertCircle },
      { titleKey: 'recurringIssues', href: '/maintenance/recurring-issues', icon: TrendingUp },
    ],
  },
  {
    titleKey: 'reports',
    icon: BarChart3,
    roles: ['owner', 'hotel_manager', 'department_manager'],
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
    href: '/settings/general',
    icon: Settings,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
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

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter((item) => {
    if (item.roles && !item.roles.includes(role || 'staff')) return false
    return hasModuleAccess(item.titleKey)
  }).map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => hasChildAccess(item.titleKey, child.titleKey))
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
      prev.includes(titleKey) ? prev.filter((t) => t !== titleKey) : [...prev, titleKey]
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
          const isExpanded = expandedItems.includes(item.titleKey)
          const hasChildren = item.children && item.children.length > 0
          const title = t(item.titleKey)

          if (hasChildren) {
            const hasActiveChild = item.children!.some(
              (child) => child.href && currentPath.startsWith(normalizePath(child.href))
            )

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
                  {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
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
                      const isChildActive = child.href && currentPath === normalizePath(child.href)
                      const childTitle = t(child.titleKey)

                      return (
                        <Link
                          key={child.titleKey}
                          to={child.href || '#'}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            isChildActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <ChildIcon className="h-4 w-4 flex-shrink-0" />
                          <span>{childTitle}</span>
                          {child.badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {child.badge}
                            </Badge>
                          )}
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
