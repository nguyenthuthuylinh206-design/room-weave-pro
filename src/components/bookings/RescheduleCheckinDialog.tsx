import { useState, useEffect, useMemo } from 'react'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRescheduleBookingCheckin } from '@/hooks/useRescheduleBookingCheckin'
import { useRoomAvailabilityWindow } from '@/hooks/useRoomAvailabilityWindow'
import { RoomAvailabilityStrip } from './RoomAvailabilityStrip'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  roomId?: string | null
  guestName: string
  roomNumber: string
  currentCheckIn: string // yyyy-MM-dd
  currentCheckOut: string
  onSuccess?: () => void
}

const DEFAULT_WINDOW_DAYS = 30
const EXTRA_WINDOW_DAYS = 30
const MAX_WINDOW_DAYS = 120

export function RescheduleCheckinDialog({
  open,
  onOpenChange,
  bookingId,
  roomId,
  guestName,
  roomNumber,
  currentCheckIn,
  currentCheckOut,
  onSuccess,
}: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const nights = Math.max(
    1,
    differenceInDays(parseISO(currentCheckOut), parseISO(currentCheckIn)),
  )

  const [newIn, setNewIn] = useState(today)
  const [newOut, setNewOut] = useState(format(addDays(parseISO(today), nights), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('')
  const [windowDays, setWindowDays] = useState(DEFAULT_WINDOW_DAYS)
  const mutation = useRescheduleBookingCheckin()

  // Auto-adjust check-out khi đổi check-in (giữ số đêm)
  useEffect(() => {
    if (!newIn) return
    setNewOut(format(addDays(parseISO(newIn), nights), 'yyyy-MM-dd'))
  }, [newIn, nights])

  // Reset cửa sổ khi mở lại
  useEffect(() => {
    if (open) {
      setWindowDays(DEFAULT_WINDOW_DAYS)
      setNewIn(today)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toDate = useMemo(
    () => format(addDays(parseISO(today), windowDays), 'yyyy-MM-dd'),
    [today, windowDays],
  )

  const { isLoading, isDateBooked, isRangeFree, findNextFreeWindow } = useRoomAvailabilityWindow({
    roomId,
    fromDate: today,
    toDate,
    excludeBookingId: bookingId,
    enabled: open && !!roomId,
  })

  const rangeFree = newIn && newOut ? isRangeFree(newIn, newOut) : false
  const suggestion = useMemo(() => {
    if (rangeFree || !roomId) return null
    return findNextFreeWindow(nights, newIn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFree, roomId, nights, newIn, isLoading])

  const handleSubmit = async () => {
    if (!newIn || !newOut || newOut <= newIn) return
    await mutation.mutateAsync({
      bookingId,
      newCheckInDate: newIn,
      newCheckOutDate: newOut,
      reason: reason.trim() || undefined,
    })
    onOpenChange(false)
    setReason('')
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Dời ngày check-in</DialogTitle>
          <DialogDescription>
            Đổi lịch nhận phòng cho khách <b>{guestName}</b> — phòng <b>{roomNumber}</b>. Hệ thống
            giữ nguyên số đêm ({nights} đêm) và kiểm tra phòng có sẵn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {roomId && (
            <div className="space-y-2">
              <RoomAvailabilityStrip
                fromDate={today}
                days={windowDays}
                selectedIn={newIn}
                selectedOut={newOut}
                isDateBooked={isDateBooked}
                onPickDate={(d) => setNewIn(d)}
                isLoading={isLoading}
              />
              {windowDays < MAX_WINDOW_DAYS && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setWindowDays((d) => Math.min(MAX_WINDOW_DAYS, d + EXTRA_WINDOW_DAYS))
                    }
                  >
                    Xem thêm {EXTRA_WINDOW_DAYS} ngày
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Check-in mới</Label>
              <Input
                type="date"
                min={today}
                value={newIn}
                onChange={(e) => setNewIn(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Check-out mới</Label>
              <Input
                type="date"
                min={newIn}
                value={newOut}
                onChange={(e) => setNewOut(e.target.value)}
              />
            </div>
          </div>

          {roomId && newIn && newOut && !rangeFree && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs space-y-1">
              <div className="text-red-700 font-medium">
                Khoảng {format(parseISO(newIn), 'dd/MM')} → {format(parseISO(newOut), 'dd/MM')}{' '}
                trùng lịch khác của phòng này.
              </div>
              {suggestion && (
                <button
                  type="button"
                  onClick={() => setNewIn(suggestion.in)}
                  className="text-red-700 underline hover:no-underline"
                >
                  Dùng khoảng trống gần nhất:{' '}
                  <b>
                    {format(parseISO(suggestion.in), 'dd/MM')} →{' '}
                    {format(parseISO(suggestion.out), 'dd/MM')}
                  </b>
                </button>
              )}
              {!suggestion && (
                <div className="text-red-600">
                  Không tìm thấy khoảng trống {nights} đêm trong cửa sổ hiện tại — thử mở rộng lịch.
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Lịch cũ: {format(parseISO(currentCheckIn), 'dd/MM/yyyy')} →{' '}
            {format(parseISO(currentCheckOut), 'dd/MM/yyyy')}
          </div>

          <div className="space-y-1">
            <Label htmlFor="r-reason" className="text-xs">
              Lý do (tuỳ chọn)
            </Label>
            <Textarea
              id="r-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Khách báo đến muộn 1 ngày..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !newIn ||
              !newOut ||
              newOut <= newIn ||
              mutation.isPending ||
              (!!roomId && !rangeFree)
            }
          >
            {mutation.isPending ? 'Đang lưu...' : 'Xác nhận dời lịch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

