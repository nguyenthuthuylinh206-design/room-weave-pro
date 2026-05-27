import { useNavigate, useLocation } from 'react-router-dom'
import { Home, DoorOpen, Shirt, Wrench, ClipboardList, CalendarDays, Package, MoreHorizontal, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/useUser'
import { useUserModulePermissions, type PermissionSummary } from '@/hooks/useUserModulePermissions'
import { usePendingTaskCount } from '@/hooks/useHousekeepingTasks'
import { usePendingCounts, type PendingCounts } from '@/hooks/usePendingCounts'
import { prefetchRoute } from '@/lib/route-prefetch'

type PendingCountKey = keyof PendingCounts | 'tasks'

interface NavItem {
  id: string
  label: string
  icon: typeof Home
  path: string
  /** Module(s) needed to display this tab. Multiple = OR (any one is enough). */
  modules?: string[]
  badgeKey?: PendingCountKey
  /** Always visible regardless of permission (Home, More) */
  alwaysShow?: boolean
}

// Pool 8 tab — Home + 6 module + More. Sẽ filter theo permission rồi cắt còn tối đa 5 nút.
const ALL_TABS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/', alwaysShow: true },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: ClipboardList,
    path: '/my-tasks',
    badgeKey: 'tasks',
    // Tasks là view tổng hợp — hiện nếu có quyền 1 trong các module sau
    modules: ['housekeeping_tasks', 'room_checks', 'maintenance_requests', 'distribution_orders'],
  },
  { id: 'bookings', label: 'Đặt phòng', icon: CalendarDays, path: '/bookings', modules: ['bookings'] },
  { id: 'rooms', label: 'Phòng', icon: DoorOpen, path: '/rooms', modules: ['rooms'] },
  { id: 'laundry', label: 'Giặt là', icon: Shirt, path: '/laundry', modules: ['laundry'] },
  { id: 'maintenance', label: 'Bảo trì', icon: Wrench, path: '/maintenance', modules: ['maintenance_requests', 'maintenance'] },
  { id: 'inventory', label: 'Kho', icon: Package, path: '/inventory', modules: ['inventory', 'items'] },
  { id: 'more', label: 'Thêm', icon: MoreHorizontal, path: '/more', alwaysShow: true },
]

const MAX_TABS = 5

export const MobileBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useUser()
  const { data: modulePermissions } = useUserModulePermissions()
  const { data: pendingTaskCount = 0 } = usePendingTaskCount()
  const { data: pendingCounts } = usePendingCounts()

  // Hide MobileBottomNav khi đang trong room check (cần full screen)
  if (location.pathname.includes('/check')) {
    return null
  }

  const isPrivileged = role === 'super_admin' || role === 'owner'

  const hasModuleAccess = (modules?: string[]): boolean => {
    if (!modules || modules.length === 0) return true
    if (isPrivileged) return true
    if (!modulePermissions) return false
    return modules.some((module) => {
      const p = modulePermissions.find((x: PermissionSummary) => x.module === module)
      if (!p) return false
      return p.can_view || p.can_create || p.can_update || p.can_delete
    })
  }

  // Determine tasks path based on department
  const tasksPath = user?.department === 'housekeeping' ? '/staff/housekeeping' : '/my-tasks'

  // Filter pool theo permission
  const accessibleTabs = ALL_TABS
    .filter((tab) => tab.alwaysShow || hasModuleAccess(tab.modules))
    .map((tab) => (tab.id === 'tasks' ? { ...tab, path: tasksPath } : tab))

  // Tách Home (đầu) + More (cuối) + module tabs ở giữa
  const homeTab = accessibleTabs.find((t) => t.id === 'home')!
  const moreTab = accessibleTabs.find((t) => t.id === 'more')!
  const moduleTabs = accessibleTabs.filter((t) => t.id !== 'home' && t.id !== 'more')

  // Lấy tối đa (MAX_TABS - 2) module tabs để chừa slot Home + More
  const visibleModuleTabs = moduleTabs.slice(0, MAX_TABS - 2)
  const effectiveNavItems: NavItem[] = [homeTab, ...visibleModuleTabs, moreTab]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/more') return location.pathname === '/more'
    if (path === tasksPath) {
      return location.pathname.startsWith('/my-tasks') || location.pathname.startsWith('/staff/housekeeping')
    }
    return location.pathname.startsWith(path)
  }

  const getBadgeCount = (badgeKey?: PendingCountKey): number => {
    if (!badgeKey) return 0
    if (badgeKey === 'tasks') return pendingTaskCount
    if (!pendingCounts) return 0
    return (pendingCounts as PendingCounts)[badgeKey as keyof PendingCounts] || 0
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {effectiveNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          const badgeCount = getBadgeCount(item.badgeKey)

          return (
            <button
              key={item.id}
              onPointerDown={() => prefetchRoute(item.path)}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-all',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {active && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
              <div className="relative">
                <Icon className={cn('h-5 w-5', active && 'fill-primary/20')} />
                {badgeCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
