import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, 
  Package, 
  DoorOpen,
  Shirt, 
  Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions'

interface NavTab {
  id: string
  icon: typeof Home
  label: string
  path: string
  module?: string
}

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useUser()
  const { data: modulePermissions } = useUserModulePermissions()

  // Only operations modules
  const tabs: NavTab[] = [
    { 
      id: 'dashboard', 
      icon: Home, 
      label: 'Home', 
      path: '/' 
    },
    { 
      id: 'inventory', 
      icon: Package, 
      label: 'Kho', 
      path: '/inventory',
      module: 'inventory'
    },
    { 
      id: 'rooms', 
      icon: DoorOpen, 
      label: 'Phòng', 
      path: '/rooms',
      module: 'rooms'
    },
    { 
      id: 'laundry', 
      icon: Shirt, 
      label: 'Laundry', 
      path: '/laundry',
      module: 'laundry'
    },
    { 
      id: 'maintenance', 
      icon: Wrench, 
      label: 'Bảo trì', 
      path: '/maintenance',
      module: 'maintenance'
    }
  ]

  // Check if user has module access
  const hasModuleAccess = (moduleCode?: string): boolean => {
    if (!moduleCode) return true
    if (role === 'super_admin' || role === 'owner') return true
    
    const permission = modulePermissions?.find(p => p.module === moduleCode)
    if (!permission) return false
    
    return permission.can_view || permission.can_create || permission.can_update || permission.can_delete
  }

  // Filter tabs based on permissions
  const visibleTabs = tabs.filter(tab => hasModuleAccess(tab.module))

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.path)

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[48px]",
                "transition-all duration-200 relative",
                "active:scale-95",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
              )}
              
              <Icon className={cn(
                "h-5 w-5 mb-1 transition-transform duration-200",
                active && "scale-110"
              )} />
              
              <span className={cn(
                "text-xs font-medium transition-all duration-200",
                active && "font-semibold"
              )}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
