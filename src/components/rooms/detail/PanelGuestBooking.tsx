import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Phone, Calendar } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoomBooking } from '@/hooks/useRoomBooking'
import { RoomBookingDialog } from '@/components/rooms/RoomBookingDialog'
import { formatCurrency } from '@/lib/utils'

interface Props {
  roomId: string
  hotelId: string
  tenantId: string
  roomNumber: string
}

export function PanelGuestBooking({ roomId, hotelId, tenantId, roomNumber }: Props) {
  const { data: booking, isLoading } = useRoomBooking(roomId)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 h-full flex flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-20 w-full mt-auto" />
      </div>
    )
  }

  if (!booking) {
    return (
      <>
        <div className="border rounded-lg p-4 h-full flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mb-3">
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-semibold">Phòng sẵn sàng</p>
          <p className="text-xs text-muted-foreground mt-1">Chưa có khách đặt</p>
          <Button size="sm" className="mt-4 h-8" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Tạo đặt phòng
          </Button>
        </div>
        <RoomBookingDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          roomId={roomId}
          roomNumber={roomNumber}
          hotelId={hotelId}
          tenantId={tenantId}
        />
      </>
    )
  }

  const total = booking.total_amount ?? 0
  const paid = (booking.amount_paid ?? 0) + (booking.deposit_amount ?? 0)
  const debt = Math.max(0, total - paid)
  const co = new Date(booking.check_out_date)
  const ci = new Date(booking.check_in_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nightsLeft = Math.max(0, differenceInDays(co, today))
  const totalNights = Math.max(1, differenceInDays(co, ci))

  const statusLabels: Record<string, { label: string; className: string }> = {
    checked_in: { label: 'Đang ở', className: 'text-green-600 bg-green-50 dark:bg-green-950/40' },
    confirmed:  { label: 'Đã xác nhận', className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
    pending:    { label: 'Chờ xác nhận', className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
    checked_out:{ label: 'Đã trả phòng', className: 'text-muted-foreground bg-muted' },
  }
  const st = statusLabels[booking.status] || { label: booking.status, className: 'text-muted-foreground bg-muted' }

  return (
    <div className="border rounded-lg p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Khách đang ở</p>
          <p className="text-base font-semibold truncate">{booking.guest_name}</p>
          {booking.guest_phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" />{booking.guest_phone}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${st.className}`}>
          {st.label}
        </span>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="border rounded p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Nhận phòng</p>
          <p className="font-medium">{format(ci, 'dd/MM HH:mm', { locale: vi })}</p>
        </div>
        <div className="border rounded p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Trả phòng</p>
          <p className="font-medium">{format(co, 'dd/MM HH:mm', { locale: vi })}</p>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-bold">{nightsLeft}</span>
        <span className="text-xs text-muted-foreground">/ {totalNights} đêm còn lại</span>
      </div>

      {/* Finance */}
      <div className="mt-auto space-y-1 text-xs border-t pt-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tổng tiền</span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Đã trả</span>
          <span className="text-green-600 font-medium">{formatCurrency(paid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Còn nợ</span>
          <span className={`font-bold ${debt > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
            {formatCurrency(debt)}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3 h-8 text-xs"
        onClick={() => navigate(`/bookings/${booking.id}`)}
      >
        Xem booking →
      </Button>
    </div>
  )
}
