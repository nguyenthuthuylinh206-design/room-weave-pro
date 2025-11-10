import { Building2, Check, ChevronDown, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHotelContext } from '@/contexts/HotelContext'
import { cn } from '@/lib/utils'

export function HotelSwitcher() {
  const {
    selectedHotel,
    setSelectedHotel,
    availableHotels,
    isAllHotelsMode,
    setAllHotelsMode,
  } = useHotelContext()

  if (availableHotels.length === 0) {
    return null
  }

  // If only one hotel, don't show switcher
  if (availableHotels.length === 1 && !isAllHotelsMode) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{availableHotels[0].name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isAllHotelsMode ? (
            <>
              <BarChart3 className="h-4 w-4" />
              <span>All Hotels</span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4" />
              <span>{selectedHotel?.name || 'Select Hotel'}</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {availableHotels.map((hotel) => (
          <DropdownMenuItem
            key={hotel.id}
            onClick={() => setSelectedHotel(hotel)}
            className={cn(
              'gap-2 cursor-pointer',
              !isAllHotelsMode && selectedHotel?.id === hotel.id && 'bg-accent'
            )}
          >
            <Building2 className="h-4 w-4" />
            <span className="flex-1">{hotel.name}</span>
            {!isAllHotelsMode && selectedHotel?.id === hotel.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setAllHotelsMode(true)}
          className={cn('gap-2 cursor-pointer', isAllHotelsMode && 'bg-accent')}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="flex-1">All Hotels (Consolidated)</span>
          {isAllHotelsMode && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
