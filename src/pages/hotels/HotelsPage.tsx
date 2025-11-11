import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, MapPin, Users, Star } from 'lucide-react'
import { useHotels } from '@/hooks/useHotels'
import { HotelFormDialog } from '@/components/settings/hotels/HotelFormDialog'
import { HotelDetailDialog } from '@/components/settings/hotels/HotelDetailDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useState } from 'react'
import type { Hotel } from '@/hooks/useHotels'

export function HotelsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  
  const { data: hotels, isLoading } = useHotels({})

  const handleAddNew = () => {
    setSelectedHotel(null)
    setIsFormOpen(true)
  }

  const handleEdit = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setIsFormOpen(true)
  }

  const handleView = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setIsDetailOpen(true)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Khách sạn"
        description="Quản lý các cơ sở khách sạn trong hệ thống"
        action={{
          label: 'Thêm khách sạn',
          icon: Plus,
          onClick: handleAddNew,
        }}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hotels?.map((hotel) => (
          <Card key={hotel.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
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
                  <div>
                    <CardTitle className="text-lg">{hotel.name}</CardTitle>
                    <Badge 
                      variant={hotel.status === 'active' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {hotel.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{hotel.address || 'Chưa có địa chỉ'}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{hotel._count?.rooms || 0} phòng</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{hotel._count?.users || 0} nhân viên</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  size="sm"
                  onClick={() => handleView(hotel)}
                >
                  Xem chi tiết
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleEdit(hotel)}
                >
                  Sửa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!hotels || hotels.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Chưa có khách sạn</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Thêm khách sạn đầu tiên để bắt đầu
            </p>
            <Button className="mt-4" onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm khách sạn
            </Button>
          </CardContent>
        </Card>
      )}

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
          setSelectedHotel(hotel)
          setIsFormOpen(true)
        }}
      />
    </div>
  )
}
