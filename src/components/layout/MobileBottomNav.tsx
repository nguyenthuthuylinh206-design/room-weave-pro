import { useNavigate, useLocation } from 'react-router-dom'
import { Home, DoorOpen, Shirt, Wrench, ClipboardList, CalendarDays, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/useUser'
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions'
import { usePendingTaskCount } from '@/hooks/useHousekeepingTasks'
import { usePendingCounts, type PendingCounts } from '@/hooks/usePendingCounts'
import { useUsageMode } from '@/hooks/useUsageMode'

type PendingCountKey = keyof PendingCounts | 'tasks'

interface NavItem {
  id: string
  label: string
  icon: typeof Home
  path: string
  module?: string
  badgeKey?: PendingCountKey
}

export const MobileBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, tenantId } = useUser()
  const { data: modulePermissions } = useUserModulePermissions()
  const { data: pendingTaskCount = 0 } = usePendingTaskCount()
  const { data: pendingCounts } = usePendingCounts()
  const { hasMode } = useUsageMode()

  // Hide MobileBottomNav when on room check pages (staff needs full screen for check workflow)
  if (location.pathname.includes('/check')) {
    return null
  }

  // Navigation items - 5 tabs max for mobile usability
  const NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'my-tasks', label: 'Tasks', icon: ClipboardList, path: '/my-tasks', badgeKey: 'tasks' },
    { id: 'bookings', label: 'Đặt phòng', icon: CalendarDays, path: '/bookings', module: 'bookings' },
    { id: 'rooms', label: 'Phòng', icon: DoorOpen, path: '/rooms', module: 'rooms' },
    { id: 'more', label: 'Thêm', icon: MoreHorizontal, path: '/more' },
  ]

  const effectiveNavItems = NAV_ITEMS

  // Check if user has module access
  const hasModuleAccess = (moduleCode?: string): boolean => {
    if (!moduleCode) return true
    if (role === 'super_admin' || role === 'owner') return true
    
    const modules = moduleCode.split(',')
    return modules.some(module => {
      const permission = modulePermissions?.find(p => p.module === module)
      if (!permission) return false
      return permission.can_view || permission.can_create || permission.can_update || permission.can_delete
    })
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    if (path === '/more') {
      return location.pathname === '/more'
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {effectiveNavItems.filter(item => hasModuleAccess(item.module) && (!item.module || hasMode('homestay'))).map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          const badgeCount = getBadgeCount(item.badgeKey)

          return (
            <button
              key={item.id}
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
