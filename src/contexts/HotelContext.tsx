import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Hotel, useHotels } from '@/hooks/useHotels'
import { useUser } from '@/hooks/useUser'

interface HotelContextType {
  selectedHotel: Hotel | null
  setSelectedHotel: (hotel: Hotel) => void
  availableHotels: Hotel[]
  isAllHotelsMode: boolean
  setAllHotelsMode: (enabled: boolean) => void
  isLoading: boolean
}

const HotelContext = createContext<HotelContextType | undefined>(undefined)

export function HotelProvider({ children }: { children: ReactNode }) {
  const { hotelId } = useUser()
  const { data: hotels, isLoading } = useHotels()
  const [selectedHotel, setSelectedHotelState] = useState<Hotel | null>(null)
  const [isAllHotelsMode, setAllHotelsMode] = useState(false)

  // Initialize selected hotel
  useEffect(() => {
    if (!hotels || hotels.length === 0) return

    // Try to load from localStorage
    const savedHotelId = localStorage.getItem('selected_hotel_id')
    
    if (savedHotelId) {
      const hotel = hotels.find(h => h.id === savedHotelId)
      if (hotel) {
        setSelectedHotelState(hotel)
        return
      }
    }

    // Fallback to user's primary hotel
    if (hotelId) {
      const hotel = hotels.find(h => h.id === hotelId)
      if (hotel) {
        setSelectedHotelState(hotel)
        return
      }
    }

    // Fallback to first hotel
    if (hotels.length > 0) {
      setSelectedHotelState(hotels[0])
    }
  }, [hotels, hotelId])

  const setSelectedHotel = (hotel: Hotel) => {
    setSelectedHotelState(hotel)
    setAllHotelsMode(false)
    localStorage.setItem('selected_hotel_id', hotel.id)
  }

  const handleSetAllHotelsMode = (enabled: boolean) => {
    setAllHotelsMode(enabled)
    if (enabled) {
      localStorage.removeItem('selected_hotel_id')
    }
  }

  return (
    <HotelContext.Provider
      value={{
        selectedHotel,
        setSelectedHotel,
        availableHotels: hotels || [],
        isAllHotelsMode,
        setAllHotelsMode: handleSetAllHotelsMode,
        isLoading,
      }}
    >
      {children}
    </HotelContext.Provider>
  )
}

export function useHotelContext() {
  const context = useContext(HotelContext)
  if (context === undefined) {
    throw new Error('useHotelContext must be used within a HotelProvider')
  }
  return context
}
