import { useState } from 'react'
import { Building2, Plus, MapPin, Users, RefreshCw, ChevronRight, Layers } from 'lucide-react'
import { useHotels } from '@/hooks/useHotels'
import { HotelFormDialog } from '@/components/settings/hotels/HotelFormDialog'
import { HotelDetailDialog } from '@/components/settings/hotels/HotelDetailDialog'
import { useHotelContext } from '@/contexts/HotelContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Hotel } from '@/hooks/useHotels'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { cn } from '@/lib/utils'

export function MobileHotelsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { data: hotels, isLoading } = useHotels({})
  const { selectedHotel: currentHotel, isAllHotelsMode } = useHotelContext()
  const queryClient = useQueryClient()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['hotels'] })
    toast.success('Đã làm mới danh sách')
    setIsRefreshing(false)
  }

  const handleAddNew = () => {
    setSelectedHotel(null)
    setIsFormOpen(true)
  }

  const handleView = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setIsDetailOpen(true)
  }

  const handleEdit = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setIsFormOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Hoạt động</Badge>
      case 'inactive':
        return <Badge variant="secondary">Tạm ngưng</Badge>
      case 'maintenance':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Bảo trì</Badge>
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Khách sạn</h1>
            <div className="flex items-center gap-2 mt-1">
              {isAllHotelsMode ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Layers className="h-3 w-3" />
                  Tất cả
                </Badge>
              ) : currentHotel ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Building2 className="h-3 w-3" />
                  {currentHotel.name}
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {hotels?.length || 0} khách sạn
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={handleAddNew}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex-1 p-4 space-y-3">
          {isLoading ? (
            // Skeleton loading
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-2/3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : hotels && hotels.length > 0 ? (
            <div className="space-y-3">
              {hotels.map((hotel) => (
                <Card 
                  key={hotel.id}
                  className={cn(
                    "transition-all active:scale-[0.98]",
                    hotel.id === currentHotel?.id && "ring-2 ring-primary"
                  )}
                  onClick={() => handleView(hotel)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Logo/Icon */}
                      {hotel.logo_url ? (
                        <img
                          src={hotel.logo_url}
                          alt={hotel.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Building2 className="h-6 w-6" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{hotel.name}</h3>
                            <p className="text-xs text-muted-foreground">{hotel.code}</p>
                          </div>
                          {hotel.id === currentHotel?.id && (
                            <Badge className="bg-primary text-xs shrink-0">
                              Đang chọn
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{hotel.city || hotel.address || 'Chưa có địa chỉ'}</span>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-xs">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span>{hotel._count?.rooms || 0} phòng</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{hotel._count?.users || 0} NV</span>
                          </div>
                          {getStatusBadge(hotel.status || 'active')}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Empty state
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Chưa có khách sạn</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Thêm khách sạn đầu tiên để bắt đầu
                </p>
                <Button className="mt-4" onClick={handleAddNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm khách sạn
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </PullToRefresh>

      {/* Dialogs */}
      <HotelFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        hotel={selectedHotel}
      />

      <HotelDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        hotel={selectedHotel}
        onEdit={(hotel) => {
          setIsDetailOpen(false)
          handleEdit(hotel)
        }}
      />
    </div>
  )
}
