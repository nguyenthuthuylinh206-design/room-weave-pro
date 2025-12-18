import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Package, DoorOpen, Shirt, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/useUser'
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface NavItem {
  id: string
  label: string
  icon: typeof Home
  path: string
  module?: string
  badge?: boolean
}

export const MobileBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, tenantId } = useUser()
  const { data: modulePermissions } = useUserModulePermissions()

  // Get pending counts
  const { data: pendingCounts } = useQuery({
    queryKey: ['pending-counts', tenantId],
    queryFn: async () => {
      const [maintenance, laundry] = await Promise.all([
        supabase
          .from('maintenance_requests')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId!)
          .eq('status', 'pending'),
        supabase
          .from('laundry_batches')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId!)
          .eq('status', 'in_progress')
      ])
      return {
        maintenance: maintenance.count || 0,
        laundry: laundry.count || 0
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30000
  })

  // Only operations modules
  const NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'inventory', label: 'Kho', icon: Package, path: '/inventory', module: 'inventory,items' },
    { id: 'rooms', label: 'Phòng', icon: DoorOpen, path: '/rooms', module: 'rooms' },
    { id: 'laundry', label: 'Giặt là', icon: Shirt, path: '/laundry', module: 'laundry', badge: true },
    { id: 'maintenance', label: 'Bảo trì', icon: Wrench, path: '/maintenance', module: 'maintenance', badge: true },
  ]

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
    return location.pathname.startsWith(path)
  }

  const getBadgeCount = (itemId: string): number => {
    if (!pendingCounts) return 0
    if (itemId === 'maintenance') return pendingCounts.maintenance
    if (itemId === 'laundry') return pendingCounts.laundry
    return 0
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.filter(item => hasModuleAccess(item.module)).map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          const badgeCount = item.badge ? getBadgeCount(item.id) : 0

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
