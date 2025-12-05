import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Hotel, useHotels } from '@/hooks/useHotels'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

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
  const { user, hotelId } = useUser()
  const userId = user?.id
  const { data: hotels, isLoading: hotelsLoading } = useHotels()
  const [selectedHotel, setSelectedHotelState] = useState<Hotel | null>(null)
  const [isAllHotelsMode, setAllHotelsMode] = useState(false)
  const queryClient = useQueryClient()

  // Fetch user preference from database
  const { data: userPreference, isLoading: preferenceLoading } = useQuery({
    queryKey: ['user-preference', userId],
    queryFn: async () => {
      if (!userId) return null
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('current_hotel_id, preferences')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user preference:', error)
        return null
      }
      return data
    },
    enabled: !!userId,
  })

  // Save preference mutation
  const savePreferenceMutation = useMutation({
    mutationFn: async ({ hotelId: newHotelId, isAllHotels }: { hotelId: string | null, isAllHotels: boolean }) => {
      if (!userId) throw new Error('No user ID')

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: userId,
            current_hotel_id: isAllHotels ? null : newHotelId,
            preferences: { is_all_hotels_mode: isAllHotels },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
      
      // Also update localStorage as backup
      if (isAllHotelsMode) {
        localStorage.removeItem('selected_hotel_id')
        localStorage.setItem('is_all_hotels_mode', 'true')
      } else if (selectedHotel) {
        localStorage.setItem('selected_hotel_id', selectedHotel.id)
        localStorage.removeItem('is_all_hotels_mode')
      }
    },
    onError: (error: any) => {
      console.error('Error saving preference:', error)
      
      // Fallback to localStorage on error
      if (isAllHotelsMode) {
        localStorage.removeItem('selected_hotel_id')
        localStorage.setItem('is_all_hotels_mode', 'true')
      } else if (selectedHotel) {
        localStorage.setItem('selected_hotel_id', selectedHotel.id)
        localStorage.removeItem('is_all_hotels_mode')
      }
    },
  })

  // Initialize selected hotel from preference or fallback
  useEffect(() => {
    if (!hotels || hotels.length === 0 || hotelsLoading || preferenceLoading) return

    // Check for "All Hotels" mode first
    const preferences = userPreference?.preferences as { is_all_hotels_mode?: boolean } | null
    const isAllHotelsFromPref = preferences?.is_all_hotels_mode
    const isAllHotelsFromLocal = localStorage.getItem('is_all_hotels_mode') === 'true'
    
    if (isAllHotelsFromPref || (isAllHotelsFromLocal && hotels.length > 1)) {
      setAllHotelsMode(true)
      return
    }

    // Try database preference
    if (userPreference?.current_hotel_id) {
      const hotel = hotels.find(h => h.id === userPreference.current_hotel_id)
      if (hotel) {
        setSelectedHotelState(hotel)
        return
      }
    }

    // Fallback to localStorage
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
  }, [hotels, hotelId, userPreference, hotelsLoading, preferenceLoading])

  const setSelectedHotel = (hotel: Hotel) => {
    setSelectedHotelState(hotel)
    setAllHotelsMode(false)
    
    // Save to database
    savePreferenceMutation.mutate({ hotelId: hotel.id, isAllHotels: false })
    
    // Invalidate ALL queries to refresh data with new hotel context
    queryClient.invalidateQueries({ queryKey: ['items'] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
    queryClient.invalidateQueries({ queryKey: ['floor-plan'] })
    queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
    queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
    queryClient.invalidateQueries({ queryKey: ['vendors'] })
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['hotels-breakdown-stats'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  const handleSetAllHotelsMode = (enabled: boolean) => {
    setAllHotelsMode(enabled)
    
    // Save to database
    savePreferenceMutation.mutate({ hotelId: null, isAllHotels: enabled })
    
    // Invalidate ALL queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['items'] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
    queryClient.invalidateQueries({ queryKey: ['floor-plan'] })
    queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
    queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
    queryClient.invalidateQueries({ queryKey: ['vendors'] })
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['hotels-breakdown-stats'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  const isLoading = hotelsLoading || preferenceLoading

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
