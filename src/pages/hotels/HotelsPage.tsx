import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, MapPin, Users, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function HotelsPage() {
  const navigate = useNavigate()

  // Mock data - sẽ được thay thế bằng dữ liệu thực từ database
  const hotels = [
    {
      id: '1',
      name: 'Grand Hotel Saigon',
      address: '123 Nguyễn Huệ, Q1, TP.HCM',
      rooms: 120,
      staff: 45,
      rating: 4.5,
      status: 'active',
      logo_url: null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Khách sạn"
        description="Quản lý các cơ sở khách sạn trong hệ thống"
        action={{
          label: 'Thêm khách sạn',
          icon: Plus,
          onClick: () => {
            // TODO: Implement add hotel
          },
        }}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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
                <span className="truncate">{hotel.address}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{hotel.rooms} phòng</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{hotel.staff} nhân viên</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{hotel.rating}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full" size="sm">
                  Xem chi tiết
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hotels.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Chưa có khách sạn</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Thêm khách sạn đầu tiên để bắt đầu
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Thêm khách sạn
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
