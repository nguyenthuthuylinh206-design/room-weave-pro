import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import { useUser } from '@/hooks/useUser'
import * as LucideIcons from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Sidebar = () => {
  const { user, role } = useUser()

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role || 'staff')
  )

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Hotel Assets</h1>
        <p className="text-sm text-muted-foreground mt-1">{user?.hotel?.name || 'Dashboard'}</p>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = LucideIcons[item.icon as keyof typeof LucideIcons] as LucideIcons.LucideIcon
            
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                {Icon && <Icon className="h-5 w-5" />}
                <span>{item.title}</span>
              </NavLink>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
