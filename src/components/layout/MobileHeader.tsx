import { useState } from 'react'
import { Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useHotelContext } from '@/contexts/HotelContext'
import { MobileSidebar } from './MobileSidebar'
import { HotelSwitcher } from './HotelSwitcher'
import { NotificationBell } from '@/components/notifications'
import { cn } from '@/lib/utils'
import logoRoomQc from '@/assets/logo-roomqc.png'

interface MobileHeaderProps {
  showHotelSelector?: boolean
  showSearch?: boolean
  className?: string
}

export const MobileHeader = ({ 
  showHotelSelector = true,
  showSearch = false,
  className 
}: MobileHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { selectedHotel } = useHotelContext()

  return (
    <header className={cn(
      "sticky top-0 z-40 bg-background border-b shadow-sm safe-area-top will-change-transform",
      className
    )}>
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Logo + Hotel Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoRoomQc} alt="RoomQc" className="h-7 w-7 rounded-md object-cover flex-shrink-0" />
            {selectedHotel ? (
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedHotel.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedHotel.city || selectedHotel.country}
              </p>
            </div>
            ) : (
              <span className="font-semibold text-sm">RoomQc</span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {showSearch && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Notifications */}
          <NotificationBell className="h-10 w-10" />

          {/* Hotel Switcher (Mobile) */}
          {showHotelSelector && (
            <div className="lg:hidden">
              <HotelSwitcher />
            </div>
          )}

          {/* Menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-[280px] p-0"
            >
              <MobileSidebar onClose={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
