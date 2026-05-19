import { useState, useEffect } from 'react'
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  guestName: string
  roomNumber: string
  currentCheckIn: string // yyyy-MM-dd
  currentCheckOut: string
  onSuccess?: () => void
}

export function RescheduleCheckinDialog({
  open,
  onOpenChange,
  bookingId,
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
  const mutation = useRescheduleBookingCheckin()

  // Auto-adjust check-out khi đổi check-in (giữ số đêm)
  useEffect(() => {
    if (!newIn) return
    setNewOut(format(addDays(parseISO(newIn), nights), 'yyyy-MM-dd'))
  }, [newIn, nights])

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dời ngày check-in</DialogTitle>
          <DialogDescription>
            Đổi lịch nhận phòng cho khách <b>{guestName}</b> — phòng <b>{roomNumber}</b>. Hệ thống
            sẽ giữ nguyên số đêm ({nights} đêm) và kiểm tra phòng có sẵn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
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
            disabled={!newIn || !newOut || newOut <= newIn || mutation.isPending}
          >
            {mutation.isPending ? 'Đang lưu...' : 'Xác nhận dời lịch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
