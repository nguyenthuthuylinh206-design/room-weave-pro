import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { vi } from 'date-fns/locale'
import { getRoomStatusMeta } from '@/lib/roomStatus'
import { Phone, Users, Building2, BedDouble, Calendar } from 'lucide-react'
import type { FloorPlanRoom } from '@/hooks/useFloorPlanLive'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: FloorPlanRoom | null
  onBookRoom: (roomId: string, roomNumber: string) => void
  onOpenBookingDetail: (bookingId: string) => void
}

function formatCountdown(target: Date): { label: string; tone: 'normal' | 'soon' | 'overdue' } {
  const mins = differenceInMinutes(target, new Date())
  if (mins < 0) return { label: `Trễ ${Math.abs(Math.round(mins / 60))}h`, tone: 'overdue' }
  if (mins < 60) return { label: `Còn ${mins} phút`, tone: 'soon' }
  if (mins < 24 * 60) return { label: `Còn ${Math.round(mins / 60)}h`, tone: 'normal' }
  return { label: `Còn ${Math.round(mins / (60 * 24))} ngày`, tone: 'normal' }
}

export function ReceptionQuickDialog({ open, onOpenChange, room, onBookRoom, onOpenBookingDetail }: Props) {
  const navigate = useNavigate()
  const bk = room?.current_booking

  const { data: detail } = useQuery({
    queryKey: ['reception-room-quick', room?.id],
    enabled: open && !!room?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!room) return null
      const { data, error } = await supabase
        .from('rooms')
        .select('id, room_number, room_type, floor, base_price, hourly_price, max_guests, bed_type, view_type')
        .eq('id', room.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  if (!room) return null

  const meta = getRoomStatusMeta(room.status)
  const isOccupied = !!bk
  const checkoutDate = bk?.check_out_date
    ? parseISO(`${bk.check_out_date}T${(bk.expected_check_out_time || '12:00').slice(0, 5)}:00`)
    : null
  const countdown = checkoutDate ? formatCountdown(checkoutDate) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Header — màu theo trạng thái */}
        <div className={`px-5 py-4 ${meta.bg} ${meta.border} border-b`}>
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="text-2xl font-bold">Phòng {room.room_number}</span>
              <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
            </DialogTitle>
            <div className="text-xs text-muted-foreground capitalize">
              {detail?.room_type || room.room_type}
              {detail?.bed_type ? ` · ${detail.bed_type}` : ''}
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {isOccupied && bk ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Khách đang ở</div>
                <div className="text-lg font-semibold">{bk.guest_name || 'Khách lẻ'}</div>
                {bk.guest_phone && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${bk.guest_phone}`} className="hover:underline">{bk.guest_phone}</a>
                  </div>
                )}
              </div>
              {checkoutDate && countdown && (
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Checkout dự kiến</div>
                    <div className="text-base font-semibold">
                      {format(checkoutDate, 'HH:mm · dd/MM', { locale: vi })}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      countdown.tone === 'overdue'
                        ? 'text-red-600'
                        : countdown.tone === 'soon'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {countdown.label}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {bk.guest_count && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{bk.guest_count} khách</span>
                  </div>
                )}
                {detail?.floor != null && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Tầng {detail.floor}</span>
                  </div>
                )}
                {bk.total_amount != null && (
                  <div className="col-span-2 flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Tổng tiền</span>
                    <span className="font-semibold">{formatCurrency(Number(bk.total_amount))}</span>
                  </div>
                )}
                {(() => {
                  const remaining = (Number(bk.total_amount) || 0) - (Number(bk.amount_paid) || 0) - (Number(bk.deposit_amount) || 0)
                  if (remaining <= 1000) return null
                  return (
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Còn phải thu</span>
                      <span className="font-semibold text-red-600">{formatCurrency(remaining)}</span>
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Giá hôm nay</div>
                <div className="text-2xl font-bold text-foreground">
                  {detail?.base_price ? formatCurrency(Number(detail.base_price)) : '—'}
                </div>
                {detail?.hourly_price ? (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Theo giờ: {formatCurrency(Number(detail.hourly_price))}/h
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded border p-2 text-center">
                  <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                  <div className="font-semibold">{detail?.max_guests ?? '—'} khách</div>
                </div>
                <div className="rounded border p-2 text-center">
                  <Building2 className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                  <div className="font-semibold">Tầng {detail?.floor ?? '—'}</div>
                </div>
                <div className="rounded border p-2 text-center">
                  <BedDouble className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                  <div className="font-semibold truncate">{detail?.bed_type || '—'}</div>
                </div>
              </div>
              {room.next_booking && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-orange-700">
                    <Calendar className="h-3.5 w-3.5" />
                    Sắp có khách: {room.next_booking.guest_name}
                  </div>
                  <div className="text-orange-600 mt-0.5">
                    {room.next_booking.check_in_date} {(room.next_booking.expected_check_in_time || '14:00').slice(0, 5)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t bg-muted/30 px-5 py-3 flex gap-2">
          {isOccupied && bk ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <Button className="flex-1" onClick={() => { onOpenChange(false); onOpenBookingDetail(bk.id) }}>
                Chi tiết booking
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false)
                  navigate(`/bookings/new?roomId=${room.id}&mode=checkin`)
                }}
              >
                Checkin nhanh
              </Button>
              <Button
                className="flex-1"
                onClick={() => { onOpenChange(false); onBookRoom(room.id, room.room_number) }}
              >
                Đặt phòng
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
