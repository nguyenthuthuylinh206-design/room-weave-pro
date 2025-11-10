import { useNavigate } from 'react-router-dom'
import { 
  Settings, 
  User, 
  Building2, 
  Users, 
  TrendingUp,
  FileText,
  HelpCircle,
  Info,
  ChevronRight,
  ShoppingCart,
  Package,
  Wrench,
  Shirt
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { hasPermission, Permission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

interface MenuItem {
  icon: typeof Settings
  label: string
  description?: string
  path: string
  permission?: Permission
}

interface MenuSection {
  title?: string
  items: MenuItem[]
}

export default function MorePage() {
  const navigate = useNavigate()
  const { user, role } = useUser()
  const { signOut } = useAuth()

  const menuSections: MenuSection[] = [
    {
      items: [
        {
          icon: User,
          label: 'Profile',
          description: 'Manage your account',
          path: '/profile'
        }
      ]
    },
    {
      title: 'Management',
      items: [
        {
          icon: ShoppingCart,
          label: 'Purchase Orders',
          description: 'Manage orders',
          path: '/purchase-orders',
          permission: 'view_items'
        },
        {
          icon: Package,
          label: 'Items',
          description: 'Item catalog',
          path: '/items',
          permission: 'view_items'
        },
        {
          icon: TrendingUp,
          label: 'Reports',
          description: 'Analytics & insights',
          path: '/reports',
          permission: 'view_reports'
        },
        {
          icon: Building2,
          label: 'Hotels',
          description: 'Manage properties',
          path: '/hotels',
          permission: 'manage_settings'
        },
        {
          icon: Users,
          label: 'Users',
          description: 'Team management',
          path: '/users',
          permission: 'manage_users'
        },
        {
          icon: Users,
          label: 'Vendors',
          description: 'Supplier management',
          path: '/vendors',
          permission: 'view_items'
        }
      ]
    },
    {
      title: 'Settings & Support',
      items: [
        {
          icon: Settings,
          label: 'Settings',
          description: 'App preferences',
          path: '/settings'
        },
        {
          icon: HelpCircle,
          label: 'Help & Support',
          description: 'Get assistance',
          path: '/help'
        },
        {
          icon: Info,
          label: 'About',
          description: 'App information',
          path: '/about'
        }
      ]
    }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {user?.full_name || 'User'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {section.title}
              </h2>
            )}
            <Card className="overflow-hidden">
              {section.items.map((item, itemIndex) => {
                // Check permission
                if (item.permission && !hasPermission(role, item.permission)) {
                  return null
                }

                const Icon = item.icon
                const isLast = itemIndex === section.items.length - 1

                return (
                  <div key={item.path}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-4",
                        "hover:bg-accent transition-colors duration-200",
                        "active:scale-99"
                      )}
                    >
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium">{item.label}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </button>
                    {!isLast && <Separator />}
                  </div>
                )
              })}
            </Card>
          </div>
        ))}
      </div>

      {/* Version Info */}
      <div className="max-w-screen-xl mx-auto px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Room Weave Pro v1.0.0
        </p>
      </div>
    </div>
  )
}
