import { Building2, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useHotelContext } from '@/contexts/HotelContext'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export function MobileHotelSwitcher() {
  const { t } = useTranslation('hotels')
  const { 
    selectedHotel, 
    setSelectedHotel, 
    availableHotels, 
    isAllHotelsMode, 
    setAllHotelsMode,
    canViewAllHotels 
  } = useHotelContext()

  const handleSelectHotel = (hotel: any) => {
    setSelectedHotel(hotel)
  }

  const handleAllHotels = () => {
    if (canViewAllHotels) {
      setAllHotelsMode(true)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-auto py-2 px-3"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-medium truncate w-full text-left">
                {isAllHotelsMode ? t('switcher.allHotels') : selectedHotel?.name || t('switcher.title')}
              </span>
              {!isAllHotelsMode && selectedHotel?.code && (
                <span className="text-xs text-muted-foreground">
                  {selectedHotel.code}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>{t('switcher.title')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Only show "All Hotels" option if user can view all hotels */}
        {canViewAllHotels && availableHotels.length > 1 && (
          <>
            <DropdownMenuItem
              onClick={handleAllHotels}
              className={cn(
                "cursor-pointer",
                isAllHotelsMode && "bg-accent"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Building2 className="h-4 w-4" />
                <span className="flex-1">{t('switcher.allHotels')}</span>
                {isAllHotelsMode && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {availableHotels.map((hotel) => (
          <DropdownMenuItem
            key={hotel.id}
            onClick={() => handleSelectHotel(hotel)}
            className={cn(
              "cursor-pointer",
              !isAllHotelsMode && selectedHotel?.id === hotel.id && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{hotel.name}</span>
                  {hotel.status === 'active' && (
                    <Badge variant="default" className="text-xs">
                      {t('status.active')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{hotel.code}</span>
                  {hotel.city && <span>• {hotel.city}</span>}
                </div>
              </div>
              {!isAllHotelsMode && selectedHotel?.id === hotel.id && (
                <Check className="h-4 w-4 flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
