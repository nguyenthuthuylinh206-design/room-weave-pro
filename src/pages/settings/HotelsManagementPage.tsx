import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useHotels, useDeleteHotel, Hotel } from '@/hooks/useHotels'
import { HotelCard } from '@/components/settings/hotels/HotelCard'
import { HotelFormDialog } from '@/components/settings/hotels/HotelFormDialog'
import { HotelDetailDialog } from '@/components/settings/hotels/HotelDetailDialog'
import { DeactivateHotelDialog } from '@/components/settings/hotels/DeactivateHotelDialog'
import { HotelStatsCards } from '@/components/settings/hotels/HotelStatsCards'
import { HotelFilters, HotelFiltersState } from '@/components/settings/hotels/HotelFilters'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MobileHotelManagementPage } from '@/components/settings/MobileHotelManagementPage'
import { useIsMobile } from '@/hooks/use-mobile'

export default function HotelsManagementPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileHotelManagementPage />
  }
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [hotelToDelete, setHotelToDelete] = useState<Hotel | null>(null)
  const [filters, setFilters] = useState<HotelFiltersState>({
    status: 'all',
    type: 'all',
    city: 'all',
    manager_id: 'all',
    search: '',
  })

  const { data: hotels, isLoading } = useHotels(filters)
  const deleteHotel = useDeleteHotel()

  const cities = [...new Set(hotels?.map(h => h.city).filter(Boolean))] as string[]
  const managers = [...new Set(hotels?.map(h => 
    h.manager_id && h.manager_name ? { id: h.manager_id, name: h.manager_name } : null
  ).filter(Boolean))] as Array<{ id: string; name: string }>

  const handleEdit = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setDialogOpen(true)
  }

  const handleDelete = (hotel: Hotel) => {
    setHotelToDelete(hotel)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (hotelToDelete) {
      await deleteHotel.mutateAsync(hotelToDelete.id)
      setDeleteDialogOpen(false)
      setHotelToDelete(null)
    }
  }

  const handleAddNew = () => {
    setSelectedHotel(null)
    setDialogOpen(true)
  }

  const handleView = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setDetailDialogOpen(true)
  }

  const handleDeactivate = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setDeactivateDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hotels / Properties</h2>
          <p className="text-muted-foreground">
            Manage your hotels and properties
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Hotel
        </Button>
      </div>

      {hotels && hotels.length > 0 && <HotelStatsCards hotels={hotels} />}

      <HotelFilters 
        filters={filters}
        onFiltersChange={(f) => setFilters(prev => ({ ...prev, ...f }))}
        cities={cities}
        managers={managers}
      />

      {hotels && hotels.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No hotels found</p>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Hotel
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {hotels?.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      )}

      <HotelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hotel={selectedHotel}
      />

      <HotelDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        hotel={selectedHotel}
        onEdit={handleEdit}
      />

      <DeactivateHotelDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        hotel={selectedHotel}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{hotelToDelete?.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
