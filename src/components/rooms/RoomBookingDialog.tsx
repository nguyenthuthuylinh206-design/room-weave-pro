import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { format, addDays, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Calendar as CalendarIcon, User, Phone, Mail, Users, Save, X, Loader2, DollarSign, CreditCard, Clock, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import type { RoomBooking } from '@/hooks/useRoomBooking'

// Time options for check-in/check-out
const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
]

interface RoomBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  roomNumber: string
  hotelId: string
  tenantId: string
  booking?: RoomBooking | null
  defaultRoomPrice?: number
}

export function RoomBookingDialog({
  open,
  onOpenChange,
  roomId,
  roomNumber,
  hotelId,
  tenantId,
  booking,
  defaultRoomPrice = 0,
}: RoomBookingDialogProps) {
  const { t } = useTranslation(['rooms', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const isEdit = !!booking
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false)
  
  // Guest info
  const [guestName, setGuestName] = useState(booking?.guest_name || '')
  const [guestPhone, setGuestPhone] = useState(booking?.guest_phone || '')
  const [guestEmail, setGuestEmail] = useState(booking?.guest_email || '')
  const [guestCount, setGuestCount] = useState(booking?.guest_count || 1)
  
  // Dates and times
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(
    booking?.check_in_date ? new Date(booking.check_in_date) : new Date()
  )
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(
    booking?.check_out_date ? new Date(booking.check_out_date) : addDays(new Date(), 1)
  )
  const [checkInTime, setCheckInTime] = useState<string>((booking as any)?.expected_check_in_time?.slice(0, 5) || '14:00')
  const [checkOutTime, setCheckOutTime] = useState<string>((booking as any)?.expected_check_out_time?.slice(0, 5) || '12:00')
  
  const [status, setStatus] = useState(booking?.status || 'confirmed')
  const [notes, setNotes] = useState(booking?.notes || '')
  
  // Financial fields
  const [roomPrice, setRoomPrice] = useState<number>((booking as any)?.room_price || defaultRoomPrice)
  const [extraCharges, setExtraCharges] = useState<number>((booking as any)?.extra_charges || 0)
  const [depositAmount, setDepositAmount] = useState<number>((booking as any)?.deposit_amount || 0)
  const [amountPaid, setAmountPaid] = useState<number>((booking as any)?.amount_paid || 0)
  
  // Calculate total and remaining
  const nights = checkInDate && checkOutDate ? differenceInDays(checkOutDate, checkInDate) : 0
  const totalAmount = (roomPrice * nights) + extraCharges
  const remainingAmount = totalAmount - amountPaid
  
  // Auto-calculate payment status
  const calculatedPaymentStatus = amountPaid === 0 
    ? 'pending' 
    : amountPaid >= totalAmount 
      ? 'paid' 
      : 'partial'

  // Reset form when booking changes
  useEffect(() => {
    if (booking) {
      setGuestName(booking.guest_name || '')
      setGuestPhone(booking.guest_phone || '')
      setGuestEmail(booking.guest_email || '')
      setGuestCount(booking.guest_count || 1)
      setCheckInDate(booking.check_in_date ? new Date(booking.check_in_date) : new Date())
      setCheckOutDate(booking.check_out_date ? new Date(booking.check_out_date) : addDays(new Date(), 1))
      setCheckInTime((booking as any)?.expected_check_in_time?.slice(0, 5) || '14:00')
      setCheckOutTime((booking as any)?.expected_check_out_time?.slice(0, 5) || '12:00')
      setStatus(booking.status || 'confirmed')
      setNotes(booking.notes || '')
      setRoomPrice((booking as any)?.room_price || defaultRoomPrice)
      setExtraCharges((booking as any)?.extra_charges || 0)
      setDepositAmount((booking as any)?.deposit_amount || 0)
      setAmountPaid((booking as any)?.amount_paid || 0)
    }
  }, [booking, defaultRoomPrice])
  
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['room-booking', roomId] })
    queryClient.invalidateQueries({ queryKey: ['room-bookings', roomId] })
    queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['booking-stats'] })
    queryClient.invalidateQueries({ queryKey: ['today-checkouts'] })
    queryClient.invalidateQueries({ queryKey: ['today-checkins'] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!guestName.trim()) {
      toast({
        variant: 'destructive',
        title: t('booking.validation.guestNameRequired'),
      })
      return
    }
    
    if (!checkInDate || !checkOutDate) {
      toast({
        variant: 'destructive',
        title: t('booking.validation.datesRequired'),
      })
      return
    }
    
    if (checkOutDate <= checkInDate) {
      toast({
        variant: 'destructive',
        title: t('booking.validation.invalidDates'),
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const bookingData = {
        room_id: roomId,
        hotel_id: hotelId,
        tenant_id: tenantId,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim() || null,
        guest_email: guestEmail.trim() || null,
        guest_count: guestCount,
        check_in_date: format(checkInDate, 'yyyy-MM-dd'),
        check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
        expected_check_in_time: checkInTime,
        expected_check_out_time: checkOutTime,
        status,
        notes: notes.trim() || null,
        actual_check_in: status === 'checked_in' ? new Date().toISOString() : null,
        // Financial fields
        room_price: roomPrice,
        extra_charges: extraCharges,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        amount_paid: amountPaid,
        // payment_status is auto-calculated by trigger
      }
      
      if (isEdit && booking) {
        const { error } = await supabase
          .from('room_bookings')
          .update(bookingData)
          .eq('id', booking.id)
          
        if (error) throw error
        
        toast({
          title: t('booking.updateSuccess'),
        })
      } else {
        const { error } = await supabase
          .from('room_bookings')
          .insert(bookingData)
          
        if (error) throw error
        
        toast({
          title: t('booking.createSuccess'),
        })
      }
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving booking:', error)
      toast({
        variant: 'destructive',
        title: t('booking.saveError'),
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCheckIn = async () => {
    if (!booking) return
    
    setIsSubmitting(true)
    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_in',
          actual_check_in: new Date().toISOString(),
        })
        .eq('id', booking.id)
        
      if (bookingError) throw bookingError

      // Update room status to 'occupied'
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', roomId)
        
      if (roomError) throw roomError
      
      toast({
        title: t('booking.checkInSuccess'),
      })
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('booking.checkInError'),
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCheckOutClick = () => {
    // Check if payment is complete
    if (calculatedPaymentStatus !== 'paid') {
      setShowCheckoutWarning(true)
    } else {
      performCheckOut()
    }
  }
  
  const performCheckOut = async () => {
    if (!booking) return
    
    setIsSubmitting(true)
    setShowCheckoutWarning(false)
    
    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_out',
          actual_check_out: new Date().toISOString(),
        })
        .eq('id', booking.id)
        
      if (bookingError) throw bookingError

      // Update room status to 'check_out' (needs inspection/cleaning)
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'check_out' })
        .eq('id', roomId)
        
      if (roomError) throw roomError
      
      toast({
        title: t('booking.checkOutSuccess'),
      })
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('booking.checkOutError'),
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReceivePayment = async () => {
    if (!booking) return
    
    // Set amount paid to total
    const newAmountPaid = totalAmount
    setAmountPaid(newAmountPaid)
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({
          amount_paid: newAmountPaid,
          total_amount: totalAmount,
        })
        .eq('id', booking.id)
        
      if (error) throw error
      
      toast({
        title: 'Đã nhận thanh toán đầy đủ',
      })
      
      invalidateQueries()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi cập nhật thanh toán',
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayAndCheckout = async () => {
    if (!booking) return
    
    setIsSubmitting(true)
    setShowCheckoutWarning(false)
    
    try {
      // First, mark as paid
      const { error: paymentError } = await supabase
        .from('room_bookings')
        .update({
          amount_paid: totalAmount,
          total_amount: totalAmount,
        })
        .eq('id', booking.id)
        
      if (paymentError) throw paymentError
      
      // Then perform checkout
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_out',
          actual_check_out: new Date().toISOString(),
        })
        .eq('id', booking.id)
        
      if (bookingError) throw bookingError

      // Update room status
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'check_out' })
        .eq('id', roomId)
        
      if (roomError) throw roomError
      
      toast({
        title: 'Đã thanh toán và check-out thành công',
      })
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('booking.editTitle') : t('booking.addTitle')} - {t('detail.title', { number: roomNumber })}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Guest Name */}
            <div className="space-y-2">
              <Label htmlFor="guestName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('booking.guestName')} *
              </Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t('booking.guestNamePlaceholder')}
                required
              />
            </div>
            
            {/* Contact Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="guestPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t('booking.phone')}
                </Label>
                <Input
                  id="guestPhone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="0909..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t('booking.email')}
                </Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="email@..."
                />
              </div>
            </div>
            
            {/* Guest Count */}
            <div className="space-y-2">
              <Label htmlFor="guestCount" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('booking.guestCount')}
              </Label>
              <Input
                id="guestCount"
                type="number"
                min={1}
                max={10}
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
              />
            </div>
            
            {/* Check-in Date + Time */}
            <div className="border rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Thời gian lưu trú
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Check-in */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Check-in *</Label>
                  <div className="flex gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-8",
                            !checkInDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {checkInDate ? format(checkInDate, 'dd/MM', { locale: vi }) : "Ngày"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkInDate}
                          onSelect={setCheckInDate}
                          locale={vi}
                        />
                      </PopoverContent>
                    </Popover>
                    <Select value={checkInTime} onValueChange={setCheckInTime}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Check-out */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Check-out *</Label>
                  <div className="flex gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-8",
                            !checkOutDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {checkOutDate ? format(checkOutDate, 'dd/MM', { locale: vi }) : "Ngày"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOutDate}
                          onSelect={setCheckOutDate}
                          disabled={(date) => checkInDate ? date <= checkInDate : false}
                          locale={vi}
                        />
                      </PopoverContent>
                    </Popover>
                    <Select value={checkOutTime} onValueChange={setCheckOutTime}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Actual check-in/out times */}
              {isEdit && booking && (
                <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span>Thực tế check-in:</span>
                    <span className={booking.actual_check_in ? 'text-green-600 font-medium' : ''}>
                      {booking.actual_check_in 
                        ? format(new Date(booking.actual_check_in), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : '--'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thực tế check-out:</span>
                    <span className={(booking as any)?.actual_check_out ? 'text-green-600 font-medium' : ''}>
                      {(booking as any)?.actual_check_out 
                        ? format(new Date((booking as any).actual_check_out), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : '--'
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Section */}
            <div className="border rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Thông tin thanh toán
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="roomPrice" className="text-xs text-muted-foreground">Giá phòng/đêm</Label>
                  <Input
                    id="roomPrice"
                    type="number"
                    min={0}
                    className="h-8"
                    value={roomPrice}
                    onChange={(e) => setRoomPrice(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="extraCharges" className="text-xs text-muted-foreground">Phí phát sinh</Label>
                  <Input
                    id="extraCharges"
                    type="number"
                    min={0}
                    className="h-8"
                    value={extraCharges}
                    onChange={(e) => setExtraCharges(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* Deposit and Amount Paid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="depositAmount" className="text-xs text-muted-foreground">Tiền đặt cọc</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    min={0}
                    className="h-8"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amountPaid" className="text-xs text-muted-foreground">Đã thanh toán</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    min={0}
                    className="h-8"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* Summary */}
              <div className="space-y-2 pt-2 border-t text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng ({nights} đêm)</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Đã thanh toán</span>
                  <span className="font-medium text-green-600">{formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Còn lại</span>
                  <span className={cn(
                    "font-bold",
                    remainingAmount > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {formatCurrency(remainingAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    calculatedPaymentStatus === 'paid' && "bg-green-100 text-green-700",
                    calculatedPaymentStatus === 'partial' && "bg-amber-100 text-amber-700",
                    calculatedPaymentStatus === 'pending' && "bg-red-100 text-red-700"
                  )}>
                    {calculatedPaymentStatus === 'paid' && 'Đã thanh toán'}
                    {calculatedPaymentStatus === 'partial' && 'Thanh toán một phần'}
                    {calculatedPaymentStatus === 'pending' && 'Chưa thanh toán'}
                  </span>
                </div>
              </div>

              {/* Quick Payment Button */}
              {isEdit && calculatedPaymentStatus !== 'paid' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-green-500 text-green-600 hover:bg-green-50"
                  onClick={handleReceivePayment}
                  disabled={isSubmitting}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Nhận thanh toán đầy đủ ({formatCurrency(remainingAmount)})
                </Button>
              )}
            </div>
            
            {/* Status */}
            <div className="space-y-2">
              <Label>{t('booking.status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">{t('booking.statusConfirmed')}</SelectItem>
                  <SelectItem value="checked_in">{t('booking.statusCheckedIn')}</SelectItem>
                  <SelectItem value="checked_out">{t('booking.statusCheckedOut')}</SelectItem>
                  <SelectItem value="cancelled">{t('booking.statusCancelled')}</SelectItem>
                  <SelectItem value="no_show">{t('booking.statusNoShow')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('booking.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('booking.notesPlaceholder')}
                rows={2}
              />
            </div>
            
            {/* Quick Actions for existing booking */}
            {isEdit && booking && (
              <div className="flex gap-2 pt-2 border-t">
                {booking.status === 'confirmed' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCheckIn}
                    disabled={isSubmitting}
                  >
                    {t('booking.doCheckIn')}
                  </Button>
                )}
                {booking.status === 'checked_in' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCheckOutClick}
                    disabled={isSubmitting}
                  >
                    {t('booking.doCheckOut')}
                  </Button>
                )}
              </div>
            )}
            
            {/* Submit Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                {t('common:cancel')}
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEdit ? t('common:save') : t('booking.addGuest')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Warning Dialog */}
      <AlertDialog open={showCheckoutWarning} onOpenChange={setShowCheckoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Khách chưa thanh toán đầy đủ
            </AlertDialogTitle>
            <AlertDialogDescription>
              Khách còn nợ <span className="font-bold text-red-600">{formatCurrency(remainingAmount)}</span>.
              Bạn có chắc muốn cho trả phòng?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={performCheckOut}
              disabled={isSubmitting}
            >
              Vẫn cho trả phòng
            </Button>
            <Button
              onClick={handlePayAndCheckout}
              disabled={isSubmitting}
            >
              Thanh toán & Trả phòng
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
