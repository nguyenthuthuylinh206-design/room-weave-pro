import { Card } from '@/components/ui/card'
import { Building2, CheckCircle2, XCircle, Bed, Users, Package } from 'lucide-react'
import { Hotel } from '@/hooks/useHotels'

interface HotelStatsCardsProps {
  hotels: Hotel[]
  viewMode?: 'all' | 'focus'
}

export function HotelStatsCards({ hotels, viewMode = 'all' }: HotelStatsCardsProps) {
  const stats = {
    total: hotels.length,
    active: hotels.filter(h => h.status === 'active').length,
    inactive: hotels.filter(h => h.status === 'inactive').length,
    totalRooms: hotels.reduce((sum, h) => sum + h.total_rooms, 0),
    totalStaff: hotels.reduce((sum, h) => sum + (h._count?.users || 0), 0),
    totalItems: hotels.reduce((sum, h) => sum + (h._count?.items || 0), 0),
  }

  const modeLabel = viewMode === 'focus' ? 'Khách sạn này' : 'Tổng cộng'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'focus' ? 'Khách sạn' : 'Tổng khách sạn'}
            </p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'focus' ? 'Trạng thái' : 'Đang hoạt động'}
            </p>
            <p className="text-2xl font-bold">
              {viewMode === 'focus' ? (stats.active > 0 ? 'Hoạt động' : 'Ngừng') : stats.active}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'focus' ? 'Loại hình' : 'Ngừng hoạt động'}
            </p>
            <p className="text-2xl font-bold">
              {viewMode === 'focus' ? (hotels[0]?.type || 'Hotel') : stats.inactive}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Bed className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {modeLabel} - Phòng
            </p>
            <p className="text-2xl font-bold">{stats.totalRooms}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {modeLabel} - Nhân viên
            </p>
            <p className="text-2xl font-bold">{stats.totalStaff}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Package className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {modeLabel} - Tài sản
            </p>
            <p className="text-2xl font-bold">{stats.totalItems}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
