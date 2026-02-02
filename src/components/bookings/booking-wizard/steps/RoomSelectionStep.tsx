import { Building2, CheckCircle2, Loader2, Sparkles, Wrench, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { useAvailableRooms, AvailableRoom } from '@/hooks/useAvailableRooms'

// Helper to get status badge for rooms
const getRoomStatusBadge = (status: string) => {
  switch (status) {
    case 'cleaning':
      return (
        <span className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium">
          <Sparkles className="h-2.5 w-2.5" />
          Dọn
        </span>
      )
    case 'maintenance':
      return (
        <span className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-medium">
          <Wrench className="h-2.5 w-2.5" />
          Bảo trì
        </span>
      )
    case 'occupied':
      return null // Room passed overlap check, will be free by booking date
    default:
      return null
  }
}
import { useHotelContext } from '@/contexts/HotelContext'
import { BookingFormState, BookingFormComputed, SelectedRoomWithPrice } from '../types'

interface RoomSelectionStepProps {
  state: BookingFormState
  computed: BookingFormComputed
  onToggleRoom: (room: AvailableRoom) => void
  onUpdateRoomPrice: (roomId: string, price: number) => void
}

const getRoomTypeLabel = (type: string) => {
  switch (type) {
    case 'single': return 'Đơn'
    case 'double': return 'Đôi'
    case 'twin': return 'Twin'
    case 'suite': return 'Suite'
    case 'deluxe': return 'Deluxe'
    case 'vip': return 'VIP'
    default: return type
  }
}

const getPriceUnitLabel = (bookingType: string) => {
  switch (bookingType) {
    case 'hourly': return 'đ/giờ'
    case 'monthly': return 'đ/tháng'
    default: return 'đ/đêm'
  }
}

const getPricePlaceholder = (bookingType: string) => {
  switch (bookingType) {
    case 'hourly': return 'Giá/giờ'
    case 'monthly': return 'Giá/tháng'
    default: return 'Giá/đêm'
  }
}

const getTotalLabel = (bookingType: string) => {
  switch (bookingType) {
    case 'hourly': return 'Tổng giá phòng/giờ:'
    case 'monthly': return 'Tổng giá phòng/tháng:'
    default: return 'Tổng giá phòng/đêm:'
  }
}

export function RoomSelectionStep({ 
  state, 
  computed, 
  onToggleRoom, 
  onUpdateRoomPrice 
}: RoomSelectionStepProps) {
  const { isAllHotelsMode } = useHotelContext()
  const { data: availableRooms, isLoading: isLoadingRooms } = useAvailableRooms(
    state.checkInDate,
    state.checkOutDate
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">Phòng trống</span>
        {availableRooms && (
          <Badge variant="secondary">
            {availableRooms.length} phòng
          </Badge>
        )}
        {state.selectedRooms.length > 0 && (
          <Badge variant="default">
            Đã chọn {state.selectedRooms.length}
          </Badge>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Click để chọn/bỏ chọn phòng. Có thể chọn nhiều phòng cùng lúc.
      </p>
      
      {/* Room Grid */}
      {isLoadingRooms ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : availableRooms && availableRooms.length > 0 ? (
        <ScrollArea className="h-[180px] rounded-md border p-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {availableRooms.map((room) => {
              const isSelected = state.selectedRooms.some(r => r.id === room.id)
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onToggleRoom(room)}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:border-primary/50",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  {isSelected && (
                    <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />
                  )}
                  <Building2 className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="font-semibold text-sm">{room.room_number}</span>
                  <span className="text-xs text-muted-foreground">
                    T{room.floor} • {getRoomTypeLabel(room.room_type)}
                  </span>
                  {(() => {
                    let displayPrice = room.base_price
                    if (state.bookingType === 'hourly' && room.hourly_price) {
                      displayPrice = room.hourly_price
                    } else if (state.bookingType === 'monthly' && room.monthly_price) {
                      displayPrice = room.monthly_price
                    }
                    return displayPrice && displayPrice > 0 ? (
                      <span className="text-xs font-medium text-primary">
                        {formatCurrency(displayPrice)}
                      </span>
                    ) : null
                  })()}
                  {isAllHotelsMode && room.hotel_name && (
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {room.hotel_name}
                    </span>
                  )}
                  {/* Status indicator for cleaning/maintenance rooms */}
                  {getRoomStatusBadge(room.currentStatus)}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Không có phòng trống trong khoảng thời gian này</p>
        </div>
      )}
      
      {/* Selected Rooms with Price Inputs */}
      {state.selectedRooms.length > 0 && (
        <div className="p-3 bg-primary/5 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium">
              Đã chọn {state.selectedRooms.length} phòng - Nhập giá mỗi phòng:
            </span>
          </div>
          
          <div className="space-y-2">
            {state.selectedRooms.map(room => (
              <div key={room.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm">{room.room_number}</span>
                    <span className="text-xs text-muted-foreground">
                      T{room.floor} • {getRoomTypeLabel(room.room_type)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={room.customPrice > 0 ? formatNumber(room.customPrice) : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      onUpdateRoomPrice(room.id, parseInt(value) || 0)
                    }}
                    placeholder={getPricePlaceholder(state.bookingType)}
                    className="w-28 h-8 text-right"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{getPriceUnitLabel(state.bookingType)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onToggleRoom(room)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Room total summary */}
          <div className="flex justify-between items-center pt-2 border-t text-sm">
            <span className="text-muted-foreground">{getTotalLabel(state.bookingType)}</span>
            <span className="font-medium text-primary">{formatCurrency(computed.totalRoomPrice)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
