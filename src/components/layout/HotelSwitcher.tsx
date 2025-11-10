import { useState, useEffect } from 'react'
import { useHotelContext } from '@/contexts/HotelContext'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, Building2, BarChart3, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export function HotelSwitcher() {
  const { selectedHotel, setSelectedHotel, availableHotels, isAllHotelsMode, setAllHotelsMode } = useHotelContext()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (availableHotels.length === 0) {
    return null
  }

  // If only one hotel, show simple display (no switcher needed)
  if (availableHotels.length === 1 && !isAllHotelsMode) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{availableHotels[0].name}</span>
      </div>
    )
  }

  const filteredHotels = availableHotels.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.code.toLowerCase().includes(search.toLowerCase()) ||
      h.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full lg:w-[280px] justify-between"
          data-hotel-switcher
        >
          {isAllHotelsMode ? (
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-medium hidden sm:inline">All Hotels</span>
              <span className="font-medium sm:hidden">All</span>
            </div>
          ) : selectedHotel ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium truncate">{selectedHotel.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select hotel...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-popover z-50" align="start">
        <Command>
          <CommandInput
            placeholder="Search hotels..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandEmpty>No hotels found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {filteredHotels.map((hotel) => (
              <CommandItem
                key={hotel.id}
                value={hotel.id}
                onSelect={() => {
                  setSelectedHotel(hotel)
                  setOpen(false)
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedHotel?.id === hotel.id && !isAllHotelsMode ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{hotel.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    📍 {hotel.city || 'Unknown'} • {hotel.total_rooms || 0} rooms
                    {hotel._count?.users ? ` • ${hotel._count.users} staff` : ''}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          
          {availableHotels.length > 1 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="all-hotels"
                  onSelect={() => {
                    setAllHotelsMode(true)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      isAllHotelsMode ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">All Hotels (Consolidated View)</span>
                  </div>
                </CommandItem>
              </CommandGroup>
            </>
          )}
          
          <CommandSeparator />
          <CommandGroup>
            <CommandItem
              value="manage-hotels"
              onSelect={() => {
                navigate('/settings/hotels')
                setOpen(false)
              }}
              className="cursor-pointer"
            >
              <Settings2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Manage Hotels</span>
            </CommandItem>
          </CommandGroup>
        </Command>
        
        {/* Keyboard shortcut hint */}
        <div className="border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
          {' '}to open
        </div>
      </PopoverContent>
    </Popover>
  )
}
