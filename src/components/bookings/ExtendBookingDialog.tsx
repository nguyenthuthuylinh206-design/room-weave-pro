import { useState } from 'react'
import { format, addDays, startOfDay, isBefore } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Calendar as CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ExtendBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: {
    id: string
    guest_name: string
    room_id: string
    check_in_date: string
    check_out_date: string
    room_price?: number
    room?: {
      room_number: string
    }
  } | null
  onSuccess?: () => void
}

export function ExtendBookingDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: ExtendBookingDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [newCheckOutDate, setNewCheckOutDate] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!booking) return null

  const today = startOfDay(new Date())
  const currentCheckOut = new Date(booking.check_out_date)
  const daysOverdue = Math.ceil((today.getTime() - currentCheckOut.getTime()) / (1000 * 60 * 60 * 24))
  const roomPrice = (booking as any).room_price || 0
  
  // Calculate minimum new checkout date (must be at least tomorrow)
  const minNewCheckout = addDays(today, 1)
  
  // Calculate additional cost
  const additionalNights = newCheckOutDate 
    ? Math.ceil((newCheckOutDate.getTime() - currentCheckOut.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const additionalCost = additionalNights * roomPrice

  const handleDateSelect = async (date: Date | undefined) => {
    setNewCheckOutDate(date)
    setValidationError(null)

    if (!date) return

    // Validate no overlap with other bookings
    const { data, error } = await supabase.rpc('validate_booking_dates', {
      p_room_id: booking.room_id,
      p_check_in: booking.check_in_date,
      p_check_out: format(date, 'yyyy-MM-dd'),
      p_exclude_booking_id: booking.id,
    })

    if (error) {
      console.error('Validation error:', error)
      return
    }

    const result = data as { valid: boolean; message?: string }
    if (!result.valid) {
      setValidationError(result.message || 'Phòng đã có lịch đặt trong khoảng thời gian này')
    }
  }

  const handleExtend = async () => {
    if (!newCheckOutDate || validationError) return

    setIsSubmitting(true)
    try {
      // Update booking checkout date
      const { error } = await supabase
        .from('room_bookings')
        .update({
          check_out_date: format(newCheckOutDate, 'yyyy-MM-dd'),
          notes: `${(booking as any).notes || ''}\n[Gia hạn từ ${format(currentCheckOut, 'dd/MM/yyyy')} → ${format(newCheckOutDate, 'dd/MM/yyyy')}]`.trim(),
        })
        .eq('id', booking.id)

      if (error) throw error

      toast({ 
        title: 'Gia hạn thành công',
        description: `Đã gia hạn đến ${format(newCheckOutDate, 'dd/MM/yyyy')}`,
      })

      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi gia hạn',
        description: error.message?.includes('overlap') 
          ? 'Không thể gia hạn do trùng lịch với booking khác'
          : error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Đã quá ngày trả phòng
          </DialogTitle>
          <DialogDescription>
            Khách đã ở quá {daysOverdue} ngày so với lịch. Vui lòng gia hạn booking trước khi checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Booking info */}
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Khách:</span>
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phòng:</span>
              <span className="font-medium">{booking.room?.room_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày trả phòng cũ:</span>
              <span className="font-medium text-red-600">
                {format(currentCheckOut, 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số ngày quá hạn:</span>
              <span className="font-medium text-red-600">{daysOverdue} ngày</span>
            </div>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Chọn ngày trả phòng mới</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !newCheckOutDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newCheckOutDate ? (
                    format(newCheckOutDate, 'dd/MM/yyyy', { locale: vi })
                  ) : (
                    'Chọn ngày'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newCheckOutDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => isBefore(date, minNewCheckout)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
          </div>

          {/* Cost preview */}
          {newCheckOutDate && !validationError && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Số đêm gia hạn:</span>
                <span className="font-medium">{additionalNights} đêm</span>
              </div>
              <div className="flex justify-between">
                <span>Giá phòng/đêm:</span>
                <span className="font-medium">{formatCurrency(roomPrice)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Phí gia hạn:</span>
                <span className="font-bold text-primary">{formatCurrency(additionalCost)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleExtend} 
            disabled={!newCheckOutDate || !!validationError || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gia hạn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
