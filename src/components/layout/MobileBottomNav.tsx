import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Package, Settings, FileText, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: typeof Home
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: Home, path: '/' },
  { id: 'items', label: 'Sản phẩm', icon: Package, path: '/items' },
  { id: 'maintenance', label: 'Bảo trì', icon: Wrench, path: '/maintenance' },
  { id: 'reports', label: 'Báo cáo', icon: FileText, path: '/reports' },
  { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/settings' },
]

export const MobileBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'fill-primary/20')} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
