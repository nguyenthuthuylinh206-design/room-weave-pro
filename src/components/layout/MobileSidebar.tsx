import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home,
  Package,
  LayoutDashboard,
  Shirt,
  Wrench,
  ShoppingCart,
  TrendingUp,
  Building2,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions'

interface MenuItem {
  title: string
  icon: typeof Home
  path: string
  module?: string
  badge?: string
}

interface MenuSection {
  title?: string
  items: MenuItem[]
}

interface MobileSidebarProps {
  onClose: () => void
}

export const MobileSidebar = ({ onClose }: MobileSidebarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()
  const { user, role } = useUser()
  const { data: modulePermissions } = useUserModulePermissions()

  const menuSections: MenuSection[] = [
    {
      items: [
        { title: 'Dashboard', icon: Home, path: '/' },
      ]
    },
    {
      title: 'Operations',
      items: [
        { title: 'Inventory', icon: Package, path: '/inventory', module: 'inventory' },
        { title: 'Items', icon: LayoutDashboard, path: '/items', module: 'items' },
        { title: 'Laundry', icon: Shirt, path: '/laundry', module: 'laundry' },
        { title: 'Maintenance', icon: Wrench, path: '/maintenance', module: 'maintenance' },
        { title: 'Purchase Orders', icon: ShoppingCart, path: '/purchase-orders', module: 'purchase_orders' },
      ]
    },
    {
      title: 'Management',
      items: [
        { title: 'Reports', icon: TrendingUp, path: '/reports', module: 'reports' },
        { title: 'Hotels', icon: Building2, path: '/hotels', module: 'hotels' },
        { title: 'Users', icon: Users, path: '/users', module: 'users' },
        { title: 'Vendors', icon: Users, path: '/vendors', module: 'vendors' },
      ]
    },
    {
      title: 'Settings',
      items: [
        { title: 'Settings', icon: Settings, path: '/settings' },
        { title: 'Help & Support', icon: HelpCircle, path: '/help' },
      ]
    }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    onClose()
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  // Check if user has module access
  const hasModuleAccess = (moduleCode?: string): boolean => {
    if (!moduleCode) return true
    if (role === 'super_admin' || role === 'owner') return true
    
    const permission = modulePermissions?.find(p => p.module === moduleCode)
    if (!permission) return false
    
    return permission.can_view || permission.can_create || permission.can_update || permission.can_delete
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigation('/profile')}
            aria-label="View profile"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Menu Items */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-4">
              {section.title && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items
                  .filter((item) => hasModuleAccess(item.module))
                  .map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.path)

                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                        "transition-colors duration-200",
                        "hover:bg-accent",
                        "active:scale-98",
                        active && "bg-accent text-accent-foreground font-medium"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        active ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className="flex-1 text-left">{item.title}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Sign Out */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
